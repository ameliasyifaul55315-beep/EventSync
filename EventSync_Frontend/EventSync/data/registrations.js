/* data/registrations.js — tabel `event_registrations` (junction User <-> Event). Status: registered | cancelled | attended */
(function () {
  const at = ES_SEED.at;
  // [user_id, event_id, status, hari mendaftar (relatif)]
  const rows = [
    [4, 1, "registered", -10], [4, 3, "registered", -8], [4, 4, "attended", -60], [4, 5, "registered", -5],
    [5, 1, "registered", -9],  [5, 2, "registered", -7], [5, 7, "registered", -4],
    [6, 1, "cancelled", -9],   [6, 3, "registered", -6], [6, 5, "registered", -4], [6, 4, "attended", -61],
    [7, 1, "registered", -8],  [7, 6, "registered", -3], [7, 7, "registered", -3],
    [8, 2, "registered", -6],  [8, 5, "registered", -3]
  ];
  ES_SEED.registrations = rows.map((r, i) => ({
    id: i + 1, user_id: r[0], event_id: r[1], status: r[2], registered_at: at(r[3], "10:00"),
    cancelled_at: r[2] === "cancelled" ? at(r[3] + 1, "10:00") : null
  }));
})();
