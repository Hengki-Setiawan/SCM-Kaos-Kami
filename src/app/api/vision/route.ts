import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

import { checkRateLimit } from '@/lib/rate-limiter';

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'anonymous';
  const { allowed } = checkRateLimit(`vision:${ip}`, 5, 60000);
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analisis gambar struk/resi pengiriman ini. 
              Tolong ekstrak informasi berikut ke dalam format JSON:
              - customerName (Nama pembeli)
              - trackingNumber (Nomor resi/pelacakan)
              - platform (Shopee / Tokopedia / TikTok / Manual)
              
              Jika ada informasi yang buram atau tidak ada, biarkan kosong ("").
              Hanya kembalikan string JSON yang valid, tanpa tambahan teks apapun.`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      // Llama 3 Vision model
      model: 'llama-3.2-11b-vision-preview',
      temperature: 0.2,
      max_tokens: 1024,
      response_format: { type: 'json_object' }
    });

    const parsedData = JSON.parse(completion.choices[0]?.message?.content || '{}');

    return NextResponse.json({ 
      success: true, 
      data: parsedData
    });

  } catch (error: any) {
    console.error('Groq Vision error:', error);
    return NextResponse.json({ error: error.message || 'Gagal menganalisis gambar' }, { status: 500 });
  }
}
