import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { db } from '@/db';
import { priceReferences } from '@/db/schema';
import { v4 as uuidv4 } from 'uuid';

import { pipeline } from '@/lib/ai-collab';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST(req: Request) {
  const { requireRole } = await import('@/lib/rbac');
  const roleCheck = await requireRole(['admin', 'manager', 'staff']);
  if (roleCheck) return roleCheck;

  const ip = req.headers.get('x-forwarded-for') || 'anonymous';
  const { allowed } = checkRateLimit(`calc:${ip}`, 20, 60000);
  if (!allowed) return NextResponse.json({ error: 'Terlalu banyak request.' }, { status: 429 });

  try {
    const { input } = await req.json();

    if (!input) {
      return NextResponse.json({ error: 'Input teks diperlukan' }, { status: 400 });
    }

    const systemPrompt = `
      Anda adalah Kalkulator Harga AI untuk bisnis "Kaos Kami".
      Tugas Anda mengekstrak harga satuan dari teks pengguna yang berantakan.
      
      Format response harus JSON:
      {
        "totalPrice": angka,
        "quantity": angka,
        "unit": "string (pcs, pack, lembar, dll)",
        "parsedUnitPrice": angka,
        "recommendation": "Saran harga jual (margin 30-50%) atau insight pendek"
      }
      
      Contoh chat: "polymailer 100 bungkus 25rb"
      Contoh response: 
      {
        "totalPrice": 25000,
        "quantity": 100,
        "unit": "bungkus",
        "parsedUnitPrice": 250,
        "recommendation": "Harga satuan Rp 250 tergolong standard. Jika digunakan sebagai packaging, tambahkan ke HPP produk +Rp 250."
      }
      
      Pesan User: "${input}"
    `;

    const { content } = await pipeline({
      userMessage: input,
      systemPrompt: systemPrompt,
      isJson: true
    });

    const parsedData = JSON.parse(content || '{}');

    // Simpan ke database price_references
    if (parsedData.totalPrice && parsedData.quantity && parsedData.parsedUnitPrice) {
      await db.insert(priceReferences).values({
        id: uuidv4(),
        rawInput: input,
        totalPrice: Number(parsedData.totalPrice),
        quantity: Number(parsedData.quantity),
        unit: parsedData.unit || 'pcs',
        parsedUnitPrice: Number(parsedData.parsedUnitPrice),
        aiResponse: parsedData.recommendation || ''
      });
    }

    return NextResponse.json({ success: true, data: parsedData });

  } catch (error: any) {
    console.error('Calculator API Error:', error);
    return NextResponse.json({ error: 'Gagal memproses kalkulasi.' }, { status: 500 });
  }
}
