# EventSync — Folder Sketsa UI/UX

Folder ini berisi sketsa antarmuka editable untuk dokumentasi desain EventSync. Seluruh diagram dibuat dengan shape Draw.io (kotak, garis, kartu, dan elemen visual), **tanpa memakai shape tabel**. Daftar event, kontrol, dan dashboard digambarkan sebagai kartu/komponen agar cocok untuk sketsa UI.

## Isi folder

- `00_Alur_Navigasi_Role.drawio` — alur Home, login, role Peserta/Organizer/Admin, dan pengajuan-review event.
- `01_Sketsa_Halaman_Publik.drawio` — Home, Events, Schedule, Speakers.
- `02_Sketsa_Detail_Auth_Peserta.drawio` — Detail Event, Login/Register, Dashboard Peserta, My Events.
- `03_Sketsa_Organizer.drawio` — Dashboard Organizer, My Events, Create/Edit Event, Participants/Schedule/Speakers & Committee.
- `04_Sketsa_Admin.drawio` — Dashboard Admin, Event Review, All Events, Categories/Users/Organizers.

## Membuka file

1. Buka draw.io Desktop atau https://app.diagrams.net/.
2. Pilih **Open From > Device** lalu pilih salah satu file `.drawio`.
3. Setiap file dapat diedit. Gunakan menu File > Save As untuk menyimpan perubahan.

## Catatan kesesuaian

Sketsa disusun berdasarkan nama halaman dan fitur yang ditemukan pada project EventSync yang dikirim: `public/index.html`, `public/pages/`, `public/js/app.js`, `events.js`, `auth.js`, `user.js`, `organizer.js`, dan `admin.js`. Jalur halaman yang ditulis pada sketsa merujuk ke halaman tersebut. Angka statistik sengaja memakai tanda '—' karena nilainya dinamis dari API dan tidak ditetapkan sebagai data contoh. Kartu dan daftar digambar sebagai komponen wireframe, bukan shape tabel.

Sketsa ini disiapkan sebagai dokumentasi rancangan UI/UX dan penyelarasan prototype yang sudah ada. Jangan mengklaim bahwa dokumen ini secara kronologis dibuat sebelum implementasi jika memang dibuat setelah prototype.
