import { NextResponse } from 'next/server';
import { db } from '@/db';
import { products, orders, stockMovements, expenses, orderItems } from '@/db/schema';
import { sql, desc, eq, and, ne } from 'drizzle-orm';

export async function GET() {
  try {
    // 1. Basic Stock Stats
    const stats = await db.select({
      totalProducts: sql<number>`count(${products.id})`,
      totalStock: sql<number>`coalesce(sum(${products.currentStock}), 0)`,
      lowStockItems: sql<number>`count(case when ${products.currentStock} <= ${products.minStock} and not (${products.currentStock} = 0 and ${products.minStock} = 0) then 1 end)`,
      totalValue: sql<number>`coalesce(sum(${products.currentStock} * ${products.buyPrice}), 0)`
    }).from(products);

    // 2. Financial Stats (Gross Sales)
    const financialStats = await db.select({
      grossRevenue: sql<number>`coalesce(sum(${orders.totalPrice}), 0)`,
      orderCount: sql<number>`count(${orders.id})`
    }).from(orders).where(ne(orders.status, 'cancelled'));

    // 3. Expenses Stats
    const totalExpenses = await db.select({
      total: sql<number>`coalesce(sum(${expenses.amount}), 0)`
    }).from(expenses);

    // 4. HPP Estimation (COG) 
    // This is an approximation based on items sold * current buyPrice of product
    const hppStats = await db.select({
      totalHpp: sql<number>`coalesce(sum(${orderItems.quantity} * ${products.buyPrice}), 0)`
    })
    .from(orderItems)
    .leftJoin(orders, eq(orderItems.orderId, orders.id))
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(ne(orders.status, 'cancelled'));

    const pendingOrders = await db.select({
      count: sql<number>`count(${orders.id})`
    }).from(orders).where(eq(orders.status, 'pending'));

    const recentMovements = await db.select({
      id: stockMovements.id,
      type: stockMovements.type,
      quantity: stockMovements.quantity,
      reason: stockMovements.reason,
      createdBy: stockMovements.createdBy,
      createdAt: stockMovements.createdAt,
      productName: products.name
    })
    .from(stockMovements)
    .leftJoin(products, eq(stockMovements.productId, products.id))
    .orderBy(desc(stockMovements.createdAt))
    .limit(10);

    const lowStockList = await db.select({
      id: products.id,
      name: products.name,
      currentStock: products.currentStock,
      minStock: products.minStock
    }).from(products)
    .where(sql`${products.currentStock} <= ${products.minStock} and not (${products.currentStock} = 0 and ${products.minStock} = 0)`)
    .limit(8);

    const revenue = financialStats[0].grossRevenue || 0;
    const expense = totalExpenses[0].total || 0;
    const hpp = hppStats[0].totalHpp || 0;
    const netProfit = revenue - hpp - expense;

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          ...stats[0],
          revenue,
          expense,
          hpp,
          netProfit
        },
        pendingOrderCount: pendingOrders[0].count,
        recentMovements,
        lowStockList
      }
    });
  } catch (error: any) {
    console.error('API Dashboard Stats Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
