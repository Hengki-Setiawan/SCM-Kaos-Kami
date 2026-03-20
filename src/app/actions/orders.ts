'use server';

import { db } from '@/db';
import { orders, orderItems, products, stockMovements, autoDeductRules } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

type OrderItemInput = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

type CreateOrderParams = {
  customerName: string;
  platform: string;
  totalPrice: number;
  items: OrderItemInput[];
};

export async function createOrder(data: CreateOrderParams) {
  try {
    const orderId = uuidv4();
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    await db.transaction(async (tx) => {
      // 1. Create the main order record
      await tx.insert(orders).values({
        id: orderId,
        orderNumber,
        customerName: data.customerName,
        platform: data.platform,
        status: 'pending',
        totalPrice: data.totalPrice,
      });

      // 2. Process each item
      for (const item of data.items) {
        // Insert order line item
        await tx.insert(orderItems).values({
          id: uuidv4(),
          orderId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        });

        // 3. Deduct stock for the main item (Baju, DTF, Aksesoris)
        const [product] = await tx.select({ currentStock: products.currentStock }).from(products).where(eq(products.id, item.productId));
        
        if (!product) throw new Error(`Product ${item.productId} not found`);
        if (product.currentStock < item.quantity) throw new Error(`Stok tidak cukup untuk produk ini.`);

        const newStock = product.currentStock - item.quantity;
        
        await tx.update(products)
          .set({ currentStock: newStock })
          .where(eq(products.id, item.productId));

        // 4. Record stock movement
        await tx.insert(stockMovements).values({
          id: uuidv4(),
          productId: item.productId,
          type: 'ORDER_OUT',
          quantity: item.quantity,
          reason: `Pesanan pelanggan ${data.customerName} via ${data.platform}`,
          referenceId: orderId,
        });
      }
    });

    revalidatePath('/orders');
    revalidatePath('/stock');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to create order:', error);
    return { success: false, error: error.message || 'Gagal membuat pesanan baru' };
  }
}

export async function updateOrderStatus(orderId: string, newStatus: string) {
  try {
    const isShipped = newStatus === 'shipped';

    await db.transaction(async (tx) => {
      // Get current order
      const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
      if (!order) throw new Error('Order not found');

      // Update status
      await tx.update(orders)
        .set({ status: newStatus, updatedAt: new Date().toISOString() })
        .where(eq(orders.id, orderId));

      // --- AUTO-DEDUCT PACKAGING (Triggers ONLY when Order moves to "shipped") ---
      if (isShipped && order.status !== 'shipped') {
        
        // 1. Get Active Auto-Deduct Rule
        const [rule] = await tx.select().from(autoDeductRules).where(eq(autoDeductRules.isActive, true));
        
        if (rule && rule.items) {
          const deductItems: { productId: string, quantity: number }[] = JSON.parse(rule.items as string);
          
          for (const item of deductItems) {
            // Get current stock
            const [product] = await tx.select({ currentStock: products.currentStock }).from(products).where(eq(products.id, item.productId));
            
            if (product) {
              const newStock = product.currentStock - item.quantity;
              
              // Dedut stock
              await tx.update(products)
                .set({ currentStock: newStock })
                .where(eq(products.id, item.productId));

              // Record movement
              await tx.insert(stockMovements).values({
                id: uuidv4(),
                productId: item.productId,
                type: 'AUTO_DEDUCT_OUT',
                quantity: item.quantity,
                reason: `Auto-deduct pengiriman order ${order.orderNumber}`,
                referenceId: orderId,
              });
            }
          }
        }
      }
    });

    revalidatePath('/orders');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update order status:', error);
    return { success: false, error: error.message || 'Gagal mengubah status pesanan' };
  }
}
