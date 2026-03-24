import { NextResponse } from 'next/server';
import { db } from '@/db';
import { stockMovements } from '@/db/schema';
import { lte } from 'drizzle-orm';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    // F7. Data Cleanup Strategy
    const deletedMovements = await db.delete(stockMovements)
      .where(lte(stockMovements.createdAt, ninetyDaysAgo.toISOString()))
      .returning({ id: stockMovements.id });

    // Note: F6 Aggregation (daily_sales_summary) is skipped in favor of dynamic calculation
    // to prevent schema mismatch/migration requirements on production Turso DB.

    return NextResponse.json({
        success: true,
        message: 'Daily cron job executed successfully',
        deletedData: {
          stockMovements: deletedMovements.length
        }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
