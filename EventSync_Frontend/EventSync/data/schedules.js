/* data/schedules.js — tabel `schedules`
   Baris: [event_id, speaker_id|null, sesi, judul, lokasi, penanggung jawab (teks), selisihHari, mulai, selesai] */
(function () {
  const at = ES_SEED.at;
  const rows = [
    // 1 Tech Innovation Summit 2026
    [1, null, "Morning",   "Registration & Welcome Coffee",                "Lobby, Grand Hall",   "Committee", 45, "08:30", "09:30"],
    [1, 1,    "Morning",   "Keynote: Applied AI for Everyday Products",    "Main Hall",           null,        45, "09:30", "10:30"],
    [1, null, "Morning",   "Panel: Building Tech Products in Indonesia",   "Main Hall",           "Panel moderators", 45, "10:45", "12:00"],
    [1, 2,    "Afternoon", "Workshop: Building a REST API with Laravel",   "Workshop Room 1",     null,        45, "13:00", "15:00"],
    [1, null, "Afternoon", "Startup Demo & Showcase",                      "Exhibition Area",     "Participants", 45, "15:15", "16:30"],
    [1, null, "Afternoon", "Closing",                                      "Main Hall",           "Committee", 45, "16:30", "17:00"],
    // 2 UMKM Digital Marketing Workshop
    [2, null, "Morning",   "Registration",                                 "Workshop Room",       "Committee", 20, "09:00", "09:30"],
    [2, 3,    "Morning",   "Fundamentals of Digital Marketing for Small Business", "Workshop Room", null,       20, "09:30", "11:00"],
    [2, 3,    "Morning",   "Social Media Content Planning (hands-on)",     "Workshop Room",       null,        20, "11:00", "12:00"],
    [2, 4,    "Afternoon", "Product Photography with a Smartphone",        "Workshop Room",       null,        20, "13:00", "14:30"],
    [2, null, "Afternoon", "Q&A and Closing",                              "Workshop Room",       "Committee", 20, "14:30", "15:00"],
    // 3 Indonesia Hackathon 2026
    [3, null, "Day 1",     "Opening & Rules",                              "Innovation Lab",      "Committee", 38, "09:00", "10:00"],
    [3, null, "Day 1",     "Hacking Time",                                 "Innovation Lab",      "Teams",     38, "10:00", "17:00"],
    [3, 5,    "Day 2",     "Final Hacking & Mentoring",                    "Innovation Lab",      null,        39, "09:00", "12:00"],
    [3, 6,    "Day 2",     "Final Pitch to Judges",                        "Main Stage",          null,        39, "13:00", "15:30"],
    [3, null, "Day 2",     "Announcement & Closing",                       "Main Stage",          "Committee", 39, "15:30", "17:00"],
    // 4 Tech Innovation Day 2026 (selesai)
    [4, null, "Rundown",   "Registration",                                 "Convention Hall",     "Committee", -46, "09:00", "09:30"],
    [4, 8,    "Rundown",   "Keynote: Technology for Campuses",             "Convention Hall",     null,        -46, "09:30", "10:30"],
    [4, 9,    "Rundown",   "Web Basics Workshop",                          "Convention Hall",     null,        -46, "10:45", "12:00"],
    [4, null, "Rundown",   "Product Demo & Showcase",                      "Convention Hall",     "Participants", -46, "13:00", "16:00"],
    [4, null, "Rundown",   "Closing",                                      "Convention Hall",     "Committee", -46, "16:00", "17:00"],
    // 5 Campus Creative Festival (berlangsung)
    [5, 10,   "Daily program", "Art Exhibition",                           "Plaza Kampus",        null,        -2, "10:00", "12:00"],
    [5, null, "Daily program", "Poster Design Contest",                    "Plaza Kampus",        "Judges",    -2, "13:00", "15:00"],
    [5, null, "Daily program", "Creative Bazaar",                          "Plaza Kampus",        "Community", -2, "16:00", "18:00"],
    [5, null, "Daily program", "Acoustic Music Night",                     "Plaza Kampus",        "Campus bands", -2, "19:00", "21:00"],
    // 6 Aceh Youth Digital Summit
    [6, null, "Rundown",   "Opening",                                      "Aula Utama",          "Committee", 59, "09:00", "09:30"],
    [6, 11,   "Rundown",   "Talk: Digital Literacy",                       "Aula Utama",          null,        59, "09:30", "11:00"],
    [6, null, "Rundown",   "Career Panel in Tech",                         "Aula Utama",          "Panelists", 59, "13:00", "15:00"],
    [6, null, "Rundown",   "Closing",                                      "Aula Utama",          "Committee", 59, "15:00", "16:00"],
    // 7 Charity & Community Day
    [7, null, "Rundown",   "Fun Walk",                                     "Lapangan Komunitas",  "Participants", 46, "08:00", "09:00"],
    [7, 12,   "Rundown",   "Community Service & Book Donation",            "Lapangan Komunitas",  null,        46, "09:00", "11:00"],
    [7, null, "Rundown",   "Shared Lunch",                                 "Lapangan Komunitas",  "Committee", 46, "11:00", "13:00"],
    // 8 Startup Networking Night (pending)
    [8, null, "Rundown",   "Registration & Networking",                    "Co-working Space",    "Committee", 101, "19:00", "19:30"],
    [8, 13,   "Rundown",   "Founders Panel",                               "Co-working Space",    null,        101, "19:30", "20:30"],
    [8, null, "Rundown",   "Open Networking",                              "Co-working Space",    "Participants", 101, "20:30", "22:00"],
    // 10 Campus Innovation Expo (pending)
    [10, null, "Rundown",  "Opening & Booth Walk",                         "Gedung Serbaguna",    "Committee", 66, "09:00", "11:00"],
    [10, 15,  "Rundown",   "Panel: Turning Research into Products",        "Gedung Serbaguna",    null,        66, "11:00", "12:30"]
  ];
  ES_SEED.schedules = rows.map((r, i) => ({
    id: i + 1, event_id: r[0], speaker_id: r[1], session_name: r[2], title: r[3], description: null,
    location: r[4], person_in_charge: r[5], start_at: at(r[6], r[7]), end_at: at(r[6], r[8]), sort_order: i
  }));
})();
