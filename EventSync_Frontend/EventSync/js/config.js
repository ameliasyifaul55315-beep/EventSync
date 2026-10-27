/* EventSync — config.js
   Pengaturan global frontend. Folder ini = SUMBER frontend (mode demo 'local' bawaan, data/*.js tersedia).
   Salinan yang dilayani Laravel ada di EventSync_Backend/EventSync/public/ dan HANYA berbeda di:
   (1) js/config.js -> API_MODE = "remote", (2) tag <script src="...data/*.js"> dihapus dari HTML, (3) folder data/ tidak disertakan.
   Cek dengan: node tools/verify_frontend_sync.js */
window.ES_CONFIG = {
  APP_NAME: "EventSync",
  TAGLINE: "Event Management & Scheduling System",
  // 'local'  = simulator di browser (localStorage), tanpa server. Data TIDAK berasal dari database.
  // 'remote' = memanggil Laravel API di API_BASE (data dari MySQL).
  API_MODE: "local",
  // "auto" = <root halaman>/api, benar walau project dipasang di subfolder. Atau isi URL penuh, mis. "http://localhost:8000/api".
  API_BASE: "auto",
  // Tombol akun demo di halaman Login. Matikan (false) di server produksi.
  SHOW_DEMO_ACCOUNTS: true,
  // Password DUMMY akun demo development (harus sama dengan SEED_DEMO_PASSWORD di .env backend). BUKAN password asli.
  DEMO_PASSWORD: "demo1234",
  STORAGE_KEY: "eventsync.db.v1",   // data demo (hanya mode local)
  AUTH_KEY: "eventsync.auth.v1",    // token + user yang sedang login
  PER_PAGE: 9
};

/* Helper seed: tanggal RELATIF terhadap hari ini (dipakai data/*.js mode local). */
window.ES_SEED = {
  at(days, hm) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + days);
    const [h, m] = hm.split(":");
    d.setHours(+h, +m, 0, 0);
    const p = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
  }
};
