import { db } from '@/db';
import { products, stockMovements, autoDeductRules } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Groq } from 'groq-sdk';
import { v4 as uuidv4 } from 'uuid';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function parseAndExecuteAIAction(text: string, source: 'web' | 'telegram', contextMessages: any[] = []) {
  try {
    const allProducts = await db.select().from(products);
    const catalogStr = allProducts.map(p => `[SKU: ${p.sku}] ${p.name}`).join('\n');

    const systemPrompt = `
      Anda adalah "Action Parser" untuk sistem SCM Kaos Kami.
      Tugas Anda menganalisis pesan user dan mengonversinya menjadi JSON action object.
      
      Valid Actions:
      - "PROCESS_ORDER" (jika user bilang "kirim pesanan", "kirim 1 paket", "proses order")
      - "DEDUCT_STOCK" (jika user bilang "kurangi stok", "jual")
      - "ADD_STOCK" (jika user bilang "tambah stok", "restock", "beli barang")
      - "UPDATE_STOCK" (jika user bilang "ubah stok jadi X", "set stok")
      - "DELETE_PRODUCT" (jika user bilang "hapus produk", "hilangkan barang", "hapus dari database")
      - "CHAT" (jika user sekadar bertanya stok, minta saran, hitung harga, ngobrol)

      Return STRICTLY valid JSON format: 
      {"action": "TIPE", "sku": "nama barang/sku", "qty": angka, "reason": "alasan"}
      
      Contoh Chat: "Aku baru kirim 1 paket kaos hitam L"
      Output JSON: {"action": "PROCESS_ORDER", "sku": "kaos hitam L", "qty": 1, "reason": "Kirim pesanan Telegram"}
      
      Contoh Chat: "Ubah stok kaos putih M jadi 15"
      Output JSON: {"action": "UPDATE_STOCK", "sku": "kaos putih M", "qty": 15, "reason": "Koreksi manual"}
      
      ⚡ SANGAT PENTING: Cocokkan produk yang dimaksud user dengan KATALOG resmimu di bawah ini:
      ${catalogStr}
      
      Isi field "sku" di JSON dengan "SKU" persis atau "Nama" persis dari katalog yang paling cocok dengan ucapan user. Jangan mengarang nama barang.

      Pesan User: "${text}"
      
      Konteks Chat Sebelumnya (Gunakan ini jika User tidak menyebut nama barang secara spesifik): 
      ${JSON.stringify(contextMessages.slice(-5))}
    `;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'system', content: systemPrompt }],
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    const intent = JSON.parse(completion.choices[0]?.message?.content || '{"action": "CHAT"}');

    if (intent.action === 'CHAT' || !intent.sku) {
      return null;
    }

    const p = allProducts.find(x => 
      x.sku.toLowerCase() === intent.sku.toLowerCase() || 
      x.name.toLowerCase() === intent.sku.toLowerCase() ||
      x.sku.toLowerCase().includes(intent.sku.toLowerCase()) || 
      x.name.toLowerCase().includes(intent.sku.toLowerCase())
    );

    if (!p) {
      return { message: `❌ Gagal mengeksekusi aksi. Produk yang mirip dengan '${intent.sku}' tidak ditemukan.` };
    }

    let summary = `✅ Berhasil eksekusi perintah!\n*Produk Utama:* ${p.name}\n`;
    const undoToken = uuidv4();

    // Aksi Single Produk (Add/Update/Deduct Biasa)
    if (['DEDUCT_STOCK', 'ADD_STOCK', 'UPDATE_STOCK'].includes(intent.action)) {
       let newStock = p.currentStock;
       let moveType = 'ADJUSTMENT';

       if (intent.action === 'DEDUCT_STOCK') { newStock = p.currentStock - (intent.qty || 0); moveType = 'OUT'; }
       else if (intent.action === 'ADD_STOCK') { newStock = p.currentStock + (intent.qty || 0); moveType = 'IN'; }
       else if (intent.action === 'UPDATE_STOCK') { newStock = intent.qty || 0; moveType = newStock > p.currentStock ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT'; }

       if (newStock < 0) newStock = 0;
       const diff = Math.abs(newStock - p.currentStock);

       await db.update(products).set({ currentStock: newStock }).where(eq(products.id, p.id));
       
       if (diff > 0) {
         await db.insert(stockMovements).values({
           id: uuidv4(), productId: p.id, type: moveType, quantity: diff, reason: intent.reason || `AI Action (${source})`, createdBy: `ai_${source}`,
           undoToken: undoToken, canBeUndone: true
         });
       }
       summary += `Sisa Stok: ${newStock} pcs\n`;
    }

    // Aksi PROCESS_ORDER (Deduct Produk Utama + Auto Deduct Packaging)
    if (intent.action === 'PROCESS_ORDER') {
       const qtyOrder = intent.qty || 1;
       const newStock = Math.max(0, p.currentStock - qtyOrder);
       
       await db.update(products).set({ currentStock: newStock }).where(eq(products.id, p.id));
       await db.insert(stockMovements).values({
         id: uuidv4(), productId: p.id, type: 'OUT', quantity: qtyOrder, reason: 'Pengiriman via AI Chat', createdBy: `ai_${source}`,
         undoToken: undoToken, canBeUndone: true
       });
       summary += `Produk -${qtyOrder} (Sisa ${newStock})\n\n📦 *Auto Deduct Packaging:*\n`;

       // Jalankan Packaging Rules
       const rules = await db.select().from(autoDeductRules).where(eq(autoDeductRules.isActive, true));
       let deductedItemsCount = 0;

       for (const rule of rules) {
         if (rule.items) {
            const items = JSON.parse(rule.items as string);
            for (const item of items) {
               const packProd = allProducts.find(x => x.id === item.productId);
               if (packProd) {
                  const dedQty = item.quantity * qtyOrder;
                  const newPackStock = Math.max(0, packProd.currentStock - dedQty);
                  
                  await db.update(products).set({ currentStock: newPackStock }).where(eq(products.id, packProd.id));
                  await db.insert(stockMovements).values({
                    id: uuidv4(), productId: packProd.id, type: 'OUT', quantity: dedQty, reason: `Auto Deduct ${rule.name}`, createdBy: `ai_auto`,
                    undoToken: undoToken, canBeUndone: true
                  });

                  summary += `• ${packProd.name}: -${dedQty} (Sisa ${newPackStock})\n`;
                  deductedItemsCount++;
               }
            }
         }
       }
       
       if (deductedItemsCount === 0) {
         summary += '_(Tidak ada aturan packaging aktif)_';
       }
    }

    // Aksi DELETE PRODUCT
    if (intent.action === 'DELETE_PRODUCT') {
       try {
         await db.transaction(async (tx) => {
           await tx.delete(stockMovements).where(eq(stockMovements.productId, p.id));
           await tx.delete(products).where(eq(products.id, p.id));
         });
         summary = `🗑️ *Produk Berhasil Dihapus*\n\nProduk ${p.name} (${p.sku}) beserta riwayat pergerakan stoknya telah dihapus permanen dari sistem.`;
       } catch (error) {
         return { message: `❌ *Penghapusan Gagal*\n\nProduk ${p.name} tidak dapat dihapus karena masih terhubung dengan salah satu Pesanan (Orders) aktif.` };
       }
    }

    return { message: summary, undoToken: intent.action === 'DELETE_PRODUCT' ? null : undoToken };

  } catch (error) {
    console.error('AI Action Parse Error:', error);
    return null;
  }
}
