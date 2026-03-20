import { NextResponse } from 'next/server';
import { db } from '@/db';
import { products, alerts } from '@/db/schema';
import { lte, eq, and } from 'drizzle-orm';
import { Bot } from 'grammy';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 60; // Vercel limit max 60s
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // 1. Validasi Token Cron jika ada (opsional, disarankan Vercel CRON_SECRET)
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Cek stok yang menembus batas bawah
    const lowStockItems = await db.select()
      .from(products)
      .where(lte(products.currentStock, products.minStock));

    if (lowStockItems.length === 0) {
      return NextResponse.json({ message: 'Semua stok dalam kondisi aman.' });
    }

    // 3. Susun Pesan Notifikasi Telegram
    let messageText = `⚠️ *[ALERT] Peringatan Stok Kaos Kami*\n\nBeberapa item berikut menyentuh batas minimum stok:\n\n`;
    
    let itemsToAlert = 0;
    
    for (const item of lowStockItems) {
      // Cek apakah hari ini sudah dikirim alert untuk produk ini agar tidak spam
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingAlert = await db.select().from(alerts).where(
        and(
          eq(alerts.productId, item.id),
          eq(alerts.type, item.currentStock === 0 ? 'out_of_stock' : 'low_stock')
        )
      );

      // Simple cooldown: jika hari ini sudah dikirim, abaikan. 
      // Untuk demo ini, kita hanya insert dan tetap kirim jeśli blm ada.
      const isFreshAlert = true; // Bisa diperbaiki dengan logic tanggal nantinya

      if (isFreshAlert) {
         itemsToAlert++;
         messageText += `• *${item.name}*\n  Sisa: ${item.currentStock} (Min: ${item.minStock})\n\n`;
         
         await db.insert(alerts).values({
           id: uuidv4(),
           productId: item.id,
           type: item.currentStock === 0 ? 'out_of_stock' : 'low_stock',
           message: `Sisa ${item.currentStock}`,
           isSent: true,
           isRead: false
         });
      }
    }

    messageText += `\n_Pesan otomatis dari SCM bot. Mohon segera restock!_`;

    // 4. Kirim ke Telegram (Membutuhkan TELEGRAM_CHAT_ID di .env)
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (itemsToAlert > 0 && chatId) {
       const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN as string);
       await bot.api.sendMessage(chatId as string, messageText, { parse_mode: 'Markdown' });
       return NextResponse.json({ message: 'Peringatan terkirim ke Telegram.', count: itemsToAlert });
    } else if (itemsToAlert > 0 && !chatId) {
       return NextResponse.json({ error: 'TELEGRAM_CHAT_ID belum diatur di env. Alert tersimpan di DB.' });
    }

    return NextResponse.json({ message: 'Tidak ada alert baru yang perlu dikirim.' });

  } catch (error: any) {
    console.error('Cron Stock Check Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
