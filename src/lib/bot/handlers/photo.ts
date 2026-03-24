import { InlineKeyboard } from 'grammy';
import { db } from '@/db';
import { products } from '@/db/schema';
import { Groq } from 'groq-sdk';
import { followUpGeneral } from '@/lib/bot/keyboards';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function handlePhotoMsg(ctx: any) {
  const session = ctx.session;
  const caption = ctx.message.caption || '';

  try {
    await ctx.reply('🔍 *Sedang menganalisis gambar...*', { parse_mode: 'Markdown' });

    const photos = ctx.message.photo;
    const bestPhoto = photos[photos.length - 1];
    const file = await ctx.api.getFile(bestPhoto.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    const imgResponse = await fetch(fileUrl);
    const imgBuffer = await imgResponse.arrayBuffer();
    const base64Image = Buffer.from(imgBuffer).toString('base64');
    const mimeType = file.file_path?.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    const visionPrompt = `Anda adalah AI Vision untuk sistem SCM Kaos Kami. Analisis gambar ini dan tentukan TIPE gambar:

1. **PRODUK** — Jika gambar menunjukkan kaos/produk pakaian → Identifikasi detail lengkap (warna, ukuran tulisan, corak baju).
2. **RESI/NOTA** — Jika gambar menunjukkan struk/resi/nota pengiriman → Ekstrak: customerName, trackingNumber, platform, items.
3. **SCREENSHOT_CHAT** — Jika gambar berupa screenshot percakapan customer → Ekstrak: customerName, platform, items yang dipesan, qty, alamat.
4. **NOTA_PENGELUARAN** — Jika gambar menunjukkan bon/struk belanja bahan → Ekstrak: title, amount, items, vendor.
5. **LAINNYA** — Jika tidak sesuai kategori di atas.

${caption ? `Keterangan user: "${caption}"` : ''}

Return JSON format:
{
  "type": "PRODUK|RESI|SCREENSHOT_CHAT|NOTA_PENGELUARAN|LAINNYA",
  "summary": "Ringkasan singkat apa yang terlihat",
  "extractedData": { ... data relevan ... },
  "suggestedAction": "Saran aksi yang bisa diambil"
}`;

    const completion = await groq.chat.completions.create({
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: visionPrompt },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      }],
      model: 'llama-3.2-11b-vision-preview',
      temperature: 0.2,
      max_tokens: 2048,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');

    let response = '';
    const keyboard = new InlineKeyboard();

    if (result.type === 'PRODUK') {
      response = `📸 *Identifikasi Produk*\n\n${result.summary}\n\n`;
      if (result.extractedData?.productCharacteristics) {
        response += `🔍 Detail: *${result.extractedData.productCharacteristics}*\n`;
      }
      if (result.suggestedAction) response += `\n💡 _${result.suggestedAction}_`;
      keyboard.text('📦 Cek Stok', 'btn_stock').text('🏠 Menu', 'btn_mainmenu');

    } else if (result.type === 'RESI') {
      const d = result.extractedData || {};
      response = `📋 *Data Resi Terdeteksi*\n\n`;
      if (d.customerName) response += `👤 Pelanggan: *${d.customerName}*\n`;
      if (d.trackingNumber) response += `📦 No Resi: \`${d.trackingNumber}\`\n`;
      if (d.platform) response += `🏪 Platform: ${d.platform}\n`;
      response += `\n💡 _${result.suggestedAction || 'Gunakan data ini untuk membuat pesanan baru.'}_`;
      keyboard.text('📋 Buat Pesanan', 'btn_orders').text('🏠 Menu', 'btn_mainmenu');

    } else if (result.type === 'SCREENSHOT_CHAT') {
      const d = result.extractedData || {};
      response = `💬 *Data Chat Customer Terdeteksi*\n\n`;
      if (d.customerName) response += `👤 Pelanggan: *${d.customerName}*\n`;
      if (d.platform) response += `🏪 Platform: ${d.platform}\n`;
      if (d.items) response += `📦 Produk: ${Array.isArray(d.items) ? d.items.join(', ') : d.items}\n`;
      if (d.qty) response += `🔢 Qty: ${d.qty}\n`;
      response += `\n💡 _${result.suggestedAction || 'Anda bisa langsung buat pesanan dari data ini.'}_`;
      keyboard.text('📋 Buat Pesanan', 'btn_orders').text('🏠 Menu', 'btn_mainmenu');

    } else if (result.type === 'NOTA_PENGELUARAN') {
      const d = result.extractedData || {};
      response = `💸 *Nota Pengeluaran Terdeteksi*\n\n`;
      if (d.title) response += `📝 Deskripsi: *${d.title}*\n`;
      if (d.amount) response += `💰 Total: *Rp ${new Intl.NumberFormat('id-ID').format(d.amount)}*\n`;
      if (d.vendor) response += `🏪 Vendor: ${d.vendor}\n`;
      if (d.items) response += `📦 Items: ${Array.isArray(d.items) ? d.items.join(', ') : d.items}\n`;
      response += `\n💡 _${result.suggestedAction || 'Mau saya catat sebagai pengeluaran?'}_`;

      if (d.amount && d.title) {
        session.pendingAction = { action: 'LOG_EXPENSE', title: d.title, category: 'operasional', qty: d.amount };
        keyboard.text('✅ Catat Pengeluaran', 'confirm_action').text('❌ Batal', 'cancel_action');
      } else {
        keyboard.text('💸 Catat Manual', 'btn_expense').text('🏠 Menu', 'btn_mainmenu');
      }

    } else {
      response = `🖼️ *Hasil Analisis Gambar*\n\n${result.summary || 'Gambar diterima tapi tidak dapat diproses lebih lanjut.'}`;
      if (result.suggestedAction) response += `\n\n💡 _${result.suggestedAction}_`;
      keyboard.text('🏠 Menu', 'btn_mainmenu');
    }

    await ctx.reply(response, { parse_mode: 'Markdown', reply_markup: keyboard });

  } catch (error: any) {
    console.error('Vision Bot Error:', error);
    await ctx.reply('❌ Gagal menganalisis gambar. Pastikan gambar jelas dan coba lagi.', { reply_markup: followUpGeneral });
  }
}
