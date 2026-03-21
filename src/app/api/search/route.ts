import { NextResponse } from 'next/server';
import { db } from '@/db';
import { products, orders } from '@/db/schema';
import { sql, or, like } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, data: { products: [], orders: [] } });
    }

    const query = `%${q.toLowerCase()}%`;

    const foundProducts = await db.select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      stock: products.currentStock
    })
    .from(products)
    .where(or(
      sql`lower(${products.name}) like ${query}`,
      sql`lower(${products.sku}) like ${query}`
    ))
    .limit(5);

    const foundOrders = await db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerName: orders.customerName,
      status: orders.status
    })
    .from(orders)
    .where(or(
      sql`lower(${orders.orderNumber}) like ${query}`,
      sql`lower(${orders.customerName}) like ${query}`
    ))
    .limit(5);

    return NextResponse.json({
      success: true,
      data: {
        products: foundProducts,
        orders: foundOrders
      }
    });
  } catch (error: any) {
    console.error('Search API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
