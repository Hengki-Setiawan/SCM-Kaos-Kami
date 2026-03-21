'use server';

import { db } from '@/db';
import { orders, orderItems, products, stockMovements, autoDeductRules } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { orderSchema } from '@/lib/validations';

export async function createOrder(data: { customerName: string; platform: string; items: any[]; totalPrice: number }) {
  try {
    const parsed = orderSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error?.issues?.[0]?.message || 'Data order invalid' };
    }

    const orderId = uuidv4();
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await db.transaction(async (tx) => {
      // 1. Create Order
      await tx.insert(orders).values({
        id: orderId,
        orderNumber,
        customerName: data.customerName,
        platform: data.platform,
        status: 'processing',
        totalPrice: data.totalPrice,
      });

      // 2. Create Order Items & Deduct Stock
      for (const item of data.items) {
        // Validasi Stok
        const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
        if (!product || product.currentStock < item.quantity) {
          throw new Error(`Stok ${product?.name || 'produk'} tidak mencukupi (sisa: ${product?.currentStock || 0}, diminta: ${item.quantity})`);
        }

        await tx.insert(orderItems).values({
          id: uuidv4(),
          orderId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        });

        // Deduct Stock
        await tx.update(products)
          .set({ currentStock: sql`current_stock - ${item.quantity}` })
          .where(eq(products.id, item.productId));

        // Create Stock Movement Log
        await tx.insert(stockMovements).values({
          id: uuidv4(),
          productId: item.productId,
          type: 'OUT',
          quantity: item.quantity,
          reason: `Pesanan Baru #${orderNumber}`,
          referenceId: orderNumber,
        });
      }
    });

    revalidatePath('/orders');
    revalidatePath('/');
    return { success: true, orderId };
  } catch (error: any) {
    console.error('CREATE_ORDER_ERROR', error);
    return { success: false, error: error.message || 'Gagal membuat pesanan' };
  }
}

export async function updateOrderStatus(orderId: string, status: string) {
  try {
    const oldOrder = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      columns: { status: true, orderNumber: true }
    });
    if (!oldOrder) throw new Error('Order tidak ditemukan');

    await db.update(orders).set({ status }).where(eq(orders.id, orderId));
    
    // Auto-deduct packaging logic
    if (oldOrder.status !== 'shipped' && oldOrder.status !== 'completed' && (status === 'shipped' || status === 'completed')) {
      const rules = await db.select().from(autoDeductRules).where(eq(autoDeductRules.isActive, true));
      
      for (const rule of rules) {
        if (!rule.items) continue;
        const items = JSON.parse(rule.items as string);
        for (const item of items) {
           await db.update(products)
             .set({ currentStock: sql`current_stock - ${item.quantity}` })
             .where(eq(products.id, item.productId));
           
           await db.insert(stockMovements).values({
             id: uuidv4(),
             productId: item.productId,
             type: 'OUT',
             quantity: item.quantity,
             reason: `Auto-Deduct Packaging (${rule.name}) #${oldOrder.orderNumber}`,
             referenceId: oldOrder.orderNumber,
           });
        }
      }
    }
    
    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/orders');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update order status:', error);
    return { success: false, error: error.message || 'Gagal mengubah status pesanan' };
  }
}

export async function deleteOrder(orderId: string) {
  try {
    if (!orderId) return { success: false, error: 'Order ID wajib' };
    
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { items: true }
    });
    if (!order) return { success: false, error: 'Pesanan tidak ditemukan' };

    await db.transaction(async (tx) => {
      // Revert stock & log movements
      for (const item of order.items) {
        await tx.update(products)
          .set({ currentStock: sql`current_stock + ${item.quantity}` })
          .where(eq(products.id, item.productId));
          
        await tx.insert(stockMovements).values({
          id: uuidv4(),
          productId: item.productId,
          type: 'IN',
          quantity: item.quantity,
          reason: `Penghapusan Pesanan #${order.orderNumber}`,
          referenceId: order.orderNumber,
        });
      }

      await tx.delete(orderItems).where(eq(orderItems.orderId, orderId));
      await tx.delete(orders).where(eq(orders.id, orderId));
    });
    revalidatePath('/orders');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete order:', error);
    return { success: false, error: 'Gagal menghapus pesanan' };
  }
}

export async function returnOrder(orderId: string) {
  try {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
      with: { items: true }
    });

    if (!order) throw new Error('Pesanan tidak ditemukan');
    if (order.status === 'cancelled') throw new Error('Pesanan sudah dibatalkan sebelumnya');

    // 1. Update status order ke cancelled
    await db.update(orders).set({ status: 'cancelled' }).where(eq(orders.id, orderId));

    // 2. Kembalikan stok untuk setiap item
    for (const item of order.items) {
      await db.update(products)
        .set({ currentStock: sql`current_stock + ${item.quantity}` })
        .where(eq(products.id, item.productId));

      // Catat log mutasi
      await db.insert(stockMovements).values({
        id: uuidv4(),
        productId: item.productId,
        type: 'IN',
        quantity: item.quantity,
        reason: `Retur/Pembatalan Pesanan #${order.orderNumber}`,
        referenceId: order.orderNumber,
      });
    }

    revalidatePath(`/orders/${orderId}`);
    revalidatePath('/orders');
    revalidatePath('/activity');
    return { success: true };
  } catch (error: any) {
    console.error('RETURN_ORDER_ERROR', error);
    return { success: false, error: error.message || 'Gagal memproses retur' };
  }
}
