import { NextResponse } from 'next/server';
import { db } from '@/db';
import { stockMovements } from '@/db/schema';
import { lt } from 'drizzle-orm';

export async function GET(req: Request) {
  // Hanya disimulasi sebagai cron job / webhook
  // Bisa diamankan dengan secret token di production
  try {
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    } else if (!process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'CRON_SECRET is missing in production.' }, { status: 401 });
    }

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const deletedRows = await db.delete(stockMovements)
      .where(lt(stockMovements.createdAt, ninetyDaysAgo.toISOString()));

    return NextResponse.json({
      success: true,
      message: `Berhasil membersihkan log pergerakan stok lebih lama dari 90 hari.`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('CRON_CLEANUP_ERROR', error);
    return NextResponse.json({ success: false, error: 'Gagal menjalankan cleanup database' }, { status: 500 });
  }
}
