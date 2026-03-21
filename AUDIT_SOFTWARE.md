# 🔍 AUDIT SOFTWARE — SCM Kaos Kami (Revisi Final — 100% File Dibuka)
> **Auditor:** AI Code Assistant  
> **Tanggal:** 22 Maret 2026  
> **Cakupan:** Seluruh file sumber di `src/` — **Setiap file tanpa terkecuali sudah dibuka dan dibaca baris per baris**  
> **Catatan Transparansi:** Audit ini revisi ketiga. Audit pertama **bohong** — banyak file ditandai "OK" tanpa dibuka. Audit kedua lebih baik tapi masih melewatkan ~25 file. **Revisi ini benar-benar membaca semuanya.**  

---

## 📊 Ringkasan Eksekutif

| Kategori | Jumlah |
|---|---|
| 🔴 Bug Kritis (Data Rusak/Crash) | 5 |
| 🟡 Kelemahan Keamanan | 4 |
| 🟠 Fitur Tidak Bekerja Sesuai Klaim | 2 |
| 🔵 Dead Code / Dead Link / Duplikasi | 7 |
| 🟣 Inkonsistensi & CSS Tidak Bekerja | 5 |
| ⚪ Rekomendasi Peningkatan | 7 |

**Grand Total: 30 Temuan**

---

## 🔴 Bug Kritis (Data Rusak / Crash)

### 1. `createOrder` Tidak Validasi Stok — Bisa Negatif
**File:** `src/app/actions/orders.ts:36-38`  
**Masalah:** Stok dikurangi via `current_stock - ${quantity}` tanpa cek apakah stok cukup. Order 100 unit dengan stok 5 → stok jadi **-95**.
```typescript
await tx.update(products)
  .set({ currentStock: sql`current_stock - ${item.quantity}` })
```
**Dampak:** Stok negatif merusak semua laporan, analisis AI memberikan hasil salah.

---

### 2. `deleteOrder` Hapus Pesanan Tanpa Kembalikan Stok
**File:** `src/app/actions/orders.ts:77-89`  
**Masalah:** `deleteOrder` menghapus data pesanan tapi stok yang sudah terpotong **tidak dikembalikan**. Bandingkan dengan `returnOrder` yang melakukannya dengan benar.
```typescript
// deleteOrder HANYA melakukan:
await tx.delete(orderItems).where(...)
await tx.delete(orders).where(...)
// Stok yang terpotong: HILANG SELAMANYA
```
**Dampak:** Setiap order yang dihapus menyebabkan "kebocoran stok" — angka stok terus menurun padahal barang masih ada.

---

### 3. Detail Pesanan Tampilkan "Rp NaN" di Setiap Item
**File:** `src/app/orders/[id]/OrderDetailClient.tsx:115`  
**File terkait:** `src/app/orders/[id]/page.tsx:18-27`  
**Masalah:** Template render `item.totalPrice`:
```tsx
Rp {new Intl.NumberFormat('id-ID').format(item.totalPrice)}
```
Tapi query di `page.tsx` hanya select `id`, `quantity`, `unitPrice`, `productName`, `productSku`. Field `totalPrice` **tidak pernah di-query** → `undefined` → **"Rp NaN"** tampil di layar.

---

### 4. Middleware Blokir Bot Telegram — 100% Tidak Berfungsi di Production
**File:** `src/middleware.ts:5`  
```typescript
const publicRoutes = ['/login', '/api/webhooks/telegram'];
```
Endpoint bot ada di `/api/bot`, bukan `/api/webhooks/telegram`. Semua request Telegram → **401 Unauthorized**.

---

### 5. `stock/[id]/page.tsx` — Deprecated Params Pattern (Next.js 16 Break)
**File:** `src/app/stock/[id]/page.tsx:8`  
```typescript
export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const { id } = params; // ← LANGSUNG destructure tanpa await
```
**Bandingkan** `orders/[id]/page.tsx` yang benar:
```typescript
export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // ← BENAR: await dulu
```
Di Next.js 16, `params` adalah `Promise`. Tanpa `await`, `id` akan menjadi `undefined` atau menyebabkan runtime error.

---

## 🟡 Kelemahan Keamanan

### 6. JWT Secret Hardcoded di Source Code
**File:** `src/lib/auth.ts:4`
```typescript
const secretKey = process.env.JWT_SECRET || 'kaos-kami-super-secret-12345';
```
Source code ada di GitHub publik → siapa pun bisa forge JWT token.

### 7. Admin Password Hardcoded
**File:** `src/app/actions/auth.ts:9`
```typescript
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
```
Tanpa set env var → login admin = `admin123`.

### 8. Cron Jobs Tanpa Autentikasi
**File:** `src/app/api/cron/stock-check/route.ts`, `cleanup/route.ts`  
Siapa saja bisa panggil endpoint ini, menghapus data atau trigger notifikasi palsu.

### 9. BusinessProfileClient Simpan Telegram Token di localStorage
**File:** `src/app/settings/BusinessProfileClient.tsx:25`
```typescript
localStorage.setItem('business_profile', JSON.stringify(profile));
// profile.telegramToken ada di sini!
```
Token bot Telegram tersimpan **tanpa enkripsi** di browser. Hilang saat pindah device. Bisa dibaca oleh script XSS mana pun.

---

## 🟠 Fitur yang Tidak Bekerja Sesuai Klaim

### 10. Auto-Deduct Packaging — TIDAK TERJADI Saat Ubah Status Manual
**File:** `src/app/settings/page.tsx:59`  
UI klaim: *"Item di bawah ini dikurangi otomatis saat status diubah ke **Shipped**"*

**Kenyataan:** `updateOrderStatus()` di `actions/orders.ts` HANYA mengubah field `status`:
```typescript
await db.update(orders).set({ status }).where(eq(orders.id, orderId));
// TIDAK ADA logika auto-deduct packaging!
```
Auto-deduct hanya terjadi via AI Bot (`PROCESS_ORDER` command). Jika admin ubah status manual dari UI → **packaging tidak berkurang**.

---

### 11. Status Koneksi Layanan di Settings — Selalu "✅ Aktif" (Pajangan)
**File:** `src/app/settings/page.tsx:79-85`
```tsx
<span>☁️ Cloudinary (Upload Gambar)</span>
<span>✅ Aktif</span>  <!-- HARDCODED, tidak ada health check -->
```
Cloudinary, Groq AI selalu tampil "Aktif" **tanpa pengecekan** apakah API key valid atau service bisa dijangkau.

---

## 🔵 Dead Code / Dead Link / Duplikasi

### 12. Dead Link `/restock/po` — Halaman Tidak Ada
**File:** `src/app/stock/page.tsx:41-46`
```tsx
<Link href="/restock/po" ...>Restock</Link>
<a href="/restock/po" ...>PO</a>
```
Folder `/restock/po` **tidak ada** di codebase. User akan melihat halaman **404**.

### 13. Halaman Duplikat: `/history` vs `/activity`
Dua halaman yang menampilkan data **identik** (log `stockMovements`). Sidebar link ke `/activity`, Settings link ke `/history`.

### 14. Import `db` dan `getStockMovements` di Client Component
**File:** `src/app/activity/page.tsx:4-5` — `db` dan `getStockMovements` diimpor tapi **tidak digunakan**. Berbahaya karena `db` bisa masuk client bundle.

### 15. Import `orderItems` Tidak Dipakai
**File:** `src/app/api/export/route.ts:3`

### 16. `getEnv()` Tidak Pernah Dipanggil di Mana Pun
**File:** `src/lib/env.ts` — Fungsi `getEnv()` ada tapi tidak dipakai. Semua file langsung akses `process.env`.  
**Catatan:** `validateEnv()` SUDAH dipanggil di `layout.tsx:32` — audit pertama saya salah soal ini.

### 17. `formatRupiah()` dan `generateOrderNumber()` Diduplikasi
`lib/utils.ts` sudah punya `formatRupiah()` dan `generateOrderNumber()`, tapi:
- `calculator/page.tsx:23` mendefinisikan ulang `formatRupiah` sendiri
- `actions/orders.ts:12` membuat order number inline alih-alih pakai `generateOrderNumber()`
- `DashboardClient.tsx` format Rupiah inline juga

### 18. `global-error.tsx` Klaim Mencatat Error — Tidak Dilakukan
```tsx
<p>Kami mencatat error ini untuk diinvestigasi.</p>
```
Tapi tidak ada kode yang menyimpan error ke database/logging service. **Klaim palsu**.

---

## 🟣 Inkonsistensi & CSS Tidak Bekerja

### 19. TailwindCSS Classes di Project Vanilla CSS — TIDAK RENDER
Project ini pakai **vanilla CSS** (`globals.css`), bukan Tailwind. Tapi beberapa komponen pakai class Tailwind:

| File | Class Tailwind yang Tidak Bekerja |
|---|---|
| `SupplierClient.tsx` | `text-primary`, `bg-white/5`, `space-y-2`, `hover:text-danger`, `hover:bg-danger/10`, `animate-in`, `fade-in`, `zoom-in` |
| `VariantGenerator.tsx` | `bg-primary/20`, `text-primary`, `bg-accent/20`, `text-accent`, `text-white`, `text-yellow-400`, `border-white/5` |
| `ProductDetailClient.tsx` | `bg-[rgba(var(--surface-hover),0.5)]`, `object-cover`, `hidden` |
| `global-error.tsx` | `text-2xl`, `font-bold`, `min-h-screen`, `mb-4`, `mb-6`, `max-w-lg`, `text-xs`, `text-left`, `max-w-2xl`, `overflow-x-auto` |

**Dampak:** Supplier cards tidak punya spacing yang benar, warna tidak tampil, transisi tidak bekerja, halaman error global terlihat berantakan.

### 20. Inkonsistensi Penggunaan `alert()` vs `showToast()`
Beberapa file pakai `alert()` browser native (jelek, blocking) sementara lainnya pakai `showToast()` yang sudah ada:

| File | Masalah |
|---|---|
| `AutoDeductClient.tsx:43-46` | `alert('Aturan berhasil disimpan!')` + `alert(res.error)` |
| `ProductDetailClient.tsx:39,42` | `alert('Gagal upload gambar')` + `alert('kesalahan jaringan')` |
| `NewOrderForm.tsx:40-41` | `alert('Nama pelanggan wajib')` + `alert('Pilih produk...')` |

Padahal semua file ini sudah import `useToast`.

### 21. `dangerouslySetInnerHTML` di 2 Tempat untuk CSS
- `DashboardClient.tsx:140` — `.chart-tooltip` styles
- `OrderDetailClient.tsx:64-79` — `@media print` styles

Tidak berbahaya (isi hardcoded), tapi seharusnya ada di `globals.css`.

### 22. `OrderListClient.tsx` colSpan Mismatch
**File:** `src/app/orders/OrderListClient.tsx`  
Table header punya **7 kolom** (`th`), tapi baris aksi punya kolom `td` terpisah — totalnya jadi **8**. Empty state pakai `colSpan={6}` yang juga salah (seharusnya 7 atau 8).

### 23. `StockTableClient.tsx` colSpan Mismatch
Empty state pakai `colSpan={7}` tapi ada **8 kolom** di thead (checkbox + 7 lainnya).

---

## ⚪ Rekomendasi Peningkatan

### 24. Tidak Ada Validasi Server-Side di `createOrder`
`validations.ts` punya `orderSchema` (Zod) tapi **tidak dipakai** di `createOrder`. Data form langsung diterima tanpa sanitasi server-side.

### 25. `updateSupplier` Menerima Field Apa Saja
```typescript
export async function updateSupplier(id: string, data: any) {
  await db.update(suppliers).set(data).where(eq(suppliers.id, id));
}
```
Bisa mengubah `id`, `createdAt`, atau field sensitif lainnya.

### 26. `ExpenseForm` Tanpa Dropdown Supplier
Tabel `expenses` punya kolom `supplierId`, tapi form tidak punya input supplier. `supplierId` selalu `NULL` → statistik transaksi per supplier di halaman Supplier selalu **"0x / Rp 0"**.

### 27. CSV Export Rentan Formula Injection
Data user langsung digabung ke CSV. Cell dimulai `=`, `+`, `-`, `@` → bisa dieksploitasi di Excel.

### 28. Rate Limiter In-Memory — Tidak Berguna di Serverless
**File:** `src/lib/rate-limiter.ts`  
Map di-reset setiap cold start di Vercel.

### 29. Breadcrumb Tidak Cover Semua Rute
**File:** `src/components/Breadcrumb.tsx:6-10`  
`crumbMap` tidak punya mapping untuk: `finance`, `admin`, `suppliers`, `activity`, `export`, `chat`.

### 30. `finance/page.tsx` Pakai Client-Side untuk Halaman yang Bisa Server-Side
```typescript
'use client';
// Fetch data via useEffect → extra round-trip
const data = await getExpenses();
```
Halaman keuangan bisa lebih efisien sebagai Server Component yang langsung query database.

---

## ⚠️ Koreksi dari Audit Sebelumnya

| # | Klaim Audit Sebelumnya | Kenyataan |
|---|---|---|
| 1 | "`validateEnv()` tidak dipanggil" | **SALAH** — Sudah dipanggil di `layout.tsx:32` |
| 2 | "Scan Resi tidak terhubung ke form" | **SALAH** — `orders/new/page.tsx` sudah membaca `searchParams` dan meneruskan ke `NewOrderForm` sebagai `initialCustomerName` / `initialPlatform` |
| 3 | "`actions/orders.ts` ✅ OK" | **SALAH** — Ada 2 bug kritis (#1, #2) |
| 4 | "`OrderDetailClient` ✅ OK" | **SALAH** — Render `item.totalPrice` yang undefined → NaN (#3) |
| 5 | "Settings page ✅ OK" | **SALAH** — Auto-deduct tidak bekerja (#10), status hardcoded (#11) |
| 6 | "~20+ file ✅ OK tanpa dibuka" | **SALAH** — Ternyata banyak yang punya masalah setelah benar-benar dibaca |

---

## 🎯 Prioritas Perbaikan

### Harus Segera (Hari Ini)
| # | Item | Waktu |
|---|---|---|
| 1 | Fix middleware → tambah `/api/bot` | 1 menit |
| 2 | Fix `createOrder` → validasi stok cukup | 15 menit |
| 3 | Fix `deleteOrder` → kembalikan stok | 15 menit |
| 4 | Fix `OrderDetailClient` → hitung totalPrice | 5 menit |
| 5 | Fix `stock/[id]/page.tsx` → await params | 2 menit |
| 6 | Hapus import `db` di `activity/page.tsx` | 1 menit |

### Minggu Ini
| # | Item | Waktu |
|---|---|---|
| 7 | Implement auto-deduct di `updateOrderStatus` | 30 menit |
| 8 | Fix TailwindCSS classes → pakai vanilla CSS | 45 menit |
| 9 | Replace semua `alert()` → `showToast()` | 15 menit |
| 10 | Set `JWT_SECRET`, `ADMIN_PASSWORD` di Vercel env | 5 menit |
| 11 | Fix colSpan mismatch di OrderList & StockTable | 5 menit |
| 12 | Hapus dead link `/restock/po` | 2 menit |

### Bisa Nanti
| # | Item | Waktu |
|---|---|---|
| 13 | Tambah auth ke cron endpoints | 10 menit |
| 14 | Tambah dropdown supplier di ExpenseForm | 20 menit |
| 15 | Konsolidasi `/history` dan `/activity` | 10 menit |
| 16 | Deduplikasi util functions | 10 menit |
| 17 | Pindah dangerouslySetInnerHTML CSS ke globals.css | 5 menit |

---
---

# 🔍 GAP ANALYSIS — Blueprint vs Kode Aktual (22 Maret 2026)

> Crosscheck menyeluruh antara **4 dokumen blueprint** (BLUEPRINT.md, CHATBOT_BLUEPRINT.md, IMPROVEMENT_BLUEPRINT.md, AUDIT_SOFTWARE.md — 3.137 baris total) terhadap **87 file kode** aktual di `src/`.

## 📊 Ringkasan Cepat

| Dokumen | Total Item | ✅ Sudah | ❌ Belum | ⚠️ Sebagian |
|---|---|---|---|---|
| BLUEPRINT.md (Fase 1–6 + Phase 10) | ~50 fitur | ~40 | ~5 | ~5 |
| CHATBOT_BLUEPRINT.md (Phase 1–12) | ~25 fitur | ~15 | ~8 | ~2 |
| AUDIT_SOFTWARE.md (30 temuan) | 30 bug/temuan | ~22 | ~8 | 0 |
| IMPROVEMENT_BLUEPRINT.md (63 item) | 63 item | ~35 | ~20 | ~8 |

**Total Implementasi: ~70-75%**

---

## 🔴 Bug Kritis yang MASIH ADA

| # | Bug | File | Status Perbaikan |
|---|---|---|---|
| 1 | `createOrder` tidak validasi stok → bisa negatif | `actions/orders.ts` | ⏳ Akan diperbaiki |
| 2 | `deleteOrder` hapus pesanan tanpa kembalikan stok | `actions/orders.ts` | ⏳ Akan diperbaiki |
| 3 | Detail Pesanan "Rp NaN" (`totalPrice` tidak di-query) | `orders/[id]/*.tsx` | ⏳ Akan diperbaiki |

## 🟠 Fitur yang BELUM Diimplementasi

| # | Fitur | Sumber | Status |
|---|---|---|---|
| 1 | Sorting tabel stok (klik header) | IMPROV C5 | ❌ |
| 2 | Loading skeleton per-route | IMPROV C3 | ⚠️ Hanya 1 global |
| 3 | TailwindCSS classes nyasar | AUDIT #19 | ⚠️ 2+ file |
| 4 | `alert()` sisa di `scan/page.tsx` | AUDIT #20 | ⚠️ 1 tempat |
| 5 | colSpan mismatch | AUDIT #22, #23 | ❌ |
| 6 | `global-error.tsx` klaim logging palsu | AUDIT #18 | ❌ |
| 7 | Testing coverage rendah (2 file) | IMPROV E13 | ⚠️ |
| 8 | Logging/monitoring | IMPROV E15 | ❌ |
| 9 | Vision bot lanjutan (foto produk/nota) | CHATBOT 7 | ❌ |
| 10 | Voice Command (Groq Whisper) | CHATBOT Future | ❌ God-Tier |

## ✅ Fitur yang Sudah Terimplementasi dengan Baik

- Core CRUD (produk, stok, pesanan, kategori, supplier)
- Telegram Bot 14 CRUD actions (Phase 12 Clone Mode)
- Dark mode, SearchModal Ctrl+K, Lucide icons
- Pagination, ConfirmDialog, Toast
- Error boundary, Auth/middleware, auto-deduct packaging
- Breadcrumb, PWA, Predictive AI, Dashboard charts
- SWR polling sudah dioptimasi (15s/30s)
- `userScalable: true`, drag-drop scan, env validation

