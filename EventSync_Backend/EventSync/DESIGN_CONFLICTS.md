# DESIGN_CONFLICTS — EventSync

Catatan jujur: dokumen desain lama (ERD, Use Case, Activity Diagram, DFD, Wireframe, `database_design.md`) **tidak ada di ZIP frontend**.
"Desain sebelumnya" di bawah = spesifikasi tugas backend + catatan di `README.md`/`CHANGELOG.md` frontend (yang menyatakan frontend mengikuti desain tersebut).
Jika ERD asli Anda berbeda dari yang tertulis di sini, tolong bandingkan dan kabari saya. Prinsip yang dipakai: **frontend resmi menang**, karena backend harus menghidupkannya.

## 1. Nama & nilai status event
- **Masalah:** Spesifikasi menyebut `draft, pending, approved, rejected, published`; frontend memakai `draft, pending_review, approved, rejected, cancelled`.
- **Desain sebelumnya:** `pending`, dan `published` sebagai status terpisah.
- **Frontend:** `pending_review`; tidak ada `published`; ada `cancelled` (event approved yang dibatalkan); CHANGELOG frontend menyebut `cancelled` sudah ada di ENUM desain.
- **Rekomendasi:** Pakai nilai frontend. "Published" = `approved` (satu langkah review sudah cukup).
- **Perubahan yang dilakukan:** ENUM `events.status` = frontend. `approved` otomatis tampil publik.

## 2. Tanggal & jam event
- **Masalah:** Spesifikasi: kolom `date, end_date, start_time, end_time`. Frontend: `start_at`, `end_at` (datetime).
- **Frontend:** Seluruh UI/filter/jadwal memakai satu timestamp awal dan akhir; event multi-hari (Hackathon, Festival) natural.
- **Rekomendasi:** Dua kolom datetime lebih sederhana dan tidak bisa tidak konsisten.
- **Perubahan yang dilakukan:** `start_at`, `end_at`. Form frontend tetap memisah tanggal/jam di UI lalu menggabungkannya.

## 3. Pendaftaran: nama kolom & aturan unik
- **Masalah:** Spesifikasi: `registration_date`, dan unik "jika status masih aktif". MySQL tidak punya partial unique index.
- **Frontend:** `registered_at`, `cancelled_at`; `UNIQUE(event_id, user_id)`; daftar ulang memakai baris yang sama.
- **Rekomendasi:** Ikuti frontend; satu baris per pasangan user–event, riwayat tetap rapi, tidak ada duplikasi.
- **Perubahan yang dilakukan:** `registered_at` (bukan `registration_date`) + `cancelled_at`; status `registered/cancelled/attended`; UNIQUE(event_id,user_id). Daftar ulang menghidupkan baris lama.

## 4. Kolom tambahan yang tidak ada di spesifikasi minimal
- **Masalah:** Frontend memerlukan data yang tidak ada di daftar minimal.
- **Frontend → kolom:** `events.capacity` (kuota & "Event Full"), `is_featured`, `submitted_at/reviewed_by/reviewed_at/review_note` (alur review & alasan penolakan), `deleted_at` (hapus lunak); `users.phone/organization_name/is_active`; `speakers.role/title/topic`; `schedules.session_name/location/person_in_charge/speaker_id/sort_order`; `categories.slug/color/description`; `events.image` → **`poster_path`**.
- **Rekomendasi:** Semua dipakai nyata oleh halaman; tidak ada kolom yang dibuat "jaga-jaga".
- **Perubahan yang dilakukan:** Ditambahkan di migration. `speakers.topic` sudah diminta CHANGELOG frontend.

## 5. Tabel tambahan `event_committees`
- **Masalah:** Spesifikasi minimal hanya 6 tabel.
- **Frontend:** Tab "Committee" di Speakers & Committee, dan kartu "Committee" di detail event (data dari `organizers.json` prototype lama).
- **Rekomendasi:** Tambahkan tabel, bukan membuang fitur.
- **Perubahan yang dilakukan:** Tabel `event_committees` (+ model `Committee`). Total 7 tabel domain + `personal_access_tokens` (Sanctum).

## 6. Route Blade vs API
- **Masalah:** Spesifikasi menyebut route web (`GET /organizer/events/create`, `/edit`, `GET /events`) dan `/api/...`.
- **Frontend:** Halaman statis `.html` (form create/edit memakai `create-event.html?id=`), semua data lewat `/api`.
- **Rekomendasi:** Tidak membuat Blade ganda; API saja.
- **Perubahan yang dilakukan:** Tidak ada route `create`/`edit` terpisah (tidak relevan untuk API). Ditambahkan `GET /api/organizer/events/{id}` untuk data form edit. `routes/web.php` hanya membuka Home.

## 7. Pembuatan Organizer
- **Masalah:** Spesifikasi: organizer dibuat lewat "mekanisme aman".
- **Frontend:** Halaman registrasi menyatakan organizer/admin dibuat administrator.
- **Perubahan yang dilakukan:** Hanya `POST /api/admin/users`. Registrasi publik mengabaikan field `role`.

## 8. Event approved masih bisa diedit organizer tanpa review ulang
- **Masalah:** Aturan frontend (`editable` = bukan pending/cancelled) mengizinkan organizer mengubah event yang sudah approved dan event tetap `approved`. Organizer bisa mengubah judul/jadwal setelah disetujui tanpa pengawasan admin.
- **Frontend:** Tombol Edit tersedia untuk event approved.
- **Rekomendasi:** Pertimbangkan: perubahan field penting pada event approved → kembali `pending_review`. Perlu keputusan Anda.
- **Perubahan yang dilakukan:** **Belum diubah** (mengikuti frontend). Sengaja tidak mengubah diam-diam.

## 9. Bentuk respons
- **Masalah:** Spesifikasi: `{success, message, data}` + error `errors` standar Laravel (array per field).
- **Frontend:** Membaca `token`/`user` di level atas saat login, `meta` untuk paginasi, dan `errors[field]` berupa **string** tunggal.
- **Perubahan yang dilakukan:** Semua respons memuat `success` dan `message`; `token`, `user`, `meta` tetap di level atas; error validasi dikirim satu string per field.

## 10. Kecil-kecil
- **Edit event rejected → otomatis `draft`:** CHANGELOG frontend minta dikonfirmasi; **diterapkan** (ditest).
- **Hapus kategori:** frontend hanya memeriksa event aktif; di DB, FK RESTRICT juga memblokir event ter-soft-delete. Backend menolak (422) keduanya dengan pesan yang sama.
- **Slug event:** frontend membuat ulang slug tiap simpan; backend hanya jika judul berubah, agar tautan lama tidak putus.
- **Rule password:** minimal 8 karakter (sesuai UI); belum ada aturan kompleksitas/verifikasi email/lupa password (di luar cakupan).
- **Admin mengubah event:** hanya judul, kategori, lokasi, kapasitas, featured (sesuai form admin); konten/jadwal tetap milik organizer.
