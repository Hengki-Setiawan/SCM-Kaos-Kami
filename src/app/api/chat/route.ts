import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { db } from '@/db';
import { products, orders, stockMovements, aiCache, categories } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { parseAIIntent, executeStockActionDirectly } from '@/lib/ai-actions';
import { pipeline } from '@/lib/ai-collab';
import { detectMultiIntent, analyzeTrend } from '@/lib/smart-ai';
import { checkRateLimit } from '@/lib/rate-limiter';
import { requireRole } from '@/lib/rbac';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// O5: AI Response Caching (SQLite Persistent, 5 minutes TTL)
const CACHE_TTL = 5 * 60 * 1000;

export async function POST(req: Request) {
  try {
    // E3: Rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const { allowed } = checkRateLimit(`chat:${ip}`, 10, 60000);
    if (!allowed) return NextResponse.json({ error: 'Terlalu banyak request. Coba lagi dalam 1 menit.' }, { status: 429 });

    const rbacResponse = await requireRole(['admin', 'manager', 'staff']); // Allow staff for now but they shouldn't do dangerous stuff, wait, staff isn't allowed to do dangerous stuff! I will set to admin, manager, staff and rely on bot or I'll just restrict to admin and manager as instructed by the bug fix.
    // Wait, the bug specifically says: "Staff yang login bisa menjalankan semua aksi termasuk hapus produk via AI chat. Fix: Tambahkan middleware RBAC."
    // So let's restrict AI Chat to admin and manager:
    const roleCheck = await requireRole(['admin', 'manager']);
    if (roleCheck) return roleCheck;

    const { message, context, imageUrl, executePending } = await req.json();

    if (executePending) {
       const executed = await executeStockActionDirectly(executePending, 'web');
       return NextResponse.json({ response: executed?.message || 'Aksi dieksekusi.' });
    }

    if (!message && !imageUrl) {
        return NextResponse.json({ error: 'Message or Image is required' }, { status: 400 });
    }

    // 1. VISION LOGIC (Jika ada gambar)
    if (imageUrl) {
      const visionPrompt = `Anda adalah AI Vision SCM "Kaos Kami". Analisis gambar ini dan tentukan TIPE:
      1. **PRODUK** — Identifikasi warna, ukuran, jenis. Cocokkan dengan katalog.
      2. **RESI/NOTA** — Ekstrak: customerName, trackingNumber, platform, items.
      3. **NOTA_PENGELUARAN** — Ekstrak: title, amount, items, vendor.
      4. **LAINNYA** — Ringkasan apa yang terlihat.
      
      Gunakan bahasa Indonesia yang santai tapi profesional. Berikan saran aksi.`;

      const visionCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: visionPrompt + (message ? `\nPesan user: "${message}"` : '') },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        model: 'llama-3.2-11b-vision-preview',
        temperature: 0.2,
        max_tokens: 1024,
      });

      return NextResponse.json({ 
        response: visionCompletion.choices[0]?.message?.content || 'Gagal menganalisis gambar.'
      });
    }

    // 2. CHAT LOGIC (Standard text flow)
    // Ekstrak nama produk terakhir jika konteks ada
    let lastProductName = '';
    const lastAsstMsg = context && context.length > 0 ? context.filter((m: any) => m.role === 'assistant').pop() : null;
    if (lastAsstMsg) {
       // heuristik sederhana ambil teks tebal pertama yang mungkin nama barang
       const match = lastAsstMsg.text.match(/\*([^*]+)\*/);
       if (match) lastProductName = match[1];
    }
    
    // Transformasi context ke format role-content
    // Limit context history to max 8 elements to save tokens and prevent overload (Sliding Window Memory)
    const formattedCtx = (context || []).slice(-8).map((msg: any) => ({ role: msg.role, content: msg.text }));

    // 1. Cek Multi-Intent (Batch Operations)
    const multiIntents = detectMultiIntent(message);
    if (multiIntents.length > 1 && !message.toLowerCase().includes('buat pesanan')) {
      let summary = '📦 *Eksekusi Massal Web AI:*\n\n';
      let successCount = 0;
      
      for (const mi of multiIntents) {
          const fakeText = `${mi.action} ${mi.productQuery} ${mi.qty}`;
          const singleIntent = await parseAIIntent(fakeText, formattedCtx, lastProductName);
          
          if (singleIntent && singleIntent.action !== 'CHAT') {
             const res = await executeStockActionDirectly(singleIntent, 'web');
             if (res && res.message) {
                 summary += res.message.replace(/✅ Berhasil eksekusi perintah!\n/, '✅ ') + '\n\n';
                 successCount++;
             } else {
                 summary += `❌ Gagal memproses: ${mi.productQuery}\n\n`;
             }
          }
      }
      
      if (successCount > 0) {
         return NextResponse.json({ response: summary });
      }
    }

    // 2. Cek aksi tunggal (Single Intent)
    const actionResult = await parseAIIntent(message, formattedCtx, lastProductName);
    if (actionResult && actionResult.action !== 'CHAT') {
       return NextResponse.json({
          pendingAction: actionResult,
          response: `🤖 **Konfirmasi Aksi Sistem**\n\nTampaknya Anda ingin melakukan:\n- **Aksi:** \`${actionResult.action}\`\n- **Target:** *${actionResult.sku || actionResult.name || actionResult.keyword || '-'}*\n- **Jumlah/Data:** ${actionResult.qty || actionResult.newName || '-'}\n\nApakah Anda yakin ingin mengeksekusi ini ke Database?`
       });
    }

    // 3. Fallback CHAT (Business Intelligence & Saran)
    const cacheRawKey = `${message}_${context?.length || 0}`;
    const cacheKey = crypto.createHash('md5').update(cacheRawKey).digest('hex');
    
    try {
      await db.run(sql`
        CREATE TABLE IF NOT EXISTS ai_cache (
          id TEXT PRIMARY KEY,
          messages_hash TEXT NOT NULL UNIQUE,
          response TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
        )
      `);
    } catch(e) {}

    const [cachedData] = await db.select().from(aiCache).where(eq(aiCache.messagesHash, cacheKey));
    if (cachedData) {
       const createdTime = new Date(`${cachedData.createdAt}Z`).getTime();
       if (Date.now() - createdTime < CACHE_TTL) {
         return NextResponse.json({ 
            response: cachedData.response,
            ai_mode: 'cache'
         });
       } else {
         await db.delete(aiCache).where(eq(aiCache.id, cachedData.id));
       }
    }

    const allProducts = await db.select().from(products);
    const allCategories = await db.select().from(categories);
    const recentOrders = await db.select({ orderNum: orders.orderNumber, status: orders.status }).from(orders).limit(5).orderBy(desc(orders.createdAt));
    
    // BI Data Injection (Analysis, HPP, dsb)
    const allMovements = await db.select().from(stockMovements).limit(1000).orderBy(desc(stockMovements.createdAt));
    const trendAnalysis = analyzeTrend(allMovements, allProducts);

    const systemPrompt = `
      Anda adalah Llama Super AI untuk Sistem SCM "Kaos Kami".
      Anda pintar menghitung Harga Pokok Penjualan (HPP) / Profit margin, membaca daftar array context, dan menganalisis data tren Business Intelligence.
      Gunakan bahasa Indonesia yang santai, terstruktur rapi dengan format Markdown murni (**tebal**, *miring*, list, tabel, dll) agar mudah dibaca. JANGAN SAYA/AKU, panggil diri Anda "AI Assistant" atau "Bot SCM".
      
      DATA GUDANG TERKINI:
      - Total Varian Produk: ${allProducts.length}
      - Produk Stok Rendah (< Minimal): ${allProducts.filter(p => p.currentStock <= p.minStock).map(p => `${p.name} (Sisa ${p.currentStock}/${p.minStock})`).join(', ') || 'Semua Aman'}
      - Top Seller Mingguan: ${trendAnalysis.topSellers.map(t => t.name).join(', ')}
      - Produk Sedang Naik Tren: ${trendAnalysis.rising.map(t => t.name).join(', ')}
      - Produk Sedang Turun Tren: ${trendAnalysis.falling.map(t => t.name).join(', ')}
      
      PENCOCOKAN PRODUK (Dari Pesan User):
      ${(() => {
        const msgLower = message.toLowerCase();
        const matched = allProducts.filter(p => {
          const nameMatch = p.name.toLowerCase().includes(msgLower) || msgLower.includes(p.name.toLowerCase());
          const skuMatch = p.sku.toLowerCase().includes(msgLower) || msgLower.includes(p.sku.toLowerCase());
          const cat = allCategories.find(c => c.id === p.categoryId);
          const catMatch = cat && (cat.name.toLowerCase().includes(msgLower) || msgLower.includes(cat.name.toLowerCase()));
          return nameMatch || skuMatch || catMatch;
        }).slice(0, 15);
        return matched.map(p => `- [${p.sku}] ${p.name}: Stok=${p.currentStock}, Min=${p.minStock}`).join('\n') || 'Tidak ada produk spesifik disebutkan.';
      })()}
      
      PESANAN TERAKHIR:
      ${JSON.stringify(recentOrders)}
      
      Aturan Menjawab:
      1. Jika user bertanya "Prediksi habis" atau "Tren", jawablah dengan wawasan Business Intelligence di atas.
      2. Jika user meminta "Kalkulator HPP" atau minta dihitungkan "margin 30%", BERIKAN RUMUS HITUNGAN PASTI! (Harga Beli + (Harga Beli * margin)). Harga Beli / Unit Price ada di DB tapi asumsikan secara umum jika tidak detail.
      3. Jika user merujuk "barang ke-2" atau referensi berurutan, selidiki Array KONTEKS untuk mencari pesan sebelumnya.
      4. Jangan membuat-buat detail stok secara persis jika angkanya meragukan, tapi Anda BOLEH memberitahu ringkasan kasarnya.
      5. Peringatkan user jika tren penjualan suatu barang sedang jatuh (falling).
    `;

    const { content, mode } = await pipeline({
      userMessage: message,
      systemPrompt: systemPrompt,
      context: formattedCtx,
      dbData: { products: allProducts.length, recentOrders, trends: trendAnalysis }
    });

    if (content) {
      try {
        await db.insert(aiCache).values({
          id: uuidv4(),
          messagesHash: cacheKey,
          response: content
        }).onConflictDoUpdate({
          target: aiCache.messagesHash,
          set: { response: content, createdAt: sql`CURRENT_TIMESTAMP` }
        });
      } catch (e) {
        console.error('Failed to cache response to Turso:', e);
      }
    }

    return NextResponse.json({ 
      response: content || 'Maaf, saya tidak bisa memproses permintaan itu.',
      ai_mode: mode
    });

  } catch (error: any) {
    console.error('Groq AI Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
