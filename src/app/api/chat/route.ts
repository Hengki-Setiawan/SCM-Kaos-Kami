import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { db } from '@/db';
import { products, orders } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { parseAndExecuteAIAction } from '@/lib/ai-actions';
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

    // 1. Cek apakah pesan ini berisikan NIAT UNTUK MUTASI DATABASE
    const actionResult = await parseAndExecuteAIAction(message, 'web');
    if (actionResult !== null) {
      // Jika AI mendeteksi ini sebuah command (DEDUCT, UPDATE, dsb), dia akan mereturn string konfirmasi langsung
      return NextResponse.json({ response: actionResult });
    }

    // 2. Jika bukan Command Aksi, berarti ini Chat Info/Analisa biasa
    // Gather basic system context from DB
    const allProducts = await db.select({ name: products.name, sku: products.sku, stock: products.currentStock }).from(products);
    const recentOrders = await db.select({ orderNum: orders.orderNumber, status: orders.status }).from(orders).limit(5).orderBy(desc(orders.createdAt));

    const systemPrompt = `
      Anda adalah Asisten AI untuk Sistem SCM "Kaos Kami".
      Anda membantu Hengki Setiawan mengelola stok gudang, menganalisis data, dan memproses pesanan.
      Gunakan bahasa Indonesia yang santai tapi profesional.
      
      DATA STOK SAAT INI (Ringkasan):
      ${JSON.stringify(allProducts.slice(0, 50))} // Max 50 untuk menjaga context size
      
      PESANAN TERAKHIR:
      ${JSON.stringify(recentOrders)}
      
      Aturan:
      1. Jika user bertanya data stok spesifik, berikan datanya dengan akurat berdasarkan array JSON di atas.
      2. Jangan membuat-buat data stok jika tidak ada dalam daftar.
      3. Jika pengguna meminta opini atau analisis bisnis, berikan jawaban cerdas selayaknya konsultan bisnis.
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...context.map((msg: any) => ({ role: msg.role, content: msg.text })),
        { role: 'user', content: message }
      ],
      model: 'llama-3.1-8b-instant',
      temperature: 0.5,
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
