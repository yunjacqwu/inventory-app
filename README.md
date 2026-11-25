# Inventory App

Aplikasi web untuk mencatat stok dan pemakaian barang kendaraan: sparepart, literan (oli), dan ban. Dibuat dengan Node.js + Express + MySQL, frontend HTML/CSS/JavaScript tanpa framework.

## Fitur

- **Master data**: vendor dan kendaraan.
- **Sparepart**: input stok masuk, catat pemakaian per kendaraan, edit dan hapus pemakaian (dengan histori), rekap semua barang.
- **Ban**: kelola stok ban, catat penukaran ban per kendaraan, laporan ban.
- **Barang literan (oli)**: input oli masuk (bisa digabung dengan sisa lama), catat pemakaian oli, rekap oli.
- **Dashboard**: ringkasan stok menipis, pemakaian bulan ini, stok oli, ban siap pakai, dan grafik tren.
- **Rekap dan export**: filter per tanggal, vendor, kendaraan, dan barang; export Excel dan PDF.

Stok dijaga konsisten dengan transaksi database: pemakaian, edit, dan hapus berjalan di dalam transaksi dan mengunci baris stok (`FOR UPDATE`), jadi dua pemakaian bersamaan tidak bisa membuat stok negatif.

## Teknologi

- Backend: Node.js, Express 5, mysql2 (connection pool)
- Database: MySQL / MariaDB (XAMPP)
- Frontend: HTML, CSS, JavaScript, Chart.js (grafik), SheetJS dan jsPDF (export)
- Font: Inter (Google Fonts)

## Struktur folder

```
inventory-app/
├── backend/
│   ├── server.js          # setup Express, pasang route, error handler, start server
│   ├── db.js              # koneksi pool MySQL + helper transaksi (db.transact)
│   ├── routes/            # route per domain (vendor, sparepart, ban, oli, rekap, ...)
│   ├── helpers/           # validasi input (tolakInputTidakValid)
│   ├── database/
│   │   ├── db_stok.sql    # schema database (aman dijalankan ulang)
│   │   ├── gen_seed.js    # generator data contoh (dummy)
│   │   └── seed_data.sql  # hasil generator, untuk database kosong
│   └── package.json
└── frontend/
    ├── index.html         # dashboard
    ├── *.html             # halaman tiap menu
    ├── css/               # theme.css (tema bersama), layout.css (sidebar), per halaman
    └── js/                # layout.js (sidebar), dashboard.js, dan script per halaman
```

Server juga melayani folder `frontend/`, jadi cukup satu port untuk API dan halaman.

## Cara menjalankan

### 1. Prasyarat

- Node.js 18 atau lebih baru
- XAMPP dengan MySQL/MariaDB yang sudah berjalan

### 2. Buat database

Jalankan dari terminal (ganti path sesuai lokasi XAMPP):

```bash
C:\xampp\mysql\bin\mysql.exe -uroot < backend\database\db_stok.sql
```

Skrip ini membuat database `db_stok` dan tabel-tabelnya. Aman dijalankan ulang: tabel yang sudah ada tidak dihapus.

Untuk mengisi data contoh (hanya untuk database yang masih kosong):

```bash
C:\xampp\mysql\bin\mysql.exe -uroot db_stok < backend\database\seed_data.sql
```

Data contoh bersifat dummy. Untuk membuat ulang data contoh dari awal, lihat bagian [Data contoh](#data-contoh).

### 3. Install dan jalankan backend

```bash
cd backend
npm install
npm start
```

Saat start, server mengecek koneksi database. Kalau gagal, server berhenti dengan pesan error. Kalau berhasil, buka:

```
http://localhost:3000
```

### Konfigurasi database

Default cocok untuk setup XAMPP lokal. Untuk mengubahnya, set environment variable sebelum menjalankan server:

| Variable      | Default     |
|---------------|-------------|
| `DB_HOST`     | `localhost` |
| `DB_USER`     | `root`      |
| `DB_PASSWORD` | (kosong)    |
| `DB_NAME`     | `db_stok`   |

Contoh di PowerShell:

```powershell
$env:DB_PASSWORD = "rahasia"
npm start
```

## Halaman

| Menu | Halaman | Fungsi |
|------|---------|--------|
| Dashboard | `index.html` | Ringkasan dan grafik |
| Master Data | `vendor.html`, `kendaraan.html` | Kelola vendor dan kendaraan |
| Sparepart | `insparepart.html` | Input sparepart masuk |
| Sparepart | `barang.html` | Input pemakaian barang |
| Sparepart | `pemakaian.html` | Catat pemakaian sparepart |
| Sparepart | `editpemakaian.html` | Edit dan hapus pemakaian |
| Sparepart | `rekapsemua.html`, `rekap.html` | Rekap barang dan laporan |
| Ban | `ban.html` | Kelola stok ban |
| Ban | `pban.html` | Catat penukaran ban |
| Ban | `lapban.html` | Laporan ban |
| Barang Literan | `inoli.html` | Input oli masuk |
| Barang Literan | `pemakaianoli.html` | Catat pemakaian oli |
| Barang Literan | `rekapoli.html` | Rekap oli |

Halaman `gudang.html` belum masuk menu dan belum berfungsi penuh (lihat [Catatan](#catatan)).

## API

Semua endpoint berada di root server (`http://localhost:3000`). Ringkasannya:

| Area | Endpoint utama |
|------|----------------|
| Vendor | `GET/POST /vendor`, `PUT/DELETE /vendor/:id` |
| Kendaraan | `GET/POST /kendaraan`, `PUT/DELETE /kendaraan/:id` |
| Sparepart | `GET/POST /sparepart`, `PUT/DELETE /sparepart/:id`, `GET /stok_sparepart` |
| Pemakaian sparepart | `GET/POST /pemakaian`, `PUT/DELETE /pemakaian/:id`, `GET /pemakaian_vendor` |
| Histori | `GET /histori_pemakaian`, `GET /histori_pemakaian/stats` |
| Ban | `GET/POST /ban`, `PUT/DELETE /ban/:id`, `GET /ban/tersedia` |
| Penukaran ban | `GET /pban/all`, `POST /pban`, `PUT /pban/:id`, `PUT /pban/edit/:id` |
| Oli | `GET/POST /oli_masuk`, `PUT/DELETE /oli_masuk/:id`, `GET /stok_oli` |
| Pemakaian oli | `GET/POST /pemakaian_oli` |
| Rekap | `GET /rekap`, `GET /rekap_lama`, `GET /rekap_ban`, `GET /rekap/oli_masuk`, `GET /rekap/pemakaian_oli` |

Error dari server berbentuk JSON. Field wajib yang kosong dibalas `400` dengan pesan `message`. Error server dibalas `500` dengan pesan umum; detail teknisnya dicatat di console server.

## Data contoh

Generator membuat catatan setahun (Januari sampai November 2026) dengan stok yang konsisten dengan pemakaian:

```bash
cd backend\database
node gen_seed.js > seed_data.sql
```

Hasilnya deterministik, jadi jalankan ulang akan menghasilkan data yang sama. Untuk mengisi ulang database dari awal:

```bash
C:\xampp\mysql\bin\mysql.exe -uroot -e "DROP DATABASE IF EXISTS db_stok;"
C:\xampp\mysql\bin\mysql.exe -uroot < backend\database\db_stok.sql
C:\xampp\mysql\bin\mysql.exe -uroot db_stok < backend\database\seed_data.sql
```

**Perhatian**: perintah `DROP DATABASE` menghapus semua data di `db_stok`.

## Catatan

- Halaman dibuka lewat `http://localhost:3000`, bukan dengan membuka file HTML langsung, karena halaman memanggil API di server yang sama.
- `gudang.html` dan `js/ban/ban.js` memanggil endpoint `/gudang` yang belum ada di server.
- Tidak ada autentikasi. Aplikasi ini ditujukan untuk jaringan internal atau penggunaan lokal.
- Tidak ada tes otomatis. Verifikasi dilakukan dengan tes manual dan pengecekan konsistensi data.
- Ukuran font dan layout dioptimalkan untuk layar laptop 1366px ke atas.

## Lisensi

Belum ditentukan.
