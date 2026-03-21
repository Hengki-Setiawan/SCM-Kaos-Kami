import { NextResponse } from 'next/server';
import { db } from '@/db';
import { stockMovements, products } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET() {
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
      .limit(100);

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error('ACTIVITY_API_ERROR', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch activity logs' }, { status: 500 });
  }
}
