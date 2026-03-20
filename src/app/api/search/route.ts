import { NextResponse } from 'next/server';
import { db } from '@/db';
import { products, orders, categories } from '@/db/schema';
import { sql } from 'drizzle-orm';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    const query = `%${q.toLowerCase()}%`;

    // Search Products
    const productResults = await db.select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      currentStock: products.currentStock
    }).from(products)
      .where(sql`lower(${products.name}) like ${query} or lower(${products.sku}) like ${query}`)
      .limit(10);

    // Search Orders
    const orderResults = await db.select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerName: orders.customerName,
      status: orders.status
    }).from(orders)
      .where(sql`lower(${orders.customerName}) like ${query} or lower(${orders.orderNumber}) like ${query}`)
      .limit(5);

    // Search Categories 
    const categoryResults = await db.select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      icon: categories.icon
    }).from(categories)
      .where(sql`lower(${categories.name}) like ${query}`)
      .limit(5);

    return NextResponse.json({
      results: {
        products: productResults,
        orders: orderResults,
        categories: categoryResults
      }
    });

  } catch (error: any) {
    console.error('Search API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
