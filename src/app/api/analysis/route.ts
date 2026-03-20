import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';
import { db } from '@/db';
import { products, stockMovements } from '@/db/schema';
import { desc } from 'drizzle-orm';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function GET() {
  try {
    // 1. Kumpulkan data mentah dari database
    const allProducts = await db.select({
      id: products.id,
      name: products.name,
      currentStock: products.currentStock,
      minStock: products.minStock,
      unitPrice: products.unitPrice,
      buyPrice: products.buyPrice
    }).from(products);

    const recentMovements = await db.select({
      type: stockMovements.type,
      qty: stockMovements.quantity,
      createdAt: stockMovements.createdAt
    }).from(stockMovements).orderBy(desc(stockMovements.createdAt)).limit(100);

    // 2. Hitung statistik dasar untuk menghemat token
    let totalItems = 0;
    let totalValue = 0;
    let lowStockItems = [];
    let outOfStockItems = [];

    // Simple analysis
    for (const p of allProducts) {
      totalItems += p.currentStock;
      totalValue += (p.currentStock * (p.buyPrice || 0));

      if (p.currentStock === 0) {
        outOfStockItems.push(p.name);
      } else if (p.currentStock <= p.minStock) {
        lowStockItems.push(`${p.name} (Sisa: ${p.currentStock})`);
      }
    }

    const dataSnapshot = {
      totalKuantitas: totalItems,
      totalNilaiAset: totalValue,
      barangHabis: outOfStockItems,
      barangMenipis: lowStockItems,
      totalSKU: allProducts.length
    };

    // 3. Minta AI Analisis Datanya
    const systemPrompt = `
      Anda adalah Analis Gudang (Supply Chain Manager) untuk "Kaos Kami".
      Tugas Anda adalah membaca data ringkasan stok gudang, lalu membuat Laporan Analisis Kesehatan Gudang (Insight/Saran).
      
      Format respon harus JSON:
      {
        "healthScore": 0-100 (angka integer, 100=sangat sehat),
        "summary": "Ringkasan 2 kalimat tentang kondisi gudang",
        "actionItems": ["Tindakan 1 yang harus segera dilakukan", "Tindakan 2..."],
        "insights": ["Insight tren 1", "Insight 2..."],
        "stats": { "totalItems": angka, "totalValue": angka, "lowStockCount": angka }
      }
      
      DATA GUDANG SAAT INI:
      ${JSON.stringify(dataSnapshot)}
    `;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'system', content: systemPrompt }],
      model: 'llama-3.1-8b-instant',
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const parsedData = JSON.parse(completion.choices[0]?.message?.content || '{}');

    return NextResponse.json({ success: true, analysis: parsedData });

  } catch (error: any) {
    console.error('Analysis API Error:', error);
    return NextResponse.json({ error: 'Gagal memproses analisis.' }, { status: 500 });
  }
}
