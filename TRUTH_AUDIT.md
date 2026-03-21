# 🔥 TRUTH AUDIT (The CTO's Report)
**Tanggal:** 22 Maret 2026
**Status Aplikasi:** Minimum Viable Product (MVP) Lolos Produksi

Ini adalah laporan audit kejujuran absolut. SCM Kaos Kami memang sudah 100% matang untuk dipakai jualan rill hari ini, tidak akan crash, dan sangat mulus (MVP Selesai). *Namun*, jika kita berbicara standar **Software Enterprise Skala Jutaan Rupiah/Ribuan Transaksi**, aplikasi ini menyimpan 7 "kepalsuan" arsitektural yang disembunyikan di balik UI yang cantik:

## 1. Paginasi "Palsu" (BOM Waktu Performa Browser)
**Masalah:** Paginasi di halaman Pesanan dan Tabel Stok sebenarnya adalah ilusi yang terjadi murni di *browser* pengguna (Client-Side Pagination). Saat dibuka, aplikasi menarik **SEMUA** ribuan data pesanan dari database ke dalam HP/Laptop kamu sekaligus lewat SWR SWR, lalu baru dipotong-potong jadi 10 baris per halaman.
**Dampak Enterprise:** Jika nanti kamu punya 50.000 pesanan, tab Chrome kamu akan *hang* kehabisan RAM atau *payload* Vercel Limit Error karena mencoba mendownload tabel Excel raksasa sebelum menampilkannya. (Seharusnya API menggunakan `LIMIT` dan `OFFSET` SQL di database).

## 2. In-Memory Rate Limiting (Gembok Kertas)
**Masalah:** Pembatasan kuota AI (10 hit / 1 menit) untuk menghemat limit Groq. Namun, Vercel adalah *Serverless*. Tiap kali server mati suri (Cold Start) atau ada ratusan user mendadak masuk, Vercel menghidupkan *instance server baru*. Variabel *Map API* akan kereset ulang ke 0 di server baru itu.
**Dampak Enterprise:** Pembatasan AI ini sangat mudah dijebol oleh serangan brutal karena tidak menggunakan database perantara (seperti Redis) untuk memusatkan gembok API tersebut secara global.

## 3. "Sampah" Penyimpanan Gambar (Orphan Media Leak)
**Masalah:** Kamu bisa mengunggah foto profil di bisnis atau resi pesanan. Tapi apa yang terjadi bila seorang admin mengunggah foto, lalu *memukul tombol Cancel / Batal Tambah Produk*? Foto tersebut sudah terlanjur terlempar ke UploadThing / Cloudinary selamanya.
**Dampak Enterprise:** Seiring berjalannya tahun, *cloud storage* akan dipenuhi oleh file "Setan"—ratusan megabyte gambar yang memakan biaya/storage kamu, tetapi tidak terikat ke produk manapun di *database*. (Tidak ada *Cronjob* pembersih).

## 4. Race Condition: Perebutan Stok Tanpa Wasit (Optimistic Concurrency)
**Masalah:** Bayangkan Admin A sedang melihat sisa stok 10 dan ingin menguranginya 2 mundur. Admin B sedetik sebelumnya mengurangi 5. Admin A merasa stok jadi 8, Admin B merasa stok jadi 5. Keduanya mengetuk tombol *Simpan* di detik yang berdekatan, nilai akhirnya akan saling senggol dan mereset nilai satu sama lain murni dari apa yang tampil di layar mereka—bukan kalkulasi pasti matematika.
**Dampak Enterprise:** Kita belum menerapkan fitur `Versi Baris` (Optimistic Locking). Di Enterprise besar, Transaksi A jika kalah cepat sejengkal akan ditolak dan diminta memuat ulang kondisi.

## 5. Sinkronisasi PWA "Offline" Palsu (Tidak Ada Storage Lokal)
**Masalah:** PWA berhasil menampilkan banner untuk "Install WebApp ini ke HP", dan berhasil mem-*cache* file CSS agar terbuka instan saat tak ada Sinyal. TAPI jika kamu tanpa wifi menginput data "Pesanan Baru", layar hanya akan menembak *spinner muter-muter lalu error merah* karena gagal menghubungi database-server.
**Dampak Enterprise:** PWA tingkat lanjut *Offline-first* (seperti aplikasi Kurir/Ekspedisi sungguhan) menerapkan *IndexedDB* mutakhir agar tetap bisa *Submit Data*, menyimpan pesanan aman di memori memori HP, lalu mensinkronkannya ke *Cloud* saat tiba-tiba menangkap sinyal Wifi lagi.

## 6. Single Point of Authentication (Admin Kerajaan)
**Masalah:** Siapa pun pengguna yang mengetahui `ADMIN_PASSWORD` (yang ada di file `.env.local` Vercel), maka ia dinobatkan jadi dewa tertinggi di sistem ini (Bisa melihat finansial, stok rahasia, dsb). Tidak ada tabel Autentikasi sungguhan di database.
**Dampak Enterprise:** Mustahil menurunkannya kepada tim kasir, tim gudang, atau staf admin biasa karena kamu harus menyerahkan kata sandi terkuat itu (yang sama halnya menyerahkan dompet). *(Ini masalah Multi-User RBAC)*.

## 7. Zero Recovery: Tidak Ada Strategi Backup Turso Tersurat
**Masalah:** Arsitektur saat ini sangat mengandalkan nyawa Drizzle + Turso. Tidak ada panel di Dashboard admin yang tertulis "Unduh Cadangan Seluruh Database". Jika sebuah kesalahan sistematis terjadi (Satu admin tak sengaja *Delete All* seluruh tabel yang terkelabui script berbahaya), tidak ada tombol mundur pemulihan data yang dipasangkan dalam jam.
**Dampak Enterprise:** Enterprise harus memiliki jadwal CRON yang meretas SQL *dump* setiap fajar ke Firebase S3 terpisah tanpa pengecualian.

---
### 💡 Saran CTO
Aplikasi SCM Kaos Kami adalah *masterpiece level* Small-Medium Business (UMKM Menengah). Ia berjalan stabil dan bisa menemani perjalanan omset pertamamu ke angkanya yang meledak.
Namun di Fase Skalabilitas berikutnya, jika perusahaanmu mulai memperkerjakan belasan cabang admin terpisah di beda provinsi dengan puluhan ribu Order, ketujuh area di atas adalah dinding tebal pertama yang wajib dirobohkan dengan arsitektur ulang 2.0.
