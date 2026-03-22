import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { db } from '@/db';
import { products, orders, stockMovements } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { parseAIIntent, executeStockActionDirectly } from '@/lib/ai-actions';
import { detectMultiIntent, analyzeTrend } from '@/lib/smart-ai';
import { checkRateLimit } from '@/lib/rate-limiter';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    // E3: Rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const { allowed } = checkRateLimit(`chat:${ip}`, 10, 60000);
    if (!allowed) return NextResponse.json({ error: 'Terlalu banyak request. Coba lagi dalam 1 menit.' }, { status: 429 });

    const { message, context } = await req.json();

    if (!message) {
        return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Ekstrak nama produk terakhir jika konteks ada
    let lastProductName = '';
    const lastAsstMsg = context && context.length > 0 ? context.filter((m: any) => m.role === 'assistant').pop() : null;
    if (lastAsstMsg) {
       // heuristik sederhana ambil teks tebal pertama yang mungkin nama barang
       const match = lastAsstMsg.text.match(/\*([^*]+)\*/);
       if (match) lastProductName = match[1];
    }
    
    // Transformasi context ke format role-content
    const formattedCtx = (context || []).map((msg: any) => ({ role: msg.role, content: msg.text }));

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
       const executed = await executeStockActionDirectly(actionResult, 'web');
       if (executed && executed.message) {
          return NextResponse.json({ response: executed.message });
       }
    }

    // 3. Fallback CHAT (Business Intelligence & Saran)
    const allProducts = await db.select().from(products);
    const recentOrders = await db.select({ orderNum: orders.orderNumber, status: orders.status }).from(orders).limit(5).orderBy(desc(orders.createdAt));
    
    // BI Data Injection (Analysis, HPP, dsb)
    const allMovements = await db.select().from(stockMovements).limit(1000).orderBy(desc(stockMovements.createdAt));
    const trendAnalysis = analyzeTrend(allMovements, allProducts);

    const systemPrompt = `
      Anda adalah Llama Super AI untuk Sistem SCM "Kaos Kami".
      Anda pintar menghitung Harga Pokok Penjualan (HPP) / Profit margin, membaca daftar array context, dan menganalisis data tren Business Intelligence.
      Gunakan bahasa Indonesia yang santai, terstruktur rapi dengan format Markdown, tapi profesional! JANGAN SAYA/AKU, panggil diri Anda "AI Assistant" atau "Bot SCM".
      
      DATA GUDANG TERKINI:
      - Total Varian Produk: ${allProducts.length}
      - Top Seller Mingguan: ${trendAnalysis.topSellers.map(t => t.name).join(', ')}
      - Produk Sedang Naik Tren: ${trendAnalysis.rising.map(t => t.name).join(', ')}
      - Produk Sedang Turun Tren: ${trendAnalysis.falling.map(t => t.name).join(', ')}
      
      PESANAN TERAKHIR:
      ${JSON.stringify(recentOrders)}
      
      Aturan Menjawab:
      1. Jika user bertanya "Prediksi habis" atau "Tren", jawablah dengan wawasan Business Intelligence di atas.
      2. Jika user meminta "Kalkulator HPP" atau minta dihitungkan "margin 30%", BERIKAN RUMUS HITUNGAN PASTI! (Harga Beli + (Harga Beli * margin)). Harga Beli / Unit Price ada di DB tapi asumsikan secara umum jika tidak detail.
      3. Jika user merujuk "barang ke-2" atau referensi berurutan, selidiki Array KONTEKS untuk mencari pesan sebelumnya.
      4. Jangan membuat-buat detail stok secara persis jika angkanya meragukan, tapi Anda BOLEH memberitahu ringkasan kasarnya.
      5. Peringatkan user jika tren penjualan suatu barang sedang jatuh (falling).
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...formattedCtx,
        { role: 'user', content: message }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.3,
      max_tokens: 1024,
    });

    return NextResponse.json({ 
      response: chatCompletion.choices[0]?.message?.content || 'Maaf, saya tidak bisa memproses permintaan itu.'
    });

  } catch (error: any) {
    console.error('Groq AI Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
