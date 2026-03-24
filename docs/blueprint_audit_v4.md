# 📋 V4 Micro-Audit: Enterprise SCM Architecture (Kritis & Jujur)
> Tanggal: 24 Maret 2026
> Sifat Dokumen: Audit Tingkat Lanjut (Business Logic & SCM Science)

Setelah membedah Blueprint v2 dan skema database `src/db/schema.ts` secara menyeluruh, saya menemukan bahwa **secara kode sistem ini sudah sangat stabil** (berkat perbaikan V1-V3). 

NAMUN, **secara keilmuan SCM (Supply Chain Management) dan Akuntansi Bisnis**, ada 5 Celah Kritis yang menghalangi sistem ini menjadi "True Enterprise-Grade Application". Blueprint v2 telalu berfokus pada AI dan perbaikan bug, tetapi melewatkan fondasi bisnis SCM itu sendiri.

Berikut adalah hasil riset dan audit logika bisnis yang jujur:

---

### 🚨 GAP 1: "The Flat Cost Fallacy" (Kelemahan Penilaian Aset & Profit)
**Kondisi Saat Ini:**
Berdasarkan `schema.ts`, tabel `products` hanya memiliki 1 kolom `buyPrice` (Harga Beli).
**Kesalahan Logika SCM:**
Di dunia nyata, harga restock kaos atau kain pasti berfluktuasi. 
- Batch 1: Beli 100 pcs @ Rp30.000
- Batch 2: Beli 100 pcs @ Rp35.000
Jika Anda memperbarui `buyPrice` menjadi Rp35.000, maka **semua sisa stok batch lama akan ternilai Rp35.000**. Ini menyebabkan *Asset Valuation* gudang salah bayang dan perhitungan Laba Kotor *Gross Margin* menjadi fiktif.
**Solusi Enterprise:**
Kita wajib mengimplementasikan **FIFO (First-In, First-Out) Costing Method** atau minimal **Moving Average Cost**. Membutuhkan tabel baru `inventory_lots` untuk melacak harga beli dari masing-masing batch kedatangan.

### 🚨 GAP 2: "The Procurement Blindspot" (Kekosongan Data Lead-Time)
**Kondisi Saat Ini:**
Di Blueprint v2 (Fase 4), AI merencanakan Kalkulator ROP (Reorder Point) & Safety Stock. Rumus ini membutuhkan variabel **L (Lead Time)** atau waktu tunggu dari Supplier.
**Kesalahan Logika SCM:**
Bagaimana AI bisa tahu Lead Time supplier? Saat ini database hanya memiliki tabel `expenses` dan `suppliers`. TIDAK ADA tabel `purchase_orders` (PO). Sistem tidak tahu kapan sebuah pesanan dibuat vs kapan barang fisik tiba di gudang. Tanpa sistem PO, Lead Time AI hanyalah "tebakan statis" yang berbahaya.
**Solusi Enterprise:**
Membangun modul **Procurement (PO)**: Tabel `purchase_orders` yang mencatat tanggal rilis PO dan tanggal kedatangan surat jalan (Goods Receipt), sehingga sistem secara dinamis bisa menghitung varians reliabilitas tiap Supplier.

### 🚨 GAP 3: Makloon & WIP (Work-In-Progress) Tak Terlacak
**Kondisi Saat Ini:**
Bisnis "Kaos Kami" erat kaitannya dengan *Makloon* (konveksi jahitan, sablon). Tabel `autoDeductRules` berpotensi menjadi Bill of Materials (BOM) primitif.
**Kesalahan Logika SCM:**
Ketika kain 100 yard dikirim ke vendor sablon, statusnya di gudang pasti "BERKURANG" (OUT), tapi barang tersebut belum lenyap. Barang tersebut berstatus **WIP (Work In Progress)**. Saat ini, sistem langsung menganggapnya Expense/Out, sehingga *nilai aset* perusahaan seolah menurun drastis saat proses produksi berjalan.
**Solusi Enterprise:**
Membangun visibilitas WIP. Harus ada status pergerakan `TO_VENDOR` dan tabel penengah untuk memastikan aset bahan baku masih terhitung dalam neraca finansial sebelum kembali menjadi Barang Jadi (Finished Goods).

### 🚨 GAP 4: "Blind Average Demand" vs Seasonality
**Kondisi Saat Ini:**
Blueprint menugaskan AI menghitung EOQ (Target Belanja Optimal) dengan proyektil D (Demand) harian rata-rata.
**Kesalahan Logika SCM:**
Pakaian adalah komoditas highly-seasonal (Siklus Ramadhan, Akhir Tahun, Acara Kampus). Rata-rata 30 hari terakhir TIDAK BISA dipakai untuk memesan stok 30 hari ke depan jika bulan depan adalah Idul Fitri. EOQ statis akan berujung pada kehabisan barang di peak-season dan *Overstock* di pasca-season.
**Solusi Enterprise:**
Gemini AI dalam Pipeline kita harus diberikan instruksi *Time-Series Seasonality*. Daripada rata-rata matematika murni, AI harus diberikan metadata tren waktu dan acara kalender lokal sebelum menyemburkan angka EOQ.

### 🚨 GAP 5: Single Location / Omnichannel Collision
**Kondisi Saat Ini:**
Stok hanya dipetakan dalam 1 kolom saklek `currentStock`.
**Kesalahan Logika SCM:**
Ke level enterprise, penjualan sering terjadi di 3 jalur:
1. Etalase / Toko Fisik (Gudang Depan)
2. Storage Master (Gudang Belakang)
3. Alokasi Tahan (Reserved untuk Livestream / TikTok Shop Campaign)
Jika ada campaign Flash Sale, staf butuh menahan (Reserve) 50 kaos hitam. Dengan skema saat ini, barang berpotensi di-checkout oleh admin penjualan biasa karena *currentStock* masih terlihat 100.
**Solusi Enterprise:**
Membagi status agregat stok: `Available`, `Reserved` (Tahan), dan `Damaged/Reject`. Minimal butuh tabel `stock_reservations` untuk mencegah konflik double-booking.

---

### Kesimpulan Audit V4
Improvement Blueprint v2 berhasil memperbaiki *kerusakan pondasi infrastruktur software* (kecepatan, anti-crash, pipeline AI). Namun, secara *Akuntansi Logistik*, sistem ini masih bertaraf **Retail Sedang**, belum **Enterprise SCM**. 

Jika Anda ingin software ini benar-benar tidak tertandingi dan secara akuntansi siap di-audit, kita harus memvalidasi GAP 1 (FIFO Costing) dan GAP 2 (Purchase Orders) sebagai fondasi arsitektur berikutnya.
