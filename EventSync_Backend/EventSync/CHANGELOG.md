# CHANGELOG — EventSync — Event Management & Scheduling System

## Backend v1.0 (tahap Laravel + MySQL)

### Backend
- Project Laravel 12 (PHP 8.2+) dengan struktur standar; API JSON di `routes/api.php`.
- 17 class controller (termasuk base & kerangka CRUD), 8 resource, 1 policy, 2 middleware (role, akun aktif), 1 FormRequest, 2 service (gambar, aturan event), handler error JSON terpusat.

### Database
- Migration (urutan aman dari DB kosong): `users`, `categories`, `events`, `speakers`, `schedules`, `event_committees`, `event_registrations`, `personal_access_tokens`.
- FK + RESTRICT/CASCADE/SET NULL, unique, index; soft delete pada events. Lihat `DATABASE_DOCUMENTATION.md`.
- Seeder development dari data frontend (7 kategori, 9 akun, 11 event, 15 speaker, 37 jadwal, 10 panitia, 16 pendaftaran; tanggal relatif).

### Authentication
- Register (selalu role `user`), login, logout, `me`, ubah profil & password. Hash bcrypt. Token Laravel Sanctum (kedaluwarsa 7 hari). Rate limit login/register. Akun nonaktif ditolak walau token masih ada.

### Authorization
- `role:` middleware per grup route + `EventPolicy` (organizer hanya event miliknya, admin semua). Event pending terkunci untuk organizer (409). Mass-assignment dikunci.

### API
- 51 endpoint (semua yang dipakai frontend + `GET /api/organizer/events/{id}`). Lihat `API_DOCUMENTATION.md`.
- Aturan bisnis: daftar hanya event approved/belum mulai/belum penuh/belum terdaftar (transaksi + lock), batal hanya sebelum mulai, approve/reject (alasan wajib), event approved ber-pendaftar tidak bisa dihapus, upload gambar tervalidasi.

### Integrasi frontend
Frontend disalin ke `public/` dan **desain/layout/warna tidak diubah**. Perubahan teknis:
- `js/config.js`: `API_MODE: "remote"`, `API_BASE: "auto"` (root halaman + `/api`), flag `SHOW_DEMO_ACCOUNTS`.
- `js/api.js`: URL dasar otomatis; error jaringan menjadi pesan yang jelas; mode `local` memberi pesan bila dipakai tanpa `data/`.
- `js/app.js`: error validasi server untuk `start_at/end_at/poster_path` dipetakan ke input form (atau toast); link "Reset demo data" hanya di mode local.
- `js/auth.js`: kotak akun demo bisa dimatikan; teks disesuaikan.
- 22 halaman HTML: tag `<script data/*.js>` dihapus (data kini dari MySQL). Folder `data/` tidak disertakan.

### Testing
- Feature test: `AuthenticationTest`, `EventRegistrationTest`, `EventAuthorizationTest`, `AdminApprovalTest` + 2 unit test (total 48 skenario).
- **Status verifikasi:** semua file PHP lolos `php -l` (PHP 8.3) dan JS lolos `node --check`; kontrak endpoint frontend↔routes dicek otomatis. **Test belum dijalankan** — sandbox pembuatan tidak dapat mengunduh dependensi Composer (Packagist diblokir), jadi `composer install`, `migrate`, dan `php artisan test` belum pernah dieksekusi. Jalankan di komputer Anda; jika ada test gagal, kirim outputnya.
