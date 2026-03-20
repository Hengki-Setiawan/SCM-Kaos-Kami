import { Bot, webhookCallback, InlineKeyboard, Keyboard, InputFile } from 'grammy';
import { db } from '@/db';
import { products, orders, stockMovements, categories, telegramUsers } from '@/db/schema';
import { desc, eq, sql, lte } from 'drizzle-orm';
import { Groq } from 'groq-sdk';
import { v4 as uuidv4 } from 'uuid';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN as string);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
  .text('🤖 Tanya AI').text('⚙️ Menu Lain').row()
  .resized().persistent();

const menuLain = new Keyboard()
  .text('🧮 Kalkulator').text('📜 Riwayat').row()
  .text('📸 Scan Resi').text('🔍 Cari Produk').row()
  .webApp('🌐 Buka Dashboard', process.env.NEXT_PUBLIC_APP_URL || 'https://scm-kaos-kami.vercel.app').row()
  .text('🏠 Menu Utama').row()
  .resized().persistent();

// ==================== SECURITY MIDDLEWARE (ROLE MANAGEMENT) ====================
bot.use(async (ctx, next) => {
  const tId = ctx.from?.id.toString() || '';
  const username = ctx.from?.username || '';
  
  // Super Admin bypass via ENV
  const isSuperAdmin = username === process.env.TELEGRAM_USERNAME?.replace('@', '');
  
  // Check against DB
  const userDb = await db.select().from(telegramUsers).where(eq(telegramUsers.telegramId, tId));
  const isRegistered = userDb.length > 0 && userDb[0].isActive;

  if (!isSuperAdmin && !isRegistered) {
    await ctx.reply(`🚫 Akses ditolak. Bot SCM Kaos Kami hanya untuk karyawan terdaftar.\nID Telegram Anda: \`${tId}\`\nBerikan ID ini ke admin jika Anda adalah staff.`, { parse_mode: 'Markdown' });
    return;
  }

  // Inject role to context state
  (ctx as any).session = (ctx as any).session || {};
  (ctx as any).session.role = isSuperAdmin ? 'admin' : userDb[0].role;
  
  await next();
});

// ==================== /start ====================
bot.command('start', async (ctx) => {
  await ctx.reply(
    `🧵 *Selamat datang di Kaos Kami SCM!*\n\n` +
    `Saya adalah asisten gudang Anda. Gunakan tombol di bawah untuk navigasi, atau langsung ketik perintah dalam bahasa Indonesia.\n\n` +
    `*Contoh perintah:*\n` +
    `• _"Stok kaos hitam L berapa?"_\n` +
    `• _"Kirim 1 paket Skizo hitam L"_\n` +
    `• _"Tambah stok polymailer 100"_\n\n` +
    `Atau kirim 📸 foto resi untuk dibaca AI!`,
    { parse_mode: 'Markdown', reply_markup: mainMenu }
  );
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
    await ctx.reply('❌ Gagal memuat kategori.');
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
    msg += `\n📊 Total: *${totalStock}* pcs dari ${items.length} varian`;

    await ctx.editMessageText(msg, { parse_mode: 'Markdown' });
  } catch (e) {
    await ctx.editMessageText('❌ Gagal memuat data stok.');
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

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch (e) {
    await ctx.reply('❌ Gagal memuat data low stock.');
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

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  } catch (e) {
    await ctx.reply('❌ Gagal memuat pesanan.');
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

    const pendingCount = await db.select({
      c: sql<number>`count(${orders.id})`
    }).from(orders).where(sql`${orders.status} = 'pending'`);

    const s = stats[0];
    const now = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    const msg = `📈 *Laporan — ${now}*\n\n` +
      `📦 Varian Produk: *${s.total}*\n` +
      `🏪 Total Item Gudang: *${s.totalStock}* pcs\n` +
      `💰 Estimasi Nilai Aset: *Rp ${new Intl.NumberFormat('id-ID').format(s.assetValue)}*\n` +
      `⚠️ Produk Low Stock: *${s.lowCount}*\n` +
      `📋 Pesanan Pending: *${pendingCount[0].c}*\n`;

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

// Callback shortcuts from laporan
bot.callbackQuery('btn_lowstock', async (ctx) => {
  await ctx.answerCallbackQuery();
  // Trigger low stock handler
  await ctx.reply('⚠️ Memuat data low stock...', { reply_markup: mainMenu });
  // Simulate hears trigger
  const lowItems = await db.select({
    name: products.name, stock: products.currentStock, min: products.minStock
  }).from(products).where(lte(products.currentStock, products.minStock)).limit(15);
  
  if (lowItems.length === 0) { await ctx.reply('✅ Semua stok aman!'); return; }
  let msg = `⚠️ *${lowItems.length} Produk Low Stock:*\n\n`;
  lowItems.forEach(p => { msg += `${p.stock === 0 ? '🔴' : '⚠️'} ${p.name}: *${p.stock}*/${p.min}\n`; });
  await ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.callbackQuery('btn_orders', async (ctx) => {
  await ctx.answerCallbackQuery();
  const recent = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(5);
  if (recent.length === 0) { await ctx.reply('📭 Belum ada pesanan.'); return; }
  let msg = `📋 *Pesanan Terakhir:*\n\n`;
  const si: Record<string, string> = { pending: '🟡', processing: '🔵', shipped: '📦', completed: '✅', cancelled: '❌' };
  recent.forEach(o => { msg += `${si[o.status] || '⚪'} #${o.orderNumber} — ${o.customerName} (*${o.status}*)\n`; });
  await ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.callbackQuery('btn_csv', async (ctx) => {
  if ((ctx as any).session?.role !== 'admin') return ctx.answerCallbackQuery('🚫 Akses ditolak');
  
  await ctx.answerCallbackQuery('Membuat CSV...');
  try {
    const all = await db.select().from(products);
    let csv = 'SKU,Nama,Kategori,Harga Beli,Harga Jual,Stok Saat Ini,Min Stok\\n';
    all.forEach(p => { csv += `"${p.sku}","${p.name}","${p.categoryId}",${p.buyPrice || 0},${p.unitPrice || 0},${p.currentStock},${p.minStock}\\n`; });
    
    const buffer = Buffer.from(csv, 'utf-8');
    const d = new Date().toISOString().split('T')[0];
    await ctx.replyWithDocument(new InputFile(buffer, `Laporan_Stok_${d}.csv`));
  } catch (e) {
    await ctx.reply('❌ Gagal menggenerate CSV.');
  }
});

// ==================== ⚙️ MENU LAIN ====================
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

// ==================== 📸 SCAN RESI (Photo) ====================
bot.hears('📸 Scan Resi', async (ctx) => {
  await ctx.reply('📸 Kirim foto resi pengiriman, saya akan membacanya dengan AI Vision!');
});

bot.on('message:photo', async (ctx) => {
  try {
    await ctx.reply('⏳ Menganalisis gambar...');
    
    const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
    const file = await ctx.api.getFile(fileId);
    const imageUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    
    const completion = await groq.chat.completions.create({
      messages: [{
        role: "user",
        content: [
          { type: "text", text: `Analisis gambar ini. Jika ini resi pengiriman, extract JSON: {"type":"resi","customerName":"...","trackingNumber":"...","platform":"..."}. Jika ini nota pembelian, extract: {"type":"nota","items":"deskripsi item","total":"total harga"}. Jika ini foto barcode atau label produk, extract: {"type":"barcode","sku":"kode yang terbaca"}. Jika bukan ketiganya: {"type":"unknown","description":"deskripsi singkat"}` },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      }],
      model: "llama-3.2-11b-vision-preview",
      temperature: 0,
      response_format: { type: 'json_object' }
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}');
    
    if (parsed.type === 'resi' && parsed.trackingNumber) {
      await ctx.reply(
        `✅ *Resi Terbaca!*\n\n` +
        `👤 Pembeli: ${parsed.customerName || '-'}\n` +
        `📦 No Resi: \`${parsed.trackingNumber}\`\n` +
        `🌐 Platform: ${parsed.platform || '-'}`,
        { parse_mode: 'Markdown' }
      );
    } else if (parsed.type === 'nota') {
      await ctx.reply(
        `🧾 *Nota Pembelian Terbaca!*\n\n` +
        `📝 Item: ${parsed.items || '-'}\n` +
        `💰 Total: ${parsed.total || '-'}`,
        { parse_mode: 'Markdown' }
      );
    } else if (parsed.type === 'barcode' && parsed.sku) {
      await ctx.reply(`📷 *Barcode Terdeteksi: \`${parsed.sku}\`*\nMencari stok gudang...`, { parse_mode: 'Markdown' });
      // Redirect to search logic
      const session = getSession(ctx.chat?.id || 0);
      session.lastQuery = 'SEARCH_MODE';
      ctx.message.text = parsed.sku;
      bot.handleUpdate(ctx.update);
    } else {
      await ctx.reply(`📷 Gambar dikenali: ${parsed.description || 'Tidak dapat diidentifikasi sebagai resi/nota.'}`);
    }
  } catch (error) {
    await ctx.reply('❌ Gagal menganalisis gambar.');
  }
});

// ==================== 🎙️ VOICE COMMAND (Whisper) ====================
bot.on('message:voice', async (ctx) => {
  try {
    await ctx.reply('🎙️ Mendengarkan Voice Note...');
    const file = await ctx.api.getFile(ctx.message.voice.file_id);
    const audioUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    
    // Fetch audio file buffer
    const response = await fetch(audioUrl);
    const buffer = await response.arrayBuffer();
    
    // Convert to File object for Groq SDK
    const audioFile = new File([buffer], "audio.ogg", { type: "audio/ogg" });
    
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-large-v3-turbo",
      response_format: "json",
      language: "id"
    });
    
    const spokenText = transcription.text;
    await ctx.reply(`_"${spokenText}"_\n\n⏳ Menganalisis niat...`, { parse_mode: 'Markdown' });
    
    // Lemparkan text ke handler teks biasa untuk diproses aksinya
    ctx.message.text = spokenText;
    bot.handleUpdate(ctx.update);
    
  } catch (error) {
    console.error('Voice Error:', error);
    await ctx.reply('❌ Gagal memproses perintah suara (Whisper).');
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

    // 1. Cek apakah ini aksi database (kurangi/tambah/kirim)
    const actionIntent = await parseAIIntent(text, session.contextMessages);
    
    if (actionIntent && actionIntent.action !== 'CHAT') {
      // Tampilkan KONFIRMASI, jangan langsung eksekusi
      const allProducts = await db.select().from(products);
      const p = allProducts.find(x => 
        x.sku.toLowerCase().includes(actionIntent.sku.toLowerCase()) || 
        x.name.toLowerCase().includes(actionIntent.sku.toLowerCase())
      );
      
      if (!p) {
        await ctx.reply(`❌ Produk "${actionIntent.sku}" tidak ditemukan.`, { reply_markup: mainMenu });
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
      }

      // Simpan pending action
      session.pendingAction = { ...actionIntent, productId: p.id, productName: p.name };

      const confirmKeyboard = new InlineKeyboard()
        .text('✅ Ya, Lanjutkan', 'confirm_action')
        .text('❌ Batalkan', 'cancel_action');

      await ctx.reply(`⚠️ ${preview}\n\nLanjutkan?`, { parse_mode: 'Markdown', reply_markup: confirmKeyboard });
      return;
    }

    // 2. Jika bukan aksi, jawab sebagai AI Chat (ringkas)
    const topProducts = await db.select({
      name: products.name, stock: products.currentStock
    }).from(products).limit(15);

    const chatReply = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: `Anda adalah "Kaos Kami Bot" di Telegram. Jawab SINGKAT dan PADAT (maks 8 baris). Gunakan emoji. Jangan pernah dump semua data. Jika user bertanya stok umum, arahkan mereka klik tombol "📦 Cek Stok". Data stok sample: ${JSON.stringify(topProducts.slice(0, 8))}` },
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
  const action = session.pendingAction;

  if (!action) {
    await ctx.editMessageText('⚠️ Tidak ada aksi yang menunggu konfirmasi.');
    return;
  }

  try {
    const { parseAndExecuteAIAction } = await import('@/lib/ai-actions');
    // Reconstruct the original command text for the parser
    let cmdText = '';
    if (action.action === 'DEDUCT_STOCK') cmdText = `kurangi stok ${action.sku} ${action.qty}`;
    else if (action.action === 'ADD_STOCK') cmdText = `tambah stok ${action.sku} ${action.qty}`;
    else if (action.action === 'UPDATE_STOCK') cmdText = `ubah stok ${action.sku} jadi ${action.qty}`;
    else if (action.action === 'PROCESS_ORDER') cmdText = `kirim ${action.qty || 1} paket ${action.sku}`;

    const result = await parseAndExecuteAIAction(cmdText, 'telegram', session.contextMessages);
    session.pendingAction = undefined;

    if (result && typeof result === 'object' && result.undoToken) {
      const undoKeyboard = new InlineKeyboard().text('↩️ Undo Aksi Ini', `undo_${result.undoToken}`);
      await ctx.editMessageText(result.message, { parse_mode: 'Markdown', reply_markup: undoKeyboard });
    } else {
      await ctx.editMessageText(result?.message || '✅ Aksi berhasil dieksekusi!', { parse_mode: 'Markdown' });
    }
  } catch (e) {
    session.pendingAction = undefined;
    await ctx.editMessageText('❌ Gagal mengeksekusi aksi.');
  }
});

bot.callbackQuery('cancel_action', async (ctx) => {
  await ctx.answerCallbackQuery('Dibatalkan.');
  const session = getSession(ctx.chat?.id || 0);
  session.pendingAction = undefined;
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
    let ctxStr = contextMessages.map(m => `${m.role}: ${m.content}`).join('\\n');
    const systemContent = `Anda menganalisis pesan dan return JSON. PENTING: Untuk perintah ganti stok, set stok, ubah stok jadi X, pastikan mengembalikan 'UPDATE_STOCK' dengan qty berisi angka tersebut.\nActions: "PROCESS_ORDER","DEDUCT_STOCK","ADD_STOCK","UPDATE_STOCK","CHAT". Format: {"action":"TIPE","sku":"nama","qty":angka}. Jika hanya ngobrol kembalikan "CHAT". \nKonteks Percakapan Sebelumnya: \n${ctxStr}\n\nPesan Saat Ini: "${text}"`;
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

export const POST = webhookCallback(bot, 'std/http');
export const GET = async () => new Response('Telegram webhook is running', { status: 200 });
