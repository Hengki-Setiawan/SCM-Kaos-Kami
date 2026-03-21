'use server';

import { db } from '@/db';
import { categories } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

export async function createCategory(data: { name: string; icon?: string }) {
  try {
    if (!data.name?.trim()) return { success: false, error: 'Nama kategori wajib diisi' };
    await db.insert(categories).values({
      id: uuidv4(),
      name: data.name.trim(),
      slug: data.name.trim().toLowerCase().replace(/\s+/g, '-'),
      icon: data.icon || '📁',
    });
    revalidatePath('/settings');
    revalidatePath('/stock');
    return { success: true };
  } catch (error: any) {
    if (error.message?.includes('UNIQUE')) return { success: false, error: 'Kategori sudah ada' };
    return { success: false, error: 'Gagal menambahkan kategori' };
  }
}

export async function deleteCategory(categoryId: string) {
  try {
    if (!categoryId) return { success: false, error: 'Category ID wajib' };
    await db.delete(categories).where(eq(categories.id, categoryId));
    revalidatePath('/settings');
    revalidatePath('/stock');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'Gagal menghapus kategori. Mungkin masih ada produk terkait.' };
  }
}
