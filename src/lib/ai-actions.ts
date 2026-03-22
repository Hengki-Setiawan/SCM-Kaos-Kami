import { db } from '@/db';
import { products, stockMovements, autoDeductRules, categories, suppliers, orders, orderItems } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { Groq } from 'groq-sdk';
import { v4 as uuidv4 } from 'uuid';

// ==================== NON-PRODUCT CRUD ACTIONS ====================
// Handles: CREATE_ORDER, DELETE_ORDER, UPDATE_ORDER_STATUS,
//          CREATE_CATEGORY, DELETE_CATEGORY, CREATE_SUPPLIER, DELETE_SUPPLIER

export async function executeNonProductAction(action: any) {
  try {
    // --- CATEGORY CRUD ---
    if (action.action === 'CREATE_CATEGORY') {
      const slug = (action.name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await db.insert(categories).values({
        id: uuidv4(),
        name: action.name,
        slug: slug,
        icon: action.icon || '📦',
        description: action.description || null,
      });
      return { message: `✅ *Kategori Baru Ditambahkan!*\n\n${action.icon || '📦'} *${action.name}*\nSlug: \`${slug}\`` };
    }

    if (action.action === 'CREATE_PRODUCT') {
      const allCats = await db.select().from(categories);
      const catName = (action.category || '').toLowerCase();
      const cat = allCats.find(c => 
        c.name.toLowerCase().includes(catName) || 
        c.slug.toLowerCase().includes(catName)
      );
      
      if (!cat) return { message: `❌ Kategori "${action.category}" tidak ditemukan. Silakan buat kategorinya dulu.` };

      const name = action.name || 'Produk Baru';
      // Generate SKU if missing
      const sku = (action.sku || name.toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '')).slice(0, 20);
      
      const [existing] = await db.select().from(products).where(eq(products.sku, sku));
      if (existing) return { message: `❌ Produk dengan SKU \`${sku}\` sudah ada (${existing.name}).` };

      await db.insert(products).values({
        id: uuidv4(),
        categoryId: cat.id,
        name: name,
        sku: sku,
        unit: action.unit || 'pcs',
        unitPrice: action.unitPrice || 0,
        buyPrice: action.buyPrice || 0,
        currentStock: action.qty || 0,
        minStock: 0,
        isActive: true,
      });

      return { message: `✅ *Produk Berhasil Ditambahkan!*\n\n📦 *${name}*\nSKU: \`${sku}\`\n📁 Kategori: *${cat.name}*\n🔢 Stok Awal: *${action.qty || 0}*` };
    }

    if (action.action === 'UPDATE_PRODUCT_NAME') {
      const targetSku = (action.sku || '').toLowerCase();
      if (!targetSku) return { message: `❌ Gagal menemukan referensi SKU barang yang dimaksud.` };
      if (!action.newName) return { message: `❌ Nama produk baru harus jelas disertakan.` };

      const allProds = await db.select().from(products);
      const prod = allProds.find(p => p.sku.toLowerCase().includes(targetSku) || p.name.toLowerCase().includes(targetSku));

      if (!prod) return { message: `❌ Tidak ditemukan produk yang cocok dengan pencarian sku "${action.sku}".` };

      // Update name
      await db.update(products).set({ name: action.newName, updatedAt: new Date().toISOString() }).where(eq(products.id, prod.id));

      return { message: `📝 *Nama Produk Diperbarui*\n\nDari: *${prod.name}*\nMenjadi: *${action.newName}*` };
    }

    if (action.action === 'DELETE_CATEGORY') {
      const allCats = await db.select().from(categories);
      const cat = allCats.find(c =>
        c.name.toLowerCase().includes((action.name || '').toLowerCase()) ||
        c.slug.toLowerCase().includes((action.name || '').toLowerCase())
      );
      if (!cat) return { message: `❌ Kategori "${action.name}" tidak ditemukan.` };

      // Cek apakah ada produk di kategori ini
      const prodsInCat = await db.select().from(products).where(eq(products.categoryId, cat.id));
      if (prodsInCat.length > 0) {
        return { message: `❌ *Gagal Hapus Kategori*\n\nKategori "${cat.name}" masih memiliki *${prodsInCat.length} produk* di dalamnya. Pindahkan atau hapus produk tersebut terlebih dahulu.` };
      }
      await db.delete(categories).where(eq(categories.id, cat.id));
      return { message: `🗑️ *Kategori "${cat.name}" Berhasil Dihapus*` };
    }

    // --- SUPPLIER CRUD ---
    if (action.action === 'CREATE_SUPPLIER') {
      await db.insert(suppliers).values({
        id: uuidv4(),
        name: action.name,
        phone: action.phone || null,
        contactPerson: action.contactPerson || null,
        address: action.address || null,
        notes: action.notes || null,
      });
      return { message: `✅ *Supplier Baru Ditambahkan!*\n\n👤 *${action.name}*${action.phone ? `\n📱 ${action.phone}` : ''}` };
    }

    if (action.action === 'DELETE_SUPPLIER') {
      const allSuppliers = await db.select().from(suppliers);
      const sup = allSuppliers.find(s =>
        s.name.toLowerCase().includes((action.name || '').toLowerCase())
      );
      if (!sup) return { message: `❌ Supplier "${action.name}" tidak ditemukan.` };
      await db.delete(suppliers).where(eq(suppliers.id, sup.id));
      return { message: `🗑️ *Supplier "${sup.name}" Berhasil Dihapus*` };
    }
    
    // --- BULK PRODUCT DELETE ---
    if (action.action === 'DELETE_PRODUCTS_BULK') {
      const keyword = (action.keyword || '').toLowerCase().trim();
      if (!keyword) return { message: `❌ Keyword kosong.` };
      
      const keywords = keyword.split(/\s+/).filter((k: string) => k.length > 0);
      const allProds = await db.select().from(products);
      const matched = allProds.filter(p => {
          const nameLower = p.name.toLowerCase();
          const skuLower = p.sku.toLowerCase();
          return keywords.every((k: string) => nameLower.includes(k)) || keywords.every((k: string) => skuLower.includes(k));
      });
      
      if (matched.length === 0) return { message: `❌ Tidak menemukan produk dengan keyword "${keyword}".` };
      
      await db.transaction(async (tx) => {
          for (const p of matched) {
              await tx.delete(stockMovements).where(eq(stockMovements.productId, p.id));
              await tx.delete(products).where(eq(products.id, p.id));
          }
      });
      return { message: `🗑️ *${matched.length} Produk Berhasil Dihapus Permanen!*\n\nSemua barang yang mengandung kata "${keyword}" beserta riwayat pergerakannya telah lenyap dari database.` };
    }

    // --- ORDER CRUD ---
    if (action.action === 'CREATE_ORDER') {
      // Get product for the order
      const allProds = await db.select().from(products);
      const p = allProds.find(x =>
        x.sku.toLowerCase().includes((action.sku || '').toLowerCase()) ||
        x.name.toLowerCase().includes((action.sku || '').toLowerCase())
      );
      if (!p) return { message: `❌ Produk "${action.sku}" tidak ditemukan untuk pesanan.` };

      const qty = action.qty || 1;
      if (p.currentStock < qty) {
        return { message: `❌ Stok ${p.name} tidak cukup (sisa: ${p.currentStock}, diminta: ${qty}).` };
      }

      const orderId = uuidv4();
      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const totalPrice = (p.unitPrice || 0) * qty;

      await db.transaction(async (tx) => {
        await tx.insert(orders).values({
          id: orderId, orderNumber,
          customerName: action.customerName || 'Pelanggan Telegram',
          platform: action.platform || 'telegram',
          status: 'processing', totalPrice,
        });
        await tx.insert(orderItems).values({
          id: uuidv4(), orderId, productId: p.id,
          quantity: qty, unitPrice: p.unitPrice || 0,
        });
        // Deduct stock
        await tx.update(products).set({ currentStock: p.currentStock - qty }).where(eq(products.id, p.id));
        await tx.insert(stockMovements).values({
          id: uuidv4(), productId: p.id, type: 'OUT',
          quantity: qty, reason: `Order ${orderNumber} via Telegram`,
          createdBy: 'ai_telegram',
        });
      });

      return { message: `✅ *Pesanan Baru Dibuat!*\n\n📋 No: \`${orderNumber}\`\n👤 ${action.customerName || 'Pelanggan Telegram'}\n📦 ${p.name} x${qty}\n💰 Rp ${new Intl.NumberFormat('id-ID').format(totalPrice)}\n📉 Sisa stok: ${p.currentStock - qty}` };
    }

    if (action.action === 'DELETE_ORDER') {
      const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
      const ord = allOrders.find(o =>
        o.orderNumber.toLowerCase().includes((action.orderNumber || '').toLowerCase()) ||
        o.customerName.toLowerCase().includes((action.orderNumber || '').toLowerCase())
      );
      if (!ord) return { message: `❌ Pesanan "${action.orderNumber}" tidak ditemukan.` };

      // Return stock
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, ord.id));
      await db.transaction(async (tx) => {
        for (const item of items) {
          const [prod] = await tx.select().from(products).where(eq(products.id, item.productId));
          if (prod) {
            await tx.update(products).set({ currentStock: prod.currentStock + item.quantity }).where(eq(products.id, prod.id));
          }
        }
        await tx.delete(orderItems).where(eq(orderItems.orderId, ord.id));
        await tx.delete(orders).where(eq(orders.id, ord.id));
      });
      return { message: `🗑️ *Pesanan ${ord.orderNumber} Dihapus*\n\n👤 ${ord.customerName}\nStok yang terpotong telah dikembalikan.` };
    }

    if (action.action === 'UPDATE_ORDER_STATUS') {
      const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
      const ord = allOrders.find(o =>
        o.orderNumber.toLowerCase().includes((action.orderNumber || '').toLowerCase()) ||
        o.customerName.toLowerCase().includes((action.orderNumber || '').toLowerCase())
      );
      if (!ord) return { message: `❌ Pesanan "${action.orderNumber}" tidak ditemukan.` };

      const validStatuses = ['pending', 'processing', 'shipped', 'completed', 'cancelled'];
      const newStatus = (action.newStatus || '').toLowerCase();
      if (!validStatuses.includes(newStatus)) {
        return { message: `❌ Status "${action.newStatus}" tidak valid. Pilihan: ${validStatuses.join(', ')}` };
      }
      await db.update(orders).set({ status: newStatus, updatedAt: new Date().toISOString() }).where(eq(orders.id, ord.id));
      return { message: `✅ *Status Pesanan Diperbarui*\n\n📋 ${ord.orderNumber}\n👤 ${ord.customerName}\n📌 ${ord.status} → *${newStatus}*` };
    }

    return { message: '❌ Aksi tidak dikenali.' };
  } catch (error: any) {
    console.error('Non-Product Action Error:', error);
    return { message: `❌ Gagal mengeksekusi: ${error.message || 'Kesalahan tidak diketahui'}` };
  }
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ==================== AI INTENT PARSER (Lightweight & Universal) ====================
export async function parseAIIntent(text: string, contextMessages: {role: string, content: string}[] = [], lastProductName?: string) {
  try {
    const allProd = await db.select({ sku: products.sku, name: products.name }).from(products);
    const catalogStr = allProd.map(p => `[SKU: ${p.sku}] ${p.name}`).join('\\n');
    let ctxStr = contextMessages.map(m => `${m.role}: ${m.content}`).join('\\n');
    
    // Auto-inject context if user says e.g "tambah 5"
    let userText = text;
    if (lastProductName && (text.toLowerCase().match(/^(tambah|kurangi|beli|jual|pesan|kirim|masukin)\s*\d+$/))) {
       userText = `${text} ${lastProductName}`;
    }

    const systemContent = `ASISTEN GUDANG STRUKTUR: KELUARKAN HANYA JSON.
DAFTAR ACTION:
- "CREATE_PRODUCT": Untuk "tambah barang baru", "tambah jenis", "tambah varian". Wajib kategori.
- "UPDATE_PRODUCT_NAME": Ubah atau ganti nama barang (wajib "sku" lama dari katalog, "newName").
- "ADD_STOCK"/"DEDUCT_STOCK": Update stok produk yang sudah ada di katalog.
- "DELETE_PRODUCTS_BULK": Hapus banyak barang (butuh keyword).
- "CHECK_STOCK": Jika user ingin mengecek stok barang tertentu ATAU ingin melihat isi sebuah KATEGORI (misal: "buka kategori kaos", "stok baju jadi"). Wajib isi "keyword".
- "CHAT": Sapaan santai. Membalas pertanyaan seputar stok atau kalkulator profit/HPP.

PENTING UNTUK PENCOCOKAN KATALOG:
- Jika user bertanya tentang KATEGORI (contoh: "buka kategori baju jadi"), gunakan "CHECK_STOCK" dengan keyword "baju jadi".
- Jika konteks percakapan di atas berisi daftar bernomor (contoh: "1. Kaos", "2. Baju"), lalu user merujuk pada "barang ke-2", "yang kedua", atau variannya, terjemahkan referensi indeks itu menjadi nama barang yang sebenarnya berdasarkan urutan di Konteks! 
- JANGAN PERNAH menebak SKU jika pesanan user menyebutkan VARIANT (seperti ukuran XL/L atau jenis kain) yang TIDAK ADA namanya secara persis di KATALOG.
- Konteks produk terakhir yang dibahas: "${lastProductName || 'Belum ada'}"
- Jika user pesan "Kaos ukuran XL" namun di katalog hanya ada "M", DILARANG menggunakan SKU "M". Gunakan "CHAT" untuk menolak!
- Wajib cocok 100% jika itu tindakan manipulasi stok.

CONTOH:
Konteks: "assistant: ... 1. Ganci 2. Kaos Skizo"
User: "kategori dari barang yang ke 2" -> {"action":"CHAT", "kategori_dari": "Kaos Skizo"}
User: "tambah dtf skizo putih" -> {"action":"CREATE_PRODUCT","name":"DTF Skizo Putih","category":"dtf","qty":0}
User: "tambah stok kaos hitam 10" -> {"action":"ADD_STOCK","sku":"KAOS-HITAM","qty":10}
User: "tambah 5" (bila konteks produk terakhir "Kaos Polos Hitam XL") -> {"action":"ADD_STOCK","sku":"Kaos Polos Hitam XL","qty":5}
User: "ubah nama dtf skizo jadi dtf skizo hitam" -> {"action":"UPDATE_PRODUCT_NAME","sku":"SKIZO", "newName":"DTF Skizo Hitam"}
User: "cek stok kaos hitam" -> {"action":"CHECK_STOCK","keyword":"kaos hitam"}
User: "buka kategori baju jadi" -> {"action":"CHECK_STOCK","keyword":"baju jadi"}
User: "tambah stok kaos hitam XL 2" (padahal ga ada XL) -> {"action":"CHAT"}

KATALOG:
${catalogStr}

KONTEKS: ${ctxStr}
USER: "${userText}"`;
    
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'system', content: systemContent }],
      model: 'llama-3.1-8b-instant',
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });
    return JSON.parse(completion.choices[0]?.message?.content || '{"action":"CHAT"}');
  } catch {
    return null;
  }
}

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

    return await executeStockActionDirectly(intent, source, contextMessages);

  } catch (error) {
    console.error('AI Action Parse Error:', error);
    return null;
  }
}

export async function executeStockActionDirectly(intent: any, source: 'web' | 'telegram' = 'web', contextMessages: any[] = []) {
  try {
    const allProducts = await db.select().from(products);

    // ==================== CHECK_STOCK ====================
    if (intent.action === 'CHECK_STOCK') {
      const keyword = (intent.keyword || '').toLowerCase().trim();
      if (!keyword) return { message: `📦 Silakan masukkan nama barang yang ingin dicari.` };
      
      const allCategories = await db.select().from(categories);
      const keywords = keyword.split(/\s+/).filter((k: string) => k.length > 0);
      
      const matchedProducts = allProducts.filter(p => {
        const nameLower = p.name.toLowerCase();
        const skuLower = p.sku.toLowerCase();
        const cat = allCategories.find(c => c.id === p.categoryId);
        const catNameLower = cat ? cat.name.toLowerCase() : '';
        return keywords.every((k: string) => nameLower.includes(k) || skuLower.includes(k) || catNameLower.includes(k));
      });
      
      if (matchedProducts.length === 0) {
        const { fuzzyScore } = await import('@/lib/smart-ai'); // light import for fuzzy match
        const fuzzy = allProducts.map(p => ({ item: p, score: fuzzyScore(keyword, p.name) })).sort((a,b)=>b.score - a.score);
        const good = fuzzy.filter(f => f.score >= 0.4).slice(0, 3);
        if (good.length > 0) {
          let msg = `❌ Stok "${keyword}" tidak ditemukan persis.\n\n💡 *Mungkin maksud Anda:*\n\n`;
          good.forEach((f, i) => { msg += `${i + 1}. *${f.item.name}*: *${f.item.currentStock}* pcs\n`; });
          return { message: msg };
        } else {
          return { message: `❌ Tidak ditemukan stok untuk "${keyword}".` };
        }
      }
      
      let replyStr = `📦 *Cek Stok: ${keyword.toUpperCase()}*\n\n`;
      let totalStock = 0;
      for (const p of matchedProducts) {
        let emoji = p.currentStock <= p.minStock ? '🔴' : '✅';
        replyStr += `${emoji} ${p.name}: *${p.currentStock}* ${p.unit}\n`;
        totalStock += p.currentStock;
      }
      replyStr += `\n📊 Total: *${totalStock}* pcs dari *${matchedProducts.length}* varian.`;
      return { message: replyStr };
    }

    // ==================== AKSI SINGLE PRODUK (DEDUCT, ADD, UPDATE) ====================
    let p;
    if (intent.productId) {
       p = allProducts.find(x => x.id === intent.productId);
    } else if (intent.sku) {
       p = allProducts.find(x => 
         x.sku.toLowerCase() === intent.sku.toLowerCase() || 
         x.name.toLowerCase() === intent.sku.toLowerCase() ||
         x.sku.toLowerCase().includes(intent.sku.toLowerCase()) || 
         x.name.toLowerCase().includes(intent.sku.toLowerCase())
       );
    }

    if (!p) {
      return { message: `❌ Gagal mengeksekusi aksi. Produk${intent.sku ? ` yang mirip dengan '${intent.sku}'` : ''} tidak ditemukan.` };
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
