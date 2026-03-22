import { Groq } from 'groq-sdk';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function run() {
  const text = "Hapus semua varian kaos Polyester di database";
  
  const catalogStr = "[SKU: KPH-S] Kaos Polos Hitam S\n[SKU: KPH-M] Kaos Polos Hitam M";
  const systemContent = `Anda menganalisis pesan dan return JSON. Anda adalah SUPER ADMIN BOT — bisa melakukan SEMUA operasi CRUD pada seluruh database.\nPENTING: Untuk perintah ganti stok, pastikan mengembalikan 'UPDATE_STOCK' dengan qty berisi angka tersebut.\n\nActions GUDANG (butuh "sku"): "PROCESS_ORDER","DEDUCT_STOCK","ADD_STOCK","UPDATE_STOCK","DELETE_PRODUCT".\nActions GUDANG MASSAL (hapus banyak barang sekaligus berdasarkan merk/tipe, butuh "keyword"): "DELETE_PRODUCTS_BULK".\nActions PESANAN (butuh "orderNumber","customerName","sku","qty","platform","newStatus"): "CREATE_ORDER","DELETE_ORDER","UPDATE_ORDER_STATUS".\nActions KATEGORI (butuh "name","icon"): "CREATE_CATEGORY","DELETE_CATEGORY".\nActions SUPPLIER (butuh "name","phone"): "CREATE_SUPPLIER","DELETE_SUPPLIER".\nActions BIAYA: "LOG_EXPENSE" (butuh "title","category","qty" as Rp).\nActions LAINNYA: "CHAT".\n\nFormat JSON: {"action":"TIPE","sku":"namasku","keyword":"kata kunci","qty":angka,"title":"...","category":"...","name":"...","icon":"...","phone":"...","orderNumber":"...","customerName":"...","platform":"...","newStatus":"..."}.\n\n⚡ PENTING: Jika menghapus BANYAK/SEMUA jenis barang (contoh: "hapus semua jenis kaos hitam"), gunakan action DELETE_PRODUCTS_BULK dengan keyword "kaos hitam". Jika hanya gudang biasa, cocokkan dg KATALOG INI:\n${catalogStr}\n\nKonteks Sebelumnya: \n\nPesan Saat Ini: "${text}"`;
  
  const completion = await groq.chat.completions.create({
    messages: [{ role: 'system', content: systemContent }],
    model: 'llama-3.1-8b-instant',
    temperature: 0.1,
    response_format: { type: 'json_object' }
  });
  console.log("LLM Response:");
  console.log(completion.choices[0]?.message?.content);
}

run().catch(console.error);
