# 📦 Blueprint: SCM Stock Management — "Kaos Kami"

> Supply Chain Management & Stock Control System untuk bisnis kaos custom.

---

## 1. Ringkasan Proyek

Sebuah **Progressive Web App (PWA)** untuk mengelola seluruh rantai pasokan bisnis kaos **"Kaos Kami"**, mulai dari bahan mentah, DTF print, aksesoris, hingga produk jadi. Dilengkapi AI assistant super-cerdas (web + Telegram), otomasi pengurangan stok, OCR resi pengiriman, auto-compress gambar, notifikasi Telegram, dan kalkulator penjualan cerdas.

### Tech Stack

| Layer | Teknologi |
|---|---|
| **Frontend** | Next.js 14 (App Router) + PWA (next-pwa) |
| **Database** | Turso (libSQL / SQLite edge) |
| **ORM** | Drizzle ORM |
| **AI** | Groq SDK (Llama 3.2 Vision / Llama 3 / Mixtral) |
| **Notifikasi** | Telegram Bot API (grammy) |
| **Upload Gambar** | Cloudinary (cloudinary SDK + auto-compress) |
| **OCR Resi** | Groq Vision API (image-to-text) |
| **Auth** | Simple PIN / password login (single-user) |
| **Styling** | Vanilla CSS + CSS Variables (dark mode) |
| **Deployment** | Vercel / VPS |

---

## 2. Arsitektur Sistem

```mermaid
graph TB
    subgraph Client ["📱 PWA Client"]
        UI[Next.js App Router]
        SW[Service Worker]
        COMPRESS[Image Auto-Compress]
    end

    subgraph Server ["⚙️ Backend API"]
        API[Next.js API Routes]
        AI_MODULE[AI Module - Groq]
        AI_VISION[AI Vision - OCR Resi]
        TG_BOT[Telegram Bot - Grammy - Full Assistant]
        CRON[Cron Jobs - Stock Check]
        STOCK_ENGINE[Stock Engine - Auto-Deduct]
    end

    subgraph External ["☁️ External Services"]
        TURSO[(Turso DB)]
        CLOUDINARY[Cloudinary CDN]
        GROQ_API[Groq API - Text + Vision]
        TG_API[Telegram API]
    end

    UI --> API
    SW --> UI
    COMPRESS --> API
    API --> TURSO
    API --> CLOUDINARY
    API --> AI_MODULE
    API --> AI_VISION
    AI_MODULE --> GROQ_API
    AI_VISION --> GROQ_API
    TG_BOT --> TG_API
    TG_BOT --> API
    TG_BOT --> TURSO
    TG_BOT --> STOCK_ENGINE
    CRON --> API
    CRON --> TG_BOT
```

---

## 3. Database Schema (Turso/Drizzle)

### 3.1 Tabel Utama

#### `categories` — Kategori stok
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT (PK) | UUID |
| name | TEXT | Nama kategori |
| slug | TEXT | URL-friendly name |
| icon | TEXT | Emoji/icon |
| description | TEXT | Deskripsi |
| created_at | TIMESTAMP | |

**Isi kategori awal (7 kategori):**
1. 🧵 **Baju Polos (Blank)** — stok bahan kaos mentah
2. 🎨 **DTF Print** — stok sablon DTF
3. ✅ **Aksesoris Jadi** — ganci NFC sudah jadi, stiker jadi, casing ganci jadi
4. 🔩 **Bahan Aksesoris** — bahan mentah aksesoris: casing ganci kosong, chip NFC, bahan stiker, dll
5. 👕 **Baju Jadi** — produk kaos siap jual
6. 🛠️ **Alat & Perlengkapan** — kertas termal, solasi, plastik
7. 📦 **Packaging** — plastik zipper, polymailer

---

#### `products` — Master produk/item stok
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT (PK) | UUID |
| category_id | TEXT (FK) | Referensi kategori |
| name | TEXT | Nama produk |
| sku | TEXT | Kode SKU unik |
| description | TEXT | Deskripsi detail |
| image_url | TEXT | URL gambar (Cloudinary, auto-compressed) |
| color | TEXT | Warna (hitam/putih/dll) — nullable |
| size | TEXT | Ukuran (S/M/L/XL/XXL) — nullable |
| material | TEXT | Bahan (cotton combed 24s/30s, dll) — nullable |
| thickness | TEXT | Ketebalan (tipis/sedang/tebal) — nullable |
| sleeve_type | TEXT | Jenis lengan (pendek/panjang/tanpa) — nullable |
| variant_type | TEXT | Jenis varian (untuk stiker dll) — nullable |
| unit | TEXT | Satuan (pcs/lembar/roll/meter/pack) |
| unit_price | REAL | Harga jual per satuan |
| buy_price | REAL | Harga beli per satuan |
| min_stock | INTEGER | Batas minimum stok → trigger alert |
| current_stock | INTEGER | Jumlah stok saat ini |
| is_active | INTEGER | 1=aktif, 0=nonaktif |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

> **Semua field bisa di-edit** langsung dari tabel/detail view (inline editing) maupun via Telegram bot.

---

#### `stock_movements` — Log pergerakan stok (masuk/keluar)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT (PK) | UUID |
| product_id | TEXT (FK) | Referensi produk |
| type | TEXT | `IN` / `OUT` / `ADJUSTMENT` |
| quantity | INTEGER | Jumlah (positif) |
| reason | TEXT | Alasan: restock / order / rusak / koreksi / bot_command |
| reference_id | TEXT | ID order atau referensi terkait — nullable |
| notes | TEXT | Catatan tambahan |
| created_by | TEXT | `web` / `telegram_bot` / `auto_deduct` / `cron` |
| created_at | TIMESTAMP | |

---

#### `orders` — Data pesanan / pengiriman
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT (PK) | UUID |
| order_number | TEXT | Nomor pesanan |
| customer_name | TEXT | Nama pembeli |
| platform | TEXT | shopee/tiktok/manual/whatsapp |
| status | TEXT | pending/processing/shipped/completed/cancelled |
| total_price | REAL | Total harga |
| receipt_image_url | TEXT | Foto resi pengiriman (Cloudinary) — nullable |
| receipt_data | TEXT | JSON hasil OCR resi — nullable |
| notes | TEXT | Catatan |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

---

#### `order_items` — Detail item per pesanan
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT (PK) | UUID |
| order_id | TEXT (FK) | Referensi order |
| product_id | TEXT (FK) | Referensi produk |
| quantity | INTEGER | Jumlah dipesan |
| unit_price | REAL | Harga saat transaksi |

---

#### `price_references` — Referensi harga dari AI
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT (PK) | UUID |
| product_id | TEXT (FK) | Referensi produk — nullable |
| raw_input | TEXT | Input user: "polymailer 100 bungkus 25rb" |
| parsed_unit_price | REAL | Harga satuan hasil kalkulasi |
| total_price | REAL | Harga total |
| quantity | INTEGER | Jumlah |
| unit | TEXT | Satuan |
| ai_response | TEXT | Respon penuh dari AI |
| created_at | TIMESTAMP | |

---

#### `chat_messages` — History chat AI assistant
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT (PK) | UUID |
| source | TEXT | `web` / `telegram` |
| role | TEXT | `user` / `assistant` / `system` |
| content | TEXT | Isi pesan |
| image_url | TEXT | URL gambar yang dikirim user — nullable |
| context_type | TEXT | `general` / `stock` / `price` / `analysis` / `receipt` / `edit` |
| metadata | TEXT | JSON metadata (action log, produk terkait, dll) |
| created_at | TIMESTAMP | |

---

#### `alerts` — Log notifikasi & alert
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT (PK) | UUID |
| product_id | TEXT (FK) | Produk terkait |
| type | TEXT | `low_stock` / `out_of_stock` / `reorder` |
| message | TEXT | Pesan alert |
| is_sent | INTEGER | Sudah dikirim ke Telegram? |
| is_read | INTEGER | Sudah dibaca? |
| created_at | TIMESTAMP | |

---

#### `auto_deduct_rules` — Konfigurasi auto-deduct (editable)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | TEXT (PK) | UUID |
| name | TEXT | Nama rule: "Paket Kirim Standar" |
| description | TEXT | Deskripsi |
| items | TEXT | JSON array: `[{product_id, quantity}]` |
| is_active | INTEGER | 1=aktif |
| created_at | TIMESTAMP | |

---

## 4. Data Stok Awal (Seeding)

### 4.1 Baju Polos (Blank)
| Produk | Warna | Ukuran | Bahan | Ketebalan | Lengan |
|---|---|---|---|---|---|
| Kaos Polos | Hitam | S, M, L, XL, XXL | Cotton Combed 24s | Sedang | Pendek |
| Kaos Polos | Putih | S, M, L, XL, XXL | Cotton Combed 24s | Sedang | Pendek |
| Kaos Polos | Hitam | S, M, L, XL, XXL | Cotton Combed 30s | Tipis | Pendek |
| Kaos Polos | Putih | S, M, L, XL, XXL | Cotton Combed 30s | Tipis | Pendek |

> Total: 2 warna × 5 ukuran × 2 bahan = **20 item**

### 4.2 DTF Print
| Desain | Warna Tersedia |
|---|---|
| Kami Skizo | — (universal) |
| Kami Depresi | Hitam, Putih |
| Kami Bahagia | Hitam, Putih |

> Total: **5 item DTF**

### 4.3 Aksesoris Jadi
| Produk | Keterangan |
|---|---|
| Ganci NFC Jadi | Gantungan kunci NFC sudah dirakit |
| Casing Ganci Jadi | Casing ganci sudah berisi + stiker |
| Stiker Jadi | Stiker siap pakai (per desain/jenis) |

### 4.4 Bahan Aksesoris
| Produk | Keterangan |
|---|---|
| Casing Ganci Kosong | Casing ganci belum dirakit |
| Chip NFC | Chip NFC mentah |
| Bahan Stiker | Lembaran stiker belum dipotong |
| Ring Ganci | Ring/cincin gantungan kunci |

### 4.5 Baju Jadi
| Produk | Warna |
|---|---|
| Kaos Kami Depresi | Hitam, Putih |
| Kaos Kami Skizo | Hitam, Putih |
| Kaos Kami Bahagia | Hitam, Putih |

> Total: **6 item baju jadi** (3 desain × 2 warna)

### 4.6 Alat & Perlengkapan
| Item | Satuan |
|---|---|
| Kertas Termal | Roll |
| Solasi Double Tape | Roll |
| Plastik Zipper | Pcs |
| Plastik Polymailer | Pcs |

### 4.7 Packaging
| Item | Satuan |
|---|---|
| Stiker Packing (per jenis) | Lembar |

> **Semua data di atas bisa ditambah/edit/hapus** kapan saja via website maupun via Telegram bot.

---

## 5. Fitur & Halaman

### 5.1 📊 Dashboard (Home)
- **Ringkasan stok** — total item, low-stock alerts, out-of-stock items
- **Quick stats** — total produk, total nilai stok, pesanan hari ini
- **Grafik tren stok** — chart pergerakan stok 7/30 hari terakhir
- **Alert bar** — notifikasi stok menipis (merah jika kritis)
- **Quick actions** — tombol cepat: tambah stok, proses order, chat AI, scan resi

### 5.2 📦 Manajemen Stok
- **Tampilan per kategori** — tab/filter: Baju Polos, DTF, Aksesoris Jadi, Bahan Aksesoris, Baju Jadi, Alat, Packaging
- **Tabel stok** — nama, SKU, gambar, stok saat ini, min stok, status (aman/rendah/habis)
- **Inline editing** — klik langsung pada cell tabel untuk edit nama, stok, harga, min_stock, dll
- **Detail produk** — modal/drawer: info lengkap, history pergerakan stok, gambar
- **Tambah/Edit produk** — form dengan upload gambar (auto-compress ke Cloudinary)
- **Stok masuk (Restock)** — form input jumlah + catatan
- **Stok keluar (Manual)** — form input jumlah + alasan
- **Bulk update** — update stok beberapa item sekaligus
- **Search & Filter** — cari by nama, warna, ukuran, bahan, kategori
- **Sort** — by stok terbanyak/terendah, nama, tanggal update
- **Tambah produk/kategori baru** — bisa tambah jenis barang baru kapan saja

### 5.3 📋 Proses Pesanan (Order Processing)
- **Daftar pesanan** — tabel dengan status filter (semua field editable)
- **Buat pesanan baru** — pilih produk + jumlah → **otomatis kurangi stok**
- **Detail pesanan** — item, harga, status, tracking, foto resi
- **Upload resi** — foto resi → OCR AI membaca nomor resi, ekspedisi, dll
- **Update status** — pending → processing → shipped → completed
- **Auto-deduct stok:**
  - Saat order dibuat: kurangi stok baju jadi, DTF, aksesoris yang dipesan
  - Saat proses/kirim: kurangi stok packaging (polymailer, stiker packing, dll)
  - Konfigurasi "bundled items" editable

**Auto-deduct rules (konfigurasi default — editable via Settings / Telegram Bot):**
```
Per 1 order dikirim:
├── 4x Stiker Bonus
├── 1x Plastik Polymailer
├── 1x Plastik Zipper
├── Xm Solasi Double Tape (estimasi)
└── 1x Kertas Termal (label pengiriman)
```

### 5.4 📸 Upload & Gambar
- **Auto-compress** — semua gambar yang diupload otomatis di-compress sebelum dikirim ke Cloudinary
  - Resize max dimension: 1200px
  - Quality: 80% webp
  - File size target: < 200KB
- **Upload dari web** — drag & drop atau pilih file
- **Upload dari Telegram** — kirim foto langsung ke bot → auto-compress → simpan
- **Gallery produk** — lihat semua gambar produk & desain

### 5.5 🧾 OCR Resi Pengiriman
- **Upload resi via web** — foto/screenshot resi → AI Vision membaca
- **Upload resi via Telegram** — kirim foto resi ke bot → AI baca otomatis
- **Data yang di-extract:**
  - Nomor resi / tracking number
  - Nama ekspedisi (JNE, J&T, SiCepat, dll)
  - Nama pengirim & penerima
  - Alamat tujuan
  - Berat paket
  - Biaya ongkir
- **Auto-link ke order** — data resi otomatis terhubung ke pesanan terkait
- **Resi beli online** — baca resi pembelian bahan/supply untuk tracking restock

### 5.6 🤖 AI Assistant (Chat Web)
- **Chat interface** — UI mirip ChatGPT, bisa kirim teks DAN gambar
- **Konteks otomatis** — AI punya akses penuh ke seluruh database (stok, order, harga, history)
- **Vision / Gambar** — kirim foto ke chat → AI bisa mendeteksi & membaca gambar (resi, produk, desain)
- **Kemampuan lengkap:**
  - ❓ Tanya status stok: *"Stok kaos hitam L berapa?"*
  - 📊 Analisis: *"Produk mana yang paling laku bulan ini?"*
  - 📦 Rekomendasi restock: *"Kapan harus restock polymailer?"*
  - 💰 Diskusi strategi: *"Harga jual kaos berapa biar untung 40%?"*
  - 🧮 Kalkulator harga: *"Polymailer 100 bungkus 25rb, satuan berapa?"*
  - ✏️ Edit data: *"Ubah stok kaos hitam L jadi 50"* → langsung update database
  - ➕ Tambah barang: *"Tambah produk baru: Kaos Kami Anxiety warna hitam"*
  - 📸 Baca resi: kirim foto resi → extract data
  - 📋 Proses order: *"Aku sudah kirim 1 paket Kami Depresi hitam L"* → auto-deduct semua
- **History chat** tersimpan di database

### 5.7 📈 Analisis Stok (AI-Powered)
- **Stock health overview** — visualisasi status seluruh stok
- **Trend analysis** — grafik pergerakan stok overtime
- **Prediksi kebutuhan** — AI prediksi kapan stok habis berdasarkan pola penggunaan
- **Laporan penggunaan** — bahan mana yang paling banyak digunakan
- **AI insights** — ringkasan & saran dari AI tentang kondisi stok
- **Export laporan** — download sebagai PDF/CSV

### 5.8 🧮 Kalkulator Penjualan (AI-Powered)
- **Input natural language** — ketik: *"polymailer 100 bungkus 25rb"*
- **AI parsing** — otomatis hitung harga satuan: Rp 250/pcs
- **Kalkulasi otomatis:**
  - Harga per satuan
  - Margin keuntungan (bisa set %)
  - Harga jual rekomendasi
  - Total cost per produk (bahan + DTF + aksesoris + packaging)
- **Simpan referensi harga** — tersimpan di `price_references`
- **Simulasi bundle** — hitung biaya 1 paket lengkap (kaos + DTF + ganci + stiker + packaging)

### 5.9 ⚙️ Pengaturan (Settings)
- **Profil bisnis** — nama, kontak, logo
- **Telegram Bot** — setup token bot, chat ID untuk notifikasi
- **Auto-deduct rules** — konfigurasi item apa saja yang otomatis dikurangi per order (full editable)
- **Minimum stock alerts** — set batas minimum per produk / per kategori
- **Kategori management** — tambah/edit/hapus kategori
- **Image compression settings** — atur kualitas & ukuran max gambar
- **Backup & Export** — export data stok ke CSV

### 5.10 🔔 Notifikasi & Alert
- **In-app alert** — badge merah di dashboard
- **Telegram notification:**
  - Stok di bawah minimum → kirim pesan otomatis
  - Stok habis → pesan urgent
  - Ringkasan harian (opsional) — summary stok pagi hari
- **Alert history** — log semua alert yang pernah dikirim

### 5.11 📜 Riwayat / Log Stok (BARU)
- **Halaman riwayat lengkap** — semua pergerakan stok tercatat:
  - ➕ Stok masuk (restock manual, beli bahan)
  - ➖ Stok keluar (order, kirim paket, rusak, koreksi)
  - 🔄 Adjustment (koreksi manual)
  - 🤖 Auto-deduct (otomatis saat proses order)
- **Filter by:**
  - Tipe: masuk / keluar / adjustment / auto-deduct
  - Produk: pilih produk tertentu
  - Tanggal: range tanggal
  - Sumber: web / telegram_bot / auto_deduct / cron
- **Detail per entry:** tanggal, produk, jumlah, tipe, alasan, referensi order, siapa yang melakukan
- **Timeline view** — tampilan kronologis per produk
- **Export** — download log ke CSV

### 5.12 🔍 Global Search (BARU)
- **Search bar di topbar** — bisa search dari halaman manapun
- **Search across:**
  - 📦 Produk & stok — cari by nama, SKU, warna, ukuran, bahan
  - 📋 Pesanan — cari by nomor order, nama customer, platform
  - 📜 Log stok — cari by produk, alasan, catatan
  - 🏷️ Kategori — cari kategori
- **Real-time suggestions** — hasil muncul saat mengetik (debounced)
- **Keyboard shortcut** — `Ctrl+K` / `Cmd+K` untuk buka search
- **Recent searches** — simpan 10 pencarian terakhir

### 5.13 💰 Pencatatan Pengeluaran (SARAN BARU)
- **Catat semua pengeluaran** — beli bahan, ongkir, biaya produksi
- **Kategori pengeluaran** — bahan baku, packaging, operasional, lainnya
- **Integrasi dengan resi beli online** — OCR resi pembelian → catat otomatis
- **Laporan keuangan sederhana** — pendapatan vs pengeluaran per bulan
- **AI insights** — *"Bulan ini pengeluaran bahan naik 20%, cek supplier alternatif"*

### 5.14 📇 Daftar Supplier (SARAN BARU)
- **Master data supplier** — nama, kontak, alamat, produk yang dijual
- **Riwayat pembelian per supplier** — kapan terakhir beli, total pembelian
- **Quick reorder** — tombol cepat untuk repeat order ke supplier
- **Catatan & rating** — catat kualitas, kecepatan kirim, dll

### 5.15 🗓️ Backup & Undo System (BARU)
- **Auto backup harian** — database otomatis di-backup setiap hari ke Cloudinary (file JSON/SQL)
- **Manual backup** — tombol "Backup Sekarang" di Settings + via Telegram `/backup`
- **Restore dari backup** — pilih backup lama → restore seluruh database
- **Undo per aksi** — setiap perubahan stok bisa di-undo:
  - Undo auto-deduct (kembalikan stok setelah kirim paket)
  - Undo edit stok (kembalikan ke nilai sebelumnya)
  - Undo hapus produk (soft-delete, bisa di-restore)
- **Riwayat perubahan** — setiap edit tercatat: nilai lama → nilai baru
- **Konfirmasi aksi bahaya** — hapus produk/kategori butuh konfirmasi 2x
- **Bisa undo via Telegram** — *"Undo pengiriman terakhir"* → kembalikan semua stok

---

## 6. 🤖 Telegram Bot — Asisten Pribadi Full

> Bot Telegram bukan hanya notifikasi, tapi **asisten pribadi penuh** yang bisa mengontrol seluruh website/aplikasi.

### 6.1 Kemampuan Bot

#### 📖 Baca & Query (Read)
| Perintah / Pesan | Aksi |
|---|---|
| `/stok` | Ringkasan stok semua kategori |
| `/stok kaos hitam L` | Cek stok spesifik |
| `/lowstock` | Produk dengan stok rendah |
| `/order 12345` | Cek status pesanan |
| `/laporan` | Laporan stok harian |
| `/laporan mingguan` | Laporan stok mingguan |
| `Berapa stok polymailer?` | Natural language query |
| `Produk apa yang hampir habis?` | AI analisis natural |

#### ✏️ Edit & Tulis (Write)
| Perintah / Pesan | Aksi |
|---|---|
| `Ubah stok kaos hitam L jadi 50` | Update stok langsung |
| `Tambah produk: Kaos Kami Anxiety, hitam` | Tambah produk baru ke database |
| `Hapus produk Kaos Kami Anxiety` | Hapus produk |
| `Set harga kaos depresi 120rb` | Update harga |
| `Set minimum stok polymailer 50` | Update batas minimum |
| `Tambah kategori: Merchandise` | Tambah kategori baru |
| `Edit auto-deduct: tambah 1x kartu ucapan` | Edit rules auto-deduct |

#### 📦 Proses Order via Chat
| Perintah / Pesan | Aksi |
|---|---|
| `Aku sudah kirim 1 paket Kami Depresi hitam L` | → Auto-deduct: baju jadi, polymailer, stiker, solasi, kertas termal |
| `Kirim 3 paket: 2 Skizo hitam M, 1 Bahagia putih L` | → Auto-deduct semua × 3 |
| `Buat order baru: John, Shopee, Kaos Depresi hitam M x2` | Buat order + auto-deduct |
| `Update order 12345 jadi shipped` | Update status order |
| `Cancel order 12345` | Batalkan + kembalikan stok |

#### 📸 Vision — Baca Gambar
| Aksi | Yang Terjadi |
|---|---|
| Kirim foto resi pengiriman | AI baca nomor resi, ekspedisi, penerima → simpan ke order |
| Kirim foto resi beli bahan online | AI baca detail pembelian → log sebagai restock |
| Kirim foto produk | Auto-compress → simpan sebagai gambar produk |
| Kirim foto desain baru | Auto-compress → simpan ke gallery |

#### 🧮 Kalkulator & Analisis
| Perintah / Pesan | Aksi |
|---|---|
| `/harga polymailer 100 25rb` | Hitung satuan = Rp 250 |
| `Berapa cost 1 paket lengkap kaos depresi?` | Hitung total: bahan + DTF + aksesoris + packaging |
| `Berapa untung kalau jual kaos 150rb?` | Hitung margin & profit |
| `Prediksi kapan polymailer habis?` | AI analisis berdasarkan pola penggunaan |

#### ⚙️ Kontrol Website
| Perintah / Pesan | Aksi |
|---|---|
| `Ubah nama toko jadi "Kami Official"` | Update setting profil |
| `Matikan alert untuk stiker` | Disable alert produk tertentu |
| `Backup database` | Trigger backup & kirim file CSV |
| `/help` | Daftar semua command & kemampuan |

### 6.2 Cara Kerja Bot AI

```mermaid
sequenceDiagram
    actor User as Owner (Telegram)
    participant Bot as Telegram Bot
    participant AI as Groq AI (Vision + Text)
    participant API as API Server
    participant DB as Turso DB

    User->>Bot: Pesan teks / foto / command
    
    alt Pesan mengandung gambar
        Bot->>AI: Kirim gambar ke Vision model
        AI-->>Bot: Deskripsi gambar / data resi
    end
    
    Bot->>DB: Query konteks (stok, orders, settings)
    DB-->>Bot: Data konteks real-time
    
    Bot->>AI: Kirim pesan + konteks + history
    Note over AI: AI memahami intent user:<br/>READ / WRITE / DEDUCT / CALCULATE
    AI-->>Bot: Response + action instructions (JSON)
    
    alt Action: WRITE / EDIT
        Bot->>API: Execute CRUD operation
        API->>DB: Update database
        API-->>Bot: Konfirmasi
    end
    
    alt Action: DEDUCT (kirim paket)
        Bot->>API: Trigger auto-deduct
        API->>DB: Kurangi semua stok terkait
        API->>DB: Log stock_movements
        API-->>Bot: Summary pengurangan
    end
    
    Bot->>User: Response + konfirmasi aksi
```

### 6.3 Sistem "Aku Sudah Kirim Paket"

Ketika user bilang sesuatu seperti *"aku sudah kirim 1 paket Kami Depresi hitam L"*, bot akan:

1. **Parse** — AI identifikasi: produk = Kaos Kami Depresi, warna = hitam, size = L, qty = 1
2. **Auto-deduct produk utama:**
   - 1x Kaos Kami Depresi Hitam L
3. **Auto-deduct packaging** (berdasarkan rules):
   - 1x Plastik Polymailer
   - 1x Stiker Bonus
   - ±0.5m Solasi Double Tape
   - 1x Kertas Termal (resi)
4. **Log** semua pergerakan stok ke `stock_movements`
5. **Cek** stok setelah pengurangan → alert jika ada yang rendah
6. **Reply** ringkasan ke user di Telegram:
```
✅ Paket terkirim!

📦 Dikurangi:
• Kaos Kami Depresi Hitam L: 25 → 24
• Plastik Polymailer: 100 → 99
• Stiker Bonus: 200 → 199
• Solasi Double Tape: ~50m → ~49.5m
• Kertas Termal: 1 roll (estimasi)

⚠️ Alert: Stiker Bonus tinggal 199 (min: 50) ✅ Aman
```

---

## 7. Alur Otomasi

### 7.1 Auto-Deduct Stok saat Proses Order (Web)

```mermaid
sequenceDiagram
    actor User
    participant App as PWA App
    participant API as API Server
    participant DB as Turso DB
    participant TG as Telegram Bot

    User->>App: Buat pesanan baru
    App->>API: POST /api/orders
    API->>DB: Insert order + order_items
    API->>DB: Kurangi current_stock (produk utama)

    User->>App: Update status → "Processing"
    App->>API: PATCH /api/orders/:id/status
    API->>DB: Kurangi current_stock (packaging items sesuai rules)
    API->>DB: Log stock_movements (type: OUT)

    API->>DB: Cek semua stok vs min_stock
    alt Stok < minimum
        API->>DB: Insert alert
        API->>TG: Kirim notifikasi ⚠️
    end
```

### 7.2 OCR Resi via Telegram

```mermaid
sequenceDiagram
    actor User as Owner
    participant Bot as Telegram Bot
    participant AI as Groq Vision
    participant Cloud as Cloudinary
    participant DB as Turso DB

    User->>Bot: Kirim foto resi 📸
    Bot->>Cloud: Upload & compress gambar
    Cloud-->>Bot: URL gambar
    Bot->>AI: Analisis gambar resi (Vision)
    AI-->>Bot: Data resi (JSON): nomor, ekspedisi, penerima, ongkir
    Bot->>DB: Simpan receipt_data ke order
    Bot->>User: "Resi terbaca! ✅ JNE - JT123456789 - Ongkir Rp 15.000"
```

### 7.3 Pengingat Stok Otomatis

```mermaid
sequenceDiagram
    participant CRON as Cron Job (setiap 6 jam)
    participant DB as Turso DB
    participant AI as Groq AI
    participant TG as Telegram Bot

    CRON->>DB: Query produk dengan current_stock <= min_stock
    DB-->>CRON: List produk low-stock

    alt Ada produk low-stock
        CRON->>AI: Buatkan ringkasan stok rendah
        AI-->>CRON: Pesan formatted
        CRON->>TG: Kirim notifikasi dengan detail
        CRON->>DB: Log alert (is_sent = true)
    end
```

---

## 8. UI/UX Design Direction

### Visual Style
- **Theme:** Dark mode utama (gelap elegan), dengan toggle light mode
- **Accent color:** Gradient ungu-biru (#7C3AED → #2563EB)
- **Typography:** Inter (Google Fonts)
- **Border radius:** Rounded (12px)
- **Cards:** Glassmorphism efek (backdrop blur, semi-transparan)
- **Micro-animations:** Hover scale, smooth transitions, loading skeletons
- **Inline editing:** Klik teks untuk langsung edit (semua data editable)

### Layout Desktop
```
┌─────────────────────────────────────────────────┐
│  🧵 Kaos Kami SCM             [🔔] [⚙️] [👤]  │  ← Top Navbar
├───────┬─────────────────────────────────────────┤
│       │                                         │
│ 📊   │  Main Content Area                      │
│ 📦   │                                         │
│ 📋   │  (Dashboard / Stok / Order / Chat /     │
│ 🤖   │   Analisis / Kalkulator / Resi /        │
│ 📈   │   Settings)                             │
│ 🧮   │                                         │
│ 🧾   │                                         │
│ ⚙️   │                                         │
├───────┴─────────────────────────────────────────┤
│  © Kaos Kami                                    │
└─────────────────────────────────────────────────┘
```

### Mobile (PWA)
- Sidebar → Bottom navigation bar (5 item utama)
- Cards stack vertically
- Swipe gestures untuk navigasi
- Install prompt untuk homescreen

---

## 9. Struktur File Proyek

```
SCM kaos kami/
├── public/
│   ├── icons/              # PWA icons (192x192, 512x512)
│   ├── manifest.json       # PWA manifest
│   └── sw.js               # Service worker
│
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout + metadata
│   │   ├── page.tsx            # Landing/login redirect
│   │   ├── globals.css         # Global styles + CSS variables
│   │   │
│   │   ├── dashboard/
│   │   │   ├── layout.tsx      # Dashboard layout (sidebar + topbar)
│   │   │   ├── page.tsx        # Dashboard home
│   │   │   │
│   │   │   ├── stock/
│   │   │   │   ├── page.tsx    # Stock management (inline edit)
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx # Stock detail
│   │   │   │
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx    # Order list
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx # New order form
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx # Order detail + resi
│   │   │   │
│   │   │   ├── chat/
│   │   │   │   └── page.tsx    # AI chat assistant (text + image)
│   │   │   │
│   │   │   ├── analysis/
│   │   │   │   └── page.tsx    # Stock analysis
│   │   │   │
│   │   │   ├── calculator/
│   │   │   │   └── page.tsx    # Price calculator
│   │   │   │
│   │   │   └── settings/
│   │   │       └── page.tsx    # Settings (full editable)
│   │   │
│   │   └── api/
│   │       ├── stock/
│   │       │   ├── route.ts        # GET all, POST new
│   │       │   └── [id]/
│   │       │       └── route.ts    # GET/PUT/DELETE by id
│   │       │
│   │       ├── stock-movements/
│   │       │   └── route.ts        # GET/POST movements
│   │       │
│   │       ├── orders/
│   │       │   ├── route.ts        # GET all, POST new
│   │       │   └── [id]/
│   │       │       ├── route.ts    # GET/PUT order
│   │       │       └── status/
│   │       │           └── route.ts # PATCH status + auto-deduct
│   │       │
│   │       ├── chat/
│   │       │   └── route.ts        # POST chat message → Groq AI (text + vision)
│   │       │
│   │       ├── analysis/
│   │       │   └── route.ts        # GET AI-powered analysis
│   │       │
│   │       ├── calculator/
│   │       │   └── route.ts        # POST natural lang → AI calc
│   │       │
│   │       ├── receipt/
│   │       │   └── route.ts        # POST image → OCR resi (Groq Vision)
│   │       │
│   │       ├── alerts/
│   │       │   └── route.ts        # GET alerts, POST check-stock
│   │       │
│   │       ├── upload/
│   │       │   └── route.ts        # POST image → compress → Cloudinary
│   │       │
│   │       ├── telegram/
│   │       │   └── webhook/
│   │       │       └── route.ts    # Telegram Bot webhook (full assistant)
│   │       │
│   │       └── cron/
│   │           └── stock-check/
│   │               └── route.ts    # Cron endpoint untuk cek stok
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Alert.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Chart.tsx
│   │   │   ├── InlineEdit.tsx      # Komponen inline editing
│   │   │   └── ImageUpload.tsx     # Komponen upload + preview + compress
│   │   │
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Topbar.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   └── PageHeader.tsx
│   │   │
│   │   ├── stock/
│   │   │   ├── StockTable.tsx      # Tabel stok dengan inline edit
│   │   │   ├── StockCard.tsx
│   │   │   ├── StockForm.tsx
│   │   │   ├── StockMovementLog.tsx
│   │   │   └── CategoryFilter.tsx
│   │   │
│   │   ├── orders/
│   │   │   ├── OrderTable.tsx
│   │   │   ├── OrderForm.tsx
│   │   │   ├── OrderDetail.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   └── ReceiptViewer.tsx   # Tampilkan resi + data OCR
│   │   │
│   │   ├── chat/
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── ChatMessage.tsx     # Support teks + gambar
│   │   │   ├── ChatInput.tsx       # Input teks + upload gambar
│   │   │   └── ChatImagePreview.tsx
│   │   │
│   │   ├── analysis/
│   │   │   ├── StockHealthChart.tsx
│   │   │   ├── TrendChart.tsx
│   │   │   └── AIInsights.tsx
│   │   │
│   │   └── calculator/
│   │       ├── PriceInput.tsx
│   │       ├── PriceResult.tsx
│   │       └── BundleSimulator.tsx
│   │
│   ├── db/
│   │   ├── index.ts            # Turso client + Drizzle instance
│   │   ├── schema.ts           # Drizzle schema definitions
│   │   ├── migrations/         # SQL migration files
│   │   └── seed.ts             # Seed data (produk awal)
│   │
│   ├── lib/
│   │   ├── ai.ts               # Groq AI helper functions (text)
│   │   ├── ai-vision.ts        # Groq Vision helper (image analysis, OCR)
│   │   ├── ai-actions.ts       # AI action parser (intent → DB operation)
│   │   ├── cloudinary.ts       # Cloudinary upload helper
│   │   ├── image-compress.ts   # Client-side image compression (before upload)
│   │   ├── telegram.ts         # Telegram Bot setup + full assistant logic
│   │   ├── telegram-actions.ts # Telegram bot action handlers (CRUD, deduct, etc)
│   │   ├── stock-engine.ts     # Auto-deduct logic & stock rules
│   │   ├── receipt-parser.ts   # OCR resi parsing & data extraction
│   │   ├── price-parser.ts     # Natural language price parsing
│   │   └── utils.ts            # Format currency, date, dll
│   │
│   ├── hooks/
│   │   ├── useStock.ts         # Stock data fetching hook
│   │   ├── useOrders.ts        # Order data fetching hook
│   │   ├── useChat.ts          # Chat functionality hook
│   │   ├── useAlerts.ts        # Alert/notification hook
│   │   └── useImageUpload.ts   # Image compress + upload hook
│   │
│   └── types/
│       └── index.ts            # TypeScript type definitions
│
├── drizzle.config.ts           # Drizzle config for Turso
├── next.config.js              # Next.js + PWA config
├── package.json
├── tsconfig.json
├── .env.local                  # Environment variables
└── .env.example                # Template env file
```

---

## 10. Environment Variables

```env
# Turso Database
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token

# Groq AI (Text + Vision)
GROQ_API_KEY=gsk_xxxxxxxx

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret

# Telegram Bot
TELEGRAM_BOT_TOKEN=123456:ABCdefGHIjklMNO
TELEGRAM_CHAT_ID=your-chat-id

# App
APP_PIN=1234
NEXT_PUBLIC_APP_NAME="Kami Apparel SCM"
```

---

## 11. Fase Pembangunan (Roadmap)

### Fase 1: Foundation (Hari 1-2)
- [ ] Setup Next.js project + PWA
- [ ] Setup Turso + Drizzle ORM
- [ ] Buat schema database + migrasi (termasuk `auto_deduct_rules`)
- [ ] Seed data produk awal (7 kategori)
- [ ] Setup Cloudinary + image compression pipeline
- [ ] UI: Global styles, design system, layout (sidebar, topbar)

### Fase 2: Core Stock Management (Hari 3-4)
- [ ] Halaman stok — list, filter, search (7 kategori termasuk Aksesoris Jadi & Bahan)
- [ ] CRUD produk + upload gambar (auto-compress)
- [ ] Inline editing (klik cell → edit langsung)
- [ ] Stok masuk/keluar (manual)
- [ ] Stock movement log
- [ ] Detail produk

### Fase 3: Order Processing + Auto-Deduct (Hari 5-6)
- [ ] Halaman daftar pesanan (editable)
- [ ] Form buat pesanan baru
- [ ] Auto-deduct stok saat create order
- [ ] Auto-deduct packaging saat proses/kirim (berdasarkan editable rules)
- [ ] Update status pesanan
- [ ] Konfigurasi auto-deduct rules (editable di settings)
- [ ] Upload resi + OCR preview

### Fase 4: AI Integration + Vision (Hari 7-8)
- [ ] Setup Groq AI module (text + vision)
- [ ] Chat AI assistant — interface + API (teks + gambar)
- [ ] AI Vision: OCR resi pengiriman
- [ ] AI Vision: deteksi gambar produk
- [ ] AI Actions: edit database via chat
- [ ] Kalkulator harga AI
- [ ] Analisis stok AI
- [ ] Konteks stok real-time penuh untuk AI

### Fase 5: Telegram Bot — Full Personal Assistant (Hari 9-10)
- [ ] Setup Grammy bot + webhook
- [ ] Natural language processing — bisa terima pesan bahasa manusia
- [ ] Vision: terima foto di Telegram → analisis (resi, produk, desain)
- [ ] CRUD via Telegram: tambah/edit/hapus produk & kategori
- [ ] Order processing via Telegram: "aku sudah kirim 1 paket…"
- [ ] Auto-deduct via Telegram command/pesan natural
- [ ] Kalkulator harga via Telegram
- [ ] Kontrol settings via Telegram
- [ ] Alert stok rendah → Telegram otomatis
- [ ] Cron job cek stok periodik
- [ ] Semua command & natural language lengkap

### Fase 6: Polish & Deploy (Hari 11)
- [ ] PWA: manifest, service worker, offline support
- [ ] Responsive mobile UI
- [ ] Loading states, error handling
- [ ] Inline editing polish
- [ ] Image compression optimization
- [ ] Testing end-to-end
- [ ] Deploy ke Vercel

---

## 12. Keputusan Final ✅

| # | Topik | Keputusan |
|---|---|---|
| 1 | Nama brand | **Kaos Kami** |
| 2 | Ukuran baju | **S, M, L, XL, XXL, 2XL, 3XL, 4XL, 5XL** |
| 3 | Bahan kaos | Cotton Combed 24s, 30s, Polyester + **bisa tambah bahan baru** |
| 4 | Jenis pakaian | Kaos lengan pendek, lengan panjang + **bisa tambah hoodie dll** |
| 5 | Jenis stiker | Vinyl + motif (random, anime, kami skizo, dll) — **open/fleksibel** |
| 6 | Bahan aksesoris | Casing ganci kosong, chip NFC, ring ganci — **bisa tambah lagi** |
| 7 | Auto-deduct per order | 4x stiker + 1x polymailer + 1x zipper — **editable via settings/bot** |
| 8 | Auth Web | Username: **hengki** / Password: **Admin123** |
| 9 | Auth Telegram | **Tanpa login** — bot punya akses penuh (whitelist by chat ID) |
| 10 | Varian DTF | Random, Kami Depresi, Kami Skizo, Kami Bahagia — **bisa tambah** |
| 11 | Hosting | **Vercel** via GitHub |
| 12 | Domain | **Subdomain Vercel** dulu |
| 13 | Data | **100% real database** — tidak ada dummy/statis |
| 14 | Backup | **Auto backup harian** + manual backup + undo per aksi |

---

## 13. API Keys — ✅ SUDAH DIKONFIGURASI

Semua API key sudah tersimpan di `.env.local`. Status:

| Service | Status | Keterangan |
|---|---|---|
| **Turso Database** | ✅ Ready | `libsql://scm-kaos-kami-hengki-setiawan.aws-ap-northeast-1.turso.io` |
| **Groq AI** | ✅ Ready | `gsk_SQx...N50` |
| **Cloudinary** | ✅ Ready | Cloud: `dvus6u6jf` |
| **Telegram Bot** | ✅ Ready | Bot token configured, Username: @Enggriz |
| **Auth** | ✅ Ready | Web: `hengki` / `Admin123` | Telegram: no-auth (whitelist) |

> ⚠️ **TELEGRAM_CHAT_ID** perlu diisi nanti — akan otomatis terdeteksi saat bot pertama kali dijalankan dan user mengirim pesan.

---

## 14. Saran Fitur Tambahan dari Developer

Berikut saran fitur tambahan yang sudah ditambahkan ke blueprint:

1. **📜 Riwayat/Log Stok** (Section 5.11) — halaman khusus semua pergerakan stok dengan filter lengkap
2. **🔍 Global Search** (Section 5.12) — search bar universal (`Ctrl+K`)
3. **💰 Pencatatan Pengeluaran** (Section 5.13) — catat biaya + OCR resi beli online
4. **📇 Daftar Supplier** (Section 5.14) — master data supplier + quick reorder
5. **🗓️ Backup & Undo** (Section 5.15) — auto backup + undo per aksi + restore
6. **🔐 QR Code per Produk** — generate QR code unik per produk, scan untuk cek stok instan
7. **⌨️ Keyboard Shortcuts** — shortcut cepat: `N` (produk baru), `O` (order baru), `Ctrl+K` (search)
8. **🏠 Batch Print Label** — print label pengiriman batch untuk beberapa order sekaligus

---

> **Note:** Blueprint ini adalah dokumen hidup. Semua fitur bisa ditambah/ubah/hapus kapan saja.
