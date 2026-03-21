# 🛠️ IMPROVEMENT BLUEPRINT — SCM Kaos Kami
## Full Audit & Redesign Roadmap (Senior Developer Perspective)

> Hasil audit menyeluruh terhadap **44 file source code** oleh Senior Software Developer.
> Setiap temuan diberi label prioritas, file target, dan solusi teknis.

---

## 📊 Ringkasan Audit

| Kategori | Jumlah |
|----------|--------|
| 🔴 A. Redesign UI Total (Spacing, Layout, Visual) | 12 item |
| 🟠 B. Fitur CRUD Hilang (Create/Delete) | 8 item |
| 🟡 C. UX & Interaksi yang Kurang | 10 item |
| ⚪ D. Polish & Enterprise Features | 10 item |
| 🛡️ E. Production Hardening (Keamanan & Stabilitas) | 15 item |
| 🐛 F. Code Bugs & Data Integrity | 8 item |
| **TOTAL** | **63 item** |

---
---

# 🔴 A. REDESIGN UI TOTAL

> Masalah utama: Semua elemen **terlalu rapat/berdempetan**, tidak ada ruang bernafas (whitespace), card-card berdesakan tanpa jarak yang cukup, dan tidak ada hierarki visual yang jelas antara section. Software terasa seperti "spreadsheet bercorak" bukan "dashboard premium".

---

### A1. Overhaul `globals.css` — Design System Baru

**Masalah Saat Ini:**
- `gap-4` hanya memberikan `1rem` (16px) antar elemen — terlalu sempit untuk dashboard
- Tidak ada jarak vertikal antar *section* (misal: Stat Cards → Activity → Low Stock)
- `glass-card` padding hanya `1.5rem` — terasa sesak di dalamnya
- Tidak ada max-width constraint pada `.page-container`, konten melar tak terbatas
- Tidak ada section spacing system (antar blok konten)
- Typography terlalu besar (`h1: 1.75rem`) relatif terhadap padding kecilnya

**Solusi (Overhaul Penuh):**
```
- Tambahkan gap-6 (1.5rem) dan gap-8 (2rem) utility classes
- Naikkan .glass-card padding dari 1.5rem → 1.75rem
- Tambahkan .section-gap = margin-bottom: 2rem
- Set .page-container max-width: 1280px + margin: 0 auto
- Tambahkan .card-grid = display: grid + gap: 1.5rem (bukan 1rem)
- Perkecil h1: 1.5rem, h2: 1.2rem — lebih proporsional
- Tambahkan .w-full, .truncate, .flex-1, .text-sm, .text-xs, .font-medium, .font-bold utility classes
- Tambahkan .rounded-xl (16px), .shadow-soft, .shadow-lg utility classes
```

**File:** `src/app/globals.css`

---

### A2. Sidebar Menabrak Konten (Bug CSS Kritis)

**Masalah:** Di sebagian resolusi desktop, sidebar fixed 250px *overlap* dengan konten utama. Teks "Manajemen Stok" terpotong.

**Solusi:**
- Pastikan `.main-content { margin-left: 250px }` selalu aktif di desktop
- Tambahkan `overflow-x: hidden` pada `.page-container`

**File:** `src/app/globals.css`

---

### A3. Dashboard — Grid Terlalu Padat

**Masalah Saat Ini:**
- 4 stat cards + asset value + 3-column grid (activity + low stock + actions) semuanya berdempetan tanpa jeda
- Kartu "Peringatan Stok" terlalu panjang (list produk tanpa scroll)
- Quick Actions tersembunyi di bawah, tidak terlihat tanpa scroll

**Solusi:**
- Pisahkan dashboard menjadi *visual sections* yang jelas: `Hero Stats → Asset Value → Content Grid → Quick Actions`
- Tambahkan margin/padding antar section (`gap-6` bukan `gap-4`)
- Batasi list Peringatan Stok maksimal 5 item, tambahkan "Lihat Semua →"
- Grid 3-kolom ubah breakpoint: 1 kolom di ≤1024px (tablet), bukan hanya ≤768px (HP)

**File:** `src/app/DashboardClient.tsx`, `src/app/globals.css`

---

### A4. Tabel Stok — Terlalu Polos & Tanpa Aksi

**Masalah:**
- Tidak ada kolom "Aksi" (detail/hapus)
- Nama produk tidak bisa diklik ke halaman detail
- Input number stok terlalu kecil (80px) dan tanpa konteks
- Tidak ada alternating row color (zebra striping)
- Tidak ada warna indikator pada baris yang stoknya rendah

**Solusi:**
- Tambahkan kolom "Aksi" di ujung kanan: ikon `Eye` + `Trash`
- Bungkus nama produk dengan `<Link href={/stock/${id}}>` (klikable)
- Perlebar input stok: 100px, tambah +/- button di samping
- Tambah zebra striping: baris genap background berbeda
- Baris low-stock diberi highlight merah muda

**File:** `src/app/stock/StockTableClient.tsx`

---

### A5. Topbar — Search Bar Terlalu Mendominasi

**Masalah:**
- Search bar menempati hampir separuh Topbar
- Di mobile, search bar menghimpit ikon notifikasi

**Solusi:**
- Kurangi maxWidth search: `350px` → `280px`
- Jadikan search sebagai ikon saja di mobile (klik → expand)
- Pindahkan action buttons (Pesanan Baru, Scan Resi) ke dalam Topbar sebagai quick-access icons

**File:** `src/components/layout/Topbar.tsx`

---

### A6. Halaman Detail Produk — Tidak Responsif

**Masalah:** `grid-cols-3` hardcoded tanpa breakpoint. Di tablet/HP, foto dan form saling menimpa.

**Solusi:**
- Mobile: 1 kolom (foto atas, form bawah)
- Tablet (≤1024px): 2 kolom
- Tambahkan tombol "Kembali ke Stok" di atas

**File:** `src/app/stock/[id]/ProductDetailClient.tsx`

---

### A7. Halaman Detail Pesanan — Read-Only & Tidak Responsif

**Masalah:**
- `grid-cols-2` tanpa fallback mobile (akan jadi 2 kolom sempit di HP)
- Status pesanan **tidak bisa diubah** dari halaman ini (harus kembali ke list)
- Tidak ada tombol hapus pesanan

**Solusi:**
- Tambah `mobile-col` class agar 1 kolom di HP
- Tambahkan dropdown status changer + tombol hapus
- Tambahkan link ke halaman stok produk yang dipesan

**File:** `src/app/orders/[id]/page.tsx`

---

### A8. Halaman Chat AI — Bubble Terlalu Lebar

**Masalah:** Chat bubbles `maxWidth: 80%` masih terlalu lebar di desktop. Terasa seperti email, bukan chat.

**Solusi:**
- Desktop: `maxWidth: 65%`
- Tambahkan avatar (ikon robot vs ikon user) di samping bubble
- Tambahkan timestamp di bawah setiap pesan

**File:** `src/app/chat/page.tsx`

---

### A9. Halaman Kalkulator — Hasil Kurang Visual

**Masalah:** Hasil kalkulasi hanya angka polos dalam grid. Kurang menarik dan tidak ada history kalkulasi.

**Solusi:**
- Tampilkan hasil dalam card yang lebih visual (ikon, warna gradient)
- Simpan riwayat 5 kalkulasi terakhir di `localStorage`

**File:** `src/app/calculator/page.tsx`

---

### A10. Halaman Analysis — Grid 3 Kolom Crash di Mobile

**Masalah:** `grid-cols-3` tanpa breakpoint. Skor kesehatan + summary + action items berantakan di HP.

**Solusi:**
- Mobile: 1 kolom
- Tablet: 2 kolom
- Skor kesehatan di atas (full width di mobile)

**File:** `src/app/analysis/page.tsx`

---

### A11. Halaman Settings — Tailwind Class Tidak Bekerja

**Masalah:** Menggunakan `md:grid-cols-3` (Tailwind syntax) padahal proyek ini full Vanilla CSS. Class ini **tidak akan berfungsi**.

**Solusi:**
- Ganti semua `md:grid-cols-X` dengan class CSS kustom atau inline responsive styles

**File:** `src/app/settings/page.tsx`

---

### A12. Bottom Nav — Tidak Ada Indikator Halaman Aktif (Visual)

**Masalah:** BottomNav sudah punya logic `active`, tapi secara visual perbedaannya minimal (hanya warna berubah). Perlu indikator visual yang lebih kuat.

**Solusi:**
- Tambahkan dot kecil atau garis bawah (underline) berwarna primary di bawah ikon aktif
- Ikon aktif sedikit membesar (scale 1.1)

**File:** `src/components/layout/BottomNav.tsx`, `src/app/globals.css`

---
---

# 🟠 B. FITUR CRUD HILANG

---

### B1. [BUAT] Halaman Tambah Produk Baru

**Status Saat Ini:** TIDAK ADA.

**Solusi:**
- Buat `src/app/stock/new/page.tsx` + `NewProductForm.tsx`
- Form fields: Nama, SKU (auto-generate), Kategori (dropdown), Warna, Ukuran, Bahan, Harga Beli, Harga Jual, Min Stok, Satuan, Upload Foto
- Validasi: SKU unik, harga > 0, nama wajib
- Server action: `createProduct()` di `src/app/actions/product.ts`

**File Baru:** `src/app/stock/new/page.tsx`, `src/app/stock/new/NewProductForm.tsx`
**File Modify:** `src/app/actions/product.ts`, `src/app/stock/page.tsx`

---

### B2. [BUAT] Hapus Produk (Delete)

**Status Saat Ini:** TIDAK ADA.

**Solusi:**
- Tombol ikon 🗑️ di tabel stok + halaman detail produk
- Dialog konfirmasi sebelum hapus
- Server action: `deleteProduct()` → hapus dari `products` + `stockMovements` terkait

**File Modify:** `src/app/stock/StockTableClient.tsx`, `src/app/stock/[id]/ProductDetailClient.tsx`, `src/app/actions/product.ts`

---

### B3. [BUAT] Hapus Pesanan (Delete Order)

**Status Saat Ini:** TIDAK ADA.

**Solusi:**
- Tombol hapus di `OrderListClient.tsx` + halaman detail
- Server action: `deleteOrder()` di `src/app/actions/orders.ts`

**File Modify:** `src/app/orders/OrderListClient.tsx`, `src/app/orders/[id]/page.tsx`, `src/app/actions/orders.ts`

---

### B4. [BUAT] CRUD Kategori (Tambah / Edit / Hapus)

**Status Saat Ini:** Settings menampilkan kategori tapi TIDAK BISA diubah.

**Solusi:**
- Tambahkan form inline / modal untuk tambah kategori baru
- Ikon edit dan hapus di setiap card kategori
- Buat `src/app/actions/categories.ts`

**File Baru:** `src/app/actions/categories.ts`
**File Modify:** `src/app/settings/page.tsx`

---

### B5. [BUAT] Link Produk ke Detail dari Tabel

**Status Saat Ini:** Nama produk di tabel stok TIDAK bisa diklik.

**Solusi:** Bungkus nama produk dengan `<Link href={/stock/${id}}>`

**File Modify:** `src/app/stock/StockTableClient.tsx`

---

### B6. [BUAT] Ubah Status Pesanan dari Halaman Detail

**Status Saat Ini:** Halaman `/orders/[id]` sepenuhnya read-only.

**Solusi:** Tambahkan dropdown status + tombol simpan di halaman detail

**File Modify:** `src/app/orders/[id]/page.tsx`

---

### B7. [BUAT] Tombol Stok di Label Salah

**Masalah:** Tombol utama halaman Stok bertuliskan "+ Tambah Pesanan" (link ke `/orders/new`). Konteksnya salah — ini halaman STOK, bukan pesanan.

**Solusi:** Ganti menjadi "+ Produk Baru" → link ke `/stock/new`

**File Modify:** `src/app/stock/page.tsx`

---

### B8. [BUAT] Export CSV dari Website

**Status Saat Ini:** Hanya bisa export CSV via Telegram Bot.

**Solusi:** Tombol "📥 Export CSV" di halaman stok atau laporan

**File Modify:** `src/app/stock/StockTableClient.tsx` atau `src/app/stock/page.tsx`

---
---

# 🟡 C. UX & INTERAKSI

---

### C1. Toast Notification (Ganti semua `alert()`)

**Masalah:** Seluruh feedback menggunakan `alert()` browser bawaan (memblock thread, jelek).

**Solusi:**
- Buat komponen `Toast.tsx` (auto-dismiss 3 detik, warna per tipe)
- Ganti semua `alert()` di: `StockTableClient`, `ProductDetailClient`, `NewOrderForm`, `AutoDeductClient`, `CalculatorPage`

**File Baru:** `src/components/Toast.tsx`
**File Modify:** 5+ file

---

### C2. Konfirmasi Dialog (Bukan `window.confirm()`)

**Solusi:** Buat `ConfirmDialog.tsx` — modal cantik untuk aksi destruktif (hapus produk, hapus pesanan)

**File Baru:** `src/components/ConfirmDialog.tsx`

---

### C3. Loading Skeleton

**Masalah:** Halaman **kosong** sebelum data muncul. Tidak ada indikator loading kecuali di halaman Analysis.

**Solusi:**
- Buat `loading.tsx` untuk route: `/`, `/stock`, `/orders`, `/history`
- Tampilkan skeleton placeholder (abu-abu berkedip)

**File Baru:** `src/app/loading.tsx`, `src/app/stock/loading.tsx`, dll.

---

### C4. Pagination

**Masalah:** History menampilkan 100 baris sekaligus. Orders menampilkan semua pesanan.

**Solusi:** Implementasi pagination 15 item per halaman

**File Modify:** `src/app/history/page.tsx`, `src/app/orders/OrderListClient.tsx`

---

### C5. Sorting Tabel

**Masalah:** Tabel stok tidak bisa diurutkan (by nama, stok, harga).

**Solusi:** Header tabel yang bisa diklik → toggle ascending/descending

**File Modify:** `src/app/stock/StockTableClient.tsx`

---

### C6. SearchDialog Global (Ctrl+K)

**Masalah:** Pencarian hanya redirect ke halaman stok.

**Solusi:**
- Buat modal overlay `SearchDialog.tsx` (muncul saat klik search atau tekan `Ctrl+K`)
- Terhubung ke `/api/search` yang sudah ada

**File Baru:** `src/components/SearchDialog.tsx`
**File Modify:** `src/components/layout/Topbar.tsx`

---

### C7. Empty State yang Informatif

**Masalah:** "Tidak ada produk ditemukan." terlalu polos.

**Solusi:** Ilustrasi SVG + pesan ramah + tombol aksi ("Tambah Produk Pertama!")

**File Modify:** `StockTableClient.tsx`, `OrderListClient.tsx`

---

### C8. Timestamp Ramah (Relative Time)

**Masalah:** Timestamp mentah `2024-03-15T10:30:00` ditampilkan apa adanya.

**Solusi:** Buat helper `timeAgo()` → "2 jam lalu", "Kemarin, 10:30"

**File Baru:** `src/lib/utils.ts`
**File Modify:** `history/page.tsx`, `DashboardClient.tsx`

---

### C9. Form Pesanan Baru — Kurang Field

**Masalah:** `NewOrderForm.tsx` tidak memiliki field untuk memilih produk dari inventori. Hanya nama pelanggan dan platform.

**Solusi:**
- Tambahkan section "Pilih Produk" dengan dropdown + qty
- Harga total auto-calculate
- Setelah submit, auto-deduct stok produk yang dipilih

**File Modify:** `src/app/orders/new/NewOrderForm.tsx`

---

### C10. Profil Bisnis di Settings — Hardcoded

**Masalah:** Nama "Kaos Kami" dan "Hengki Setiawan" di-hardcode dalam JSX. Tidak bisa diubah dari UI.

**Solusi:**
- Buat tabel `settings` di database atau simpan di `localStorage`
- Buat form edit profil di halaman Settings

**File Modify:** `src/app/settings/page.tsx`, `src/components/layout/Topbar.tsx`

---
---

# ⚪ D. POLISH & ENTERPRISE FEATURES

---

### D1. Dark Mode Toggle

**Solusi:** Tombol 🌙/☀️ di Topbar, simpan di `localStorage`, inject class `dark` di `<html>`

**File Modify:** `globals.css` (variabel dark), `Topbar.tsx`

---

### D2. Breadcrumb Navigation

**Solusi:** Komponen `Breadcrumb.tsx` → `Dashboard > Stok > Kaos Hitam L`

**File Baru:** `src/components/Breadcrumb.tsx`

---

### D3. Keyboard Shortcuts

**Solusi:** `Ctrl+K` = Search, `Ctrl+N` = Pesanan Baru

**File Modify:** `AppLayout.tsx`

---

### D4. Bulk Actions (Multi-Select + Hapus)

**Solusi:** Checkbox di tabel → toolbar aksi massal

**File Modify:** `StockTableClient.tsx`

---

### D5. Print-Friendly CSS

**Solusi:** `@media print` di `globals.css` → sembunyikan sidebar, bottomnav, topbar

**File Modify:** `globals.css`

---

### D6. PWA Install Banner

**Masalah:** PWA sudah dikonfigurasi tapi tidak ada prompt "Instal Aplikasi" yang visible.

**Solusi:** Tambahkan banner `Instal Aplikasi Ini di HP` di bagian bawah halaman untuk pertama kali

**File Baru:** `src/components/InstallBanner.tsx`

---

### D7. Webhook Setup Page

**Masalah:** Setup webhook Telegram harus dilakukan manual via URL browser.

**Solusi:** Tambahkan tombol "Set Webhook" di halaman Settings yang otomatis memanggil Telegram API

**File Modify:** `src/app/settings/page.tsx`

---

### D8. Activity Log / Audit Trail

**Masalah:** Riwayat hanya mencatat stok masuk/keluar. Tidak ada log untuk: siapa login, siapa edit produk, siapa buat pesanan.

**Solusi:** Buat tabel `activity_logs` dan catat semua aksi penting

**File Baru:** `src/db/schema.ts` (tambah tabel), `src/app/activity/page.tsx`

---

### D9. Dashboard Metrics Chart

**Masalah:** Dashboard hanya menampilkan angka. Tidak ada visualisasi grafik (chart).

**Solusi:**
- Tambahkan grafik garis (tren stok 7 hari terakhir) menggunakan `recharts` atau `Chart.js`
- Pie chart untuk distribusi stok per kategori

**File Modify:** `src/app/DashboardClient.tsx`

---

### D10. Multi-User Authentication

**Masalah:** Tidak ada sistem login. Siapapun yang punya URL bisa mengakses dashboard.

**Solusi:**
- Implementasi simple PIN/password login
- Middleware Next.js untuk proteksi route
- Session management via cookie

**File Baru:** `src/app/login/page.tsx`, `src/middleware.ts`

---
---

# 📋 PRIORITAS EKSEKUSI (Urutan Kerja)

| # | Item | Impact | Effort |
|---|------|--------|--------|
| 1 | A1: globals.css overhaul (spacing, max-width) | 🔥🔥🔥 | Sedang |
| 2 | A2: Sidebar overlap fix | 🔥🔥🔥 | Rendah |
| 3 | F1-F4: Fix bugs kritis (stok negatif, order number, auto-deduct) | 🔥🔥🔥 | Sedang |
| 4 | E1: Validasi form (semua halaman) | 🔥🔥🔥 | Sedang |
| 5 | B1: Halaman tambah produk | 🔥🔥🔥 | Tinggi |
| 6 | B2: Hapus produk | 🔥🔥🔥 | Rendah |
| 7 | C1: Toast notification | 🔥🔥🔥 | Sedang |
| 8 | E2: API route protection | 🔥🔥🔥 | Sedang |
| 9 | E4: Error boundary | 🔥🔥🔥 | Rendah |
| 10 | B7: Label tombol stok salah | 🔥🔥🔥 | Rendah |
| 11 | E6: Upload file validation | 🔥🔥 | Rendah |
| 12 | A3: Dashboard grid spacing | 🔥🔥 | Sedang |
| 13 | B5: Link produk ke detail | 🔥🔥 | Rendah |
| 14 | A4: Tabel stok redesign | 🔥🔥 | Sedang |
| 15 | B3: Hapus pesanan | 🔥🔥 | Rendah |
| 16 | B6: Status di detail order | 🔥🔥 | Sedang |
| 17 | A6-A11: Responsive fixes (6 halaman) | 🔥🔥 | Sedang |
| 18 | E7-E8: 404 page + SEO metadata | 🔥🔥 | Rendah |
| 19 | C2: Confirm dialog | 🔥🔥 | Rendah |
| 20 | C3: Loading skeleton | 🔥🔥 | Rendah |
| 21 | F5-F8: Fix remaining bugs | 🔥🔥 | Sedang |
| 22 | E3: Rate limiting AI | 🔥 | Rendah |
| 23 | B8: Export CSV web | 🔥 | Rendah |
| 24 | C4: Pagination | 🔥 | Sedang |
| 25 | C5: Sorting tabel | 🔥 | Rendah |
| 26 | C6: SearchDialog | 🔥 | Sedang |
| 27 | B4: CRUD kategori | 🔥 | Sedang |
| 28 | C9: Form pesanan + pilih produk | 🔥 | Tinggi |
| 29 | A8: Chat bubble redesign | ⚡ | Rendah |
| 30 | E9-E15: Remaining hardening | ⚡ | Sedang |
| 31 | C7-C8: Empty state + timestamp | ⚡ | Rendah |
| 32 | D1-D10: Polish & Enterprise | ⚡ | Tinggi |

---
---

# 🛡️ E. PRODUCTION HARDENING (Keamanan & Stabilitas)

> Temuan dari audit babak ke-2. Ini bukan masalah visual — ini masalah yang bisa **menghancurkan data bisnis** atau **membuat software crash** di production.

---

### E1. Validasi Form = NOL

**Masalah:** Tidak ada satupun form yang memiliki validasi client-side maupun server-side. Server actions (`product.ts`, `stock.ts`, `orders.ts`) langsung menelan data mentah dari frontend tanpa mengecek apapun.

**Contoh Bahaya:**
- User bisa mengetik nama produk kosong `""` → tersimpan di database
- User bisa memasukkan harga `-50000` (negatif) → diterima
- SKU bisa diisi spasi saja `"   "` → lolos

**Solusi:**
- Install `zod` sebagai library validasi schema
- Buat schema validasi untuk setiap entity: `ProductSchema`, `OrderSchema`
- Validasi di **DUA tempat**: client-side (sebelum submit) DAN server-side (di server action)

**File Modify:** `src/app/actions/product.ts`, `src/app/actions/stock.ts`, `src/app/actions/orders.ts`, `src/app/actions/settings.ts`
**File Baru:** `src/lib/validations.ts`

---

### E2. API Routes Terbuka Lebar (Tanpa Auth)

**Masalah:** Semua endpoint API (`/api/stock`, `/api/chat`, `/api/calculator`, `/api/analysis`, `/api/upload`, `/api/dashboard/stats`) bisa diakses siapapun. Seseorang bisa menggunakan `curl` atau Postman untuk memanipulasi data Anda tanpa login.

**Contoh Bahaya:**
```
curl -X POST https://your-app.vercel.app/api/stock -d '{"productId":"xxx","stock":0}'
# → Stok Anda langsung jadi 0 tanpa jejak
```

**Solusi:**
- Buat middleware auth yang memeriksa session/cookie di setiap API route
- Atau minimal tambahkan secret header check (`X-API-Key`) di setiap route

**File Modify:** Semua file di `src/app/api/*/route.ts`
**File Baru:** `src/middleware.ts`, `src/lib/auth.ts`

---

### E3. Rate Limiting pada AI Endpoints

**Masalah:** Endpoint `/api/chat`, `/api/calculator`, `/api/analysis`, `/api/vision` memanggil Groq API yang punya batas kuota (dan biaya). Tanpa rate limiting, seseorang bisa mengirim 1000 request per detik dan menghabiskan seluruh kredit Groq Anda.

**Solusi:**
- Implementasi in-memory rate limiter: maksimal 10 request per menit per IP
- Return HTTP 429 "Too Many Requests" jika melebihi batas

**File Baru:** `src/lib/rate-limiter.ts`
**File Modify:** `api/chat/route.ts`, `api/calculator/route.ts`, `api/analysis/route.ts`, `api/vision/route.ts`

---

### E4. React Error Boundary

**Masalah:** Jika salah satu komponen React crash karena data null atau API error, **seluruh halaman mati putih**. Tidak ada fallback UI.

**Solusi:**
- Buat `error.tsx` di setiap route folder (Next.js App Router convention)
- Tampilkan pesan "Terjadi kesalahan" dengan tombol "Coba Lagi"

**File Baru:** `src/app/error.tsx`, `src/app/stock/error.tsx`, `src/app/orders/error.tsx`

---

### E5. Environment Variable Tidak Divalidasi

**Masalah:** Jika `GROQ_API_KEY`, `TURSO_DATABASE_URL`, atau `CLOUDINARY_API_KEY` kosong/salah saat deploy, aplikasi akan crash saat runtime dengan error yang membingungkan. Tidak ada pengecekan di awal.

**Solusi:**
- Buat file `src/lib/env.ts` yang memvalidasi semua ENV wajib saat boot
- Tampilkan pesan error yang jelas jika ada yang kosong

**File Baru:** `src/lib/env.ts`

---

### E6. Upload File Tanpa Validasi

**Masalah:** Endpoint `/api/upload` menerima file **apapun** — file 200MB, file .exe, file .zip — tanpa pengecekan ukuran atau tipe. Ini adalah kelemahan keamanan serius.

**Kode bermasalah di `api/upload/route.ts`:**
```typescript
const file = formData.get('file') as File; // Langsung dipakai tanpa cek
```

**Solusi:**
- Validasi tipe file: hanya izinkan `image/jpeg`, `image/png`, `image/webp`
- Validasi ukuran: maksimal 5MB
- Return 400 jika tidak memenuhi syarat

**File Modify:** `src/app/api/upload/route.ts`

---

### E7. Custom 404 Page

**Masalah:** Jika user mengakses URL yang tidak ada (misal `/stock/id-yang-salah` atau `/halaman-asal-asalan`), mereka melihat halaman error default Next.js yang jelek dan membingungkan.

**Solusi:** Buat `not-found.tsx` dengan desain brand Kaos Kami + tombol "Kembali ke Dashboard"

**File Baru:** `src/app/not-found.tsx`

---

### E8. SEO Metadata Per-Halaman

**Masalah:** `layout.tsx` hanya set 1 metadata global: `title: "Kaos Kami SCM"`. Semua halaman di tab browser bertuliskan sama. Tidak ada per-page title.

**Solusi:**
- Tambahkan `export const metadata` di setiap `page.tsx` (Next.js convention)
- Contoh: halaman stok → `title: "Manajemen Stok — Kaos Kami SCM"`

**File Modify:** Semua `page.tsx` (8+ file)

---

### E9. Aksesibilitas (a11y) = 0

**Masalah:** Tidak ada satupun elemen yang memiliki `aria-label`, `role`, atau `alt` text yang bermakna. Pengguna screen reader/disability 100% tidak bisa mengoperasikan software ini. Ini bisa jadi masalah hukum di beberapa negara.

**Solusi:**
- Tambahkan `aria-label` di semua tombol ikon (🗑️, 🔔, ikon search)
- Tambahkan `role="navigation"` pada sidebar dan bottomnav
- Pastikan semua `<img>` punya `alt` text deskriptif
- Tambahkan focus ring yang terlihat pada semua elemen interaktif

**File Modify:** Semua komponen layout + halaman utama

---

### E10. Database Tumbuh Tanpa Batas

**Masalah:** Tabel `stock_movements`, `chat_messages`, dan `alerts` akan terus bertambah selamanya tanpa mekanisme pembersihan. Setelah 6-12 bulan, query akan sangat lambat.

**Solusi:**
- Buat cron atau script untuk mengarsipkan data lebih dari 90 hari
- Atau implementasi soft-delete dengan flag `is_archived`
- Batasi `chat_messages` maksimal 500 pesan terakhir

**File Modify:** `src/app/api/cron/stock-check/route.ts` (tambah cleanup logic)

---

### E11. Tidak Ada Offline Support

**Masalah:** Blueprint awal menyebut PWA, tapi tidak ada service worker caching yang sebenarnya. Jika internet mati, software 100% mati — semua API call gagal tanpa fallback.

**Solusi:**
- Konfigurasi `next-pwa` dengan runtime caching strategy
- Cache halaman statis (dashboard, stok) untuk offline viewing
- Tampilkan banner "Anda Offline" jika koneksi terputus

**File Modify:** `next.config.js`, `src/app/layout.tsx`

---

### E12. Tidak Ada Next.js Image Optimization

**Masalah:** Semua gambar (foto produk, foto resi) menggunakan `<img>` biasa, bukan `<Image>` dari Next.js. Ini berarti:
- Gambar tidak di-lazy-load (semua dimuat sekaligus)
- Gambar tidak di-resize otomatis sesuai viewport
- Performance score buruk di Lighthouse

**Solusi:**
- Ganti semua `<img src>` dengan `<Image>` dari `next/image`
- Daftarkan domain Cloudinary di `next.config.js` → `images.remotePatterns`

**File Modify:** `ProductDetailClient.tsx`, `orders/[id]/page.tsx`, `orders/scan/page.tsx`

---

### E13. Testing = 0%

**Masalah:** Tidak ada satupun test file. Setiap perubahan kode berpotensi merusak fitur lain tanpa kita ketahui.

**Solusi:**
- Install `vitest` + `@testing-library/react`
- Tulis minimal unit test untuk setiap server action (`createOrder`, `updateStock`, `deleteProduct`)
- Tulis integration test untuk API routes kritis
- Target coverage: minimal 60%

**File Baru:** `src/__tests__/actions/stock.test.ts`, `src/__tests__/actions/orders.test.ts`, dll.

---

### E14. Favicon & PWA Icons Masih Default

**Masalah:** Favicon di tab browser dan ikon PWA kemungkinan masih ikon default Next.js (segitiga hitam), bukan logo brand "Kaos Kami".

**Solusi:**
- Generate favicon set (16x16, 32x32, 180x180, 512x512)
- Update `manifest.json` dengan ikon brand
- Taruh di `public/favicon.ico` dan `public/icons/`

**File Modify:** `public/manifest.json`, `public/favicon.ico`

---

### E15. Tidak Ada Logging/Monitoring

**Masalah:** Semua error hanya di-`console.error()`. Di production (Vercel), log ini akan hilang setelah beberapa menit. Tidak ada cara untuk mengetahui error apa yang terjadi kemarin.

**Solusi:**
- Integrasikan dengan Vercel's built-in logging (gratis)
- Atau tambahkan layanan monitoring sederhana (Sentry free tier)
- Minimal: buat tabel `error_logs` di database untuk menyimpan error penting

**File Baru:** `src/lib/logger.ts`

---
---

# 🐛 F. CODE BUGS & DATA INTEGRITY

> Bug nyata yang ditemukan saat membaca source code baris per baris. Ini bukan soal fitur yang kurang — ini adalah **kode yang sudah ada tapi SALAH**.

---

### F1. `updateStock()` — Stok Bisa Jadi Negatif

**File:** `src/app/actions/stock.ts` (baris 9-36)

**Bug:** Server action `updateStock()` langsung menerima `newValue` dari frontend tanpa validasi. User bisa mengetik `-50` di input stok dan database langsung menyimpan `-50`.

**Kode bermasalah:**
```typescript
await db.update(products)
  .set({ currentStock: newValue }) // newValue bisa -999!
```

**Fix:** Tambahkan guard: `if (newValue < 0) return { success: false, error: 'Stok tidak boleh negatif' }`

---

### F2. Auto-Deduct Bisa Membuat Stok Di Bawah 0

**File:** `src/app/actions/orders.ts` (baris 109-115)

**Bug:** Saat pesanan diubah ke "shipped", auto-deduct packaging **tidak mengecek** apakah stok packaging cukup.

**Kode bermasalah:**
```typescript
const newStock = product.currentStock - item.quantity;
// newStock bisa jadi -5 dan langsung disimpan!
await tx.update(products).set({ currentStock: newStock });
```

**Fix:** Tambahkan: `if (newStock < 0) { /* skip atau warning, jangan sampai negatif */ }`

---

### F3. Order Number Rentan Collision

**File:** `src/app/actions/orders.ts` (baris 25)

**Bug:** `const orderNumber = "ORD-" + Date.now().toString().slice(-6);` — Hanya mengambil 6 digit terakhir dari timestamp. Jika 2 pesanan dibuat dalam milidetik yang sama, mereka akan punya **nomor pesanan yang sama**, dan karena `order_number` adalah `UNIQUE` di database, yang kedua akan **crash**.

**Fix:** Gunakan UUID pendek atau tambahkan random suffix: `ORD-${Date.now()}-${Math.random().toString(36).slice(2,5)}`

---

### F4. `updateProductDetails()` Menerima `any` Tanpa Sanitasi

**File:** `src/app/actions/product.ts` (baris 8)

**Bug:** `export async function updateProductDetails(productId: string, data: any)` — Parameter `data` bertipe `any`. Meskipun ada whitelist field, tidak ada validasi tipe data. User bisa mengirim `unitPrice: "bukan_angka"` dan database akan menyimpan string di kolom numerik.

**Fix:** Gunakan Zod schema validation + type checking sebelum insert

---

### F5. Scan Resi — Drag & Drop Tidak Bekerja

**File:** `src/app/orders/scan/page.tsx` (baris 76-93)

**Bug:** UI menampilkan teks "Klik atau **drag & drop** gambar resi ke sini" tetapi **tidak ada event handler untuk drag & drop** (`onDrop`, `onDragOver`). Hanya `<input type="file">` yang bekerja. Ini adalah **fitur palsu** yang membohongi user.

**Fix:** Tambahkan event handler `onDrop` dan `onDragOver` pada container div

---

### F6. NewOrderForm — Grid Tidak Responsif

**File:** `src/app/orders/new/NewOrderForm.tsx` (baris 56, 86)

**Bug:** Form menggunakan `grid-cols-2` dan `flex gap-4 items-end` tanpa breakpoint mobile. Di HP, field "Nama Pelanggan" dan "Platform" akan terjepit menjadi 2 kolom super sempit. Daftar produk (select + qty + harga + hapus) akan terlalu padat.

**Fix:** Tambahkan `mobile-col` class agar menjadi 1 kolom di mobile

---

### F7. `userScalable: false` — Melanggar Aksesibilitas

**File:** `src/app/layout.tsx` (baris 25)

**Bug:** `userScalable: false` mencegah pengguna melakukan pinch-to-zoom di mobile. Ini **melanggar WCAG accessibility guidelines** dan beberapa app store bisa menolak PWA yang melarang zoom.

**Fix:** Ubah menjadi `userScalable: true` atau hapus baris tersebut

---

### F8. SWR Polling Terlalu Agresif

**File:** `src/app/DashboardClient.tsx` (baris 12), `src/app/stock/StockTableClient.tsx` (baris 14)

**Bug:** `refreshInterval: 5000` berarti setiap 5 detik, **semua client yang membuka halaman** akan mengirim request ke server. Jika 10 orang membuka dashboard, itu = 120 request per menit ke database. Ini bisa membuat database Turso melambat atau bahkan melewati rate limit gratis.

**Fix:**
- Naikkan interval ke 15-30 detik untuk halaman stok
- Dashboard cukup 30 detik
- Atau gunakan `revalidateOnFocus: true` saja (hanya refresh saat user kembali ke tab)

---
---

# 📋 PRIORITAS EKSEKUSI (Urutan Kerja — Diperbarui)

| # | Item | Impact | Effort |
|---|------|--------|--------|
| 1 | **F1-F4: Fix bugs kritis** (stok negatif, collision, auto-deduct) | 🔥🔥🔥 | Sedang |
| 2 | **E1: Validasi form** (Zod schema) | 🔥🔥🔥 | Sedang |
| 3 | **A1: globals.css overhaul** (spacing, max-width) | 🔥🔥🔥 | Sedang |
| 4 | **A2: Sidebar overlap fix** | 🔥🔥🔥 | Rendah |
| 5 | **E2: API route protection** | 🔥🔥🔥 | Sedang |
| 6 | **E6: Upload file validation** | 🔥🔥🔥 | Rendah |
| 7 | **B1: Halaman tambah produk** | 🔥🔥🔥 | Tinggi |
| 8 | **B2: Hapus produk** | 🔥🔥🔥 | Rendah |
| 9 | **C1: Toast notification** | 🔥🔥🔥 | Sedang |
| 10 | **E4: Error boundary** | 🔥🔥🔥 | Rendah |
| 11 | **B7: Label tombol stok salah** | 🔥🔥🔥 | Rendah |
| 12 | A3: Dashboard grid spacing | 🔥🔥 | Sedang |
| 13 | B5: Link produk ke detail | 🔥🔥 | Rendah |
| 14 | A4: Tabel stok redesign | 🔥🔥 | Sedang |
| 15 | B3, B6: Hapus pesanan + status di detail | 🔥🔥 | Sedang |
| 16 | A6-A11: Responsive fixes (6 halaman) | 🔥🔥 | Sedang |
| 17 | F5-F8: Fix remaining bugs | 🔥🔥 | Sedang |
| 18 | E7-E8: 404 page + SEO metadata | 🔥🔥 | Rendah |
| 19 | C2-C3: Confirm dialog + Loading skeleton | 🔥🔥 | Rendah |
| 20 | E3: Rate limiting AI | 🔥 | Rendah |
| 21 | B8: Export CSV web | 🔥 | Rendah |
| 22 | C4-C5: Pagination + Sorting | 🔥 | Sedang |
| 23 | C6: SearchDialog | 🔥 | Sedang |
| 24 | B4: CRUD kategori | 🔥 | Sedang |
| 25 | C9: Form pesanan lengkap | 🔥 | Tinggi |
| 26 | E9-E15: Remaining hardening | ⚡ | Sedang |
| 27 | A8, A12: Chat + BottomNav polish | ⚡ | Rendah |
| 28 | C7-C8: Empty state + timestamp | ⚡ | Rendah |
| 29 | D1-D10: Polish & Enterprise + Auth | ⚡ | Tinggi |

---

## 📁 DAFTAR FILE BARU (Diperbarui)

| File | Deskripsi |
|------|-----------|
| `src/app/stock/new/page.tsx` | Halaman tambah produk baru |
| `src/app/stock/new/NewProductForm.tsx` | Form client component |
| `src/app/actions/categories.ts` | Server actions CRUD kategori |
| `src/lib/validations.ts` | Zod schema validasi semua entity |
| `src/lib/auth.ts` | Helper autentikasi (session check) |
| `src/lib/rate-limiter.ts` | Rate limiter untuk API AI |
| `src/lib/env.ts` | Validasi environment variables |
| `src/lib/logger.ts` | Centralized error logging |
| `src/lib/utils.ts` | Helper: timeAgo, formatCurrency |
| `src/components/SearchDialog.tsx` | Modal pencarian global (Ctrl+K) |
| `src/components/Toast.tsx` | Notifikasi toast modern |
| `src/components/ConfirmDialog.tsx` | Dialog konfirmasi hapus |
| `src/components/Breadcrumb.tsx` | Navigasi breadcrumb |
| `src/components/InstallBanner.tsx` | PWA install prompt |
| `src/app/error.tsx` | Error boundary global |
| `src/app/not-found.tsx` | Custom 404 page |
| `src/app/loading.tsx` | Loading skeleton global |
| `src/app/stock/loading.tsx` | Loading skeleton stok |
| `src/app/stock/error.tsx` | Error boundary stok |
| `src/app/orders/loading.tsx` | Loading skeleton pesanan |
| `src/app/orders/error.tsx` | Error boundary pesanan |
| `src/app/login/page.tsx` | Halaman login |
| `src/middleware.ts` | Auth middleware + route protection |
| `src/app/activity/page.tsx` | Halaman audit trail |
| `src/__tests__/` | Unit tests dan integration tests |

## 📁 DAFTAR FILE YANG DIMODIFIKASI (Diperbarui)

| File | Perubahan Utama |
|------|----------------|
| `globals.css` | Spacing system, max-width, sidebar fix, responsive, print CSS, dark mode vars |
| `layout.tsx` | Hapus `userScalable: false`, SEO metadata |
| `DashboardClient.tsx` | Section spacing, grid breakpoint, chart, polling interval |
| `StockTableClient.tsx` | Kolom aksi, link detail, sorting, zebra, export CSV, polling interval |
| `ProductDetailClient.tsx` | Responsif, tombol hapus, Image optimization |
| `stock/page.tsx` | Label tombol benar, link ke `/stock/new` |
| `product.ts` (actions) | `createProduct()`, `deleteProduct()`, Zod validasi |
| `stock.ts` (actions) | Guard stok negatif, Zod validasi |
| `orders.ts` (actions) | `deleteOrder()`, fix order number, fix auto-deduct negatif |
| `OrderListClient.tsx` | Hapus, pagination |
| `orders/[id]/page.tsx` | Status changer, responsive, hapus |
| `orders/scan/page.tsx` | Fix drag-and-drop, responsif |
| `NewOrderForm.tsx` | Responsif mobile, validasi |
| `settings/page.tsx` | CRUD kategori, fix CSS class, webhook setup, profil editable |
| `Topbar.tsx` | SearchDialog, dark mode toggle |
| `BottomNav.tsx` | Active indicator visual |
| `AppLayout.tsx` | Keyboard shortcuts |
| `chat/page.tsx` | Bubble width, avatar, timestamp |
| `calculator/page.tsx` | Visual result, history |
| `analysis/page.tsx` | Responsive grid |
| `api/upload/route.ts` | File type & size validation |
| `api/chat/route.ts` | Rate limiting, auth check |
| `api/calculator/route.ts` | Rate limiting, auth check |
| `api/analysis/route.ts` | Rate limiting, auth check |
| `api/vision/route.ts` | Rate limiting, auth check |
| `api/stock/route.ts` | Auth check |
| `api/cron/stock-check/route.ts` | Cleanup old data logic |
| `next.config.js` | Cloudinary remote patterns, PWA config |
| `public/manifest.json` | Brand icons |

---

> 🔥 **Setelah seluruh 63 poin di atas dieksekusi, SCM Kaos Kami akan menjadi software yang BENAR-BENAR PRODUCTION-READY — bukan hanya cantik, tapi juga aman, stabil, tervalidasi, dan tahan banting layaknya SaaS enterprise sungguhan.**

