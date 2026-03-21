'use server';

import { db } from '@/db';
import { expenses } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const expenseSchema = z.object({
  title: z.string().min(3, 'Judul minimal 3 karakter'),
  category: z.string().min(1, 'Kategori wajib diisi'),
  amount: z.number().min(0, 'Jumlah tidak boleh negatif'),
  date: z.string().min(10, 'Tanggal tidak valid'),
  notes: z.string().optional(),
  receiptUrl: z.string().optional(),
});

export async function createExpense(data: {
  title: string; category: string; amount: number; date: string; notes?: string; receiptUrl?: string;
}) {
  try {
    const validated = expenseSchema.safeParse(data);
    if (!validated.success) return { success: false, error: validated.error.issues[0].message };

    await db.insert(expenses).values({
      id: uuidv4(),
      ...data
    });

    revalidatePath('/finance');
    return { success: true };
  } catch (error: any) {
    console.error('CREATE_EXPENSE_ERROR', error);
    return { success: false, error: 'Gagal mencatat pengeluaran' };
  }
}

export async function getExpenses() {
  try {
    return await db.select().from(expenses).orderBy(desc(expenses.date));
  } catch (error) {
    console.error('GET_EXPENSES_ERROR', error);
    return [];
  }
}

export async function deleteExpense(id: string) {
  try {
    await db.delete(expenses).where(eq(expenses.id, id));
    revalidatePath('/finance');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Gagal menghapus data' };
  }
}

export async function getMonthlyExpenses() {
  try {
    // Basic aggregation for dashboard
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const result = await db.select({
      total: sql<number>`SUM(amount)`
    }).from(expenses).where(sql`date LIKE ${currentMonth + '%'}`);
    
    return result[0]?.total || 0;
  } catch (error) {
    return 0;
  }
}
