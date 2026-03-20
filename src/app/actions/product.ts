'use server';

import { db } from '@/db';
import { products } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function updateProductDetails(productId: string, data: any) {
  try {
    // Only update fields that exist in our schema that we care about from the client
    const updatableFields = [
      'name', 'sku', 'categoryId', 'color', 'size', 'material', 
      'thickness', 'sleeveType', 'variantType', 'unit', 'unitPrice', 
      'buyPrice', 'isActive', 'imageUrl'
    ];
    
    const updatePayload: any = { updatedAt: new Date().toISOString() };
    
    for (const key of updatableFields) {
      if (data[key] !== undefined) {
        updatePayload[key] = data[key];
      }
    }

    await db.update(products)
      .set(updatePayload)
      .where(eq(products.id, productId));

    revalidatePath(`/stock/${productId}`);
    revalidatePath('/stock');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update product details:', error);
    return { success: false, error: 'Gagal mengupdate detail produk. SKU mungkin duplikat.' };
  }
}
