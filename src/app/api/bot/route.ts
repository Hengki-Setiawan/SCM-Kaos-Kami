import { Bot, webhookCallback, InlineKeyboard, Keyboard, InputFile } from 'grammy';
import { db } from '@/db';
import { products, orders, stockMovements, categories, telegramUsers, expenses, suppliers, orderItems } from '@/db/schema';
import { desc, eq, sql, lte, gte, and } from 'drizzle-orm';
import { Groq } from 'groq-sdk';
import { session, Context, SessionFlavor } from 'grammy';
import { getTursoAdapter, BotSessionData } from '@/lib/turso-session';
import { parseAIIntent, executeStockActionDirectly } from '@/lib/ai-actions';
import { pipeline } from '@/lib/ai-collab';
import { v4 as uuidv4 } from 'uuid';
import { followUpStock, followUpOrder, followUpGeneral, mainMenu, menuLain } from '@/lib/bot/keyboards';
import { handlePhotoMsg } from '@/lib/bot/handlers/photo';
import { handleVoiceMsg } from '@/lib/bot/handlers/voice';

type MyContext = Context & SessionFlavor<BotSessionData>;
const bot = new Bot<MyContext>(process.env.TELEGRAM_BOT_TOKEN as string);

bot.use(session({
  initial: (): BotSessionData => ({ contextMessages: [] }),
  storage: getTursoAdapter(),
}));
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ==================== TIME-BASED GREETING ====================
function getGreeting(): string {
  const hour = parseInt(new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar', hour: 'numeric', hour12: false }));
  if (hour >= 4 && hour < 11) return '🌅 Selamat pagi, Bos!';
  if (hour >= 11 && hour < 15) return '☀️ Selamat siang, Bos!';
  if (hour >= 15 && hour < 18) return '🌤️ Selamat sore, Bos!';
  return '🌙 Selamat malam, Bos!';
}



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
async function renderCategoryMenu(ctx: any, isEdit = false) {
  try {
    const cats = await db.select().from(categories);
    const keyboard = new InlineKeyboard();
    
    cats.forEach((cat, i) => {
      keyboard.text(`${cat.icon || '📁'} ${cat.name}`, `cat_${cat.id}`);
      if (i % 2 === 1) keyboard.row();
    });
    keyboard.row().text('📊 Ringkasan Semua', 'cat_all');

    if (isEdit && ctx.callbackQuery) {
      await ctx.editMessageText('📦 *Pilih kategori stok:*', { parse_mode: 'Markdown', reply_markup: keyboard });
    } else {
      await ctx.reply('📦 *Pilih kategori stok:*', { parse_mode: 'Markdown', reply_markup: keyboard });
    }
  } catch (e) {
    if (isEdit && ctx.callbackQuery) {
      await ctx.editMessageText('❌ *Server sibuk.* Coba lagi nanti.', { parse_mode: 'Markdown' });
    } else {
      await ctx.reply('❌ *Server sibuk.* Coba lagi nanti.', { parse_mode: 'Markdown' });
    }
  }
}

bot.hears(['📦 Cek Stok', 'Cek Stok', '/stock', 'stok', 'Stok'], async (ctx) => {
  await renderCategoryMenu(ctx, false);
});

bot.callbackQuery('show_categories_menu', async (ctx) => {
  await ctx.answerCallbackQuery();
  await renderCategoryMenu(ctx, true);
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
      }).from(products).orderBy(desc(products.currentStock)).limit(15);
      title = '📊 Ringkasan 15 Stok Terbanyak';
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

// ==================== 🔁 INLINE CALLBACK HANDLERS ====================
bot.callbackQuery('btn_mainmenu', async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply('🏠 Kembali ke menu utama.', { reply_markup: mainMenu });
});

bot.callbackQuery('btn_orders', async (ctx) => {
  await ctx.answerCallbackQuery();
  try {
    const recentOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(5);
    if (recentOrders.length === 0) { await ctx.reply('📋 Belum ada pesanan.', { reply_markup: mainMenu }); return; }
    let msg = '📋 *5 Pesanan Terakhir:*\n\n';
    recentOrders.forEach((o, i) => {
      const statusIcon = o.status === 'completed' ? '✅' : o.status === 'shipped' ? '🚚' : o.status === 'processing' ? '⚙️' : o.status === 'cancelled' ? '❌' : '🕐';
      msg += `${i + 1}. ${statusIcon} *${o.orderNumber}*\n   👤 ${o.customerName} | 📌 ${o.status}\n\n`;
    });
    await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: mainMenu });
  } catch (e) { console.error('[Bot Error]:', e); await ctx.reply('❌ Gagal memuat pesanan.', { reply_markup: mainMenu }); }
});

bot.callbackQuery('btn_report', async (ctx) => {
  await ctx.answerCallbackQuery();
  try {
    const allProds = await db.select().from(products);
    const totalStock = allProds.reduce((a, p) => a + p.currentStock, 0);
    const lowCount = allProds.filter(p => p.currentStock <= p.minStock).length;
    const totalValue = allProds.reduce((a, p) => a + (p.currentStock * (p.unitPrice || 0)), 0);
    const msg = `📈 *Ringkasan Laporan*\n\n📦 Total Produk: *${allProds.length}*\n🧮 Total Stok: *${totalStock}* pcs\n⚠️ Low Stock: *${lowCount}* produk\n💰 Nilai Inventaris: *Rp ${new Intl.NumberFormat('id-ID').format(totalValue)}*`;
    await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: mainMenu });
  } catch (e) { console.error('[Bot Error]:', e); await ctx.reply('❌ Gagal memuat laporan.', { reply_markup: mainMenu }); }
});

bot.callbackQuery('btn_lowstock', async (ctx) => {
  await ctx.answerCallbackQuery();
  try {
    const lowItems = await db.select({ name: products.name, stock: products.currentStock, min: products.minStock })
      .from(products).where(lte(products.currentStock, products.minStock)).limit(15);
    if (lowItems.length === 0) { await ctx.reply('✅ Semua stok aman! Tidak ada yang rendah.', { reply_markup: mainMenu }); return; }
    let msg = '⚠️ *Produk Stok Rendah:*\n\n';
    lowItems.forEach(p => {
      msg += `${p.stock === 0 ? '🔴' : '⚠️'} ${p.name}: *${p.stock}*/${p.min} pcs\n`;
    });
    
    const lowStockKB = new InlineKeyboard()
      .text('📝 Draft PO Otomatis', 'btn_auto_po').row()
      .text('🔙 Kembali ke Kategori', 'show_categories_menu').text('🏠 Menu', 'btn_mainmenu');
      
    await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: lowStockKB });
  } catch (e) { console.error('[Bot Error]:', e); await ctx.reply('❌ Gagal memuat data.', { reply_markup: mainMenu }); }
});

bot.callbackQuery('btn_auto_po', async (ctx) => {
   await ctx.answerCallbackQuery('Membuat draf PO...');
   try {
       const lowItems = await db.select({ name: products.name, stock: products.currentStock, min: products.minStock })
         .from(products).where(lte(products.currentStock, products.minStock));
       
       if (lowItems.length === 0) { await ctx.reply('✅ Semua stok aman.', { reply_markup: mainMenu }); return; }
       
       let msg = `📄 *Draf Purchase Order Otomatis*\n_Rekomendasi Reorder Berdasarkan Stok Kritis_\n\n`;
       lowItems.forEach((p, i) => {
          // Rekomendasi restock (MinTarget x3 dikurangi sisa) dengan minimal restock 10pcs
          const suggestRestock = Math.max(10, (p.min * 3) - p.stock); 
          msg += `${i + 1}. *${p.name}*\n   📦 Rekomendasi Pesan: *${suggestRestock}* pcs\n`;
       });
       
       msg += `\n_Teruskan rincian ini langsung ke Penyuplai Anda._`;
       await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: mainMenu });
   } catch (e) { console.error('[Bot Error]:', e);
       await ctx.reply('❌ Gagal membuat draf PO.', { reply_markup: mainMenu });
   }
});

bot.callbackQuery('btn_po_link', async (ctx) => {
  await ctx.answerCallbackQuery();
  const url = process.env.NEXT_PUBLIC_APP_URL || 'https://scm-kaos-kami.vercel.app';
  await ctx.reply(`📄 *Buat Purchase Order*\n\nSilakan buka Dashboard untuk membuat PO:\n🌐 [Buka Dashboard](${url}/dashboard)`, { parse_mode: 'Markdown', reply_markup: mainMenu });
});

// ==================== 🧮 KALKULATOR HARGA AI ====================
bot.hears('🧮 Kalkulator', async (ctx) => {
  const session = ctx.session;
  session.lastQuery = 'CALC_MODE';
  await ctx.reply(
    '🧮 *Kalkulator Harga AI*\n\n' +
    'Ketik salah satu format:\n\n' +
    '📦 *Hitung HPP:*\n' +
    '• _"hpp kaos hitam M"_\n' +
    '• _"biaya produksi kaos polos"_\n\n' +
    '💰 *Hitung Harga Jual (dengan margin):*\n' +
    '• _"harga jual kaos hitam margin 40%"_\n' +
    '• _"markup kaos polos 50%"_\n\n' +
    '📊 *Profit Produk:*\n' +
    '• _"profit kaos hitam M"_\n' +
    '• _"untung dtf skizo"_',
    { parse_mode: 'Markdown' }
  );
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

// ==================== 🔍 CARI PRODUK (Fuzzy-Enhanced) ====================
bot.hears('🔍 Cari Produk', async (ctx) => {
  const session = ctx.session;
  session.lastQuery = 'SEARCH_MODE';
  await ctx.reply('🔍 Ketik nama atau SKU produk yang ingin dicari.\n_Saya bisa mengenali typo dan kata mirip!_', { parse_mode: 'Markdown', reply_markup: { force_reply: true } });
});

// ==================== 📸 PHOTO HANDLER — VISION AI ====================
bot.hears('📸 Scan Resi', async (ctx) => {
  await ctx.reply('📸 Kirim foto produk, nota belanja, atau resi pengiriman, saya akan membacanya dengan AI Vision!');
});

bot.on('message:photo', (ctx) => handlePhotoMsg(ctx));

// ==================== 🎙️ VOICE COMMAND (Whisper) ====================
bot.on('message:voice', (ctx) => handleVoiceMsg(ctx));

// ==================== FREE TEXT (AI Smart Handler) ====================
bot.on('message:text', async (ctx) => {
  const text = ctx.message.text;
  const session = ctx.session;

  // -- Import smart-ai utilities --
  const { findFuzzyMatches, parseIndonesianCurrency, detectMultiIntent, parseNaturalDate, predictStockRunout, analyzeTrend } = await import('@/lib/smart-ai');

  // ==================== MODE: SEARCH (Fuzzy) ====================
  if (session.lastQuery === 'SEARCH_MODE') {
    session.lastQuery = undefined;
    try {
      const query = `%${text.toLowerCase()}%`;
      const results = await db.select({
        name: products.name, sku: products.sku, stock: products.currentStock, min: products.minStock
      }).from(products)
        .where(sql`lower(${products.name}) like ${query} or lower(${products.sku}) like ${query}`)
        .limit(10);
      
      if (results.length > 0) {
        let msg = `🔍 *Hasil Pencarian "${text}":*\n\n`;
        results.forEach(p => {
          const s = p.stock === 0 ? '🔴' : p.stock <= p.min ? '⚠️' : '✅';
          msg += `${s} *${p.name}*\n   SKU: ${p.sku} | Stok: *${p.stock}* pcs\n\n`;
        });
        await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: mainMenu });
        return;
      }
      
      // FUZZY FALLBACK: Suggest similar products
      const allProds = await db.select().from(products);
      const fuzzy = findFuzzyMatches(text, allProds, 3);
      const goodMatches = fuzzy.filter(f => f.score >= 0.4);
      
      if (goodMatches.length > 0) {
        let msg = `🔍 Produk "${text}" tidak ditemukan persis.\n\n💡 *Mungkin maksud Anda:*\n\n`;
        goodMatches.forEach((f, i) => {
          const s = f.item.currentStock === 0 ? '🔴' : f.item.currentStock <= f.item.minStock ? '⚠️' : '✅';
          msg += `${i + 1}. ${s} *${f.item.name}*\n   SKU: ${f.item.sku} | Stok: *${f.item.currentStock}* pcs\n\n`;
        });
        await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: mainMenu });
      } else {
        await ctx.reply(`🔍 Tidak ditemukan produk yang mirip dengan "${text}".`, { reply_markup: mainMenu });
      }
      return;
    } catch (e) {
      await ctx.reply('❌ Gagal mencari produk.', { reply_markup: mainMenu });
      return;
    }
  }

  // ==================== MODE: CALCULATOR ====================
  if (session.lastQuery === 'CALC_MODE') {
    session.lastQuery = undefined;
    try {
      const allProds = await db.select().from(products);
      const fuzzy = findFuzzyMatches(text.replace(/hpp|profit|untung|margin|markup|harga\s*jual|biaya\s*produksi/gi, '').trim(), allProds, 1);
      
      if (fuzzy.length === 0 || fuzzy[0].score < 0.3) {
        await ctx.reply('❌ Produk tidak ditemukan. Coba ketik nama yang lebih spesifik.', { reply_markup: mainMenu });
        return;
      }
      const p = fuzzy[0].item;
      const buyPrice = p.buyPrice || 0;
      const sellPrice = p.unitPrice || 0;
      const profitPerUnit = sellPrice - buyPrice;
      const marginPct = sellPrice > 0 ? (profitPerUnit / sellPrice * 100).toFixed(1) : '0';

      // Check if user wants specific margin
      const marginMatch = text.match(/margin\s*(\d+)%?|markup\s*(\d+)%?/i);
      if (marginMatch) {
        const wantedMargin = parseInt(marginMatch[1] || marginMatch[2]) / 100;
        const suggestedPrice = Math.ceil(buyPrice / (1 - wantedMargin));
        await ctx.reply(
          `🧮 *Kalkulator Harga Jual*\n\n` +
          `📦 Produk: *${p.name}*\n` +
          `💵 Harga Beli: Rp ${new Intl.NumberFormat('id-ID').format(buyPrice)}\n` +
          `📊 Target Margin: ${(wantedMargin * 100).toFixed(0)}%\n` +
          `─────────────────\n` +
          `🏷️ *Harga Jual Rekomendasi: Rp ${new Intl.NumberFormat('id-ID').format(suggestedPrice)}*\n` +
          `💰 Profit/pcs: Rp ${new Intl.NumberFormat('id-ID').format(suggestedPrice - buyPrice)}`,
          { parse_mode: 'Markdown', reply_markup: mainMenu }
        );
      } else {
        // Show full profit analysis
        const recentMoves = await db.select().from(stockMovements).where(eq(stockMovements.productId, p.id));
        const outMoves = recentMoves.filter(m => m.type === 'OUT');
        const totalSold = outMoves.reduce((a, m) => a + m.quantity, 0);
        
        await ctx.reply(
          `🧮 *Analisis Profit: ${p.name}*\n\n` +
          `💵 Harga Beli: *Rp ${new Intl.NumberFormat('id-ID').format(buyPrice)}*\n` +
          `🏷️ Harga Jual: *Rp ${new Intl.NumberFormat('id-ID').format(sellPrice)}*\n` +
          `─────────────────\n` +
          `💰 Profit/pcs: *Rp ${new Intl.NumberFormat('id-ID').format(profitPerUnit)}* (${marginPct}%)\n` +
          `📦 Stok Saat Ini: *${p.currentStock}* pcs\n` +
          `📊 Total Terjual: *${totalSold}* pcs\n` +
          `💵 Total Revenue: *Rp ${new Intl.NumberFormat('id-ID').format(totalSold * sellPrice)}*\n` +
          `💰 Total Profit: *Rp ${new Intl.NumberFormat('id-ID').format(totalSold * profitPerUnit)}*`,
          { parse_mode: 'Markdown', reply_markup: mainMenu }
        );
      }
      return;
    } catch (e) {
      await ctx.reply('❌ Gagal menghitung.', { reply_markup: mainMenu });
      return;
    }
  }

  // ==================== BUSINESS INTELLIGENCE COMMANDS ====================
  const lower = text.toLowerCase();

  // Prediksi Stok
  if (lower.includes('prediksi') || lower.includes('forecast') || (lower.includes('kapan') && lower.includes('habis'))) {
    try {
      const allProds = await db.select().from(products);
      const allMoves = await db.select().from(stockMovements);
      let msg = '📉 *Prediksi Stok Kritis (Berdasarkan 30 Hari Terakhir):*\n\n';
      let criticalCount = 0;

      for (const p of allProds) {
        const prodMoves = allMoves.filter(m => m.productId === p.id);
        const pred = predictStockRunout(p.currentStock, prodMoves as any);
        if (pred && pred.daysLeft <= 14 && pred.daysLeft >= 0) {
          const icon = pred.daysLeft <= 3 ? '🔴' : pred.daysLeft <= 7 ? '🟡' : '🟢';
          msg += `${icon} *${p.name}*\n   Sisa: ${p.currentStock} pcs | Rata-rata: ${pred.avgPerDay}/hari\n   ⏰ *Habis dalam ~${pred.daysLeft} hari*\n\n`;
          criticalCount++;
        }
      }
      if (criticalCount === 0) msg += '✅ Semua stok aman dalam 14 hari ke depan!';
      else msg += `\n💡 _Restock ${criticalCount} produk di atas sebelum kehabisan!_`;

      await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: followUpStock });
      return;
    } catch (e) { await ctx.reply('❌ Gagal mengkalkulasi prediksi.', { reply_markup: mainMenu }); return; }
  }

  // Analisis Tren
  if (lower.includes('tren') || lower.includes('trend') || lower.includes('best seller') || lower.includes('bestseller')) {
    try {
      const allProds = await db.select().from(products);
      const allMoves = await db.select().from(stockMovements);
      const trend = analyzeTrend(allMoves as any, allProds);

      let msg = '📊 *Analisis Tren Penjualan (7 Hari):*\n\n';
      
      if (trend.topSellers.length > 0) {
        msg += '🏆 *Best Sellers:*\n';
        trend.topSellers.forEach((t, i) => { msg += `${i + 1}. ${t.name}: *${t.sold}* pcs\n`; });
      }
      if (trend.rising.length > 0) {
        msg += '\n📈 *Naik:*\n';
        trend.rising.forEach(t => { msg += `• ${t.name}: +${t.change}%\n`; });
      }
      if (trend.falling.length > 0) {
        msg += '\n📉 *Turun:*\n';
        trend.falling.forEach(t => { msg += `• ${t.name}: ${t.change}%\n`; });
      }
      if (trend.topSellers.length === 0) msg += '_(Belum cukup data penjualan)_';

      await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: followUpGeneral });
      return;
    } catch (e) { await ctx.reply('❌ Gagal menganalisis tren.', { reply_markup: mainMenu }); return; }
  }

  // Riwayat dengan Natural Date  
  const dateRange = parseNaturalDate(text);
  if (dateRange && (lower.includes('riwayat') || lower.includes('aktivitas') || lower.includes('history'))) {
    try {
      const moves = await db.select({
        type: stockMovements.type, qty: stockMovements.quantity, reason: stockMovements.reason,
        pName: products.name, at: stockMovements.createdAt
      }).from(stockMovements)
        .leftJoin(products, eq(stockMovements.productId, products.id))
        .where(and(gte(stockMovements.createdAt, dateRange.start.toISOString()), lte(stockMovements.createdAt, dateRange.end.toISOString())))
        .orderBy(desc(stockMovements.createdAt)).limit(15);
      
      if (moves.length === 0) { await ctx.reply(`📜 Tidak ada aktivitas pada periode ${dateRange.label}.`, { reply_markup: mainMenu }); return; }
      let msg = `📜 *Riwayat ${dateRange.label} (${moves.length} aktivitas):*\n\n`;
      moves.forEach(m => {
        const icon = (m.type === 'IN' || m.type === 'ADJUSTMENT_IN') ? '📥' : '📤';
        const sign = (m.type === 'IN' || m.type === 'ADJUSTMENT_IN') ? '+' : '-';
        msg += `${icon} ${m.pName}: *${sign}${m.qty}*\n   _${m.reason}_\n\n`;
      });
      await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: mainMenu });
      return;
    } catch (e) { await ctx.reply('❌ Gagal memuat riwayat.', { reply_markup: mainMenu }); return; }
  }

  try {
    // Anti-hallucination: Clear context if user starts a new explicit command
    const lowerText = text.toLowerCase().trim();
    if (lowerText.startsWith('tambah') || lowerText.startsWith('hapus') || lowerText.startsWith('buat') || lowerText.startsWith('buatkan')) {
        session.contextMessages = [];
    }

    session.contextMessages.push({ role: 'user', content: text });
    if (session.contextMessages.length > 5) session.contextMessages.shift();

    // 1. Cek Multi-Intent (Batch Operations)
    const multiIntents = detectMultiIntent(text);
    
    // Jika lebih dari 1 aksi terdeteksi, lakukan Batch Operation
    if (multiIntents.length > 1 && !text.toLowerCase().includes('buat pesanan')) {
      let summary = '📦 *Eksekusi Massal (Batch Operations):*\n\n';
      let successCount = 0;
      
      await ctx.reply('⏳ Memproses beberapa perintah sekaligus...');
      
      for (const mi of multiIntents) {
         // Terjemahkan perintah mentah kembali ke text untuk Parser
         const fakeText = `${mi.action} ${mi.productQuery} ${mi.qty}`;
         const singleIntent = await parseAIIntent(fakeText, session.contextMessages, session.lastProductName);
         
         if (singleIntent && singleIntent.action !== 'CHAT') {
            const res = await executeStockActionDirectly(singleIntent, 'telegram');
            if (res && res.message) {
                // Bersihkan "Berhasil eksekusi perintah!" agar rapi
                summary += res.message.replace(/✅ Berhasil eksekusi perintah!\n/, '✅ ') + '\n\n';
                successCount++;
            } else {
                summary += `❌ Gagal memproses: ${mi.productQuery}\n\n`;
            }
         } else {
            summary += `❌ Gagal mengenali: ${mi.productQuery}\n\n`;
         }
      }
      
      if (successCount > 0) {
         await ctx.reply(summary, { parse_mode: 'Markdown', reply_markup: mainMenu });
         session.contextMessages = [];
         return;
      }
    }

    // 2. Cek apakah ini aksi database tunggal (kurangi/tambah/kirim/biaya)
    const actionIntent = await parseAIIntent(text, session.contextMessages, session.lastProductName);
    
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

    // === NATIVE CHECK STOCK ===
    if (actionIntent && actionIntent.action === 'CHECK_STOCK') {
      const keyword = (actionIntent.keyword || '').toLowerCase().trim();
      const allProducts = await db.select().from(products);
      const allCategories = await db.select().from(categories);
      
      if (!keyword) {
        await ctx.reply(`📦 Silakan masukkan nama barang yang ingin dicari.`);
        return;
      }
      
      // NATIVE CHECK STOCK
      const keywords = keyword.split(/\s+/).filter((k: string) => k.length > 0);
      const matchedProducts = allProducts.filter(p => {
        const nameLower = p.name.toLowerCase();
        const skuLower = p.sku.toLowerCase();
        const cat = allCategories.find(c => c.id === p.categoryId);
        const catNameLower = cat ? cat.name.toLowerCase() : '';
        
        return keywords.every((k: string) => nameLower.includes(k) || skuLower.includes(k) || catNameLower.includes(k));
      });
      
      if (matchedProducts.length === 0) {
        // Fuzzy fallback
        const fuzzy = findFuzzyMatches(keyword, allProducts, 3);
        const good = fuzzy.filter(f => f.score >= 0.4);
        if (good.length > 0) {
          let msg = `❌ Stok "${keyword}" tidak ditemukan persis.\n\n💡 *Mungkin maksud Anda:*\n\n`;
          good.forEach((f, i) => {
            msg += `${i + 1}. *${f.item.name}*: *${f.item.currentStock}* pcs\n`;
          });
          
          session.contextMessages.push({ role: 'assistant', content: msg.replace(/\*/g, '') });
          if (session.contextMessages.length > 5) session.contextMessages.shift();
          
          await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: followUpStock });
        } else {
          session.contextMessages.push({ role: 'assistant', content: `Tidak ada stok untuk "${keyword}".` });
          await ctx.reply(`❌ Tidak ditemukan stok untuk "${keyword}".\n\nJika ingin menambah varian baru, gunakan perintah *"tambah produk ${keyword}"*.`, { parse_mode: 'Markdown' });
        }
        return;
      }
      
      let replyStr = `📦 *Cek Stok: ${keyword.toUpperCase()}*\n\n`;
      let totalStock = 0;
      for (const p of matchedProducts) {
        let emoji = p.currentStock <= p.minStock ? '🔴' : '✅';
        replyStr += `${emoji} ${p.name}: *${p.currentStock}* ${p.unit}\n`;
        totalStock += p.currentStock;
      }
      replyStr += `\n📊 Total Pencarian: *${totalStock}* pcs dari *${matchedProducts.length}* varian.`;
      
      // Save last product context for follow-up commands
      if (matchedProducts.length === 1) {
        session.lastProductId = matchedProducts[0].id;
        session.lastProductName = matchedProducts[0].name;
      }
      
      session.contextMessages.push({ role: 'assistant', content: replyStr.replace(/\*/g, '') });
      if (session.contextMessages.length > 5) session.contextMessages.shift();
      
      await ctx.reply(replyStr, { parse_mode: 'Markdown', reply_markup: followUpStock });
      return;
    }

    // === NON-PRODUCT CRUD ACTIONS (Categories, Suppliers, Orders, Bulk Product Delete) ===
    const NON_PRODUCT_ACTIONS = ['CREATE_CATEGORY', 'DELETE_CATEGORY', 'CREATE_SUPPLIER', 'DELETE_SUPPLIER', 'CREATE_ORDER', 'DELETE_ORDER', 'UPDATE_ORDER_STATUS', 'DELETE_PRODUCTS_BULK', 'CREATE_PRODUCT', 'UPDATE_PRODUCT_NAME'];
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
      } else if (actionIntent.action === 'CREATE_PRODUCT') {
        preview = `📦 *Tambah Produk Baru*\n\nNama: *${actionIntent.name}*\n📁 Kategori: *${actionIntent.category}*\n🔢 Stok Awal: *${actionIntent.qty || 0}*\n\n_Pastikan kategori sudah terdaftar._`;
      } else if (actionIntent.action === 'UPDATE_PRODUCT_NAME') {
        preview = `✏️ *Ubah Nama Produk*\n\n📦 SKU: *${actionIntent.sku}*\n🆕 Nama Baru: *${actionIntent.newName}*`;
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

    const isNonProductAction = NON_PRODUCT_ACTIONS.includes(actionIntent.action);
    const isCheckStock = actionIntent.action === 'CHECK_STOCK';

    if (actionIntent && actionIntent.action !== 'CHAT' && !isNonProductAction && !isCheckStock) {
      // Tampilkan KONFIRMASI, jangan langsung eksekusi (UNTUK ADD/DEDUCT/UPDATE)
      if (!actionIntent.sku) {
        await ctx.reply(`❌ Cek kembali kalimat Anda. Pastikan menyebutkan nama barang yang sesuai di katalog.`, { reply_markup: mainMenu });
        session.contextMessages = [];
        return;
      }
      
      const allProducts = await db.select().from(products);
      const searchSku = actionIntent.sku.toLowerCase();
      const p = allProducts.find(x => 
        x.sku.toLowerCase().includes(searchSku) || 
        x.name.toLowerCase().includes(searchSku)
      );
      
      if (!p) {
        await ctx.reply(`❌ Produk dengan kata kunci "${actionIntent.sku}" tidak ditemukan di database.`, { reply_markup: mainMenu });
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
    const allProducts = await db.select().from(products);
    const allCategories = await db.select().from(categories);

    const matchedProductsForAI = allProducts.filter((p: any) => {
      const msgLower = text.toLowerCase();
      const nameMatch = p.name.toLowerCase().includes(msgLower) || msgLower.includes(p.name.toLowerCase());
      const skuMatch = p.sku.toLowerCase().includes(msgLower) || msgLower.includes(p.sku.toLowerCase());
      const cat = allCategories.find(c => c.id === p.categoryId);
      const catMatch = cat && (cat.name.toLowerCase().includes(msgLower) || msgLower.includes(cat.name.toLowerCase()));
      return nameMatch || skuMatch || catMatch;
    }).slice(0, 15);

    const systemPrompt = `Anda adalah "Kaos Kami Bot" di Telegram. Jawab SINGKAT. 
    Total Varian: ${allProducts.length}
    Stok Rendah (< Minimal): ${allProducts.filter((p: any) => p.currentStock <= p.minStock).map((p: any) => `${p.name} (${p.currentStock}/${p.minStock})`).join(', ') || 'Semua Aman'}
    
    DATA PRODUK BERKAITAN:
    ${matchedProductsForAI.map((p: any) => `- [${p.sku}] ${p.name}: Stok=${p.currentStock}, Min=${p.minStock}`).join('\n') || 'Tidak ada produk spesifik disebutkan.'}

    PENTING: Anda HANYA MENJAWAB pertanyaan stok atau ngobrol. Anda TIDAK BISA menambah/menghapus barang via chat ini.`;
    
    const { content } = await pipeline({
      userMessage: ctx.message?.text || 'Minta bantuan bot',
      systemPrompt: systemPrompt,
      context: session.contextMessages,
    });

    const aiRes = content || 'Maaf, saya kurang paham. Coba gunakan tombol menu di bawah.';
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
  const session = ctx.session;
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
    const NON_PRODUCT_ACTIONS = ['CREATE_CATEGORY', 'DELETE_CATEGORY', 'CREATE_SUPPLIER', 'DELETE_SUPPLIER', 'CREATE_ORDER', 'DELETE_ORDER', 'UPDATE_ORDER_STATUS', 'DELETE_PRODUCTS_BULK', 'CREATE_PRODUCT', 'UPDATE_PRODUCT_NAME'];
    if (NON_PRODUCT_ACTIONS.includes(action.action)) {
      const { executeNonProductAction } = await import('@/lib/ai-actions');
      const result = await executeNonProductAction(action);
      session.pendingAction = undefined;
      session.contextMessages = [];
      await ctx.editMessageText(result?.message || '✅ Aksi berhasil!', { parse_mode: 'Markdown' });
      return;
    }

    const result = await executeStockActionDirectly(action, 'telegram', session.contextMessages);
    session.pendingAction = undefined;

    if (result && typeof result === 'object' && result.undoToken) {
      const undoKeyboard = new InlineKeyboard().text('↩️ Undo Aksi Ini', `undo_${result.undoToken}`);
      await ctx.editMessageText(result.message, { parse_mode: 'Markdown', reply_markup: undoKeyboard });
    } else {
      await ctx.editMessageText(result?.message || '❌ Gagal mengeksekusi aksi. (Terjadi Timeout/Data Tidak Lengkap)', { parse_mode: 'Markdown' });
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
  const session = ctx.session;
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

// Extracted parseAIIntent to ai-actions.ts

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

