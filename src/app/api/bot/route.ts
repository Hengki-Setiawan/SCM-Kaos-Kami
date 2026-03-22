import { Bot, webhookCallback, InlineKeyboard, Keyboard, InputFile } from 'grammy';
import { db } from '@/db';
import { products, orders, stockMovements, categories, telegramUsers, expenses, suppliers, orderItems } from '@/db/schema';
import { desc, eq, sql, lte, gte, and } from 'drizzle-orm';
import { Groq } from 'groq-sdk';
import { v4 as uuidv4 } from 'uuid';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN as string);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ==================== TIME-BASED GREETING ====================
function getGreeting(): string {
  const hour = parseInt(new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar', hour: 'numeric', hour12: false }));
  if (hour >= 4 && hour < 11) return '🌅 Selamat pagi, Bos!';
  if (hour >= 11 && hour < 15) return '☀️ Selamat siang, Bos!';
  if (hour >= 15 && hour < 18) return '🌤️ Selamat sore, Bos!';
  return '🌙 Selamat malam, Bos!';
}

// Follow-up keyboard for common actions
const followUpStock = new InlineKeyboard()
  .text('📦 Semua Stok', 'cat_all').text('⚠️ Low Stock', 'btn_lowstock').row()
  .text('📄 Buat PO', 'btn_po_link').text('🏠 Menu', 'btn_mainmenu');

const followUpOrder = new InlineKeyboard()
  .text('📋 Pesanan', 'btn_orders').text('📦 Cek Stok', 'btn_stock').row()
  .text('↩️ Undo', 'btn_undo').text('🏠 Menu', 'btn_mainmenu');

const followUpGeneral = new InlineKeyboard()
  .text('📦 Stok', 'btn_stock').text('📋 Pesanan', 'btn_orders').row()
  .text('📈 Laporan', 'btn_report').text('🏠 Menu', 'btn_mainmenu');

// ==================== SESSION STATE ====================
const sessions = new Map<number, { 
  pendingAction?: any; 
  lastCategory?: string; 
  lastQuery?: string;
  contextMessages: {role: 'user' | 'assistant' | 'system', content: string}[];
}>();

function getSession(chatId: number) {
  if (!sessions.has(chatId)) sessions.set(chatId, { contextMessages: [] });
  return sessions.get(chatId)!;
}

// ==================== MAIN KEYBOARD (Persistent Buttons) ====================
const mainMenu = new Keyboard()
  .text('📦 Cek Stok').text('⚠️ Low Stock').row()
  .text('📋 Pesanan').text('📈 Laporan').row()
  .text('💸 Catat Biaya').text('🤖 Tanya AI').row()
  .text('⚙️ Menu Lain').row()
  .resized().persistent();

const menuLain = new Keyboard()
  .text('🧮 Kalkulator').text('📜 Riwayat').row()
  .text('📸 Scan Resi').text('🔍 Cari Produk').row()
  .webApp('🌐 Buka Dashboard', process.env.NEXT_PUBLIC_APP_URL || 'https://scm-kaos-kami.vercel.app').row()
  .text('🏠 Menu Utama').row()
  .resized().persistent();

// ==================== SECURITY MIDDLEWARE (ROLE MANAGEMENT) ====================
bot.use(async (ctx, next) => {
  if (ctx.from) {
    const tId = ctx.from.id.toString();
    const username = ctx.from.username || '';
    const isSuperAdmin = username === process.env.TELEGRAM_USERNAME?.replace('@', '');
    
    const userDb = await db.select().from(telegramUsers).where(eq(telegramUsers.telegramId, tId));
    const isRegistered = userDb.length > 0 && userDb[0].isActive;

    if (!isSuperAdmin && !isRegistered) {
      if (ctx.message) await ctx.reply(`🚫 Akses ditolak. ID Telegram Anda: \`${tId}\``, { parse_mode: 'Markdown' });
      return;
    }

    (ctx as any).session = (ctx as any).session || {};
    (ctx as any).session.role = isSuperAdmin ? 'admin' : userDb[0].role;
  }
  await next();
});

// ==================== CONTEXTUAL MENU DELETION (GLOBAL) ====================
bot.on('callback_query', async (ctx, next) => {
  const data = ctx.callbackQuery.data;
  const keepKeys = ['confirm_action', 'cancel_action'];
  
  if (data && !keepKeys.includes(data) && !data.startsWith('undo_') && !data.startsWith('cat_')) {
    try {
      await ctx.editMessageReplyMarkup(undefined);
    } catch (e) { /* ignore */ }
  }
  await next();
});

// ==================== /start ====================
bot.command('start', async (ctx) => {
  const greeting = getGreeting();
  await ctx.reply(
    `🧵 *${greeting}*\n\n` +
    `Selamat datang di *Kaos Kami SCM* — asisten gudang AI pribadi Anda 🤖\n\n` +
    `─────────────────────────\n` +
    `🎯 *Yang bisa saya lakukan:*\n\n` +
    `📦 Cek stok real-time\n` +
    `📋 Kelola pesanan \u0026 pengiriman\n` +
    `📸 Scan resi otomatis (kirim foto)\n` +
    `💸 Catat pengeluaran (ketik: "Beli lakban 50rb")\n` +
    `🎙️ Voice command (kirim voice note)\n` +
    `📈 Laba Rugi \u0026 analisis bisnis\n` +
    `🧮 Kalkulator harga AI\n\n` +
    `─────────────────────────\n` +
    `💡 *Coba ketik:* _"Stok kaos hitam L"_\n` +
    `📸 *Atau kirim foto resi!*`,
    { parse_mode: 'Markdown', reply_markup: mainMenu }
  );
});

// ==================== /chart & /export ====================
bot.command('chart', async (ctx) => {
  ctx.message = { text: '📈 Laporan' } as any;
  await bot.handleUpdate(ctx.update);
});

bot.command('export', async (ctx) => {
  if ((ctx as any).session?.role !== 'admin') {
    return ctx.reply('🚫 Fitur Export hanya dapat diakses oleh Admin.');
  }
  const msg = await ctx.reply('⏳ Menyiapkan dokumen ekspor...');
  try {
    const all = await db.select().from(products);
    let csv = 'SKU,Nama,Kategori,Harga Beli,Harga Jual,Stok Saat Ini,Min Stok\n';
    all.forEach(p => { csv += `"${p.sku}","${p.name}","${p.categoryId}",${p.buyPrice || 0},${p.unitPrice || 0},${p.currentStock},${p.minStock}\n`; });
    
    const buffer = Buffer.from(csv, 'utf-8');
    const d = new Date().toISOString().split('T')[0];
    await ctx.replyWithDocument(new InputFile(buffer, `Laporan_Stok_SCM_${d}.csv`));
    await ctx.api.deleteMessage(ctx.chat.id, msg.message_id);
  } catch (e) {
    await ctx.api.editMessageText(ctx.chat.id, msg.message_id, '❌ Gagal menggenerate dokumen CSV.');
  }
});

// ==================== 📦 CEK STOK ====================
bot.hears('📦 Cek Stok', async (ctx) => {
  try {
    const cats = await db.select().from(categories);
    const keyboard = new InlineKeyboard();
    
    cats.forEach((cat, i) => {
      keyboard.text(`${cat.icon || '📁'} ${cat.name}`, `cat_${cat.id}`);
      if (i % 2 === 1) keyboard.row();
    });
    keyboard.row().text('📊 Ringkasan Semua', 'cat_all');

    await ctx.reply('📦 *Pilih kategori stok:*', { 
      parse_mode: 'Markdown', 
      reply_markup: keyboard 
    });
  } catch (e) {
    await ctx.reply('❌ *Server sedang sibuk.* Coba lagi dalam beberapa detik.', {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('🔄 Coba Lagi', 'btn_stock').text('🏠 Menu', 'btn_mainmenu')
    });
  }
});

// Callback: Category selected
bot.callbackQuery(/^cat_(.+)$/, async (ctx) => {
  const catId = ctx.match![1];
  await ctx.answerCallbackQuery();
  
  try {
    let items;
    let title: string;
    
    if (catId === 'all') {
      items = await db.select({
        name: products.name,
        stock: products.currentStock,
        min: products.minStock
      }).from(products).limit(15);
      title = '📊 Ringkasan Semua Stok';
    } else {
      items = await db.select({
        name: products.name,
        stock: products.currentStock,
        min: products.minStock
      }).from(products).where(eq(products.categoryId, catId)).limit(20);
      
      const catData = await db.select().from(categories).where(eq(categories.id, catId));
      title = `${catData[0]?.icon || '📦'} Stok ${catData[0]?.name || ''}`;
    }

    if (items.length === 0) {
      await ctx.editMessageText('📭 Tidak ada produk di kategori ini.');
      return;
    }

    let msg = `*${title}*\n\n`;
    items.forEach(p => {
      const status = p.stock === 0 ? '🔴' : p.stock <= p.min ? '⚠️' : '✅';
      msg += `${status} ${p.name}: *${p.stock}* pcs\n`;
    });

    const totalStock = items.reduce((a, b) => a + b.stock, 0);
    msg += `\n─────────────────────────\n📊 Total: *${totalStock}* pcs dari ${items.length} varian`;

    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: followUpStock });
  } catch (e) {
    await ctx.editMessageText('❌ *Gagal memuat data stok.* Coba pilih kategori lagi.', { parse_mode: 'Markdown' });
  }
});

// ==================== ⚠️ LOW STOCK ====================
bot.hears('⚠️ Low Stock', async (ctx) => {
  try {
    const lowItems = await db.select({
      name: products.name,
      stock: products.currentStock,
      min: products.minStock
    }).from(products)
      .where(lte(products.currentStock, products.minStock))
      .limit(15);

    if (lowItems.length === 0) {
      await ctx.reply('✅ Semua stok dalam kondisi aman! Tidak ada yang menipis.');
      return;
    }

    let msg = `⚠️ *${lowItems.length} Produk Stok Menipis/Habis:*\n\n`;
    lowItems.forEach(p => {
      const icon = p.stock === 0 ? '🔴 HABIS' : '⚠️ RENDAH';
      msg += `${icon} | ${p.name}\n   Sisa: *${p.stock}* / Min: ${p.min}\n\n`;
    });

    const lowFollowUp = new InlineKeyboard()
      .text('📄 Generate PO', 'btn_po_link').text('📊 Laporan', 'btn_report').row()
      .text('🏠 Menu', 'btn_mainmenu');

    await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: lowFollowUp });
  } catch (e) {
    await ctx.reply('❌ *Gagal memuat data.* Coba lagi sebentar.', {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('🔄 Coba Lagi', 'btn_lowstock')
    });
  }
});

// ==================== 📋 PESANAN ====================
bot.hears('📋 Pesanan', async (ctx) => {
  try {
    const recentOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(5);
    
    if (recentOrders.length === 0) {
      await ctx.reply('📭 Belum ada pesanan.');
      return;
    }

    const statusIcon: Record<string, string> = {
      pending: '🟡', processing: '🔵', shipped: '📦', completed: '✅', cancelled: '❌'
    };

    let msg = `📋 *5 Pesanan Terakhir:*\n\n`;
    recentOrders.forEach(o => {
      msg += `${statusIcon[o.status] || '⚪'} #${o.orderNumber}\n`;
      msg += `   ${o.customerName} (${o.platform})\n`;
      msg += `   Status: *${o.status}*\n\n`;
    });

    const orderFollowUp = new InlineKeyboard()
      .text('📦 Cek Stok', 'btn_stock').text('📈 Laporan', 'btn_report').row()
      .text('🏠 Menu', 'btn_mainmenu');

    await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: orderFollowUp });
  } catch (e) {
    await ctx.reply('❌ *Server sibuk.* Coba lagi dalam beberapa detik.', {
      parse_mode: 'Markdown',
      reply_markup: new InlineKeyboard().text('🔄 Coba Lagi', 'btn_orders')
    });
  }
});

// ==================== 📈 LAPORAN ====================
bot.hears('📈 Laporan', async (ctx) => {
  if ((ctx as any).session?.role !== 'admin') {
    return ctx.reply('🚫 Fitur Laporan hanya dapat diakses oleh Admin.');
  }

  try {
    const stats = await db.select({
      total: sql<number>`count(${products.id})`,
      totalStock: sql<number>`coalesce(sum(${products.currentStock}), 0)`,
      lowCount: sql<number>`count(case when ${products.currentStock} <= ${products.minStock} then 1 end)`,
      assetValue: sql<number>`coalesce(sum(${products.currentStock} * ${products.buyPrice}), 0)`
    }).from(products);

    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    const startOfMonth = firstOfMonth.toISOString().split('T')[0];

    const financialStats = await db.select({
      revenue: sql<number>`coalesce(sum(${orders.totalPrice}), 0)`,
      orderCount: sql<number>`count(${orders.id})`
    }).from(orders).where(and(gte(orders.createdAt, startOfMonth), sql`${orders.status} != 'cancelled'`));

    const expenseStats = await db.select({
      total: sql<number>`coalesce(sum(${expenses.amount}), 0)`
    }).from(expenses).where(gte(expenses.date, startOfMonth));

    const rev = financialStats[0].revenue;
    const exp = expenseStats[0].total;
    const profit = rev - exp;

    const s = stats[0];
    const now = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    const msg = `📈 *Ringkasan SCM — ${now}*\n\n` +
      `*DATA STOK:*\n` +
      `📦 Varian: *${s.total}* | Item: *${s.totalStock}*\n` +
      `💰 Aset Gudang: *Rp ${new Intl.NumberFormat('id-ID').format(s.assetValue)}*\n` +
      `⚠️ Low Stock: *${s.lowCount}*\n\n` +
      `*FINANSIAL (Bulan Ini):*\n` +
      `💰 Penjualan: *Rp ${new Intl.NumberFormat('id-ID').format(rev)}*\n` +
      `💸 Pengeluaran: *Rp ${new Intl.NumberFormat('id-ID').format(exp)}*\n` +
      `✨ Laba Bersih: *Rp ${new Intl.NumberFormat('id-ID').format(profit)}*\n` +
      `─────────────────────────\n` +
      `🛍️ Total ${financialStats[0].orderCount} pesanan sukses bulan ini.\n`;

    const keyboard = new InlineKeyboard()
      .text('⚠️ Lihat Low Stock', 'btn_lowstock')
      .text('📋 Lihat Pesanan', 'btn_orders').row()
      .text('📄 Download CSV', 'btn_csv');

    // Generate QuickChart URL
    const chartUrl = `https://quickchart.io/chart?c={type:'doughnut',data:{labels:['Aman','Low Stock'],datasets:[{data:[${s.total - s.lowCount},${s.lowCount}],backgroundColor:['%2310b981','%23ef4444']}]}}`;

    await ctx.replyWithPhoto(chartUrl, { caption: msg, parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (e) {
    await ctx.reply('❌ Gagal membuat laporan.');
  }
});

// ==================== SHORTCUT CALLBACK HANDLERS ====================
bot.callbackQuery('btn_mainmenu', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply('🏠 *Menu Utama*', { parse_mode: 'Markdown', reply_markup: mainMenu });
});

bot.callbackQuery('btn_stock', async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.message = { text: '📦 Cek Stok' } as any; 
  await bot.handleUpdate(ctx.update);
});

bot.callbackQuery('btn_report', async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.message = { text: '📈 Laporan' } as any;
  await bot.handleUpdate(ctx.update);
});

bot.callbackQuery('btn_po_link', async (ctx) => {
  await ctx.answerCallbackQuery();
  const poUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/restock/po` : 'https://scm-kaos-kami.vercel.app/restock/po';
  await ctx.reply(`📄 Silakan buka tautan berikut untuk membuat PO Otomatis:\n\n🔗 [Buka Surat PO](${poUrl})\n\n*(Web App akan terbuka)*`, { parse_mode: 'Markdown', reply_markup: mainMenu });
});

bot.callbackQuery('btn_lowstock', async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.message = { text: '⚠️ Low Stock' } as any;
  await bot.handleUpdate(ctx.update);
});

bot.callbackQuery('btn_orders', async (ctx) => {
  await ctx.answerCallbackQuery();
  ctx.message = { text: '📋 Pesanan' } as any;
  await bot.handleUpdate(ctx.update);
});

bot.callbackQuery('btn_csv', async (ctx) => {
  if ((ctx as any).session?.role !== 'admin') return ctx.answerCallbackQuery('🚫 Akses ditolak');
  
  await ctx.answerCallbackQuery('Membuat CSV...');
  try {
    const all = await db.select().from(products);
    let csv = 'SKU,Nama,Kategori,Harga Beli,Harga Jual,Stok Saat Ini,Min Stok\n';
    all.forEach(p => { csv += `"${p.sku}","${p.name}","${p.categoryId}",${p.buyPrice || 0},${p.unitPrice || 0},${p.currentStock},${p.minStock}\n`; });
    
    const buffer = Buffer.from(csv, 'utf-8');
    const d = new Date().toISOString().split('T')[0];
    await ctx.replyWithDocument(new InputFile(buffer, `Laporan_Stok_${d}.csv`));
  } catch (e) {
    await ctx.reply('❌ Gagal menggenerate CSV.');
  }
});

// ==================== ⚙️ MENU LAIN ====================
bot.hears('💸 Catat Biaya', async (ctx) => {
  await ctx.reply('💸 *Cara mencatat biaya via chat:*\n\nKetik langsung seperti:\n• _"Beli lakban 50rb"_\n• _"Bayar gaji staff 2jt"_\n• _"Bayar listrik 500ribu"_\n\nSaya akan mendeteksi nominal dan kategorinya otomatis!', { parse_mode: 'Markdown' });
});

bot.hears('⚙️ Menu Lain', async (ctx) => {
  await ctx.reply('⚙️ Menu tambahan:', { reply_markup: menuLain });
});

bot.hears('🏠 Menu Utama', async (ctx) => {
  await ctx.reply('🏠 Kembali ke menu utama.', { reply_markup: mainMenu });
});

// ==================== 📜 RIWAYAT ====================
bot.hears('📜 Riwayat', async (ctx) => {
  try {
    const moves = await db.select({
      type: stockMovements.type,
      qty: stockMovements.quantity,
      reason: stockMovements.reason,
      pName: products.name,
      at: stockMovements.createdAt
    }).from(stockMovements)
      .leftJoin(products, eq(stockMovements.productId, products.id))
      .orderBy(desc(stockMovements.createdAt)).limit(8);

    if (moves.length === 0) { await ctx.reply('📜 Belum ada riwayat.'); return; }

    let msg = `📜 *8 Aktivitas Terakhir:*\n\n`;
    moves.forEach(m => {
      const icon = (m.type === 'IN' || m.type === 'ADJUSTMENT_IN') ? '📥' : '📤';
      const sign = (m.type === 'IN' || m.type === 'ADJUSTMENT_IN') ? '+' : '-';
      msg += `${icon} ${m.pName}: *${sign}${m.qty}*\n   _${m.reason}_\n\n`;
    });

    await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: menuLain });
  } catch (e) {
    await ctx.reply('❌ Gagal memuat riwayat.');
  }
});

// ==================== 🔍 CARI PRODUK ====================
bot.hears('🔍 Cari Produk', async (ctx) => {
  const session = getSession(ctx.chat.id);
  session.lastQuery = 'SEARCH_MODE';
  await ctx.reply('🔍 Ketik nama atau SKU produk yang ingin dicari:', { reply_markup: { force_reply: true } });
});

// ==================== 📸 PHOTO HANDLER — VISION AI ====================
bot.hears('📸 Scan Resi', async (ctx) => {
  await ctx.reply('📸 Kirim foto produk, nota belanja, atau resi pengiriman, saya akan membacanya dengan AI Vision!');
});

bot.on('message:photo', async (ctx) => {
  const session = getSession(ctx.chat.id);
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

    const allProds = await db.select({ sku: products.sku, name: products.name, unitPrice: products.unitPrice }).from(products);
    const catalogStr = allProds.map(p => `[SKU: ${p.sku}] ${p.name} Rp${p.unitPrice}`).join('\n');

    const visionPrompt = `Anda adalah AI Vision untuk sistem SCM Kaos Kami. Analisis gambar ini dan tentukan TIPE gambar:

1. **PRODUK** — Jika gambar menunjukkan kaos/produk pakaian → Identifikasi warna, ukuran, jenis. Cocokkan dengan katalog.
2. **RESI/NOTA** — Jika gambar menunjukkan struk/resi/nota pengiriman → Ekstrak: customerName, trackingNumber, platform, items.
3. **SCREENSHOT_CHAT** — Jika gambar berupa screenshot percakapan customer → Ekstrak: customerName, platform, items yang dipesan, qty, alamat.
4. **NOTA_PENGELUARAN** — Jika gambar menunjukkan bon/struk belanja bahan → Ekstrak: title, amount, items, vendor.
5. **LAINNYA** — Jika tidak sesuai kategori di atas.

KATALOG PRODUK KAMI:
${catalogStr}

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
      if (result.extractedData?.matchedProduct) {
        response += `✅ Cocok dengan: *${result.extractedData.matchedProduct}*\n`;
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
});

// ==================== 🎙️ VOICE COMMAND (Whisper) ====================
bot.on('message:voice', async (ctx) => {
  try {
    await ctx.reply('🎙️ *Sedang mendengarkan pesan suara...*', { parse_mode: 'Markdown' });

    const file = await ctx.api.getFile(ctx.message.voice.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    
    const voiceResponse = await fetch(fileUrl);
    const voiceBuffer = await voiceResponse.arrayBuffer();

    const audioFile = new File([voiceBuffer], 'voice.ogg', { type: 'audio/ogg' });
    
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3-turbo',
      language: 'id',
      response_format: 'json',
    });

    const transcript = (transcription as any).text || '';

    if (!transcript || transcript.trim().length === 0) {
      await ctx.reply('❌ Tidak dapat mengenali suara.', { reply_markup: followUpGeneral });
      return;
    }

    await ctx.reply(`🎙️ *Transkrip:*\n_"${transcript.trim()}"_\n\n⏳ Sedang memproses perintah...`, { parse_mode: 'Markdown' });

    const session = getSession(ctx.chat.id);
    session.contextMessages.push({ role: 'user', content: `[VOICE] ${transcript.trim()}` });
    if (session.contextMessages.length > 10) session.contextMessages = session.contextMessages.slice(-10);

    const actionIntent = await parseAIIntent(transcript.trim(), session.contextMessages);

    const NON_PRODUCT_ACTIONS = ['CREATE_CATEGORY', 'DELETE_CATEGORY', 'CREATE_SUPPLIER', 'DELETE_SUPPLIER', 'CREATE_ORDER', 'DELETE_ORDER', 'UPDATE_ORDER_STATUS'];

    if (actionIntent && actionIntent.action === 'LOG_EXPENSE') {
      session.pendingAction = actionIntent;
      const confirmKeyboard = new InlineKeyboard()
        .text('✅ Ya, Catat', 'confirm_action')
        .text('❌ Batalkan', 'cancel_action');
      await ctx.reply(`💸 *Catat Pengeluaran dari Suara*\n\n📝 ${actionIntent.title}\n💰 Rp ${new Intl.NumberFormat('id-ID').format(actionIntent.qty || 0)}\n📂 ${actionIntent.category || 'operasional'}\n\nLanjutkan?`, { parse_mode: 'Markdown', reply_markup: confirmKeyboard });
      return;
    }

    if (actionIntent && NON_PRODUCT_ACTIONS.includes(actionIntent.action)) {
      session.pendingAction = actionIntent;
      const confirmKeyboard = new InlineKeyboard()
        .text('✅ Ya, Lanjutkan', 'confirm_action')
        .text('❌ Batalkan', 'cancel_action');
      await ctx.reply(`🎙️ *Perintah Suara*\n\n📌 Aksi: \`${actionIntent.action}\`\n${actionIntent.name ? `📝 Nama: ${actionIntent.name}` : ''}${actionIntent.sku ? `📦 Produk: ${actionIntent.sku}` : ''}\n\nLanjutkan?`, { parse_mode: 'Markdown', reply_markup: confirmKeyboard });
      return;
    }

    if (actionIntent && actionIntent.action !== 'CHAT') {
      const allProducts2 = await db.select().from(products);
      const p = allProducts2.find((x: any) =>
        x.sku.toLowerCase().includes((actionIntent.sku || '').toLowerCase()) ||
        x.name.toLowerCase().includes((actionIntent.sku || '').toLowerCase())
      );
      if (p) {
        session.pendingAction = actionIntent;
        const confirmKeyboard = new InlineKeyboard()
          .text('✅ Ya, Lanjutkan', 'confirm_action')
          .text('❌ Batalkan', 'cancel_action');
        await ctx.reply(`🎙️ *Perintah Suara*\n\n📌 Aksi: \`${actionIntent.action}\`\n📦 Produk: *${p.name}*\n🔢 Qty: ${actionIntent.qty || '-'}\n\nLanjutkan?`, { parse_mode: 'Markdown', reply_markup: confirmKeyboard });
        return;
      }
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'Anda asisten AI SCM Kaos Kami. Jawab singkat dan ramah dalam bahasa Indonesia.' },
        ...session.contextMessages.slice(-5).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_tokens: 500,
    });

    const aiReply = chatCompletion.choices[0]?.message?.content || 'Maaf, saya tidak mengerti pesan suara tersebut.';
    session.contextMessages.push({ role: 'assistant', content: aiReply });
    await ctx.reply(aiReply, { parse_mode: 'Markdown', reply_markup: followUpGeneral });

  } catch (error: any) {
    console.error('Voice Bot Error:', error);
    await ctx.reply('❌ Gagal memproses pesan suara.', { reply_markup: followUpGeneral });
  }
});

// ==================== FREE TEXT (AI Smart Handler) ====================
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text;
  const session = getSession(ctx.chat.id);

  // Mode Pencarian
  if (session.lastQuery === 'SEARCH_MODE') {
    session.lastQuery = undefined;
    try {
      const query = `%${text.toLowerCase()}%`;
      const results = await db.select({
        name: products.name, sku: products.sku, stock: products.currentStock, min: products.minStock
      }).from(products)
        .where(sql`lower(${products.name}) like ${query} or lower(${products.sku}) like ${query}`)
        .limit(10);
      
      if (results.length === 0) {
        await ctx.reply(`🔍 Tidak ditemukan produk dengan kata kunci "${text}".`, { reply_markup: mainMenu });
        return;
      }
      let msg = `🔍 *Hasil Pencarian "${text}":*\n\n`;
      results.forEach(p => {
        const s = p.stock === 0 ? '🔴' : p.stock <= p.min ? '⚠️' : '✅';
        msg += `${s} *${p.name}*\n   SKU: ${p.sku} | Stok: *${p.stock}* pcs\n\n`;
      });
      await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: mainMenu });
      return;
    } catch (e) {
      await ctx.reply('❌ Gagal mencari produk.', { reply_markup: mainMenu });
      return;
    }
  }

  try {
    session.contextMessages.push({ role: 'user', content: text });
    if (session.contextMessages.length > 5) session.contextMessages.shift();

    // 1. Cek apakah ini aksi database (kurangi/tambah/kirim/biaya)
    const actionIntent = await parseAIIntent(text, session.contextMessages);
    
    if (actionIntent && actionIntent.action === 'LOG_EXPENSE') {
       const confirmKeyboard = new InlineKeyboard()
        .text('✅ Catat Biaya', 'confirm_action')
        .text('❌ Batal', 'cancel_action');
       
       session.pendingAction = actionIntent;
       await ctx.reply(
         `💸 *Konfirmasi Pengeluaran*\n\n` +
         `📝 Judul: ${actionIntent.title}\n` +
         `📂 Kategori: ${actionIntent.category}\n` +
         `💰 Nominal: *Rp ${new Intl.NumberFormat('id-ID').format(actionIntent.qty)}*\n\n` +
         `Catat sekarang?`,
         { parse_mode: 'Markdown', reply_markup: confirmKeyboard }
       );
       return;
    }

    // === NON-PRODUCT CRUD ACTIONS (Categories, Suppliers, Orders, Bulk Product Delete) ===
    const NON_PRODUCT_ACTIONS = ['CREATE_CATEGORY', 'DELETE_CATEGORY', 'CREATE_SUPPLIER', 'DELETE_SUPPLIER', 'CREATE_ORDER', 'DELETE_ORDER', 'UPDATE_ORDER_STATUS', 'DELETE_PRODUCTS_BULK'];
    if (actionIntent && NON_PRODUCT_ACTIONS.includes(actionIntent.action)) {
      let preview = '';
      
      if (actionIntent.action === 'DELETE_PRODUCTS_BULK') {
        const keyword = (actionIntent.keyword || actionIntent.name || actionIntent.sku || '').toLowerCase().trim();
        if (!keyword) {
            await ctx.reply(`❌ Keyword pencarian tidak valid.`, { reply_markup: mainMenu });
            return;
        }
        
        const keywords = keyword.split(/\s+/).filter((k: string) => k.length > 0);
        const matches = await db.select().from(products);
        
        const matchedProducts = matches.filter(p => {
            const nameLower = p.name.toLowerCase();
            const skuLower = p.sku.toLowerCase();
            return keywords.every((k: string) => nameLower.includes(k)) || keywords.every((k: string) => skuLower.includes(k));
        });

        if (matchedProducts.length === 0) {
            await ctx.reply(`❌ Tidak ditemukan produk yang mengandung kata "${keyword}" di database.`, { reply_markup: mainMenu });
            return;
        }
        
        session.pendingAction = { ...actionIntent, keyword, count: matchedProducts.length };
        preview = `🗑️ *Hapus Massal Produk*\n\n🔥 Aksi: Menghapus *${matchedProducts.length}* produk yang mengandung kata *"${keyword}"* dari database beserta seluruh riwayat stoknya.\n\n⚠️ PERINGATAN BEMBAHAYA: Tindakan ini permanen!`;
      } else if (actionIntent.action === 'CREATE_CATEGORY') {
        preview = `📁 *Tambah Kategori Baru*\n\n${actionIntent.icon || '📦'} Nama: *${actionIntent.name}*`;
      } else if (actionIntent.action === 'DELETE_CATEGORY') {
        preview = `🗑️ *Hapus Kategori*\n\n📁 Nama: *${actionIntent.name}*\n\n⚠️ Kategori hanya bisa dihapus jika tidak ada produk di dalamnya!`;
      } else if (actionIntent.action === 'CREATE_SUPPLIER') {
        preview = `👤 *Tambah Supplier Baru*\n\n🏪 Nama: *${actionIntent.name}*${actionIntent.phone ? `\n📱 Telp: ${actionIntent.phone}` : ''}`;
      } else if (actionIntent.action === 'DELETE_SUPPLIER') {
        preview = `🗑️ *Hapus Supplier*\n\n🏪 Nama: *${actionIntent.name}*\n\nData supplier akan dihapus permanen!`;
      } else if (actionIntent.action === 'CREATE_ORDER') {
        preview = `📋 *Buat Pesanan Baru*\n\n👤 Pelanggan: *${actionIntent.customerName || 'Pelanggan Telegram'}*\n📦 Produk: ${actionIntent.sku}\n🔢 Qty: ${actionIntent.qty || 1}\n🏪 Platform: ${actionIntent.platform || 'telegram'}\n\n_Stok akan otomatis dikurangi._`;
      } else if (actionIntent.action === 'DELETE_ORDER') {
        preview = `🗑️ *Hapus Pesanan*\n\n📋 No/Nama: *${actionIntent.orderNumber}*\n\n⚠️ Stok yang sudah dipotong akan dikembalikan!`;
      } else if (actionIntent.action === 'UPDATE_ORDER_STATUS') {
        preview = `📌 *Ubah Status Pesanan*\n\n📋 No/Nama: *${actionIntent.orderNumber}*\n📌 Status baru: *${actionIntent.newStatus}*`;
      }

      if (actionIntent.action !== 'DELETE_PRODUCTS_BULK') {
          session.pendingAction = actionIntent;
      }
      const confirmKeyboard = new InlineKeyboard()
        .text('✅ Ya, Lanjutkan', 'confirm_action')
        .text('❌ Batalkan', 'cancel_action');
      await ctx.reply(`⚠️ ${preview}\n\nLanjutkan?`, { parse_mode: 'Markdown', reply_markup: confirmKeyboard });
      return;
    }

    if (actionIntent && actionIntent.action !== 'CHAT') {
      // Tampilkan KONFIRMASI, jangan langsung eksekusi
      const allProducts = await db.select().from(products);
      const searchSku = (actionIntent.sku || '').toLowerCase();
      const p = allProducts.find(x => 
        x.sku.toLowerCase().includes(searchSku) || 
        x.name.toLowerCase().includes(searchSku)
      );
      
      if (!p) {
        await ctx.reply(`❌ Produk "${actionIntent.sku}" tidak ditemukan.`, { reply_markup: mainMenu });
        session.contextMessages = []; // Mencegah LLM stuck pada intent ini di pesan berikutnya
        return;
      }

      let preview = '';
      let newStock = p.currentStock;
      
      if (actionIntent.action === 'DEDUCT_STOCK') {
        newStock = Math.max(0, p.currentStock - (actionIntent.qty || 0));
        preview = `📤 *Kurangi Stok*\n\n📦 ${p.name}\nStok saat ini: *${p.currentStock}*\nDikurangi: *-${actionIntent.qty}*\nSisa: *${newStock}*`;
      } else if (actionIntent.action === 'ADD_STOCK') {
        newStock = p.currentStock + (actionIntent.qty || 0);
        preview = `📥 *Tambah Stok*\n\n📦 ${p.name}\nStok saat ini: *${p.currentStock}*\nDitambah: *+${actionIntent.qty}*\nJadi: *${newStock}*`;
      } else if (actionIntent.action === 'UPDATE_STOCK') {
        newStock = actionIntent.qty || 0;
        preview = `🔄 *Update Stok*\n\n📦 ${p.name}\nStok lama: *${p.currentStock}*\nStok baru: *${newStock}*`;
      } else if (actionIntent.action === 'PROCESS_ORDER') {
        newStock = Math.max(0, p.currentStock - (actionIntent.qty || 1));
        preview = `📦 *Proses Pengiriman*\n\n📦 ${p.name}\nDikirim: *${actionIntent.qty || 1}* pcs\nSisa: *${newStock}*\n_(+ auto-deduct packaging)_`;
      } else if (actionIntent.action === 'DELETE_PRODUCT') {
        preview = `🗑️ *Hapus Produk Permanen*\n\n📦 ${p.name}\nSKU: ${p.sku}\nSeluruh sisa stok (*${p.currentStock}*) dan riwayat stok akan dihancurkan. Tindakan ini tidak bisa dibatalkan!\n_(Catatan: Akan gagal jika barang ada dalam data pesanan)_`;
      }

      // Simpan pending action
      session.pendingAction = { ...actionIntent, productId: p.id, productName: p.name };

      const confirmKeyboard = new InlineKeyboard()
        .text('✅ Ya, Lanjutkan', 'confirm_action')
        .text('❌ Batalkan', 'cancel_action');

      if (p.imageUrl) {
        await ctx.replyWithPhoto(p.imageUrl, { caption: `⚠️ ${preview}\n\nLanjutkan?`, parse_mode: 'Markdown', reply_markup: confirmKeyboard });
      } else {
        await ctx.reply(`⚠️ ${preview}\n\nLanjutkan?`, { parse_mode: 'Markdown', reply_markup: confirmKeyboard });
      }
      return;
    }

    // 2. Jika bukan aksi, jawab sebagai AI Chat (ringkas)
    const allStockData = await db.select({
      name: products.name, stock: products.currentStock
    }).from(products);

    const chatReply = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: `Anda adalah "Kaos Kami Bot" di Telegram. Jawab SINGKAT dan PADAT (maks 8 baris). Gunakan emoji. Jika user bertanya stok, cari datanya di list ini: ${JSON.stringify(allStockData)}. Berikan jawaban natural.` },
        ...session.contextMessages
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.5,
      max_tokens: 300,
    });

    const aiRes = chatReply.choices[0]?.message?.content || 'Maaf, saya kurang paham. Coba gunakan tombol menu di bawah.';
    session.contextMessages.push({ role: 'assistant', content: aiRes });
    await ctx.reply(aiRes, { reply_markup: mainMenu });

  } catch (error: any) {
    console.error('Bot Error:', error);
    await ctx.reply('❌ Terjadi kesalahan. Coba lagi atau gunakan tombol menu.', { reply_markup: mainMenu });
  }
});

// ==================== CONFIRM / CANCEL CALLBACKS ====================
bot.callbackQuery('confirm_action', async (ctx) => {
  await ctx.answerCallbackQuery('⏳ Memproses...');
  const session = getSession(ctx.chat?.id || 0);
  try {
    const action = session.pendingAction;

    if (!action) {
      await ctx.editMessageText('⚠️ Tidak ada aksi yang menunggu konfirmasi.');
      return;
    }

    if (action.action === 'LOG_EXPENSE') {
      await db.insert(expenses).values({
        id: uuidv4(),
        title: action.title,
        category: action.category || 'operasional',
        amount: action.qty,
        date: new Date().toISOString().split('T')[0],
      });
      session.pendingAction = undefined;
      await ctx.editMessageText(`✅ Berhasil mencatat biaya: *${action.title}* senilai *Rp ${new Intl.NumberFormat('id-ID').format(action.qty)}*`, { parse_mode: 'Markdown' });
      return;
    }

    // === NON-PRODUCT CRUD ACTIONS ===
    const NON_PRODUCT_ACTIONS = ['CREATE_CATEGORY', 'DELETE_CATEGORY', 'CREATE_SUPPLIER', 'DELETE_SUPPLIER', 'CREATE_ORDER', 'DELETE_ORDER', 'UPDATE_ORDER_STATUS'];
    if (NON_PRODUCT_ACTIONS.includes(action.action)) {
      const { executeNonProductAction } = await import('@/lib/ai-actions');
      const result = await executeNonProductAction(action);
      session.pendingAction = undefined;
      session.contextMessages = [];
      await ctx.editMessageText(result?.message || '✅ Aksi berhasil!', { parse_mode: 'Markdown' });
      return;
    }

    const { parseAndExecuteAIAction } = await import('@/lib/ai-actions');
    // Reconstruct the original command text for the parser
    let cmdText = '';
    if (action.action === 'DEDUCT_STOCK') cmdText = `kurangi stok ${action.sku} ${action.qty}`;
    else if (action.action === 'ADD_STOCK') cmdText = `tambah stok ${action.sku} ${action.qty}`;
    else if (action.action === 'UPDATE_STOCK') cmdText = `ubah stok ${action.sku} jadi ${action.qty}`;
    else if (action.action === 'PROCESS_ORDER') cmdText = `kirim ${action.qty || 1} paket ${action.sku}`;
    else if (action.action === 'DELETE_PRODUCT') cmdText = `hapus barang ${action.sku}`;

    const result = await parseAndExecuteAIAction(cmdText, 'telegram', session.contextMessages);
    session.pendingAction = undefined;

    if (result && typeof result === 'object' && result.undoToken) {
      const undoKeyboard = new InlineKeyboard().text('↩️ Undo Aksi Ini', `undo_${result.undoToken}`);
      await ctx.editMessageText(result.message, { parse_mode: 'Markdown', reply_markup: undoKeyboard });
    } else {
      await ctx.editMessageText(result?.message || '✅ Aksi berhasil dieksekusi!', { parse_mode: 'Markdown' });
    }
    session.contextMessages = []; // Bersihkan riwayat setelah aksi berhasil
  } catch (e) {
    session.pendingAction = undefined;
    session.contextMessages = []; // Bersihkan riwayat jika error
    await ctx.editMessageText('❌ Gagal mengeksekusi aksi.');
  }
});

bot.callbackQuery('cancel_action', async (ctx) => {
  await ctx.answerCallbackQuery('Dibatalkan.');
  const session = getSession(ctx.chat?.id || 0);
  session.pendingAction = undefined;
  session.contextMessages = []; // Bersihkan riwayat ketika dibatalkan agar tidak terulang
  await ctx.editMessageText('❌ Aksi dibatalkan.');
});

// ==================== UNDO HANDLER ====================
bot.callbackQuery(/^undo_(.+)$/, async (ctx) => {
  const token = ctx.match![1];
  await ctx.answerCallbackQuery('Membatalkan aksi...');
  
  try {
    const movements = await db.select().from(stockMovements).where(eq(stockMovements.undoToken, token));
    
    if (movements.length === 0) {
      await ctx.editMessageText('❌ Aksi ini sudah tidak bisa di-undo (kedaluwarsa atau tidak valid).');
      return;
    }
    
    if (!movements[0].canBeUndone) {
      await ctx.editMessageText('❌ Aksi ini telah di-undo sebelumnya.');
      return;
    }

    let summary = '✅ *Aksi berhasil dibatalkan (Undo)*\n\nResidu:\n';
    
    for (const m of movements) {
      const p = await db.select().from(products).where(eq(products.id, m.productId));
      if (p.length > 0) {
        let current = p[0].currentStock;
        let reverseQty = m.quantity;
        
        if (m.type === 'IN' || m.type === 'ADJUSTMENT_IN') {
           current = Math.max(0, current - reverseQty);
           summary += `• ${p[0].name}: -${reverseQty} (kembali ke ${current})\n`;
        } else if (m.type === 'OUT' || m.type === 'ADJUSTMENT_OUT') {
           current = current + reverseQty;
           summary += `• ${p[0].name}: +${reverseQty} (kembali ke ${current})\n`;
        }
        
        await db.update(products).set({ currentStock: current }).where(eq(products.id, p[0].id));
      }
    }
    
    // Mark as undone
    await db.update(stockMovements).set({ type: 'UNDONE', canBeUndone: false }).where(eq(stockMovements.undoToken, token));
    
    await ctx.editMessageText(summary, { parse_mode: 'Markdown' });

  } catch (e) {
    console.error('Undo Error:', e);
    await ctx.editMessageText('❌ Terjadi kesalahan saat membalikkan aksi.');
  }
});

// ==================== AI INTENT PARSER (Lightweight) ====================
async function parseAIIntent(text: string, contextMessages: {role: string, content: string}[] = []) {
  try {
    const allProd = await db.select({ sku: products.sku, name: products.name }).from(products);
    const catalogStr = allProd.map(p => `[SKU: ${p.sku}] ${p.name}`).join('\\n');
    let ctxStr = contextMessages.map(m => `${m.role}: ${m.content}`).join('\\n');
    
    const systemContent = `Anda menganalisis pesan dan return JSON. Anda adalah SUPER ADMIN BOT — bisa melakukan SEMUA operasi CRUD pada seluruh database.\\nPENTING: Untuk perintah ganti stok, pastikan mengembalikan 'UPDATE_STOCK' dengan qty berisi angka tersebut.\\n\\nActions GUDANG (butuh "sku"): "PROCESS_ORDER","DEDUCT_STOCK","ADD_STOCK","UPDATE_STOCK","DELETE_PRODUCT".\\nActions GUDANG MASSAL (hapus banyak barang sekaligus berdasarkan merk/tipe, butuh "keyword"): "DELETE_PRODUCTS_BULK".\\nActions PESANAN (butuh "orderNumber","customerName","sku","qty","platform","newStatus"): "CREATE_ORDER","DELETE_ORDER","UPDATE_ORDER_STATUS".\\nActions KATEGORI (butuh "name","icon"): "CREATE_CATEGORY","DELETE_CATEGORY".\\nActions SUPPLIER (butuh "name","phone"): "CREATE_SUPPLIER","DELETE_SUPPLIER".\\nActions BIAYA: "LOG_EXPENSE" (butuh "title","category","qty" as Rp).\\nActions LAINNYA: "CHAT" (WAJIB kembalikan ini jika pesan hanya sapaan "hai" atau obrolan biasa).\\n\\nFormat JSON: {"action":"TIPE","sku":"namasku","keyword":"kata kunci","qty":angka,"title":"...","category":"...","name":"...","icon":"...","phone":"...","orderNumber":"...","customerName":"...","platform":"...","newStatus":"..."}.\\n\\n⚡ PENTING: Jika menghapus BANYAK/SEMUA jenis barang (contoh: "hapus semua jenis kaos hitam"), gunakan action DELETE_PRODUCTS_BULK dengan keyword "kaos hitam". Jika hanya gudang biasa, cocokkan dg KATALOG INI:\\n${catalogStr}\\n\\nKonteks Sebelumnya: \\n${ctxStr}\\n\\nPesan Saat Ini: "${text}"`;
    
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'system', content: systemContent }],
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });
    return JSON.parse(completion.choices[0]?.message?.content || '{"action":"CHAT"}');
  } catch {
    return null;
  }
}

// ==================== /help COMMAND ====================
bot.command('help', async (ctx) => {
  await ctx.reply(
    `📖 *Daftar Perintah Tersedia:*\n\n` +
    `/start — Mulai dan tampilkan menu\n` +
    `/chart — Lihat grafik stok & laporan keuangan\n` +
    `/export — Download file CSV data stok\n` +
    `/help — Tampilkan daftar perintah ini\n\n` +
    `💡 *Tips:* Anda juga bisa mengirim *voice note*, *foto produk/nota*, atau mengetik perintah bebas seperti _"tambah stok kaos hitam 50"_.`,
    { parse_mode: 'Markdown', reply_markup: mainMenu }
  );
});

export const POST = webhookCallback(bot, 'std/http');
export const GET = async () => new Response('Telegram webhook is running', { status: 200 });

