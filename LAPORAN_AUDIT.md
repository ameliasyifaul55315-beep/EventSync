# LAPORAN AUDIT — EventSync

Acuan perilaku sistem: migration, model, routes, middleware, controller backend. Diagram dan frontend dibandingkan terhadapnya.
Cakupan yang diperiksa: 6 diagram draw.io, 81 file PHP backend (8 migration, 8 model, 18 controller, 2 middleware, 1 policy, 8 resource, 5 file test), 8 file JS + 21 halaman HTML frontend, dan salinan frontend di `public/` backend.

## 1. Ringkasan kondisi awal
Backend dan kontrak API frontend–backend **sudah konsisten**: seluruh 70+ pemanggilan `API.get/post/put/del` di frontend punya rute yang cocok di `routes/api.php` (method, URL, parameter), dan format respons (`{success,message,data}`, `token`/`user` di level atas, `meta`, `errors` string per field) sesuai yang dibaca frontend. Ketidaksesuaian ditemukan terutama di **diagram**, plus beberapa celah kecil integritas di backend dan **dua versi frontend yang menyimpang**.

## 2. Temuan dan tindakan

### Diagram
| # | Temuan sebelum perbaikan | Tindakan | Status |
|---|---|---|---|
| D1 | ERD: `tokenable_id` digambar sebagai FK → USERS. Migration memakai `morphs('tokenable')` (polimorfik, tanpa FK DB) | Atribut `tokenable_type`/`tokenable_id` diberi tanda polimorfik, relasi "has token" dibuat putus-putus + keterangan "logis, tanpa FK" | Diperbaiki |
| D2 | ERD tidak menunjukkan aturan ON DELETE dan nilai status | Catatan ditambahkan (RESTRICT/CASCADE/SET NULL sesuai migration, soft delete, enum status) | Diperbaiki |
| D3 | DFD L0: proses 2.0 (Katalog) menampilkan `registered_count`, `my_registration`, nama organizer, tetapi tidak membaca D4 dan D1 | Ditambah aliran D4→2.0 dan D1→2.0 | Diperbaiki |
| D4 | DFD L0/Konteks: Admin memoderasi (hapus) jadwal/speaker/panitia dan membatalkan/mengubah/menghapus event, tidak tergambar | Ditambah aliran Admin↔5.0, label Admin→6.0 dan Konteks diperluas; catatan bahwa validasi token terjadi di semua proses | Diperbaiki |
| D5 | Use case: "Registrasi / Login" dihubungkan ke Organizer dan Admin (registrasi publik hanya membuat role user); dashboard peserta (`pages/dashboard.html`) dan pembatalan event tidak ada; semua fungsi Admin tampak tersedia | Dipisah menjadi "Login" dan "Registrasi Akun (peserta)"; ditambah "Lihat Dashboard" untuk peserta dan "Batalkan Event" («extend» Kelola Event); akses Admin yang hanya ada di API digambar putus-putus | Diperbaiki |
| D6 | Activity: status `cancelled` tidak muncul; aturan kunci/pengeditan tidak dijelaskan | Ditambah cabang pembatalan (approved → cancelled) dan catatan aturan status | Diperbaiki |
| D7 | Sequence: judul "alur target", respons sukses ditulis "data pendaftaran" padahal controller mengembalikan **EventResource** (event + `my_registration`); "Policy" dicantumkan padahal pendaftaran memakai middleware `auth:sanctum`→`active`→`role:user`; tidak ada 404, cek event sudah mulai, transaksi + `lockForUpdate`, cek ulang di dalam kunci, reload `GET /events/{id}` | Diagram dibuat ulang (lifeline UML, fragment `alt`, semua respons error nyata) | Diperbaiki |
| D8 | README diagram memuat "asumsi yang perlu dicek" yang kini sudah diverifikasi | README diperbarui | Diperbaiki |

### Backend
| # | Temuan | Tindakan | Status |
|---|---|---|---|
| B1 | `RegistrationController`: status approved dan "belum mulai" dicek sebelum transaksi, tidak diulang setelah `lockForUpdate`; event yang dibatalkan/dihapus tepat saat transaksi bisa tetap menerima pendaftaran, dan `$locked` null bisa menyebabkan error 500 | Cek ulang di dalam kunci (404/422) | Diperbaiki (belum dijalankan) |
| B2 | Kapasitas event bisa diturunkan di bawah jumlah pendaftar aktif (organizer maupun admin) | `EventService::assertCapacityFits()` dipakai di update organizer dan admin (422) | Diperbaiki (belum dijalankan) |
| B3 | Admin bisa menurunkan role organizer yang masih memiliki event, sehingga `events.organizer_id` menunjuk ke non-organizer | Ditolak 422 selama organizer memiliki event (termasuk soft-deleted) | Diperbaiki (belum dijalankan) |
| B4 | Organizer dapat mengedit event `approved` tanpa review ulang (status tetap approved) — sudah tercatat di `DESIGN_CONFLICTS.md` #8 | **Tidak diubah**, perlu keputusan Anda; digambarkan apa adanya di activity diagram | Butuh keputusan |
| B5 | Organizer masih bisa mengubah jadwal/speaker/panitia pada event `cancelled` | Tidak diubah (tidak merusak data); dicatat | Catatan |
| B6 | API admin untuk melihat peserta dan CRUD jadwal/speaker/panitia ada, UI admin hanya memakai hapus | Tidak diubah; digambar putus-putus di use case | Catatan |
| B7 | `GET /api/organizer/events/{id}` tidak dipakai UI (form edit memakai `GET /api/events/{id}` dengan token, yang tetap menampilkan draft milik organizer) | Tidak diubah, berfungsi | Catatan |

### Frontend
| # | Temuan | Tindakan | Status |
|---|---|---|---|
| F1 | Dua versi frontend menyimpang: folder `EventSync_Frontend` (mode `local`) dan `public/` di backend (mode `remote`) berbeda pada `api.js`, `app.js`, `auth.js`, `config.js` tanpa penjelasan | `EventSync_Frontend` dijadikan **sumber**; perbaikan dari `public/` (error jaringan, pemetaan error `start_at/end_at/poster_path`, `SHOW_DEMO_ACCOUNTS`, base URL `auto`) dimasukkan ke sumber. Perbedaan yang sah hanya: `API_MODE`, tag `data/*.js`, folder `data/`. Dijaga oleh `tools/verify_frontend_sync.js` | Diperbaiki |
| F2 | Teks kotak akun demo menyebut "prototype, backend nanti" walau mode remote | Teks mengikuti `API.mode` | Diperbaiki |
| F3 | Risiko data demo menggantikan data backend | Di `public/` mode remote dan `localRequest` menolak jika `data/*.js` tidak ada; "Reset demo data" hanya tampil di mode local | Sesuai |

## 3. Matriks pemetaan fitur
Kolom diagram: ERD, DFD-K (konteks), DFD-0, UC, ACT, SEQ. Status: **S** Sesuai, **P** Perlu diperbaiki, **B** Belum tersedia, **V** Belum dapat diverifikasi (butuh dijalankan).

| Fitur | JS | Endpoint | Middleware / role | Controller (model) | Tabel | Diagram | Status |
|---|---|---|---|---|---|---|---|
| Registrasi peserta | auth.js | POST /api/auth/register | throttle:auth | AuthController (User) | users | DFD-0 1.0, UC | S (V) |
| Login / logout / me | auth.js | POST /api/auth/login, /logout, GET /me | throttle:auth; auth:sanctum, active | AuthController | users, personal_access_tokens | DFD-0 1.0, UC | S (V) |
| Profil & ganti password | user.js | PUT /api/profile, /profile/password | auth:sanctum, active | ProfileController | users, personal_access_tokens | DFD-0 1.0, UC | S (V) |
| Katalog & detail event | events.js | GET /api/events, /events/{id\|slug}, /categories | publik (token opsional) | EventController, CategoryController | events, categories, event_registrations, users | DFD-0 2.0, UC | S (V) |
| Jadwal & speaker publik | events.js | GET /api/schedules, /speakers | publik | CatalogController | schedules, speakers, events | DFD-0 2.0 | S (V) |
| Daftar event | events.js | POST /api/events/{id}/register | role:user | RegistrationController | event_registrations, events | SEQ, UC, DFD-0 4.0 | S (B1 diperbaiki, V) |
| Batal daftar | events.js, user.js | DELETE /api/events/{id}/register | role:user | RegistrationController | event_registrations | UC, DFD-0 4.0 | S (V) |
| My Events / dashboard peserta | user.js | GET /api/my-events | role:user | RegistrationController | event_registrations, events | UC, DFD-0 4.0 | S (V) |
| Dashboard organizer | organizer.js | GET /api/organizer/dashboard | role:organizer | Organizer\EventController | events, event_registrations | UC, DFD-0 3.0 | S (V) |
| CRUD event organizer | organizer.js | /api/organizer/events (+ GET /events/{id} untuk form edit) | role:organizer + EventPolicy | Organizer\EventController | events | UC, ACT, DFD-0 3.0 | S (B2, V); B4 butuh keputusan |
| Ajukan review | organizer.js | POST /api/organizer/events/{id}/submit | role:organizer | Organizer\EventController | events | ACT, UC | S (V) |
| Batalkan event | organizer.js, admin.js | POST /api/events/{id}/cancel | role:organizer,admin + Policy | Organizer\EventController, EventService | events | ACT, UC | S (V) |
| Jadwal / speaker / panitia | organizer.js | /api/events/{id}/{schedules\|speakers\|committees} | role:organizer,admin + Policy | ScheduleController, SpeakerController, CommitteeController | schedules, speakers, event_committees | DFD-0 5.0, UC | S (V); admin: API ada, UI hanya hapus |
| Peserta event | organizer.js | GET /api/organizer/participants, /events/{id}/participants | role:organizer (admin untuk per-event) | ParticipantController | event_registrations, users | UC, DFD-0 3.0 | S (V); admin: UI belum ada |
| Review event | admin.js | POST /api/admin/events/{id}/approve, /reject | role:admin | Admin\EventController | events | ACT, UC, DFD-0 6.0 | S (V) |
| Kelola event (admin) | admin.js | GET/PUT/DELETE /api/admin/events | role:admin | Admin\EventController, EventService | events | UC, DFD-0 6.0 | S (B2, V) |
| Kelola akun | admin.js | /api/admin/users, /organizers, /users/{id}/toggle | role:admin | Admin\UserController | users, personal_access_tokens | UC, DFD-0 6.0 | S (B3, V) |
| Kelola kategori | admin.js | POST/PUT/DELETE /api/admin/categories | role:admin | Admin\CategoryController | categories | UC, DFD-0 6.0 | S (V) |
| Dashboard admin | admin.js | GET /api/admin/dashboard | role:admin | Admin\DashboardController | users, events, event_registrations, categories | UC, DFD-0 6.0 | S (V) |
| Upload poster/foto | organizer.js | poster_path / photo (data URI) pada endpoint event & speaker | sama dengan endpoint induk | ImageStorage | disk public (`storage/...`) | — | V (butuh `storage:link`) |

"V" berarti logika sudah sesuai hasil pembacaan kode, tetapi belum dijalankan terhadap server nyata.

## 4. Status pengujian
**Benar-benar dijalankan:**
- `php -l` pada 81 file PHP (termasuk file yang diubah dan test baru): tanpa error sintaks.
- `node --check` pada 24 file JS: tanpa error sintaks.
- Parsing XML keenam file `.drawio`: well-formed, tanpa ID ganda, tanpa referensi source/target yang rusak.
- `node tools/verify_frontend_sync.js`: kedua versi frontend konsisten (mode sumber `local`, `public` `remote`).
- Pencocokan statis: seluruh pemanggilan API di JS frontend terhadap `routes/api.php`.

**Tidak dapat dijalankan di lingkungan saya** (Packagist diblokir sehingga `composer install` gagal; tidak ada MySQL):
- `php artisan route:list`, `migrate:status`, `php artisan test` (termasuk 2 test baru di `IntegrityGuardsTest.php`), pemanggilan endpoint nyata, dan tampilan visual diagram di diagrams.net (posisi garis hasil perubahan perlu Anda cek sekilas; semuanya masih bisa digeser/diedit).

Langkah pengujian untuk Laragon ada di `PANDUAN_LARAGON.md`.
