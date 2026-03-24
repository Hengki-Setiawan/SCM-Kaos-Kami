import { NextResponse } from 'next/server';
import { db } from '@/db';
import { products, categories } from '@/db/schema';
import { sql, eq } from 'drizzle-orm';
import { requireRole } from '@/lib/rbac';

export async function GET(req: Request) {
  const roleError = await requireRole(['admin', 'manager', 'staff']);
  if (roleError) return roleError;

  try {
    const lowStockItems = await db
      .select({
        id: products.id,
        sku: products.sku,
        name: products.name,
        currentStock: products.currentStock,
        minStock: products.minStock,
        costPrice: products.buyPrice,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(sql`${products.currentStock} < ${products.minStock}`);

    return NextResponse.json({ success: true, count: lowStockItems.length, items: lowStockItems });
  } catch (error: any) {
    console.error('Low Stock API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
