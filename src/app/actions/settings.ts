'use server';

import { db } from '@/db';
import { autoDeductRules } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';

export async function saveAutoDeductRule(ruleId: string | undefined, items: { productId: string, quantity: number }[]) {
  try {
    const jsonItems = JSON.stringify(items);

    if (ruleId) {
      await db.update(autoDeductRules)
        .set({ items: jsonItems })
        .where(eq(autoDeductRules.id, ruleId));
    } else {
      await db.insert(autoDeductRules).values({
        id: uuidv4(),
        name: 'Default Packaging Rule',
        description: 'Auto-deduct saat pesanan selesai',
        items: jsonItems,
        isActive: true,
      });
    }

    revalidatePath('/settings');
    revalidatePath('/orders');
    return { success: true };
  } catch (error: any) {
    console.error('Failed to save auto deduct rule:', error);
    return { success: false, error: 'Gagal menyimpan aturan auto-deduct' };
  }
}
