import { NextResponse } from 'next/server';
import { db } from '@/db';
import { orders, expenses } from '@/db/schema';
import { sql, and, gte, lte, ne } from 'drizzle-orm';

export async function GET() {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Fetch daily revenue for last 7 days
    const revenueData = await db.select({
      date: sql<string>`date(${orders.createdAt})`,
      amount: sql<number>`sum(${orders.totalPrice})`
    })
    .from(orders)
    .where(and(
      gte(orders.createdAt, sevenDaysAgo),
      ne(orders.status, 'cancelled')
    ))
    .groupBy(sql`date(${orders.createdAt})`);

    // Fetch daily expenses for last 7 days
    const expenseData = await db.select({
      date: sql<string>`date(${expenses.date})`,
      amount: sql<number>`sum(${expenses.amount})`
    })
    .from(expenses)
    .where(gte(expenses.date, sevenDaysAgo))
    .groupBy(sql`date(${expenses.date})`);

    // Prepare 7-day labels
    const labels = [];
    const chartData = [];

    for (let i = 0; i < 7; i++) {
        const d = new Date(sevenDaysAgo);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        
        const rev = revenueData.find(r => r.date === dateStr)?.amount || 0;
        const exp = expenseData.find(e => e.date === dateStr)?.amount || 0;
        
        labels.push(d.toLocaleDateString('id-ID', { weekday: 'short' }));
        chartData.push({
            date: dateStr,
            label: d.toLocaleDateString('id-ID', { weekday: 'short' }),
            revenue: rev,
            expense: exp,
            profit: rev - exp
        });
    }

    return NextResponse.json({
      success: true,
      data: chartData
    });
  } catch (error: any) {
    console.error('API Dashboard Charts Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
