'use server';

import { db } from '@/db';
import { suppliers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

export async function createSupplier(data: {
  name: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  notes?: string;
}) {
  try {
    await db.insert(suppliers).values({
      id: uuidv4(),
      name: data.name.trim(),
      contactPerson: data.contactPerson || null,
      phone: data.phone || null,
      address: data.address || null,
      notes: data.notes || null,
      isActive: true,
    });
    revalidatePath('/admin/suppliers');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'Gagal menambah supplier' };
  }
}

export async function updateSupplier(id: string, data: any) {
  try {
    await db.update(suppliers).set(data).where(eq(suppliers.id, id));
    revalidatePath('/admin/suppliers');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'Gagal update supplier' };
  }
}

export async function deleteSupplier(id: string) {
  try {
    await db.delete(suppliers).where(eq(suppliers.id, id));
    revalidatePath('/admin/suppliers');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'Gagal menghapus supplier. Mungkin sudah ada transaksi terkait.' };
  }
}
