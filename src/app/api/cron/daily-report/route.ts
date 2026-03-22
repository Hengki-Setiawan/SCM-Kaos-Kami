import { NextResponse } from 'next/server';
import { db } from '@/db';
import { products, stockMovements, telegramUsers } from '@/db/schema';
import { desc, eq, and, gte, lte } from 'drizzle-orm';

export const maxDuration = 60; // 1 minute max duration
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const allMoves = await db.select({
       type: stockMovements.type, quantity: stockMovements.quantity, createdAt: stockMovements.createdAt, productId: stockMovements.productId
    }).from(stockMovements)
      .where(and(gte(stockMovements.createdAt, todayStart.toISOString()), lte(stockMovements.createdAt, todayEnd.toISOString())));

    let totalSold = 0;
    let totalRestock = 0;
    for (const m of allMoves) {
        if (m.type === 'OUT' || m.type === 'ADJUSTMENT_OUT') totalSold += m.quantity;
        if (m.type === 'IN' || m.type === 'ADJUSTMENT_IN') totalRestock += m.quantity;
    }

    const allProds = await db.select().from(products);
    let lowStockCount = 0;
    for (const p of allProds) {
        if (p.currentStock <= p.minStock) lowStockCount++;
    }

    let reportMsg = `📊 *Auto-Report Harian SCM*\n\n`;
    reportMsg += `📅 Tanggal: ${todayStart.toLocaleDateString('id-ID')}\n\n`;
    reportMsg += `📤 Total Terjual Hari Ini: *${totalSold}* pcs\n`;
    reportMsg += `📥 Restock Hari Ini: *${totalRestock}* pcs\n`;
    reportMsg += `⚠️ Varian Stok Kritis: *${lowStockCount}* produk\n\n`;
    reportMsg += `_Ketik "prediksi stok" atau "tren penjualan" untuk analitik lebih lanjut._`;

    // Ambil daftar admin Telegram
    const admins = await db.select().from(telegramUsers).where(eq(telegramUsers.role, 'admin'));
    
    // Kirim pesan via Telegram Bot API
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (botToken) {
       for (const admin of admins) {
          try {
             const chatId = admin.telegramId;
             await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ chat_id: chatId, text: reportMsg, parse_mode: 'Markdown' })
             });
          } catch (e) { console.error('Gagal kirim report ke admin', admin.telegramId); }
       }
    }

    return NextResponse.json({ success: true, sentTo: admins.length, message: "Report daily cron executed" });
  } catch (error) {
    console.error('Daily Report Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
