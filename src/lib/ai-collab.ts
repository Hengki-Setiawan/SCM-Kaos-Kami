import { Groq } from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';
import { cascadeChat } from './groq-cascade';
import { logAICall } from './ai-logger';

const gemini = process.env.GEMINI_API_KEY 
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) 
  : null;

/**
 * POLA 1: PIPELINE (Groq parse → Gemini respond)
 * Digunakan untuk Chat, Kalkulator, dan Analisis
 */
export async function pipeline(options: {
  userMessage: string;
  systemPrompt: string;
  context?: { role: string; content: string }[];
  dbData?: any;
  isJson?: boolean;
}) {
  // STEP 1: Groq fast parse (menghemat token & waktu untuk database query)
  const { result: step1 } = await cascadeChat({
    messages: [
      { role: 'system', content: 'Parse user intent based on the message. Return JSON with relevant context.' },
      { role: 'user', content: options.userMessage },
    ],
    type: 'fast',
    temperature: 0.1,
    response_format: { type: 'json_object' },
  });
  
  const parsed = JSON.parse(step1.choices[0]?.message?.content || '{}');
  console.log(`[Pipeline] Step 1 Groq: ${JSON.stringify(parsed).substring(0, 100)}...`);

  // STEP 2: Gemini quality response (bahasa Indonesia natural)
  if (gemini) {
    const startTime = Date.now();
    try {
      const resp = await gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        config: {
          temperature: 0.3,
          systemInstruction: options.systemPrompt,
          ...(options.isJson ? { responseMimeType: 'application/json' } : {})
        },
        contents: [
          ...(options.context || []).map(m => ({
            role: (m.role === 'assistant' ? 'model' : 'user') as 'model' | 'user',
            parts: [{ text: m.content }],
          })),
          { 
            role: 'user', 
            parts: [{ text: `DATA BACKGROUND (Gunakan ini untuk menjawab): ${JSON.stringify(options.dbData || parsed)}\n\nPERTANYAAN USER: ${options.userMessage}` }]
          },
        ],
      });
      logAICall('gemini-2.5-flash', 'gemini', Date.now() - startTime, true, undefined, 'pipeline');
      return { content: resp.text || '', mode: 'groq→gemini', parsed };
    } catch (error: any) {
      logAICall('gemini-2.5-flash', 'gemini', Date.now() - startTime, false, error.message, 'pipeline');
      console.warn('[Pipeline] Gemini failed, falling back to Groq solo.', error.message);
    }
  }

  // DEGRADED: Groq solo (jika Gemini API key tidak ada, atau rate limit)
  try {
    const { result: solo, model } = await cascadeChat({
      messages: [
        { role: 'system', content: options.systemPrompt },
        ...(options.context || []).map(m => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })),
        { role: 'user', content: `DATA: ${JSON.stringify(options.dbData || parsed)}\n\nPERTANYAAN USER: ${options.userMessage}` },
      ],
      type: 'smart',
      temperature: 0.3,
      ...(options.isJson ? { response_format: { type: 'json_object' } } : {})
    });
    return { content: solo.choices[0]?.message?.content || '', mode: `groq-solo-${model}`, parsed };
  } catch (error: any) {
    console.warn('[Pipeline] Groq cascade completely failed.', error.message);
    return { content: '{ "error": "Seluruh AI Provider sedang sibuk. Mohon tunggu beberapa saat." }', mode: 'error', parsed };
  }
}

/**
 * POLA 2: VERIFY (Groq proposes → Gemini verifies)
 * Digunakan untuk aksi stok berbahaya (deduct, delete, dll)
 */
export async function verify(action: any, targetData: any, userMsg: string) {
  if (!gemini) return { approved: true, warning: null }; // Pass through jika tidak ada Gemini

  const startTime = Date.now();
  try {
    const resp = await gemini.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      config: { 
        temperature: 0.1, 
        responseMimeType: 'application/json',
        systemInstruction: `Anda adalah Pengawas Sistem Gudang (Safety Checker).
Tugas Anda memeriksa apakah aksi pada database AMAN berdasarkan pesan pengguna.

Aturan Kritis:
1. Pastikan jumlah (qty) masuk akal dan tidak berisiko mengosongkan stok tanpa alasan.
2. Jika mengurangi stok, pastikan stok tidak menjadi negatif.
3. Apakah aksi sesuai dengan intensi pesan pengguna?

Response format HARUS JSON valid dengan struktur:
{
  "approved": boolean,
  "warning": string | null, // Berikan string pesan peringatan jika ada yang aneh, null jika 100% aman
  "reason": string
}`
      },
      contents: [{ 
        role: 'user', 
        parts: [{ text: `Aksi yang diajukan sistem: ${JSON.stringify(action)}
Data target saat ini: ${JSON.stringify(targetData)}
Pesan asli pengguna: "${userMsg}"

Harap periksa dan return JSON verifikasi.` }]
      }],
    });
    
    logAICall('gemini-2.5-flash-lite', 'gemini', Date.now() - startTime, true, undefined, 'verify');
    return JSON.parse(resp.text || '{"approved":false,"warning":"Response kosong dari Gemini."}');
  } catch (error: any) {
    logAICall('gemini-2.5-flash-lite', 'gemini', Date.now() - startTime, false, error.message, 'verify');
    console.error('[Pipeline] Gemini Verify failed, REJECTING action for safety.', error.message);
    return { approved: false, warning: 'Sistem pengawas AI sedang offline/sibuk. Transaksi berbahaya dibatalkan demi keamanan.' };
  }
}
