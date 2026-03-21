'use server';

import { db } from '@/db';
import { orders, orderItems, products, stockMovements } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

export async function updateOrderStatus(orderId: string, status: string) {
  try {
    await db.update(orders).set({ status }).where(eq(orders.id, orderId));
    
    // Auto-deduct packaging logic (redundant if already done in sync, but good for safety)
    // In current implementation, deduction happens on creation.
    
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
    await db.transaction(async (tx) => {
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
