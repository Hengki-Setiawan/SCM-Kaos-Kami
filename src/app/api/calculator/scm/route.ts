import { NextResponse } from 'next/server';
import { db } from '@/db';
import { products } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cascadeChat } from '@/lib/groq-cascade';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, data } = body;
    
    let result: any = {};
    let promptInput = '';

    if (type === 'eoq') {
      // Economic Order Quantity: sqrt(2 * D * S / H)
      // D = Annual Demand, S = Order Cost, H = Holding Cost
      const D = Number(data.demand);
      const S = Number(data.orderCost);
      const H = Number(data.holdingCost);
      if (!D || !S || !H) return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
      
      const eoq = Math.sqrt((2 * D * S) / H);
      result = { eoq: Math.ceil(eoq), annualOrders: Math.ceil(D / eoq) };
      promptInput = `Kalkulator EOQ: Demand=${D}, Biaya Pesan=${S}, Biaya Simpan=${H}. Hasil EOQ=${result.eoq}. Beri 1 kalimat rekomendasi bisnis.`;
    } 
    else if (type === 'ss') {
      // Safety Stock: Z * stdDev * sqrt(L)
      const Z = Number(data.serviceLevel) === 99 ? 2.326 : 1.645;
      const stdDev = Number(data.stdDev); // Standard deviation of demand
      const L = Number(data.leadTime); // Lead time in days
      if (!stdDev || !L) return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
      
      const ss = Z * stdDev * Math.sqrt(L);
      result = { safetyStock: Math.ceil(ss) };
      promptInput = `Kalkulator Safety Stock: Z=${Z}, StdDev=${stdDev}, LeadTime=${L}. Hasil SS=${result.safetyStock}. Beri 1 kalimat strategi mitigasi risiko habis barang.`;
    }
    else if (type === 'rop') {
      // Reorder Point = (Lead Time * Avg Daily Demand) + Safety Stock
      const L = Number(data.leadTime);
      const d = Number(data.avgDemand);
      const ss = Number(data.safetyStock);
      if (!L || !d) return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
      
      const rop = (L * d) + (ss || 0);
      result = { rop: Math.ceil(rop) };
      promptInput = `Kalkulator ROP: LeadTime=${L}, AvgDemand=${d}, SafetyStock=${ss}. Hasil ROP=${result.rop}. Jelaskan dengan praktis apa arti angka ini bagi admin gudang.`;
    }
    else if (type === 'bep') {
      // Break Even Point = Fixed Costs / (Price - Variable Cost)
      const fc = Number(data.fixedCost);
      const price = Number(data.price);
      const vc = Number(data.variableCost); // (Buy price + COGS)
      if (!fc || !price || !vc) return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
      if (price <= vc) return NextResponse.json({ error: 'Harga jual harus lebih tinggi dari modal (Variable Cost).' }, { status: 400 });
      
      const bep = fc / (price - vc);
      result = { bepUnits: Math.ceil(bep), bepRevenue: Math.ceil(bep) * price };
      promptInput = `Kalkulator BEP: FixedCost=${fc}, HargaJual=${price}, Modal=${vc}. BEP=${result.bepUnits} pcs. Beri motivasi 1 kalimat untuk sales tim.`;
    }
    else if (type === 'profit') {
      const price = Number(data.price);
      const cost = Number(data.cost);
      if (!price || !cost) return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
      
      const profit = price - cost;
      const margin = (profit / price) * 100;
      const markup = (profit / cost) * 100;
      
      result = { profit, margin: margin.toFixed(2), markup: markup.toFixed(2) };
      promptInput = `Kalkulator Profit: Modal=${cost}, Jual=${price}, Margin=${result.margin}%, Markup=${result.markup}%. Beritahu apakah margin ini sehat untuk bisnis fesyen (idealnya >30%).`;
    }

    // Get an AI insight if possible
    let recommendation = '';
    if (promptInput) {
      try {
        const { result: chat } = await cascadeChat({
          messages: [
            { role: 'system', content: 'Anda konsultan SCM. Berikan rekomendasi 1-2 kalimat B.Indonesia singkat padat tanpa salam atau basa-basi.' },
            { role: 'user', content: promptInput }
          ],
          type: 'fast',
          temperature: 0.3,
        });
        recommendation = chat.choices[0]?.message?.content || '';
      } catch (e) {
        console.warn('AI Recommendation failed in SCM calc:', e);
      }
    }

    return NextResponse.json({ success: true, data: { ...result, recommendation } });

  } catch (error: any) {
    console.error('SCM Calculator Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
