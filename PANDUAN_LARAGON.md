# Panduan menjalankan EventSync di Laragon

Prasyarat: Laragon Full (PHP 8.2+, MySQL/MariaDB, Composer). Node tidak wajib.

## 1. Letakkan project
Salin folder `EventSync_Backend/EventSync` ke `C:\laragon\www\EventSync`. (Frontend sudah ada di `EventSync\public`.)

## 2. Pasang dependensi
Buka Terminal Laragon di folder tersebut:
```
composer install
copy .env.example .env
php artisan key:generate
```

## 3. Database
Start All di Laragon, lalu buat database (HeidiSQL atau terminal):
```
mysql -u root -e "CREATE DATABASE eventsync CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```
Sunting `.env` (hanya lokal, jangan di-commit):
```
APP_ENV=local
APP_DEBUG=true
APP_URL=http://eventsync.test
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=eventsync
DB_USERNAME=root
DB_PASSWORD=
SEED_DEMO_PASSWORD=demo1234
```
(`DB_PASSWORD` kosong adalah default Laragon; isi sesuai pengaturan Anda.)

## 4. Migration, data contoh, storage
```
php artisan migrate
php artisan db:seed
php artisan storage:link
```
Jangan memakai `migrate:fresh` pada database yang berisi data yang ingin dipertahankan.

## 5. Buka aplikasi
- Laragon: klik kanan > Apache/Nginx > Reload; Laragon membuat host `http://eventsync.test` yang mengarah ke `public/` (Auto Virtual Hosts aktif). Atau jalankan `php artisan serve` lalu buka `http://localhost:8000`.
- Login demo (password `demo1234`): `admin@example.test`, `community@example.test` (organizer), `budi@example.test` (peserta).

## 6. Pengujian yang disarankan
1. `php artisan route:list --path=api` — pastikan rute sesuai matriks di `LAPORAN_AUDIT.md`.
2. `php artisan migrate:status` — semua 8 migration "Ran".
3. `php artisan test` — memakai SQLite memori (aktifkan ekstensi `pdo_sqlite` di php.ini bila belum). Perhatikan khusus `IntegrityGuardsTest`, `EventRegistrationTest`, `AdminApprovalTest`.
4. Alur manual: peserta daftar → daftar lagi (harus ditolak) → batal → daftar ulang; organizer buat event → submit → admin reject (tanpa alasan harus ditolak) → organizer edit → submit → admin approve → event tampil di katalog; organizer turunkan kapasitas di bawah jumlah pendaftar (harus ditolak).
5. Verifikasi frontend: `node tools/verify_frontend_sync.js` dari root proyek revisi.
6. Buka tiap `.drawio` di https://app.diagrams.net dan cek tata letak.

## 7. Produksi
Set `APP_ENV=production`, `APP_DEBUG=false`, `SHOW_DEMO_ACCOUNTS: false` di `public/js/config.js`; seeder menolak jalan di production.
