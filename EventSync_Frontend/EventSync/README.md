# EventSync — Event Management & Scheduling System

**Current stage:** Frontend Prototype (HTML + CSS + JavaScript). Belum ada backend: data memakai dummy data + `localStorage`.

Proyek ini mengembangkan prototype EventSync yang lama menjadi frontend lengkap dengan tiga role (User/Participant, Organizer, Admin),
mengikuti dokumen perancangan sebelumnya (database, use case, activity diagram, DFD, wireframe). Judul dan identitas proyek tidak diubah.

## Cara menjalankan

Tidak perlu instalasi. Pilih salah satu:

1. **Paling mudah:** ekstrak ZIP, lalu buka `index.html` di browser (double-click).
2. **Dengan server lokal (disarankan):**
   ```bash
   cd EventSync
   python3 -m http.server 8000      # lalu buka http://localhost:8000
   ```

Koneksi internet hanya dipakai untuk font Google (Plus Jakarta Sans, Inter). Tanpa internet, tampilan memakai font cadangan sistem.

### Akun demo
Semua akun memakai password **dummy** `demo1234` (juga ada tombol cepat di halaman Login).

| Role | Email | Catatan |
|---|---|---|
| Admin | `admin@example.test` | review & kelola semua |
| Organizer | `community@example.test` | EventSync Community (event approved, draft, rejected) |
| Organizer | `bem@example.test` | BEM Kampus (2 event menunggu review) |
| User | `budi@example.test` | sudah terdaftar di beberapa event |
| User (nonaktif) | `rudi@example.test` | contoh akun yang tidak bisa login |

Tombol **Reset demo data** ada di footer halaman publik untuk mengembalikan data awal.
Tanggal event dibuat **relatif terhadap hari ini**, sehingga selalu ada event Upcoming, Ongoing, dan Completed.

## Technologies
HTML5 · CSS3 · JavaScript (vanilla, tanpa framework dan tanpa build step). Ikon SVG inline. Tidak memakai Bootstrap.

## Fitur

**User / Participant** — register, login, logout; browse, search, filter (kategori, tanggal, status) event; lihat detail, schedule, speaker;
Login to Register / Register for Event / Registered; batalkan pendaftaran (dengan konfirmasi); My Events (Upcoming & History); Dashboard; kelola Profile & password.

**Organizer** — dashboard + statistik; lihat/ buat/ ubah/ hapus event sendiri; kelola Schedule, Speaker, dan Committee; lihat Participants (search & filter);
Submit for Review; event yang sedang direview terkunci; catatan penolakan dari admin tampil di form.

**Admin** — dashboard (5 statistik + antrean review); kelola Users dan Organizers (tambah, ubah, aktif/nonaktif, hapus); kelola Categories; kelola semua Events;
Event Review (detail, jadwal, speaker) dengan Approve / Reject (catatan wajib) dan moderasi schedule & speaker.

**Aturan bisnis yang disimulasikan** (sesuai `target_system.md` pada tahap desain): daftar hanya untuk event approved, belum mulai, dan belum penuh; satu user satu pendaftaran per event
(daftar ulang memakai baris yang sama); batal hanya sebelum event mulai; event pending terkunci; event approved yang punya pendaftar dibatalkan, bukan dihapus; penolakan wajib bercatatan;
registrasi publik selalu `role = user`.

## Struktur proyek

```text
EventSync/
├── index.html                      Home / Landing
├── pages/
│   ├── events.html  event-detail.html  schedule.html  speakers.html      (publik)
│   ├── login.html  register.html
│   ├── dashboard.html  my-events.html  profile.html                       (user; profile untuk semua role)
│   ├── organizer/  dashboard · events · create-event (+edit ?id=) · schedule · speakers · participants
│   └── admin/      dashboard · users · organizers · categories · events · event-review
├── css/   style.css (baseline prototype) · dashboard.css (komponen baru) · responsive.css
├── js/    config.js · api.js · app.js · auth.js · events.js · user.js · organizer.js · admin.js
├── data/  events · categories · users · speakers · schedules · committees · registrations   (.js)
└── assets/ images/ (poster SVG, logo; _legacy/ = aset lama yang diarsipkan) · icons/
```

Urutan pemuatan script di setiap halaman: `config → data/* → api → app → auth → (modul halaman)`.

## Arsitektur data (siap diganti Laravel)

```text
Halaman (UI)  →  API.get/post/put/del('/events', ...)  →  api.js
                                                           ├─ mode "local"  : "server tiruan" + localStorage   (sekarang)
                                                           └─ mode "remote" : fetch ke Laravel API              (nanti)
```

UI **tidak pernah** menyentuh `localStorage` langsung. Untuk berpindah ke Laravel: ubah `ES_CONFIG.API_MODE` menjadi `"remote"` dan isi `API_BASE` (`js/config.js`).
Bentuk data di `data/*.js` sama dengan tabel pada `database_design.md`, jadi dapat dipakai sebagai seeder.

| Endpoint di `api.js` | Padanan Laravel (`routes/api.php`) |
|---|---|
| `POST /auth/login` · `/auth/register` · `/auth/logout` · `GET /auth/me` | `AuthController` (Sanctum token) |
| `GET /events` (q, category, date, lifecycle, sort, page) · `GET /events/{id\|slug}` | `EventController@index/show` |
| `POST/DELETE /events/{id}/register` · `GET /my-events` | `EventRegistrationController@store/destroy`, `MyEventController@index` |
| `GET /schedules` · `GET /speakers` · `GET /categories` | `ScheduleController`, `SpeakerController`, `CategoryController` |
| `GET/POST/PUT/DELETE /organizer/events` · `POST /organizer/events/{id}/submit` · `POST /events/{id}/cancel` | `Organizer\EventController` + `EventPolicy` |
| `/events/{id}/schedules\|speakers\|committees` (CRUD) · `/events/{id}/participants` | `Organizer\*Controller` (admin boleh untuk moderasi) |
| `GET /organizer/dashboard` · `/organizer/participants` | `Organizer\DashboardController`, `ParticipantController` |
| `/admin/users` · `/admin/organizers` · `/admin/categories` · `/admin/events` · `/admin/dashboard` | `Admin\*Controller` |
| `POST /admin/events/{id}/approve\|reject` | `Admin\EventReviewController` |

Respons list memakai bentuk `{ data: [...], meta: {...} }`, error validasi memakai status `422` + `errors{field: pesan}` — sama dengan konvensi Laravel,
sehingga kode UI untuk menampilkan error tidak perlu diubah.

## Keamanan (penting dibaca)

- **Autentikasi di frontend ini hanya dummy/simulasi.** Token dan data login disimpan di browser (`localStorage`/`sessionStorage`) hanya agar alur halaman dapat didemokan.
- **Pengecekan role di JavaScript hanya untuk mengarahkan tampilan.** Siapa pun dapat mengubah JavaScript/localStorage di browsernya; ini **bukan** keamanan.
- **Otorisasi final harus dilakukan di server (Laravel):** middleware role, Policy, validasi Form Request.
- **Password tidak boleh disimpan plaintext pada sistem final.** Di demo ini password disimpan sebagai hash sederhana (`cyrb53`) supaya tidak berupa teks biasa, tetapi itu **bukan hashing yang aman**. Laravel memakai `Hash::make()` / `Hash::check()` (bcrypt/argon).
- `demo1234` adalah password dummy bersama untuk akun demo. **Tidak ada password admin asli** di kode. Jangan pernah menaruh password/API key asli di JavaScript.
- Semua teks dari data di-escape sebelum ditampilkan (`ES.esc`) untuk mencegah XSS. Di Blade, `{{ }}` melakukan hal yang sama.
- Session, CSRF, HTTPS, rate limiting, dan upload yang aman adalah tugas backend.

## Keterbatasan yang diketahui

- Data hanya ada di browser Anda (`localStorage`); tidak dibagikan antar perangkat/browser dan hilang bila data situs dihapus.
- Upload gambar (poster, foto speaker) disimpan sebagai data URL yang sudah diperkecil di `localStorage` (batas ±5 MB per situs).
- Mode `remote` pada `api.js` sudah ditulis tetapi **belum diuji** karena belum ada API Laravel.
- Diuji di Chromium headless (desktop 1366 px dan mobile 390 px). Belum diuji di Firefox/Safari atau perangkat fisik.
- Notifikasi e-mail, verifikasi e-mail, "lupa password", dan check-in peserta (status `attended` hanya ada di data contoh) belum ada.

## Future development

```text
Frontend (sekarang)
    ↓
Laravel (migration, model, controller, Policy, Blade/API)
    ↓
MySQL
    ↓
GitHub
    ↓
Deployment (hosting PHP + MySQL, domain, HTTPS)
    ↓
API (token Sanctum)
    ↓
Mobile App
```

Lihat `CHANGELOG.md` untuk catatan integrasi Laravel (pemetaan ke Blade, hal yang perlu ditambahkan pada migration).
