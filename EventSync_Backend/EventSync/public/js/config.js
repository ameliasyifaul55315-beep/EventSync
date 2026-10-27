/* EventSync — config.js
   Pengaturan global frontend. Sekarang terhubung ke backend Laravel (API_MODE = 'remote'). */
window.ES_CONFIG = {
  APP_NAME: "EventSync",
  TAGLINE: "Event Management & Scheduling System",
  // 'remote' = memanggil Laravel API di API_BASE (build ini).
  // 'local'  = simulator localStorage lama; HANYA ada di ZIP frontend asli (folder data/ tidak disertakan di sini).
  API_MODE: "remote",
  // "auto" = <root halaman>/api, sehingga tetap benar walau project dipasang di subfolder (mis. XAMPP).
  API_BASE: "auto",
  // Tombol akun demo di halaman Login. Matikan (false) di server produksi.
  SHOW_DEMO_ACCOUNTS: true,
  // Password DUMMY akun demo development (harus sama dengan SEED_DEMO_PASSWORD di .env backend).
  // BUKAN password asli. Jangan pernah menaruh password asli di JavaScript.
  DEMO_PASSWORD: "demo1234",
  STORAGE_KEY: "eventsync.db.v1",   // data demo (pengganti MySQL)
  AUTH_KEY: "eventsync.auth.v1",    // token + user yang sedang login (pengganti session/Sanctum token)
  PER_PAGE: 9
};

/* Helper seed: tanggal RELATIF terhadap hari ini, supaya demo selalu punya event Upcoming/Ongoing/Completed. */
window.ES_SEED = {
  at(days, hm) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + days);
    const [h, m] = hm.split(":"); d.setHours(+h, +m, 0, 0);
    const p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
  }
};
