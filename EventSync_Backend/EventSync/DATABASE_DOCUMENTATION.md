# Database EventSync (MySQL)

Sumber kebenaran: `database/migrations/`. Charset `utf8mb4`, engine InnoDB.

```text
users 1──N events N──1 categories
events 1──N speakers      events 1──N schedules N──0..1 speakers
events 1──N event_committees
users 1──N event_registrations N──1 events      (relasi N:M users↔events)
users 1──N personal_access_tokens (Sanctum)
```

## users
`id`, `name`(100), `email`(150, **unique**), `password`(hash bcrypt), `role` ENUM(user, organizer, admin) default user, `phone`(20) null, `organization_name`(150) null, `is_active` bool default 1, timestamps.
Satu tabel untuk tiga role agar login sederhana. `is_active` memungkinkan menonaktifkan akun tanpa menghapus riwayat.

## categories
`id`, `name`(80, unique), `slug`(100, unique), `description`(255) null, `color`(7) default `#7C3AED`, timestamps.

## events
`id`, `organizer_id` → users (**RESTRICT**), `category_id` → categories (**RESTRICT**), `title`(150), `slug`(190, unique), `description` text, `location`(200),
`start_at` datetime, `end_at` datetime, `capacity` uint null (null = tak terbatas), `poster_path` null, `is_featured` bool,
`status` ENUM(draft, pending_review, approved, rejected, cancelled) default draft, `submitted_at` null, `reviewed_by` → users (**SET NULL**), `reviewed_at` null, `review_note` text null,
`deleted_at` (soft delete), timestamps. Index: `(status,start_at)`, `start_at`, `(organizer_id,status)`.
Upcoming/Ongoing/Completed **tidak disimpan**; dihitung dari `start_at/end_at` agar tidak pernah usang.
RESTRICT mencegah organizer/kategori yang masih punya event terhapus tak sengaja. Soft delete menjaga riwayat pendaftaran.

## speakers
`id`, `event_id` → events (**CASCADE**), `name`(120), `title`(120) null, `role`(60) default Speaker, `topic`(150) null, `bio` text null, `photo` null, timestamps.

## schedules
`id`, `event_id` → events (**CASCADE**), `speaker_id` → speakers (**SET NULL**), `session_name`(100) null, `title`(150), `description` null, `location`(150) null,
`person_in_charge`(120) null, `start_at`, `end_at`, `sort_order` smallint, timestamps. Index `(event_id,start_at)`.
Menghapus speaker tidak menghapus jadwal; `speaker_id` menjadi NULL.

## event_committees
`id`, `event_id` → events (**CASCADE**), `name`(120), `role`(60), `organization`(120) null, `contact`(150) null, timestamps.

## event_registrations
`id`, `event_id` → events (**CASCADE**), `user_id` → users (**CASCADE**), `status` ENUM(registered, cancelled, attended) default registered,
`registered_at`, `cancelled_at` null, timestamps. **UNIQUE(event_id, user_id)**; index `(user_id,status)`, `(event_id,status)`.
Pembatalan mengubah status (riwayat tetap ada); daftar ulang memakai baris yang sama. Kursi terpakai = baris dengan status ≠ cancelled.

## personal_access_tokens
Tabel standar Laravel Sanctum (token login API, disimpan sebagai hash SHA-256).
