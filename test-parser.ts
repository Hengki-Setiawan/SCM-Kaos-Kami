import { Groq } from 'groq-sdk';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function run() {
  const text = "Tambah produk DTF Kami Skizo Putih";
  const catalogStr = "[SKU: TEST] Test Product";
  const ctxStr = "";

  const systemContent = `ASISTEN GUDANG STRUKTUR: KELUARKAN HANYA JSON.
DAFTAR ACTION:
- "CREATE_PRODUCT": Untuk "tambah barang baru", "tambah jenis", "tambah varian". Wajib kategori.
- "ADD_STOCK"/"DEDUCT_STOCK": Update stok produk yang sudah ada di katalog.
- "DELETE_PRODUCTS_BULK": Hapus banyak barang (butuh keyword).
- "CHAT": Sapaan atau tanya stok.

CONTOH:
User: "tambah dtf skizo putih" -> {"action":"CREATE_PRODUCT","name":"DTF Skizo Putih","category":"dtf","qty":0}
User: "tambah stok kaos hitam 10" -> {"action":"ADD_STOCK","sku":"KAOS-HITAM","qty":10}

KATALOG:
${catalogStr}

KONTEKS: ${ctxStr}
USER: "${text}"`;

  try {
      console.log("SENDING TO GROQ...");
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'system', content: systemContent }],
        model: 'llama-3.1-8b-instant',
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });
      console.log("RAW OUTPUT:", completion.choices[0]?.message?.content);
      const parsed = JSON.parse(completion.choices[0]?.message?.content || '{"action":"CHAT"}');
      console.log("PARSED JSON:", parsed);
  } catch (e: any) {
      console.error("GROQ ERROR:", e?.message || e);
  }
}
run();
