/* data/users.js — tabel `users` (role: user | organizer | admin)
   Tidak ada password di sini. Semua akun demo memakai ES_CONFIG.DEMO_PASSWORD yang di-hash saat seed (lihat api.js). */
(function () {
  const at = ES_SEED.at;
  ES_SEED.users = [
    { id: 1, name: "Admin EventSync",     email: "admin@example.test",     role: "admin",     phone: null,           organization_name: null,                  is_active: true,  created_at: at(-120, "09:00") },
    { id: 2, name: "EventSync Community", email: "community@example.test", role: "organizer", phone: "0812-0000-0001", organization_name: "EventSync Community", is_active: true,  created_at: at(-110, "09:00") },
    { id: 3, name: "BEM Kampus",          email: "bem@example.test",       role: "organizer", phone: "0812-0000-0002", organization_name: "BEM Kampus",          is_active: true,  created_at: at(-100, "09:00") },
    { id: 4, name: "Budi Santoso",        email: "budi@example.test",      role: "user",      phone: "0812-1111-0001", organization_name: null,                  is_active: true,  created_at: at(-60, "10:00") },
    { id: 5, name: "Sari Dewi",           email: "sari@example.test",      role: "user",      phone: "0812-1111-0002", organization_name: null,                  is_active: true,  created_at: at(-58, "10:00") },
    { id: 6, name: "Andi Wijaya",         email: "andi@example.test",      role: "user",      phone: null,             organization_name: null,                  is_active: true,  created_at: at(-55, "10:00") },
    { id: 7, name: "Citra Lestari",       email: "citra@example.test",     role: "user",      phone: null,             organization_name: null,                  is_active: true,  created_at: at(-40, "10:00") },
    { id: 8, name: "Dewi Anggraini",      email: "dewi@example.test",      role: "user",      phone: null,             organization_name: null,                  is_active: true,  created_at: at(-30, "10:00") },
    { id: 9, name: "Rudi Hartono",        email: "rudi@example.test",      role: "user",      phone: null,             organization_name: null,                  is_active: false, created_at: at(-90, "10:00") }
  ];
})();
