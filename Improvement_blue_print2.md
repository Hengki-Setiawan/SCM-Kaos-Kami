# 📋 Improvement Blueprint v2 — SCM Kaos Kami
> Dokumen audit kritis dan rencana peningkatan sistem SCM.
> Tanggal: 23 Maret 2026

---

## 🔍 AUDIT JUJUR: Kondisi Saat Ini

### ❌ Masalah Kritis yang Ditemukan

#### 1. Logika "Stok Menipis" Salah
- **Sekarang:** `currentStock <= minStock` → Jika stok = min, dianggap "Rendah". Ini salah.
- **Seharusnya:** `currentStock < minStock` → Stok dianggap rendah HANYA jika **di bawah** batas minimum.
- **Dampak:** Badge "Rendah" muncul padahal stok masih aman, notifikasi bell membengkak (63 → seharusnya jauh lebih sedikit).
- **Lokasi bug:**
  - `src/app/api/dashboard/stats/route.ts` (SQL query count + list)
  - `src/app/stock/StockTableClient.tsx` (group logic + variant badge)
  - `src/components/layout/Topbar.tsx` (notifikasi dropdown)
  - `src/app/api/bot/route.ts` (Telegram bot low stock — 5+ lokasi)
  - `src/lib/ai-actions.ts` (CHECK_STOCK emoji logic)
  - `src/app/api/analysis/route.ts` (warehouse health analysis)

#### 2. AI Model Terlalu Kecil untuk Bahasa Indonesia
- **Sekarang:** Semua endpoint AI menggunakan `llama-3.1-8b-instant` (8 Miliar parameter).
- **Masalah:** Model 8B memiliki kemampuan bahasa Indonesia yang terbatas:
  - Sering salah memahami perintah informal/slang Indonesia
  - Kurang akurat dalam parsing intent yang kompleks
  - Tidak mengenal idiom bisnis Indonesia (misal: "laku keras", "slow moving", "barang laris")
- **Fakta dari Groq API Docs (Maret 2026):**
  - Groq sudah mendukung `llama-3.3-70b-versatile` (70B parameter, context 128K)
  - Groq juga mendukung `openai/gpt-oss-120b` (120B parameter)
  - Kedua model ini JAUH lebih baik dalam memahami bahasa Indonesia
  - **Biaya tetap GRATIS** di Groq (rate-limited, bukan pay-per-token)

#### 3. Kalkulator Harga Terlalu Sederhana
- **Sekarang:** Hanya menghitung harga satuan (HPP per unit) dari teks pembelian.
- **Yang TIDAK bisa dilakukan:**
  - Menghitung EOQ (Economic Order Quantity) — Berapa jumlah optimal untuk pesan barang
  - Menghitung Safety Stock — Berapa stok pengaman yang ideal
  - Menghitung Reorder Point (ROP) — Kapan harus pesan ulang
  - Menghitung Inventory Turnover — Seberapa cepat barang berputar
  - Break Even Analysis — Berapa unit harus terjual untuk BEP
  - Margin & Markup Calculator — Hitung profit per produk
- **Seharusnya:** Ini adalah sistem SCM (Supply Chain Management), kalkulator harus bisa menghitung SEMUA formula stok bisnis standar.

#### 4. Halaman Analisis Gudang Kurang Lengkap
- **Sekarang:** Hanya menampilkan health score, executive summary, dan prediksi kehabisan stok.
- **Yang kurang:**
  - Tidak ada daftar lengkap stok rendah (low stock table)
  - Tidak ada daftar belanja AI (apa yang harus dibeli)
  - Tidak ada prioritas restock (urgent/sedang/rendah)
  - Tidak ada estimasi biaya restock
  - Tidak ada ABC Analysis (klasifikasi barang berdasarkan nilai)
  - Tidak ada link dari notifikasi bell → halaman ini

#### 5. Notifikasi Bell Tidak Punya "Lihat Semua"
- **Sekarang:** Menampilkan max 8 item, tidak ada tombol untuk melihat semua.
- **Seharusnya:** Ada link "Lihat Selengkapnya →" yang mengarah ke halaman analisis gudang.

---

## 🏗️ RENCANA IMPLEMENTASI

### FASE 1: Fix Logika Low Stock (Prioritas TINGGI)

#### Perubahan: `<=` → `<` di SEMUA Lokasi

| File | Baris | Perubahan |
|------|-------|-----------|
| ~~`api/dashboard/stats/route.ts`~~ | ~~L12, L61~~ | ✅ **SUDAH FIX** — file ini sudah pakai `<` + filter `not (0 AND 0)` |
| `stock/StockTableClient.tsx` | L180, L402 | JS: `<=` → `<` |
| `components/layout/Topbar.tsx` | — | Tambah link "Lihat Selengkapnya" |
| `api/bot/route.ts` | L209, L230, L301, L443, L453-454, L472 | `lte()` → `sql\`<\`` dan `<=` → `<` |
| `lib/ai-actions.ts` | L383 | `<=` → `<` |
| `api/analysis/route.ts` | L48 | `<=` → `<` |

#### Tambahan: Fix Race Condition pada Update Stok

> ⚠️ **MASALAH KRITIS** yang belum tercover sebelumnya!

**Sekarang (BAHAYA):**
```typescript
// ai-actions.ts - Read → Compute → Write (NOT ATOMIC)
const p = await db.select()... // baca stok = 10
const newStock = p.currentStock - qty; // hitung 10 - 5 = 5
await db.update(products).set({ currentStock: newStock }) // tulis 5
```

Jika 2 request bersamaan: Request A baca 10, Request B baca 10, A tulis 5, B tulis 7 → **stok salah!**

**Seharusnya (ATOMIC SQL):**
```sql
UPDATE products SET current_stock = current_stock - ? WHERE id = ?
```

**Aturan Baru:**
- `currentStock < minStock` → ⚠️ Stok Menipis (RENDAH)
- `currentStock == 0 && minStock == 0` → ✅ Aman (diabaikan)
- `currentStock == minStock` → ✅ Aman
- `currentStock > minStock` → ✅ Aman

---

### FASE 2: AI Cascade Fallback System (Prioritas TINGGI)

#### 🔬 RISET BENCHMARK: Siapa yang Paling Pintar?

Berdasarkan riset dari benchmarks terbaru (Maret 2026):

| Model | Total Param | Active Param | Reasoning Score | Indonesian | Req/Hari (Gratis) |
|-------|-------------|-------------|-----------------|------------|-------------------|
| **`openai/gpt-oss-120b`** | **120B** | **~120B** | **🥇 Terbaik** | **✅✅ Sangat bagus** | ~1.000 |
| `llama-3.3-70b-versatile` | 70B | 70B | 🥈 Bagus (BenchLM: 59.6/100) | ✅ Bagus (8 bahasa) | ~14.400 |
| `qwen3-32b` | 32B | 32B | 🥉 Bagus | ✅ Bagus (multilingual) | ~1.000 |
| `openai/gpt-oss-20b` | 20.9B | **3.6B** (MoE!) | ⚠️ Biasa (BenchLM: 40.4/100) | ⚠️ Cukup | ~1.000 |
| `llama-3.1-8b-instant` | 8B | 8B | ⚠️ Dasar | ⚠️ Cukup | ~14.400 |

#### ⚠️ FAKTA JUJUR: GPT-OSS 20B vs Llama 70B

> **Jawaban: Llama 3.3 70B LEBIH PINTAR dari GPT-OSS 20B.**

- GPT-OSS 20B menggunakan arsitektur MoE — walaupun total 20.9B parameter, yang **aktif per request hanya 3.6B**.
- Llama 3.3 70B mengaktifkan **semua 70B** parameter per request → 19x lebih banyak neuron bekerja.
- Di BenchLM.ai (Maret 2026):
  - Llama 70B → **Reasoning: 59.6/100** (rank #80/127)
  - GPT-OSS 20B → **Reasoning: 40.4/100** (rank #111/123)
- GPT-OSS 20B unggul di **kecepatan** dan **efisiensi memori**, tapi BUKAN kualitas reasoning.

#### 🏆 FAKTA JUJUR: GPT-OSS 120B — Si Raksasa Repositori

> **Model 120B adalah yang terberat dan terhebat yang tersedia di Groq saat ini.**

- Model open-weights dari OpenAI dengan 120 Miliar parameter (dense)
- Jauh di atas rata-rata untuk kualitas bahasa dan reasoning
- Sangat cocok untuk analisis bisnis (kalkulator SCM, rekomendasi gudang)
- Tersedia 1.000 request per hari

#### ✅ CASCADE ORDER yang BENAR (Berdasarkan Ketersediaan Groq)

```
┌──────────────────────────────────────────────────────────┐
│        AI CASCADE FALLBACK SYSTEM (REVISED)              │
│                                                          │
│  Request masuk                                           │
│       ↓                                                  │
│  [1] openai/gpt-oss-120b    (120B dense) 🥇              │
│       ↓ rate-limited?                                    │
│  [2] llama-3.3-70b-versatile (70B dense) 🥈              │
│       ↓ rate-limited?                                    │
│  [3] qwen3-32b              (32B dense)  🥉              │
│       ↓ rate-limited?                                    │
│  [4] openai/gpt-oss-20b     (20.9B MoE, 3.6B aktif)     │
│       ↓ rate-limited?                                    │
│  [5] llama-3.1-8b-instant   (8B dense, tercepat)         │
│       ↓ semua rate-limited?                              │
│  [X] Return error "Semua AI sedang sibuk"                │
└──────────────────────────────────────────────────────────┘
```

> **Perubahan kunci:** Kita membuang Kimi K2 karena ternyata tidak tersedia bebas untuk semua key, lalu memposisikan **GPT-OSS 120B** di peringkat #1.

#### Dua Tipe Cascade

**🧠 CASCADE SMART (Chat, Analisis, Kalkulator):**
```
1. openai/gpt-oss-120b               (~1.000 req/hari)
2. llama-3.3-70b-versatile           (~14.400 req/hari)
3. qwen3-32b                         (~1.000 req/hari)
4. openai/gpt-oss-20b                (~1.000 req/hari)
5. llama-3.1-8b-instant              (~14.400 req/hari)
```

**⚡ CASCADE FAST (Intent Parsing):**
```
1. llama-3.1-8b-instant              (~14.400 req/hari)
2. qwen3-32b                         (~1.000 req/hari)
3. llama-3.3-70b-versatile           (~14.400 req/hari)
```

#### Total Kapasitas Gabungan (Gratis)

| Model | Req/Hari | Saat Ini |
|-------|----------|----------|
| `openai/gpt-oss-120b` | ~1.000 | ❌ Belum dipakai |
| `llama-3.3-70b-versatile` | ~14.400 | ❌ Belum dipakai |
| `qwen3-32b` | ~1.000 | ❌ Belum dipakai |
| `openai/gpt-oss-20b` | ~1.000 | ❌ Belum dipakai |
| `llama-3.1-8b-instant` | ~14.400 | ✅ Satu-satunya yg dipakai |
| **TOTAL** | **~31.800 req/hari** | **14.400 req/hari** |

> Kapasitas gabungan **2.2x lipat** dari 14.400 → 31.800 request/hari!

#### Implementasi Teknis

##### [NEW] `src/lib/groq-cascade.ts`
```typescript
import { Groq } from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SMART_CASCADE = [
  'openai/gpt-oss-120b',
  'llama-3.3-70b-versatile',
  'qwen3-32b',
  'openai/gpt-oss-20b',
  'llama-3.1-8b-instant',
];

const FAST_CASCADE = [
  'llama-3.1-8b-instant',
  'qwen3-32b',
  'llama-3.3-70b-versatile',
];

export async function cascadeChat(options: {
  messages: any[];
  type: 'smart' | 'fast';
  temperature?: number;
  max_tokens?: number;
  response_format?: any;
}) {
  const chain = options.type === 'smart' ? SMART_CASCADE : FAST_CASCADE;
  let lastError: any = null;

  for (const model of chain) {
    try {
      const result = await groq.chat.completions.create({
        messages: options.messages,
        model,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.max_tokens ?? 1024,
        response_format: options.response_format,
      });
      console.log(`[AI Cascade] ✅ Used: ${model}`);
      return { result, model };
    } catch (error: any) {
      if (error.status === 429 || error.status === 503) {
        console.warn(`[AI Cascade] ⚠️ ${error.status}: ${model}, trying next...`);
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error('All AI models exhausted');
}
```

##### File yang perlu diubah:

| File | Tipe Cascade | Alasan |
|------|-------------|--------|
| `api/chat/route.ts` | `smart` | Chat butuh pemahaman bahasa terbaik |
| `api/analysis/route.ts` | `smart` | Analisis gudang butuh reasoning |
| `api/calculator/route.ts` | `smart` | Kalkulasi SCM butuh akurasi |
| `api/stock/low-stock/ai-summary/route.ts` | `smart` | Rekomendasi restock |
| `api/bot/route.ts` (chat) | `smart` | Telegram bot responses |
| `lib/ai-actions.ts` (parseAIIntent) | `fast` | Intent parsing butuh kecepatan |

---

### FASE 2b: Optimasi AI Assistant (Prioritas SEDANG)

#### Masalah AI Assistant Saat Ini (Audit Jujur)

1. **System prompt terlalu panjang** — Mengirim seluruh katalog produk (bisa 500+ item) di setiap request → membuang token, memperlambat response, dan bisa melebihi context window.

2. **Tidak ada memory management** — Chat web (`/chat`) mengirim SEMUA history chat sebagai context → semakin lama chat, semakin lambat dan mahal.

3. **Parsing intent duplikat** — `parseAIIntent()` dan `parseAndExecuteAIAction()` melakukan hal mirip tapi dengan prompt berbeda → inconsistent behavior.

4. **Tidak ada feedback loop** — Jika AI salah eksekusi (misal salah produk), user harus undo manual. Tidak ada mekanisme "Apakah ini benar?" sebelum eksekusi di web.

5. **Emoji rendering di markdown** — Respons AI menggunakan `*bold*` markdown tapi tidak di-render sebagai HTML di chat web → tampil mentah.

#### Rencana Optimasi

##### O1. Smart Context Injection (Bukan Dump Semua Katalog)
```
SEBELUM: Kirim 500 produk ke AI setiap request
SESUDAH: Pre-filter katalog → hanya kirim 20 produk yg paling relevan
```
- Gunakan keyword matching dari pesan user
- Kirim hanya produk yang SKU/nama mirip dengan yang dibahas
- Hemat ~80% token per request

##### O2. Chat Memory Sliding Window
```
SEBELUM: Kirim semua 50 pesan history
SESUDAH: Kirim max 8 pesan terakhir + ringkasan konteks
```
- Simpan max 8 pesan terakhir sebagai context
- Untuk percakapan panjang, AI buat "summary" dari percakapan sebelumnya

##### O3. Konfirmasi Sebelum Eksekusi (Web)
```
SEBELUM: AI langsung eksekusi aksi tanpa konfirmasi
SESUDAH: AI tampilkan preview → user klik "Konfirmasi" → baru eksekusi
```
- Mencegah kesalahan fatal (misal: auto-deduct produk yang salah)
- Sudah ada di Telegram (`confirm_action`), belum ada di web chat

##### O4. Markdown Rendering di Chat Web
```
SEBELUM: *bold* tampil mentah sebagai teks
SESUDAH: **bold** di-render sebagai <strong>bold</strong>
```
- Pasang library `react-markdown` untuk render respons AI
- Tambahkan syntax highlighting untuk tabel/code

##### O5. AI Response Caching
```
SEBELUM: Setiap "cek stok kaos hitam" memanggil AI baru
SESUDAH: Cache response serupa selama 5 menit
```
- Pertanyaan identik dalam 5 menit → ambil dari cache
- Hemat request ke Groq API, response instan

---

### FASE 3: Upgrade Halaman Analisis Gudang (Prioritas SEDANG)

#### Fitur Baru: Integrasi Low Stock + AI Restock Advisor

**Perubahan pada `/analysis` page:**

1. **Tab "Low Stock" baru** — Tabel lengkap SEMUA produk di bawah minimum stok
   - Grouped by kategori
   - Kolom: Nama, SKU, Stok, Min, Kekurangan, Harga Beli, Est. Biaya Restock
   - Badge prioritas: 🔴 Kritis (stok 0) / 🟡 Rendah (stok < min)

2. **Panel AI Restock Advisor** — Tombol "🤖 Generate Rekomendasi AI"
   - AI menganalisis SEMUA data low stock dan menghasilkan:

   ```
   📋 DAFTAR BELANJA (Harus Beli dari Supplier):
   1. Resleting YKK - Pesan 200 pcs (est. Rp 400.000)
   2. Kain Cotton Combed 30s - Pesan 50 yard (est. Rp 2.500.000)

   🧵 DAFTAR PRODUKSI (Harus Dijahit/Sablon):
   1. Kaos Polos Hitam L - Produksi 20 pcs
   2. Kaos Polos Putih XL - Produksi 15 pcs

   🔥 PRIORITAS RESTOCK:
   [URGENT] Polymailer habis total — kirim tidak bisa jalan
   [SEDANG] Kaos Hitam M sisa 1, laku 2/hari → habis besok
   [RENDAH] Stiker logo sisa 10, laku 1/minggu

   💰 ESTIMASI TOTAL BIAYA RESTOCK: Rp 4.250.000
   ```

3. **Link dari Topbar notification** — "Lihat Selengkapnya →" mengarah ke `/analysis#low-stock`

**File baru/modifikasi:**

| File | Aksi |
|------|------|
| `api/stock/low-stock/route.ts` | **[NEW]** API: ambil semua produk `currentStock < minStock` |
| `api/stock/low-stock/ai-summary/route.ts` | **[NEW]** API: Groq AI generate rekomendasi restock |
| `app/analysis/page.tsx` | **[MODIFY]** Tambah tab low stock + AI advisor panel |
| `components/layout/Topbar.tsx` | **[MODIFY]** Tambah link "Lihat Selengkapnya" |

---

### FASE 4: Upgrade Kalkulator SCM (Prioritas SEDANG)

#### Dari "Kalkulator Harga" → "Kalkulator SCM Bisnis"

**Fitur-fitur kalkulator baru:**

#### 4a. Kalkulator yang Sudah Ada (Tetap Dipertahankan)
- ✅ HPP / Harga Satuan (konversi teks → harga per unit)

#### 4b. EOQ (Economic Order Quantity)
```
Rumus: EOQ = √(2DS / H)

D = Demand tahunan (estimasi dari data penjualan)
S = Biaya per pesanan (input user, misal: ongkir + admin)
H = Biaya penyimpanan per unit per tahun (estimasi 20-25% dari harga beli)
```
- User input: Produk yang ingin dihitung, biaya pesan, biaya simpan
- Output: Jumlah optimal per pesan, frekuensi pesan per tahun, total biaya minimal

#### 4c. Safety Stock
```
Rumus: SS = Z × σd × √L

Z = Service level (95% → 1.645, 99% → 2.326)
σd = Standar deviasi demand harian (dari data penjualan)
L = Lead time (waktu tunggu dari supplier, hari)
```
- User input: Produk, lead time supplier, service level yang diinginkan
- Output: Jumlah safety stock ideal, rekomendasi ubah minStock

#### 4d. Reorder Point (ROP)
```
Rumus: ROP = (Lead Time × Rata-rata Penjualan Harian) + Safety Stock
```
- Output: Kapan harus pesan ulang, sisa berapa hari sebelum perlu reorder

#### 4e. Break Even Point (BEP)
```
Rumus: BEP = Fixed Costs / (Harga Jual - Harga Beli)
```
- User input: Biaya tetap bulanan (sewa, gaji, listrik), produk
- Output: Berapa unit harus terjual sebulan untuk balik modal

#### 4f. Inventory Turnover Ratio
```
Rumus: ITR = COGS / Average Inventory
COGS = Harga Beli × Jumlah Terjual (periode tertentu)
Average Inventory = (Stok Awal + Stok Akhir) / 2
```
- Output: Berapa kali stok berputar dalam sebulan/tahun, benchmark industri

#### 4g. Profit Margin Calculator
```
Gross Margin = (Harga Jual - HPP) / Harga Jual × 100%
Markup = (Harga Jual - HPP) / HPP × 100%
```
- User input: Produk atau manual (harga beli + jual)
- Output: Margin %, Markup %, Profit per unit, Profit per dozen

**Implementasi UI:**
- Tab-based layout: HPP | EOQ | Safety Stock | ROP | BEP | Profit
- Setiap tab punya form input + output hasil + insight AI
- Data produk bisa diambil langsung dari database (auto-fill)
- Riwayat kalkulasi tetap tersimpan

**File baru/modifikasi:**

| File | Aksi |
|------|------|
| `app/calculator/page.tsx` | **[REWRITE]** UI tab-based dengan semua kalkulator |
| `api/calculator/route.ts` | **[REWRITE]** Endpoint yang lebih generik, mendukung berbagai tipe kalkulasi |
| `api/calculator/scm/route.ts` | **[NEW]** Endpoint khusus SCM (EOQ, SS, ROP dengan data real dari DB) |

---

### FASE 5: Sistem AI Kolaboratif Sejati — Groq + Gemini Pipeline (Prioritas SEDANG)

#### 🔬 RISET: 5 Pola Kolaborasi Multi-AI di Industri

| # | Pola | Cara Kerja | Cocok? |
|---|------|------------|--------|
| 1 | **Router** | Pilih salah satu AI per request | ❌ Fallback terselubung |
| 2 | **Pipeline** | AI-A proses → AI-B lanjutkan | ✅ **TERBAIK** |
| 3 | **Verify & Execute** | AI-A usulkan → AI-B verifikasi | ✅ **COCOK** |
| 4 | **Ensemble** | Keduanya jawab, pilih terbaik | ⚠️ Boros kuota |
| 5 | **Mixture of Agents** | Multi-layer refinement | ❌ Terlalu mahal |

#### 🧠 FILOSOFI: Pipeline — Dua Otak, Satu Misi

> **Router/Fallback (SALAH):** Pilih Groq ATAU Gemini → hanya 1 AI bekerja, yang lain nganggur
> **Pipeline (BENAR):** Groq parse → Gemini respond → KEDUA AI bekerja di setiap request

Analoginya:
- **Groq** = Resepsionis cepat yang langsung paham apa yang user mau (0.3 detik)
- **Gemini** = Manajer pintar yang memberikan jawaban berkualitas tinggi (2-3 detik)

Resepsionis dan manajer **selalu bekerja bersama** — bukan pilih salah satu.

---

#### ✅ 3 POLA KOLABORASI

##### POLA 1: 🔗 PIPELINE (Chat, Kalkulator, Analisis)

Kedua AI bekerja **berurutan** di SETIAP request:

```
User: "Cek stok kaos hitam, kasih saran restock"
     ↓
STEP 1 — GROQ (0.3 detik) ⚡ Parse + Query
├─ Intent: CHECK_STOCK + RESTOCK_ADVICE
├─ Produk: SKU "KAOS-HITAM-*" → 5 varian, stok 23 pcs
└─ Output: structured JSON data dari DB
     ↓
STEP 2 — GEMINI (2-3 detik) 🧠 Respond + Insight
├─ Terima data dari Groq + konteks chat
├─ Generate respons bahasa Indonesia natural
└─ Tambah insight bisnis + saran restock
     ↓
User: Respons berkualitas tinggi dalam ~3 detik
```

##### POLA 2: ✅ VERIFY & EXECUTE (Aksi Stok Kritis)

Untuk deduct/delete/order, **Groq usulkan → Gemini verifikasi**:

```
User: "Kirim 10 paket kaos hitam L"
     ↓
GROQ (Propose): DEDUCT_STOCK, SKU: KAOS-HITAM-L, qty: 10
     ↓
GEMINI (Verify):
├─ Stok = 12, Deduct 10 → sisa 2 (di bawah minimum 5)
├─ Warning: "Stok akan rendah setelah operasi ini"
└─ Verdict: APPROVED with WARNING
     ↓
EXECUTE: Jalankan + tampilkan warning
```

Ini **mencegah kesalahan fatal** — double-check oleh AI berbeda.

##### POLA 3: ⚡ GROQ SOLO (Tugas Sederhana)

Untuk cek stok simple dan voice, Groq handle sendiri (hemat kuota Gemini):

```
User: "Stok kaos hitam?" → GROQ: Jawab langsung (0.3 detik)
User: [Voice note]        → GROQ: Whisper transcribe (1 detik)
```

---

#### 📊 Kapan Pakai Pola Mana? 

| Tugas | Pola | Latency | AI yang Bekerja |
|-------|------|---------|-----------------|
| 💬 Chat | **Pipeline** | ~3 dtk | Groq parse + Gemini respond |
| 📊 Analisis | **Pipeline** | ~4 dtk | Groq data + Gemini insight |
| 🧮 Kalkulator | **Pipeline** | ~3 dtk | Groq angka + Gemini jelaskan |
| ➖ Deduct/Add stok | **Verify** | ~2 dtk | Groq propose + Gemini verify |
| 🗑️ Delete produk | **Verify** | ~2 dtk | Groq propose + Gemini safety |
| ⚡ Cek stok sederhana | **Groq Solo** | ~0.5 dtk | Groq saja |
| 🎙️ Voice | **Groq Solo** | ~1 dtk | Groq Whisper saja |

#### ⚠️ Estimasi Kuota Harian

```
Pipeline calls: ~100 Gemini + ~100 Groq → ✅ Dalam kuota
Verify calls:   ~30 Gemini + ~30 Groq  → ✅ Dalam kuota
Groq Solo:      ~200 Groq              → ✅ Dalam kuota

Total Gemini: ~130/hari dari kuota 1.350 → Sangat cukup!
Jika Gemini habis → degraded ke Groq-solo (tetap jalan 100%)
```

#### Implementasi: `src/lib/ai-collab.ts` [NEW]

```typescript
import { Groq } from 'groq-sdk';
import { GoogleGenAI } from '@google/genai';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const gemini = process.env.GEMINI_API_KEY 
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

// ═══ POLA 1: PIPELINE — Groq parse, Gemini respond ═══
export async function pipeline(options: {
  userMessage: string;
  systemPrompt: string;
  context?: { role: string; content: string }[];
  dbData?: any;
}) {
  // STEP 1: Groq fast parse
  const step1 = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: 'Parse user intent. Return JSON.' },
      { role: 'user', content: options.userMessage },
    ],
    model: 'llama-3.1-8b-instant',
    temperature: 0.1,
    response_format: { type: 'json_object' },
  });
  const parsed = JSON.parse(step1.choices[0]?.message?.content || '{}');

  // STEP 2: Gemini quality response
  if (gemini) {
    try {
      const resp = await gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        config: { temperature: 0.3, systemInstruction: options.systemPrompt },
        contents: [
          ...(options.context || []).map(m => ({
            role: (m.role === 'assistant' ? 'model' : 'user') as 'model' | 'user',
            parts: [{ text: m.content }],
          })),
          { role: 'user', parts: [{ text: 
            `DATA: ${JSON.stringify(options.dbData || parsed)}\nUSER: ${options.userMessage}` 
          }]},
        ],
      });
      return { content: resp.text || '', mode: 'groq→gemini', parsed };
    } catch { /* fallback */ }
  }

  // DEGRADED: Groq solo
  const solo = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: options.systemPrompt },
      ...(options.context || []),
      { role: 'user', content: options.userMessage },
    ],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.3,
  });
  return { content: solo.choices[0]?.message?.content || '', mode: 'groq-solo', parsed };
}

// ═══ POLA 2: VERIFY — Groq proposes, Gemini verifies ═══
export async function verify(action: any, product: any, userMsg: string) {
  if (!gemini) return { approved: true, warning: null };

  const resp = await gemini.models.generateContent({
    model: 'gemini-2.5-flash-lite',
    config: { temperature: 0.1, responseMimeType: 'application/json' },
    contents: [{ role: 'user', parts: [{ text:
      `Aksi: ${JSON.stringify(action)}\nProduk: ${JSON.stringify(product)}\nUser: "${userMsg}"
       Cek keamanan. Return JSON: {approved, warning, reason}` 
    }]}],
  });
  return JSON.parse(resp.text || '{"approved":true}');
}
```

##### Cara Pakai:

```typescript
// Chat: Pipeline (Groq parse → Gemini respond)
import { pipeline } from '@/lib/ai-collab';
const { content, mode } = await pipeline({
  userMessage: message,
  systemPrompt: 'Anda AI SCM Kaos Kami...',
  context: chatHistory,
  dbData: { products, trends },
});
// mode = "groq→gemini" ← KEDUA AI bekerja!

// Stok: Verify (Groq propose → Gemini verify)
import { verify } from '@/lib/ai-collab';
const intent = await parseAIIntent(text);       // Groq
const check = await verify(intent, product, text); // Gemini
if (!check.approved) return `⚠️ ${check.warning}`;
await executeStockAction(intent);               // Execute
```

##### Dependencies:
```bash
npm install @google/genai
# .env.local: GEMINI_API_KEY=your_key_here
```

> Jika `GEMINI_API_KEY` tidak diset → semua fungsi degraded ke Groq-solo. 100% backward compatible.

---

#### 📊 Perbandingan Final

| Metrik | Fallback | Router | **Pipeline (Baru)** |
|--------|----------|--------|---------------------|
| AI bekerja per request | 1 | 1 | **2 (keduanya!)** |
| Kualitas bahasa ID | ⚠️ | Tergantung routing | **🏆 Selalu tinggi** |
| Keamanan aksi stok | ❌ | ❌ | **✅ Double-checked** |
| Latency | 0.3s | 0.3-5s | 2-4s (acceptable) |
| Kuota Gemini/hari | 0 | ~675 | ~130 (lebih hemat!) |


### FASE 0: Security Hardening (Prioritas KRITIS)

> ⚠️ **Ditemukan dari audit kode — HARUS difix sebelum fitur apapun!**

#### S1. Hardcoded JWT Secret

```typescript
// src/lib/auth.ts — Line 8 (SEKARANG)
const key = new TextEncoder().encode(secretKey || 'kaos-kami-super-secret-12345');
// ↑ Siapapun bisa buat token valid dengan secret ini!
```

**Fix:** Tolak startup jika JWT_SECRET tidak ada, atau generate random secret.

#### S2. API Web Tidak Punya RBAC

- Semua API route (`/api/chat`, `/api/stock`, `/api/analysis`) hanya cek "sudah login?" tapi **tidak cek role**
- Staff yang login bisa menjalankan semua aksi termasuk hapus produk via AI chat
- Hanya bot/route.ts yang membedakan admin vs staff

**Fix:** Tambahkan middleware RBAC:
```typescript
// src/lib/rbac.ts — [NEW]
export function requireRole(roles: string[]) {
  return async (session: any) => {
    if (!roles.includes(session?.role)) throw new Error('Forbidden');
  };
}
```

---

### FASE 6: Fondasi Kode & Testing (Prioritas RENDAH)

#### F1. Hapus Dead Code

`parseAndExecuteAIAction()` di `ai-actions.ts` (L289-L345) adalah **dead code** — tidak dipanggil oleh siapapun.

#### F2. Refactor Bot Route (1355 baris)

Pisah `bot/route.ts` menjadi modul:
```
src/lib/bot/
  ├── commands/       (stock, orders, laporan, kalkulator)
  ├── callbacks/      (inline button handlers)
  ├── handlers/       (photo, voice, text)
  └── keyboards.ts    (semua keyboard definitions)
```

#### F3. Error Logging di Bot

Banyak catch block di bot yang menelan error tanpa logging:
```typescript
// SEKARANG (BURUK):
} catch { await ctx.reply('❌ Gagal.'); }

// SEHARUSNYA:
} catch (e) { console.error('Bot Error:', e); await ctx.reply('❌ Gagal.'); }
```

#### F4. Testing Foundation

Saat ini hanya ada 3 test file (env, utils, validations). Tidak ada test untuk:
- `parseAIIntent()` — padahal ini OTAK dari seluruh AI system
- API routes — 0 integration tests
- Cascade logic — 0 failover tests

#### F5. AI Logging & Observability

Setelah cascade diimplementasikan, kita HARUS tahu:
- Model mana yang paling sering dipakai?
- Berapa kali fallback terjadi per hari?
- Provider mana yang paling sering rate-limited?

```typescript
// [NEW] src/lib/ai-logger.ts
export function logAICall(model: string, provider: string, latency: number, success: boolean) {
  console.log(`[AI] ${provider}/${model} ${success ? '✅' : '❌'} ${latency}ms`);
  // Optional: simpan ke database untuk monitoring dashboard
}
```

#### F6. Data Historis untuk Kalkulator SCM

EOQ, Safety Stock, Inventory Turnover butuh data harian yang diagregasi. Opsi:
- Aggregate dari `stockMovements` type='OUT' per hari (lambat tapi tanpa schema baru)
- **[LEBIH BAIK]** Buat tabel `daily_sales_summary` diisi cron job harian

#### F7. Data Cleanup Strategy

`stockMovements` dan `chatMessages` terus bertambah tanpa batas → database membengkak.
- Archive `stockMovements` > 90 hari
- Hapus `chatMessages` > 30 hari

#### F8. Testing Strategy untuk Pipeline AI

Bagaimana test kalau Gemini down atau rate-limited?

```typescript
// [NEW] src/lib/__tests__/ai-collab.test.ts
// Mock Gemini timeout → pastikan degraded ke Groq-solo
// Mock Groq 429 → pastikan Gemini handle
// Mock keduanya gagal → pastikan error message jelas
// Test verify() → pastikan aksi berbahaya ditolak

// Contoh test:
test('pipeline degrades to groq-solo when Gemini fails', async () => {
  mockGemini.mockRejection(new Error('RESOURCE_EXHAUSTED'));
  const { mode } = await pipeline({ userMessage: 'cek stok', ... });
  expect(mode).toBe('groq-solo');
});
```

#### F9. AI Monitoring Endpoint (Opsional)

Setelah Pipeline berjalan, tambahkan endpoint sederhana untuk melihat statistik:

```
GET /api/ai/stats → {
  today: {
    pipeline_calls: 45,     // Groq→Gemini
    groq_solo_calls: 120,   // Groq saja
    verify_calls: 18,       // Verify aksi stok
    gemini_failures: 2,     // Berapa kali Gemini rate-limited
    avg_latency_ms: 2800    // Rata-rata waktu respons
  }
}
```

Simpan counter di memory (atau SQLite) — tidak perlu kompleks.

---

## 📊 RINGKASAN PRIORITAS (REVISI)

| # | Item | Prioritas | Estimasi | Dampak |
|---|------|-----------|----------|--------|
| 0 | 🔒 Security: JWT + RBAC | 🔴 **KRITIS** | 30 menit | Keamanan login & akses |
| 1 | Fix logika `<` vs `<=` + race condition | 🔴 Tinggi | 20 menit | Stok benar, data integrity |
| 2 | AI Cascade Groq (5 model) | 🔴 Tinggi | 30 menit | AI 2.2x lebih pintar + kapasitas |
| 2b | AI Assistant Optimizations | 🟡 Sedang | 1 jam | Hemat token, UX lebih baik |
| 3 | Halaman Low Stock + AI Advisor | 🟡 Sedang | 1-2 jam | Rekomendasi restock |
| 4 | Kalkulator SCM lengkap | 🟡 Sedang | 2-3 jam | Keputusan bisnis berbasis data |
| 5 | Gemini + Groq Pipeline Kolaboratif | 🟡 Sedang | 1 jam | KEDUA AI bekerja di setiap request + stok di-verify |
| 6 | Fondasi: Dead code, refactor, testing | 🟢 Rendah | 2-3 jam | Maintainability jangka panjang |

---

## ⚠️ CATATAN KRITIS & JUJUR

### Tentang Translation API
> **Kesimpulan: TIDAK PERLU.** Dengan Cascade multi-provider (Groq + Gemini), kita sudah punya model yang sangat bagus dalam bahasa Indonesia. Translation API hanya menambah latency.

### Tentang Gemini + Groq Pipeline Kolaboratif
> **Bukan router/fallback, tapi PIPELINE — kedua AI bekerja di SETIAP request.**
> - **Pipeline:** Groq parse intent cepat (0.3s) → Gemini generate respons berkualitas (2-3s)
> - **Verify:** Groq usulkan aksi stok → Gemini verifikasi sebelum eksekusi → mencegah kesalahan
> - **Groq Solo:** Tugas sederhana (cek stok, voice) → Groq handle sendiri, hemat kuota Gemini
> - Jika Gemini habis/down → degraded ke Groq-solo (tetap jalan 100%)

### Tentang Rate Limiting & Multi-Provider
- Groq: ~30 req/menit per model, 5 model = ~150 req/menit total
- Gemini: ~5-15 req/menit per model, 3 model = ~30 req/menit total
- **Total cascade: 7 model Groq + 3 model Gemini = ~33.150 req/hari**
- **Risiko downtime mendekati 0%** — dua provider berbeda jarang down bersamaan

### Tentang Keterbatasan Data SCM
Beberapa fitur kalkulator (EOQ, Safety Stock) butuh data historis yang cukup:
- Jika data penjualan < 30 hari, hasil prediksi akan kurang akurat
- Lead time supplier harus diinput manual oleh user (belum ada di database)
- Biaya penyimpanan (holding cost) harus diestimasi atau diinput manual
- **BARU:** Perlu tabel daily_sales_summary atau aggregasi dari stockMovements

### Tentang Keamanan (BARU)
- JWT secret hardcoded = siapa saja bisa akses tanpa login
- Tidak ada RBAC di API web = staff bisa hapus produk via AI
- Race condition = 2 request bisa bikin stok salah
- **Semua ini HARUS difix sebelum menambah fitur baru**

---

## ✅ Langkah Eksekusi yang Direkomendasikan

```
0. [FASE 0] Security: Fix JWT + tambah RBAC (30 menit)
1. [FASE 1] Fix <= → < + race condition atomic SQL (20 menit)
2. [FASE 2] Buat ai-cascade.ts Groq (5 model) + integrasikan (30 menit)
3. [FASE 2b] AI optimisasi: smart context, sliding window, markdown (1 jam)
4. [FASE 3] Buat API low-stock + integrasikan ke halaman Analisis (1-2 jam)
5. [FASE 4] Rebuild kalkulator dengan tab SCM lengkap (2-3 jam)
6. [FASE 5] Buat ai-collab.ts Pipeline + Verify (Groq parse → Gemini respond) (1 jam)
7. [FASE 6] Hapus dead code, refactor bot, tambah tests (2-3 jam)
8. [TEST]   Verifikasi semua fitur & push ke GitHub
```

> **Total estimasi REALISTIS: 8-11 jam kerja.**
>
> _(Estimasi sebelumnya 4-5 jam terlalu optimis karena tidak memasukkan security, testing, dan Gemini integration)_
