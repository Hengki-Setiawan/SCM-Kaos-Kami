import { NextResponse } from 'next/server';
import { db } from '@/db';
import { stockMovements, products } from '@/db/schema';
import { sql } from 'drizzle-orm';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function GET() {
  try {
    // Get movements from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // We only care about OUT movements
    const recentOutMovements = await db.select({
      productId: stockMovements.productId,
      quantity: stockMovements.quantity,
      createdAt: stockMovements.createdAt,
    })
    .from(stockMovements)
    .where(
      sql`${stockMovements.type} = 'OUT' AND ${stockMovements.createdAt} >= ${thirtyDaysAgo.toISOString()}`
    );

    const currentInventory = await db.select({
      id: products.id,
      name: products.name,
      currentStock: products.currentStock,
    }).from(products);

    // Aggregate movements by product
    const movementMap: Record<string, number> = {};
    for (const m of recentOutMovements) {
      if (m.productId) {
        movementMap[m.productId] = (movementMap[m.productId] || 0) + m.quantity;
      }
    }

    // Filter and map to active items only
    const productData = currentInventory.map(p => ({
      id: p.id,
      name: p.name,
      currentStock: p.currentStock,
      totalSold30Days: movementMap[p.id] || 0
    })).filter(p => p.totalSold30Days > 0);

    if (productData.length === 0) {
      return NextResponse.json({ success: true, predictions: [] });
    }

    const prompt = `Anda adalah AI Supply Chain Analyst.
Diberikan data penjualan 30 hari terakhir dan stok saat ini:
${JSON.stringify(productData)}

Tugas Anda:
1. Hitung 'velocityPerDay' (totalSold30Days / 30).
2. Hitung 'estimatedDaysLeft' (currentStock / velocityPerDay). Jika velocity 0, estimatedDaysLeft = 999.
3. Buat 'recommendation' (string max 10 kata).
      
KEMBALIKAN HANYA ARRAY JSON VALID TANPA MARKDOWN atau penjelasan apapun. Format wajib:
[
  { "id": "string", "name": "string", "velocityPerDay": number, "estimatedDaysLeft": number, "recommendation": "string" }
]`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content || '[]';
    // Clean up markdown code blocks if AI disobeys
    const cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    
    try {
      const predictions = JSON.parse(cleanJson);
      // Sort by estimatedDaysLeft ascending (most critical first)
      if (Array.isArray(predictions)) {
        predictions.sort((a, b) => a.estimatedDaysLeft - b.estimatedDaysLeft);
      }
      return NextResponse.json({ success: true, predictions });
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiResponse);
      return NextResponse.json({ success: false, error: "AI returned invalid JSON" });
    }

  } catch (error: any) {
    console.error('Predictive AI Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
