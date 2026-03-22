import { Groq } from 'groq-sdk';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function run() {
  const text = "tambahkan stok kaos kami skizo hitam ukuranXL 2 pcs di stok kaos jadi";
  const catalogStr = `[SKU: DTF-KAMI-SKIZO-HITAM] DTF Kami Skizo Hitam\n[SKU: Baju-Polos] Baju Polos`;
  const ctxStr = "";

  const systemContent = `ASISTEN GUDANG STRUKTUR: KELUARKAN HANYA JSON.
DAFTAR ACTION:
- "CREATE_PRODUCT": Untuk "tambah barang baru", "tambah jenis", "tambah varian". Wajib kategori.
- "UPDATE_PRODUCT_NAME": Ubah atau ganti nama barang (wajib "sku" lama dari katalog, "newName").
- "ADD_STOCK"/"DEDUCT_STOCK": Update stok produk yang sudah ada di katalog.
- "DELETE_PRODUCTS_BULK": Hapus banyak barang (butuh keyword).
- "CHECK_STOCK": Jika user hanya ingin mengecek stok barang tertentu (wajib "keyword").
- "CHAT": Sapaan santai.

PENTING UNTUK PENCOCOKAN KATALOG:
- JANGAN PERNAH menebak SKU jika pesanan user menyebutkan VARIANT (seperti ukuran XL/L atau jenis kain) yang TIDAK ADA namanya secara persis di KATALOG.
- Jika user pesan "Kaos ukuran XL" namun di katalog hanya ada "M", DILARANG menggunakan SKU "M". Gunakan "CHAT" untuk menolak!
- Wajib cocok 100% jika itu tindakan manipulasi stok.

CONTOH:
User: "tambah dtf skizo putih" -> {"action":"CREATE_PRODUCT","name":"DTF Skizo Putih","category":"dtf","qty":0}
User: "tambah stok kaos hitam 10" -> {"action":"ADD_STOCK","sku":"KAOS-HITAM","qty":10}
User: "ubah nama dtf skizo jadi dtf skizo hitam" -> {"action":"UPDATE_PRODUCT_NAME","sku":"SKIZO", "newName":"DTF Skizo Hitam"}
User: "cek stok kaos hitam" -> {"action":"CHECK_STOCK","keyword":"kaos hitam"}
User: "tambah stok kaos hitam XL 2" (padahal ga ada XL) -> {"action":"CHAT"}

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
