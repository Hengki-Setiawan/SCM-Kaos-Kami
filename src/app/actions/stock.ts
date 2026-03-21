'use server';

import { db } from '@/db';
import { products, stockMovements } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

export async function updateStock(productId: string, newValue: number, previousValue: number) {
  try {
    if (newValue < 0) return { success: false, error: 'Stok tidak boleh negatif' };
    if (!productId) return { success: false, error: 'Product ID wajib' };
    // 1. Update the product stock
    await db.update(products)
      .set({ currentStock: newValue, updatedAt: new Date().toISOString() })
      .where(eq(products.id, productId));

    // 2. Record the movement if it actually changed
    if (newValue !== previousValue) {
      const diff = newValue - previousValue;
      const type = diff > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
      
      await db.insert(stockMovements).values({
        id: uuidv4(),
        productId,
        type,
        quantity: Math.abs(diff),
        reason: 'Inline edit dari halaman stok',
        notes: `Perubahan dari ${previousValue} ke ${newValue}`
      });
    }

    revalidatePath('/stock');
    return { success: true };
  } catch (error) {
    console.error('Failed to update stock:', error);
    return { success: false, error: 'Gagal mengupdate stok' };
  }
}

export async function updateMinStock(productId: string, newValue: number) {
  try {
    if (newValue < 0) return { success: false, error: 'Minimum stok tidak boleh negatif' };
    await db.update(products)
      .set({ minStock: newValue, updatedAt: new Date().toISOString() })
      .where(eq(products.id, productId));

    revalidatePath('/stock');
    return { success: true };
  } catch (error) {
    console.error('Failed to update min stock:', error);
    return { success: false, error: 'Gagal mengupdate batas minimum stok' };
  }
}

export async function getStockMovements(limit = 50) {
  try {
    const logs = await db
      .select({
        id: stockMovements.id,
        type: stockMovements.type,
        quantity: stockMovements.quantity,
        reason: stockMovements.reason,
        referenceId: stockMovements.referenceId,
        createdAt: stockMovements.createdAt,
        productName: products.name,
        productSku: products.sku,
      })
      .from(stockMovements)
      .leftJoin(products, eq(stockMovements.productId, products.id))
      .orderBy(desc(stockMovements.createdAt))
      .limit(limit);

    return { success: true, data: logs };
  } catch (error: any) {
    console.error('GET_STOCK_MOVEMENTS_ERROR', error);
    return { success: false, error: 'Gagal mengambil log stok' };
  }
}
