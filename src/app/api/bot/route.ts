import { Bot, webhookCallback } from 'grammy';
import { db } from '@/db';
import { products, orders } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { Groq } from 'groq-sdk';
import { parseAndExecuteAIAction } from '@/lib/ai-actions';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN as string);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Middleware security
bot.use(async (ctx, next) => {
  const username = ctx.from?.username;
  if (username !== process.env.TELEGRAM_USERNAME?.replace('@', '')) {
    await ctx.reply('Akses ditolak. Bot ini hanya untuk admin Kaos Kami.');
    return;
  }
  await next();
});

bot.command('start', (ctx) => ctx.reply('Halo Hengki! Bot SCM Kaos Kami siap. Ketik pesan perintah, atau kirim foto resi untuk diekstrak AI.'));

// 1. Text Messages (AI Actions & Chat)
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text;
  
  try {
    // Cek apakah pesan ini adalah Command mutasi DB
    const actionResult = await parseAndExecuteAIAction(text, 'telegram');
    
    if (actionResult !== null) {
      // Jika AI mendeteksi command (DEDUCT, UPDATE, dsb), dia akan langsung return konfirmasi eksekusi
      await ctx.reply(actionResult, { parse_mode: 'Markdown' });
      return;
    }

    // Jika bukan Command Mutasi, ini adalah chat Info/Analisa. Gunakan Groq LLM standar.
    const allProducts = await db.select({ name: products.name, sku: products.sku, stock: products.currentStock }).from(products).limit(50);
    const recentOrders = await db.select({ orderNum: orders.orderNumber, status: orders.status }).from(orders).limit(5).orderBy(desc(orders.createdAt));

    const systemPrompt = `
      Anda adalah "Kaos Kami Assistant" di Telegram.
      Bantu Hengki mengelola stok gudang, menganalisis data, dan memproses urusan bisnis.
      Gunakan bahasa Indonesia yang santai, ringkas, dan profesional.
      
      DATA STOK SAAT INI: ${JSON.stringify(allProducts)}
      PESANAN TERAKHIR: ${JSON.stringify(recentOrders)}
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.5,
      max_tokens: 500,
    });

    await ctx.reply(chatCompletion.choices[0]?.message?.content || 'Maaf, saya kurang paham.');

  } catch (error: any) {
    console.error('Bot Text Error:', error);
    await ctx.reply('Terjadi kesalahan saat memproses pesan teks.');
  }
});

// 2. Photo Messages (Vision OCR)
bot.on('message:photo', async (ctx) => {
  try {
    await ctx.reply('📸 Foto diterima! Sedang dianalisis oleh AI Vision...');
    
    // Get highest resolution photo URL
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const file = await ctx.api.getFile(fileId);
    const imageUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    
    const systemPrompt = `
      Tugas Anda: Analisis gambar resi pengiriman yang diberikan.
      Format response harus valid JSON:
      {
        "customerName": "Nama pembeli",
        "trackingNumber": "Nomor Resi / Pelacakan",
        "platform": "Shopee/Tokopedia/Tiktok/dll"
      }
      Jika bukan gambar resi, kembalikan JSON kosong {}.
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: systemPrompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      model: "llama-3.2-11b-vision-preview",
      temperature: 0,
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(chatCompletion.choices[0]?.message?.content || '{}');
    
    if (parsed.trackingNumber) {
       await ctx.reply(
         `✅ *Data Resi Terbaca!*\n\n` +
         `👤 Pembeli: ${parsed.customerName || '-'}\n` +
         `📦 No Resi: ${parsed.trackingNumber}\n` +
         `🌐 Platform: ${parsed.platform || '-'}\n\n` +
         `(Gunakan web dashboard untuk melampirkan resi ini ke order tertentu)`,
         { parse_mode: 'Markdown' }
       );
    } else {
       await ctx.reply('Gambar tidak terdeteksi sebagai resi pengiriman yang valid.');
    }

  } catch (error) {
    console.error('Bot Vision Error:', error);
    await ctx.reply('Maaf, AI Vision gagal menganalisis gambar ini.');
  }
});

export const POST = webhookCallback(bot, 'std/http');
export const GET = async () => new Response('Telegram webhook is running', { status: 200 });
