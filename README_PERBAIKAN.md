# README PERBAIKAN — EventSync (revisi audit)

## Struktur folder
```
EventSync_Project_Revisi/
├── EventSync_Diagram/EventSync_Diagram/   6 file .drawio (bisa diedit di diagrams.net) + README
├── EventSync_Frontend/EventSync/          SUMBER frontend (default mode "local" = demo tanpa server)
├── EventSync_Backend/EventSync/           Laravel API + salinan frontend di public/ (mode "remote")
├── tools/verify_frontend_sync.js          cek bahwa kedua versi frontend tetap konsisten
├── LAPORAN_AUDIT.md                       temuan, tindakan, matriks fitur, status pengujian
├── PANDUAN_LARAGON.md                     langkah menjalankan di Laragon
└── README_PERBAIKAN.md                    file ini
```

## Dua versi frontend — mana acuannya?
- **`EventSync_Frontend/EventSync`** = sumber. Kode JS/HTML/CSS di sini yang diedit. Bawaannya `API_MODE: "local"` (data demo di browser, folder `data/` ikut).
- **`EventSync_Backend/EventSync/public`** = salinan yang dilayani Laravel dengan `API_MODE: "remote"` (data dari MySQL).
- Hanya tiga perbedaan yang disengaja: `js/config.js` (`API_MODE`), tag `<script src=".../data/*.js">` pada HTML, dan folder `data/`.
- Setelah mengubah sumber, salin file yang berubah ke `public/` (kecuali `js/config.js`, tag data, dan `data/`), lalu jalankan `node tools/verify_frontend_sync.js` untuk memastikan tidak ada penyimpangan baru.
- Mode tidak bisa tertukar diam-diam: di `public/` mode remote dan tidak ada `data/`, sehingga mode local menolak berjalan dengan pesan jelas.

## Daftar perubahan file
**Backend (`EventSync_Backend/EventSync`)**
| File | Perubahan | Alasan |
|---|---|---|
| `app/Http/Controllers/Api/RegistrationController.php` | Cek ulang status approved/belum mulai setelah `lockForUpdate` | Hindari balapan dengan pembatalan/penghapusan event dan null pointer |
| `app/Services/EventService.php` | Method baru `assertCapacityFits()` | Kapasitas tidak boleh di bawah jumlah pendaftar aktif |
| `app/Http/Controllers/Api/Organizer/EventController.php` | Memanggil `assertCapacityFits()` pada update | idem |
| `app/Http/Controllers/Api/Admin/EventController.php` | Memanggil `assertCapacityFits()` pada update | idem |
| `app/Http/Controllers/Api/Admin/UserController.php` | Tolak penurunan role organizer yang masih punya event | Jaga konsistensi `events.organizer_id` |
| `tests/Feature/IntegrityGuardsTest.php` (baru) | 2 test untuk guard di atas | Dokumentasi + regresi (belum dijalankan di lingkungan saya) |

**Frontend**
| File | Perubahan |
|---|---|
| `EventSync_Frontend/EventSync/js/api.js`, `js/app.js`, `js/auth.js` | Disamakan dengan versi `public/` (penanganan error jaringan, base URL `auto`, pemetaan error field server, kotak demo mengikuti mode) |
| `EventSync_Frontend/EventSync/js/config.js` | Menambah `API_BASE: "auto"`, `SHOW_DEMO_ACCOUNTS`, komentar penjelas; `API_MODE` tetap `local` |
| `EventSync_Backend/EventSync/public/js/auth.js` | Teks kotak demo mengikuti `API.mode` (identik dengan sumber) |

**Diagram** (semua tetap dapat diedit): `01` (ERD polimorfik Sanctum + ON DELETE), `02` (aliran Admin), `03` (aliran D4/D1→2.0, moderasi Admin), `04` (Login/Registrasi dipisah, Batalkan Event, dashboard peserta, akses API-only Admin), `05` (cabang cancelled + aturan status), `06` (dibuat ulang sesuai controller), serta `README.md` diagram.

**Dokumen/alat baru:** `LAPORAN_AUDIT.md`, `PANDUAN_LARAGON.md`, `README_PERBAIKAN.md`, `tools/verify_frontend_sync.js`.

Tidak ada migration atau SQL baru: struktur database sudah sesuai implementasi, jadi tidak diubah. Tidak ada kredensial asli di source; password `demo1234` adalah dummy seeder (development saja).

## Keputusan yang masih menunggu Anda
Organizer masih boleh mengedit event `approved` tanpa review ulang (lihat `DESIGN_CONFLICTS.md` #8). Saya tidak mengubahnya karena itu perubahan perilaku; diagram menggambarkannya apa adanya.

## Peringatan jujur tentang pengujian
Test Laravel, `route:list`, `migrate`, dan pemanggilan API **belum saya jalankan** (Packagist diblokir di lingkungan saya, tidak ada MySQL). Yang sudah dijalankan: lint PHP/JS, validasi XML diagram, dan pemeriksa sinkronisasi frontend. Detail di `LAPORAN_AUDIT.md` bagian 4.
