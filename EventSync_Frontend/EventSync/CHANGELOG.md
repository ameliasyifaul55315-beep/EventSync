# CHANGELOG — EventSync — Event Management & Scheduling System

## Frontend v1.0 (tahap pembuatan frontend)

### Dipertahankan dari prototype lama
- **Nama dan judul proyek** tidak berubah.
- **Identitas visual:** light theme ungu–pink, font Plus Jakarta Sans + Inter, token warna/radius/bayangan, header, hero, kartu event (`.ev-card`), chip, badge, timeline, tabel responsif (`.rtable`), footer, CTA band. `css/style.css` dan `css/responsive.css` berasal dari prototype.
- **Konsep halaman:** Home, Events (search + filter), Event Detail dengan timeline per sesi, Schedule, Speakers.
- **Model data:** event, category, schedule (dengan sesi), speaker, panitia (`organizers.json` → `committees`).
- **Aset:** semua poster SVG. Poster dakwah dan konser dipindahkan ke `assets/images/_legacy/` (tidak dihapus); logo hijau lama ke `_legacy/logo-green.svg`.
- Pola render lewat JavaScript per halaman dan helper `ES` (nama sama dengan prototype).

### Diperbaiki / diubah
- **Data tidak lagi statis:** semua halaman membaca lewat lapisan `API` (`js/api.js`), bukan membaca JSON/Local Storage langsung.
- **Status event dipisah** (sesuai desain): `draft / pending_review / approved / rejected / cancelled` disimpan; Upcoming/Ongoing/Completed dihitung dari tanggal.
- **Kategori memakai `category_id`** (bukan nama teks); jadwal memakai `start_at/end_at` (bukan teks `"08:00 – 08:30"`).
- **Halaman Participants publik dihapus** (membuka data pribadi). Digantikan Participant List khusus Organizer dan My Events untuk User.
- **Admin demo tanpa login diganti** dengan login, role, dan dua dashboard (Organizer & Admin).
- **Tidak ada ketergantungan gambar eksternal** (foto Unsplash prototype diganti poster SVG lokal).
- UI diubah ke **bahasa Inggris** agar konsisten dengan istilah di desain (Login to Register, Submit for Review, dst.).
- Data contoh **dakwah/religius dan konser artis nyata diganti** event umum.

### Halaman baru (22 halaman)
Publik: `login`, `register`. User: `dashboard`, `my-events`, `profile`. Organizer: `dashboard`, `events`, `create-event` (juga edit via `?id=`), `schedule`, `speakers` (tab Speakers & Committee), `participants`.
Admin: `dashboard`, `users`, `organizers`, `categories`, `events`, `event-review`. Halaman lama yang dipertahankan: `index`, `events`, `event-detail`, `schedule`, `speakers`.

### Fitur interaktif baru
Search/filter/sort + paginasi dengan parameter URL · register & cancel event (dengan modal konfirmasi) · status tombol (Login to Register / Register for Event / Registered / Event Full / ditutup) ·
validasi form (frontend) + pesan error dari "server" · show/hide password · modal CRUD (schedule, speaker, committee, user, kategori, event) · konfirmasi sebelum hapus · toast ·
sidebar collapse (desktop) / off-canvas (mobile) · navbar mobile · upload gambar dengan resize otomatis · statistik bar sederhana · guard halaman per role · token dicek tiap halaman (logout otomatis bila tidak valid).

### Dummy data baru
11 event (7 publik: 5 Upcoming, 1 Ongoing, 1 Completed; 2 pending_review, 1 draft, 1 rejected), 7 kategori, 9 akun (1 admin, 2 organizer, 6 user termasuk 1 nonaktif), 15 speaker, 37 item jadwal, 10 panitia, 16 pendaftaran.
Event baru: Tech Innovation Summit 2026, UMKM Digital Marketing Workshop, Indonesia Hackathon 2026, UI/UX Design Workshop, Campus Innovation Expo, Digital Marketing Seminar (+ 3 poster SVG baru untuk yang tidak punya poster).
Event dari prototype (Tech Innovation Day, Campus Creative Festival, Aceh Youth Digital Summit, Charity & Community Day, Startup Networking Night) tetap ada dengan isi disesuaikan.
Tanggal **relatif terhadap hari ini**.

### Perbedaan dengan dokumen desain (perlu diselaraskan di tahap Laravel)
| Hal | Frontend | Tindak lanjut |
|---|---|---|
| `speakers.topic` | Ada (permintaan fitur: Name, Photo, Bio, Topic, Event) | **Tambahkan kolom `topic VARCHAR(150) NULL`** pada tabel `speakers` di ERD & migration |
| Seed | 11 event (desain: 8) dan 9 akun (desain: 8) agar demo draft/rejected/nonaktif terlihat | Sesuaikan seeder; angka di wireframe hanya contoh |
| Aksi `cancel event` | Ada (`POST /events/{id}/cancel`, status `cancelled`) | Sudah ada di ENUM `events.status`; tambahkan Policy |
| Edit event `rejected` | Otomatis kembali ke `draft` | Konfirmasi aturan ini |
| Foto speaker / poster | Data URL di localStorage | Laravel: simpan file di `storage`, isi `photo_path` / `poster_path` |

### Struktur folder
Lihat `README.md`. Pemisahan: `data/` (isi) · `js/api.js` (akses data) · `js/app.js` (komponen UI) · modul per area (`events/user/organizer/admin.js`).

### Catatan integrasi Laravel
- **Layout → Blade:** `ES.mountPublic` → `layouts/public.blade.php`; `ES.mountDash` → `layouts/dashboard.blade.php` (sidebar per role).
- **Komponen → Blade component:** `ES.eventCard` → `<x-event-card>`; `ES.badge` → `<x-status-badge>`; `ES.modal/formModal` → `<x-modal>`; `ES.table` → partial tabel.
- **Halaman → View + Controller:** satu `ES.pages[...]` = satu view; `API.get('/events')` = query di Controller (`Event::approved()->with(...)`).
- **Status waktu** (`lifecycle`) → scope/accessor di model `Event`.
- **Aturan bisnis di `api.js`** (kuota, batas pembatalan, kunci edit, restriksi hapus) → Policy + Form Request + Service; jangan hanya mengandalkan UI.
- **Auth:** ganti `Auth.login` dengan endpoint Sanctum; token Bearer sudah dipakai `remoteRequest`. Nonaktifkan `DEMO_PASSWORD` dan hash dummy.
- **Pagination:** respons `{data, meta}` cocok dengan `paginate()` Laravel (sesuaikan nama field `meta`).
- Tetap tambahkan: CSRF (jika memakai session), rate limiting, verifikasi e-mail, upload file aman, HTTPS.
