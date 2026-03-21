'use server';

import { db } from '@/db';
import { products, stockMovements } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { productSchema } from '@/lib/validations';

export async function createProduct(data: {
  name: string; sku: string; categoryId: string; color?: string; size?: string;
  material?: string; thickness?: string; sleeveType?: string; unit?: string;
  unitPrice?: number; buyPrice?: number; minStock?: number; imageUrl?: string;
}) {
  try {
    const validated = productSchema.safeParse({ ...data, unitValue: 1, unitType: data.unit || 'pcs' });
    if (!validated.success) return { success: false, error: validated.error.issues[0].message };

    await db.insert(products).values({
      id: uuidv4(),
      name: data.name.trim(),
      sku: data.sku.trim().toUpperCase(),
      categoryId: data.categoryId,
      color: data.color || null,
      size: data.size || null,
      material: data.material || null,
      thickness: data.thickness || null,
      sleeveType: data.sleeveType || null,
      unit: data.unit || 'pcs',
      unitPrice: data.unitPrice || 0,
      buyPrice: data.buyPrice || 0,
      minStock: data.minStock || 5,
      currentStock: 0,
      imageUrl: data.imageUrl || null,
    });

    revalidatePath('/stock');
    return { success: true };
  } catch (error: any) {
    if (error.message?.includes('UNIQUE')) return { success: false, error: 'SKU sudah digunakan produk lain' };
    return { success: false, error: 'Gagal menambahkan produk baru' };
  }
}

export async function deleteProduct(productId: string) {
  try {
    if (!productId) return { success: false, error: 'Product ID wajib' };
    await db.transaction(async (tx) => {
      await tx.delete(stockMovements).where(eq(stockMovements.productId, productId));
      await tx.delete(products).where(eq(products.id, productId));
    });
    revalidatePath('/stock');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'Gagal menghapus produk. Mungkin masih terikat ke pesanan.' };
  }
}

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

export async function deleteProductsBulk(productIds: string[]) {
  try {
    if (!productIds || productIds.length === 0) return { success: false, error: 'Tidak ada produk dipilih' };
    
    // Hapus stock movements terkait
    await db.delete(stockMovements).where(inArray(stockMovements.productId, productIds));
    // Hapus produk
    await db.delete(products).where(inArray(products.id, productIds));
    
    revalidatePath('/stock');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to delete products bulk:', error);
    return { success: false, error: 'Gagal menghapus produk. Mungkin masih ada relasi dengan pesanan.' };
  }
}

export async function generateProductVariants(template: any, sizes: string[], colors: string[]) {
  try {
    const results = [];
    const baseSku = template.sku.trim().toUpperCase();
    
    for (const color of (colors.length ? colors : [null])) {
      for (const size of (sizes.length ? sizes : [null])) {
        const variantSku = `${baseSku}${color ? '-' + color.toUpperCase() : ''}${size ? '-' + size.toUpperCase() : ''}`;
        const variantName = `${template.name}${color ? ' ' + color : ''}${size ? ' ' + size : ''}`;
        
        results.push({
          id: uuidv4(),
          categoryId: template.categoryId,
          name: variantName,
          sku: variantSku,
          color: color,
          size: size,
          material: template.material || null,
          thickness: template.thickness || null,
          sleeveType: template.sleeveType || null,
          unit: template.unit || 'pcs',
          unitPrice: template.unitPrice || 0,
          buyPrice: template.buyPrice || 0,
          minStock: template.minStock || 5,
          currentStock: 0,
          imageUrl: template.imageUrl || null,
        });
      }
    }

    // Insert all
    await db.insert(products).values(results);
    
    revalidatePath('/stock');
    return { success: true, count: results.length };
  } catch (error: any) {
    console.error('Variant Generation Error:', error);
    if (error.message?.includes('UNIQUE')) return { success: false, error: 'Salah satu SKU varian sudah ada di sistem' };
    return { success: false, error: 'Gagal men-generate varian produk' };
  }
}
