# EventSync — Event Management & Scheduling System

Backend **Laravel + MySQL** untuk frontend EventSync (HTML/CSS/JavaScript). Frontend sudah ikut di folder `public/`
dan sudah terhubung ke API, jadi satu project ini langsung bisa dibuka di browser.

```text
Browser (public/*.html + js/)  →  Laravel API (/api/...)  →  MySQL
```

## Requirements

- PHP 8.2+ dengan ekstensi: `pdo_mysql`, `mbstring`, `xml`, `curl`, `fileinfo` (dan `pdo_sqlite` bila ingin menjalankan test)
- Composer 2
- MySQL 8 / MariaDB 10.6+
- Node/npm **tidak diperlukan** (frontend tanpa build step)

## Instalasi

```bash
composer install
cp .env.example .env            # Windows: copy .env.example .env
php artisan key:generate
```

Buat database kosong, lalu isi `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` di `.env`:

```sql
CREATE DATABASE eventsync CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

```bash
php artisan migrate             # membuat semua tabel
php artisan db:seed             # mengisi data contoh (development saja)
php artisan storage:link        # agar poster/foto hasil upload bisa tampil
php artisan serve               # buka http://localhost:8000
```

Menjalankan test (memakai SQLite di memori, tidak menyentuh MySQL): `php artisan test`

## Akun development

Dibuat oleh seeder. **Semua memakai password dummy `demo1234`** (bisa diganti lewat `SEED_DEMO_PASSWORD` di `.env`).
Itu hanya untuk development: seeder menolak berjalan jika `APP_ENV=production`, dan di produksi set
`SHOW_DEMO_ACCOUNTS: false` di `public/js/config.js`. Tidak ada password asli di project ini.

| Role | Email |
|---|---|
| Admin | `admin@example.test` |
| Organizer | `community@example.test`, `bem@example.test` |
| User | `budi@example.test` (sudah terdaftar di beberapa event), `sari@example.test`, … |
| User nonaktif | `rudi@example.test` (tidak bisa login) |

## Cara kerjanya (untuk yang sedang belajar Laravel)

| Bagian | Apa | Kenapa | Terhubung ke |
|---|---|---|---|
| `database/migrations/` | Resep pembuatan tabel | Skema bisa dibuat ulang dari nol dengan `php artisan migrate` | MySQL |
| `app/Models/` | Satu class per tabel + relasi (`Event belongsTo Category`, dst.) | Bekerja dengan data lewat PHP, bukan SQL mentah (aman dari SQL injection) | Semua tabel |
| `routes/api.php` | Daftar URL API dan siapa yang boleh | Satu tempat untuk melihat seluruh "pintu" backend | `public/js/api.js` |
| `app/Http/Controllers/Api/` | Logika tiap URL (daftar event, daftar ke event, approve, …) | Menjalankan aturan bisnis di server | Halaman frontend sesuai komentar di tiap file |
| `app/Http/Middleware/EnsureRole.php` | Penjaga role (`role:admin`) | Memblokir role yang salah sebelum controller jalan | Semua route terlindungi |
| `app/Policies/EventPolicy.php` | Aturan "event ini milik siapa?" | Organizer hanya boleh mengubah event miliknya, dicek di server | Organizer API |
| `app/Http/Resources/` | Bentuk JSON yang dikirim | Harus sama persis dengan yang diharapkan frontend | Semua halaman |
| `database/seeders/` | Data contoh | Frontend langsung terisi seperti prototype | Semua tabel |
| `tests/Feature/` | Tes otomatis alur penting | Memastikan fitur kritis tidak rusak | API |
| `public/` | Frontend (HTML/CSS/JS) | Disajikan langsung oleh Laravel/web server | API lewat `fetch` |

Alur contoh "Register for Event": klik tombol → `POST /api/events/{id}/register` → `RegistrationController@store`
(cek login & role, event approved, belum mulai, belum penuh, belum terdaftar) → tabel `event_registrations` → JSON → tombol berubah jadi **Registered**.

## Keputusan arsitektur: frontend statis + API (bukan Blade)

Frontend yang diberikan sudah memakai lapisan `api.js` dengan mode `remote` dan kontrak endpoint lengkap, jadi
paling aman dan paling kecil risikonya adalah **membiarkan frontend apa adanya** dan menyajikannya dari `public/`,
sambil membangun API yang memenuhi kontrak itu. Dengan begitu: tampilan tidak berubah, tidak ada CSRF/cookie
yang perlu diatur (autentikasi memakai Bearer token Laravel Sanctum), dan API yang sama nanti bisa dipakai aplikasi mobile.
Jika kelak ingin Blade, setiap `ES.pages[...]` dapat dipindah menjadi satu view + controller tanpa mengubah database/API.

## Keamanan singkat

Password di-hash (bcrypt) · token Sanctum (kedaluwarsa 7 hari, dicabut saat logout/nonaktif) · validasi di server ·
role middleware + Policy · mass-assignment dikunci (`role`, `status`, `organizer_id` tidak bisa dikirim dari request) ·
rate limit login/register · upload gambar divalidasi isinya (SVG ditolak) · query lewat Eloquent (prepared statement) ·
frontend meng-escape semua output. CSRF tidak berlaku karena API memakai Bearer token (bukan cookie).

## Dokumen lain

`API_DOCUMENTATION.md` · `DATABASE_DOCUMENTATION.md` · `DESIGN_CONFLICTS.md` · `CHANGELOG.md`
