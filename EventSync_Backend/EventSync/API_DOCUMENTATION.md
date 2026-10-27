# API EventSync

Base URL: `/api`. Autentikasi: header `Authorization: Bearer <token>` (token didapat dari login).

Respons sukses: `{ "success": true, "message": "...", "data": ..., "meta": {...} }`
Respons error: `{ "success": false, "message": "..." }` — validasi (422) menambah `"errors": { "field": "pesan" }`.

| Status | Arti |
|---|---|
| 200 / 201 | Berhasil / dibuat |
| 401 | Belum login / token tidak valid atau kedaluwarsa |
| 403 | Role tidak boleh, bukan pemilik event, atau akun nonaktif |
| 404 | Data tidak ditemukan (juga untuk event yang belum dipublikasikan) |
| 409 | Konflik: event sedang direview (terkunci) |
| 422 | Validasi / aturan bisnis gagal (mis. sudah terdaftar, event penuh) |
| 429 | Terlalu banyak percobaan login/register |
| 500 | Error server (detail disembunyikan saat `APP_DEBUG=false`) |

Catatan: waktu event berbentuk `YYYY-MM-DDTHH:mm:ss` tanpa zona (zona waktu aplikasi: `APP_TIMEZONE`).
Login mengembalikan `token` dan `user` di level atas respons.

## Auth & profil
| Method | Endpoint | Role | Fungsi |
|---|---|---|---|
| POST | `/api/auth/register` | Publik | Daftar (selalu role `user`) |
| POST | `/api/auth/login` | Publik | Login → `{token, user}` |
| POST | `/api/auth/logout` | Login | Cabut token saat ini |
| GET | `/api/auth/me` | Login | Data akun sendiri |
| PUT | `/api/profile` | Login | Ubah nama/telepon |
| PUT | `/api/profile/password` | Login | Ganti password |

## Publik
| Method | Endpoint | Role | Fungsi |
|---|---|---|---|
| GET | `/api/events` | Publik | List event approved. Query: `q, category (slug/id), date, lifecycle (upcoming/ongoing/completed), featured, sort (soonest/newest/title), page, per_page, limit` |
| GET | `/api/events/{id\|slug}` | Publik | Detail + schedules, speakers, committees (event non-publik hanya untuk pemilik/admin) |
| GET | `/api/categories` | Publik | Kategori + `events_count` |
| GET | `/api/schedules` | Publik | Jadwal semua event approved. Query: `event, category, date` |
| GET | `/api/speakers` | Publik | Speaker event approved. Query: `event` |

## User (peserta)
| Method | Endpoint | Role | Fungsi |
|---|---|---|---|
| POST | `/api/events/{id}/register` | User | Daftar ke event |
| DELETE | `/api/events/{id}/register` | User | Batalkan pendaftaran (sebelum event mulai) |
| GET | `/api/my-events` | User | Pendaftaran milik sendiri |

## Organizer (hanya event miliknya)
| Method | Endpoint | Role | Fungsi |
|---|---|---|---|
| GET | `/api/organizer/dashboard` | Organizer | Statistik + daftar event |
| GET | `/api/organizer/events` | Organizer | List event sendiri (`status`, `q`) |
| POST | `/api/organizer/events` | Organizer | Buat event (status `draft`) |
| GET | `/api/organizer/events/{id}` | Organizer | Detail untuk edit |
| PUT | `/api/organizer/events/{id}` | Organizer | Ubah event (ditolak → kembali `draft`) |
| DELETE | `/api/organizer/events/{id}` | Organizer | Hapus (soft delete) |
| POST | `/api/organizer/events/{id}/submit` | Organizer | Ajukan review → `pending_review` |
| GET | `/api/organizer/participants` | Organizer | Peserta semua event sendiri (`event, status, q`) |
| GET | `/api/events/{id}/participants` | Organizer / Admin | Peserta satu event |
| POST | `/api/events/{id}/cancel` | Organizer / Admin | Batalkan event approved |
| GET/POST | `/api/events/{id}/schedules` | Organizer / Admin | List / tambah jadwal |
| PUT/DELETE | `/api/events/{id}/schedules/{rid}` | Organizer / Admin | Ubah / hapus jadwal |
| GET/POST | `/api/events/{id}/speakers` | Organizer / Admin | List / tambah speaker |
| PUT/DELETE | `/api/events/{id}/speakers/{rid}` | Organizer / Admin | Ubah / hapus speaker |
| GET/POST | `/api/events/{id}/committees` | Organizer / Admin | List / tambah panitia |
| PUT/DELETE | `/api/events/{id}/committees/{rid}` | Organizer / Admin | Ubah / hapus panitia |

## Admin
| Method | Endpoint | Role | Fungsi |
|---|---|---|---|
| GET | `/api/admin/dashboard` | Admin | Statistik, antrean review, grafik |
| GET / POST | `/api/admin/users` | Admin | List (`role`, `q`) / buat akun (user, organizer, admin) |
| PUT / DELETE | `/api/admin/users/{id}` | Admin | Ubah / hapus akun |
| POST | `/api/admin/users/{id}/toggle` | Admin | Aktif ↔ nonaktif |
| GET | `/api/admin/organizers` | Admin | List organizer + jumlah event |
| POST | `/api/admin/categories` | Admin | Buat kategori |
| PUT / DELETE | `/api/admin/categories/{id}` | Admin | Ubah / hapus kategori (ditolak jika masih punya event) |
| GET | `/api/admin/events` | Admin | Semua event (`status, category, organizer, q`) |
| PUT / DELETE | `/api/admin/events/{id}` | Admin | Ubah judul/kategori/lokasi/kapasitas/featured · hapus |
| POST | `/api/admin/events/{id}/approve` | Admin | Setujui → `approved` (tampil publik) |
| POST | `/api/admin/events/{id}/reject` | Admin | Tolak, `review_note` wajib (min. 5 karakter) |

Gambar (poster event, foto speaker) dikirim sebagai data-URL PNG/JPEG/WebP (maks. 2 MB / 1 MB) atau path gambar bawaan `assets/images/...`;
server memvalidasi isinya dan menyimpannya ke `storage/app/public` (tampil lewat `/storage/...`).
