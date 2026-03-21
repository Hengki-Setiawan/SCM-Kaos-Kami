import { NextResponse } from 'next/server';
import { db } from '@/db';
import { products, alerts, telegramUsers } from '@/db/schema';
import { lte, eq, and } from 'drizzle-orm';
import { Bot, InlineKeyboard } from 'grammy';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 60; // Vercel limit max 60s
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // 1. Validasi Token Cron jika ada (opsional, disarankan Vercel CRON_SECRET)
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    } else if (!process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'CRON_SECRET is missing in production.' }, { status: 401 });
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

    // 4. Kirim ke Telegram Admin (Semua yang role='admin' dan aktif)
    const admins = await db.select().from(telegramUsers).where(
      and(eq(telegramUsers.role, 'admin'), eq(telegramUsers.isActive, true))
    );

    const poUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/restock/po` : 'https://scm-kaos-kami.vercel.app/restock/po';
    const actionKeyboard = new InlineKeyboard()
      .url('📄 Buat Draft PO Sekarang', poUrl)
      .row()
      .text('📦 Cek Detail Stok', 'btn_stock');

    const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN as string);
    let sentCount = 0;

    if (itemsToAlert > 0) {
      if (admins.length > 0) {
        for (const admin of admins) {
          try {
            await bot.api.sendMessage(admin.telegramId, messageText, { parse_mode: 'Markdown', reply_markup: actionKeyboard });
            sentCount++;
          } catch (e) { console.error(`Failed to send to admin ${admin.telegramId}`); }
        }
        return NextResponse.json({ message: `Peringatan terkirim ke ${sentCount} admin Telegram.`, count: itemsToAlert });
      } else {
        // Fallback to TELEGRAM_CHAT_ID from env if no admins in DB
        const envChatId = process.env.TELEGRAM_CHAT_ID;
        if (envChatId) {
          await bot.api.sendMessage(envChatId, messageText, { parse_mode: 'Markdown', reply_markup: actionKeyboard });
          return NextResponse.json({ message: 'Peringatan terkirim ke Admin utama (ENV).', count: itemsToAlert });
        }
      }
    }

    // 5. DB Cleanup (E10): Hapus alert lama (> 30 hari) dan logs lama
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // cleanup alerts
    await db.delete(alerts).where(lte(alerts.createdAt, thirtyDaysAgo.toISOString()));
    // cleanup audit logs if exists (stock movements) - actually movement is important so keep it.
    // but alerts can be cleaned.

    return NextResponse.json({ 
      message: sentCount > 0 ? `Peringatan terkirim ke ${sentCount} admin.` : 'Check selesai, database dibersihkan.',
      count: itemsToAlert,
      cleanup: 'Alerts > 30 hari dihapus'
    });

  } catch (error: any) {
    console.error('Cron Stock Check Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
