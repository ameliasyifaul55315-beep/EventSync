/* data/events.js — tabel `events`
   Status tersimpan = alur persetujuan (draft / pending_review / approved / rejected / cancelled).
   Upcoming / Ongoing / Completed TIDAK disimpan; dihitung dari start_at & end_at (lihat api.js: lifecycle()).
   Tanggal memakai ES_SEED.at(selisihHari, "HH:MM") agar demo tidak kedaluwarsa. */
(function () {
  const at = ES_SEED.at, P = "assets/images/poster-";
  ES_SEED.events = [
    { id: 1, organizer_id: 2, category_id: 1, title: "Tech Innovation Summit 2026", slug: "tech-innovation-summit-2026",
      description: "A one-day summit that brings together developers, researchers and students to discuss applied AI, cloud and modern web development. Includes a keynote, a panel, a hands-on Laravel workshop and a startup showcase.",
      location: "Grand Hall, Jakarta (sample data)", start_at: at(45, "08:30"), end_at: at(45, "17:00"), capacity: 500, poster_path: P + "tech-innovation-summit-2026.svg", is_featured: true,
      status: "approved", submitted_at: at(-20, "10:00"), reviewed_by: 1, reviewed_at: at(-19, "09:00"), review_note: null, created_at: at(-25, "10:00") },
    { id: 2, organizer_id: 2, category_id: 4, title: "UMKM Digital Marketing Workshop", slug: "umkm-digital-marketing-workshop",
      description: "A practical workshop for small business owners: learn the basics of digital marketing, plan social media content and take better product photos with just a smartphone.",
      location: "Co-working Space, Banda Aceh (sample data)", start_at: at(20, "09:00"), end_at: at(20, "15:00"), capacity: 60, poster_path: P + "umkm-digital-marketing-workshop.svg", is_featured: true,
      status: "approved", submitted_at: at(-15, "10:00"), reviewed_by: 1, reviewed_at: at(-14, "09:00"), review_note: null, created_at: at(-18, "10:00") },
    { id: 3, organizer_id: 2, category_id: 6, title: "Indonesia Hackathon 2026", slug: "indonesia-hackathon-2026",
      description: "A two-day programming competition. Teams build a working prototype, get feedback from mentors and pitch to a panel of judges on the final day.",
      location: "Innovation Lab, Bandung (sample data)", start_at: at(38, "09:00"), end_at: at(39, "17:00"), capacity: 200, poster_path: P + "indonesia-hackathon-2026.svg", is_featured: true,
      status: "approved", submitted_at: at(-22, "10:00"), reviewed_by: 1, reviewed_at: at(-21, "09:00"), review_note: null, created_at: at(-26, "10:00") },
    { id: 4, organizer_id: 2, category_id: 1, title: "Tech Innovation Day 2026", slug: "tech-innovation-day-2026",
      description: "A community technology day with a keynote on technology for campuses, a web basics workshop and a product demo showcase.",
      location: "Convention Hall, Banda Aceh (sample data)", start_at: at(-46, "09:00"), end_at: at(-46, "17:00"), capacity: 300, poster_path: P + "tech-innovation-day-2026.svg", is_featured: false,
      status: "approved", submitted_at: at(-80, "10:00"), reviewed_by: 1, reviewed_at: at(-79, "09:00"), review_note: null, created_at: at(-85, "10:00") },
    { id: 5, organizer_id: 3, category_id: 3, title: "Campus Creative Festival", slug: "campus-creative-festival",
      description: "A multi-day festival of student creativity: art exhibition, poster design contest, creative bazaar and acoustic music in the evening.",
      location: "Plaza Kampus (sample data)", start_at: at(-2, "10:00"), end_at: at(2, "21:00"), capacity: 1000, poster_path: P + "campus-creative-festival.svg", is_featured: true,
      status: "approved", submitted_at: at(-30, "10:00"), reviewed_by: 1, reviewed_at: at(-29, "09:00"), review_note: null, created_at: at(-35, "10:00") },
    { id: 6, organizer_id: 2, category_id: 2, title: "Aceh Youth Digital Summit", slug: "aceh-youth-digital-summit",
      description: "A summit for young people about digital literacy and careers in technology, with a talk and a career panel.",
      location: "Aula Utama, Banda Aceh (sample data)", start_at: at(59, "09:00"), end_at: at(59, "16:00"), capacity: 400, poster_path: P + "aceh-youth-digital-summit.svg", is_featured: false,
      status: "approved", submitted_at: at(-12, "10:00"), reviewed_by: 1, reviewed_at: at(-11, "09:00"), review_note: null, created_at: at(-14, "10:00") },
    { id: 7, organizer_id: 3, category_id: 5, title: "Charity & Community Day", slug: "charity-community-day",
      description: "A morning of community service: fun walk, book donation drive and a shared lunch for volunteers and neighbours.",
      location: "Lapangan Komunitas, Banda Aceh (sample data)", start_at: at(46, "08:00"), end_at: at(46, "13:00"), capacity: 500, poster_path: P + "charity-community-day.svg", is_featured: false,
      status: "approved", submitted_at: at(-10, "10:00"), reviewed_by: 1, reviewed_at: at(-9, "09:00"), review_note: null, created_at: at(-12, "10:00") },
    { id: 8, organizer_id: 3, category_id: 4, title: "Startup Networking Night", slug: "startup-networking-night",
      description: "An evening for founders, students and investors to meet, hear a short founders panel and network openly.",
      location: "Co-working Space, Medan (sample data)", start_at: at(101, "19:00"), end_at: at(101, "22:00"), capacity: 120, poster_path: P + "startup-networking-night.svg", is_featured: false,
      status: "pending_review", submitted_at: at(-3, "10:00"), reviewed_by: null, reviewed_at: null, review_note: null, created_at: at(-6, "10:00") },
    { id: 9, organizer_id: 2, category_id: 2, title: "UI/UX Design Workshop", slug: "ui-ux-design-workshop",
      description: "Hands-on workshop from wireframe to clickable prototype. Still being prepared by the organizer.",
      location: "Design Studio, Yogyakarta (sample data)", start_at: at(52, "13:00"), end_at: at(52, "17:00"), capacity: 40, poster_path: P + "ui-ux-design-workshop.svg", is_featured: false,
      status: "draft", submitted_at: null, reviewed_by: null, reviewed_at: null, review_note: null, created_at: at(-2, "10:00") },
    { id: 10, organizer_id: 3, category_id: 3, title: "Campus Innovation Expo", slug: "campus-innovation-expo",
      description: "An expo where student teams present research and product ideas to visitors and industry mentors.",
      location: "Gedung Serbaguna Kampus (sample data)", start_at: at(66, "09:00"), end_at: at(66, "16:00"), capacity: 800, poster_path: P + "campus-innovation-expo.svg", is_featured: false,
      status: "pending_review", submitted_at: at(-1, "14:00"), reviewed_by: null, reviewed_at: null, review_note: null, created_at: at(-4, "10:00") },
    { id: 11, organizer_id: 2, category_id: 4, title: "Digital Marketing Seminar", slug: "digital-marketing-seminar",
      description: "A seminar on current digital marketing trends for students and young professionals.",
      location: "Auditorium, Surabaya (sample data)", start_at: at(73, "09:30"), end_at: at(73, "12:30"), capacity: 150, poster_path: P + "digital-marketing-seminar.svg", is_featured: false,
      status: "rejected", submitted_at: at(-8, "10:00"), reviewed_by: 1, reviewed_at: at(-7, "11:00"),
      review_note: "Please add a complete schedule and at least one speaker, then submit again.", created_at: at(-9, "10:00") }
  ];
})();
