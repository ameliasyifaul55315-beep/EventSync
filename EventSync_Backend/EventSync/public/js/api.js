/* EventSync — api.js
   LAPISAN DATA. UI tidak pernah menyentuh localStorage langsung; UI hanya memanggil:
        API.get('/events', {query})   API.post('/events/3/register')   ...
   Mode 'local'  : request ditangani "server tiruan" di bawah (data di localStorage) — menggantikan Laravel + MySQL sementara.
   Mode 'remote' : request dikirim ke Laravel (ES_CONFIG.API_BASE) dengan token Bearer. UI tidak perlu diubah.

   Setiap handler di bawah = satu Controller action Laravel nanti. Aturan bisnis & pengecekan role di sini hanya SIMULASI;
   keamanan sebenarnya harus dilakukan di server Laravel (Policy, middleware, validasi, Hash). */
(function () {
  const C = window.ES_CONFIG;

  class ApiError extends Error {
    constructor(status, message, errors) { super(message); this.status = status; this.errors = errors || null; }
  }

  /* ---------- util ---------- */
  const pad = n => String(n).padStart(2, "0");
  const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const nowISO = () => toISO(new Date());
  const clone = o => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
  const slugify = s => String(s).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  /* Hash DUMMY (cyrb53) hanya agar password tidak tersimpan sebagai teks biasa di demo.
     BUKAN hashing yang aman. Laravel nanti memakai Hash::make() (bcrypt/argon). */
  function hash(str, seed = 0) {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507); h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507); h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  }
  const hashPw = (email, pw) => hash("eventsync-demo:" + email.toLowerCase() + ":" + pw);

  /* ---------- "database" (localStorage) ---------- */
  const TABLES = ["categories", "users", "events", "speakers", "schedules", "committees", "registrations"];
  let db = null;
  function seed() {
    const d = { tokens: {}, seq: {} };
    TABLES.forEach(t => { d[t] = clone(window.ES_SEED[t] || []); d.seq[t] = d[t].reduce((m, r) => Math.max(m, r.id), 0); });
    d.users.forEach(u => { u.password_hash = hashPw(u.email, C.DEMO_PASSWORD); });
    d.events.forEach(e => { e.deleted_at = null; });
    return d;
  }
  function load() {
    if (db) return db;
    try { db = JSON.parse(localStorage.getItem(C.STORAGE_KEY)); } catch (e) { db = null; }
    if (!db || !db.events) { db = seed(); save(); }
    return db;
  }
  function save() { try { localStorage.setItem(C.STORAGE_KEY, JSON.stringify(db)); } catch (e) { console.warn("Storage full or blocked", e); } }
  const nextId = t => (load().seq[t] = (load().seq[t] || 0) + 1);

  /* ---------- validasi (meniru Laravel validate()) ---------- */
  function validate(body, rules) {
    const errors = {};
    for (const [field, rule] of Object.entries(rules)) {
      const v = body[field]; const empty = v === undefined || v === null || String(v).trim() === "";
      for (const r of rule.split("|")) {
        const [name, arg] = r.split(":");
        if (errors[field]) break;
        if (name === "required" && empty) errors[field] = "This field is required.";
        else if (empty) continue;
        else if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors[field] = "Enter a valid email address.";
        else if (name === "min" && String(v).length < +arg) errors[field] = `Minimum ${arg} characters.`;
        else if (name === "max" && String(v).length > +arg) errors[field] = `Maximum ${arg} characters.`;
        else if (name === "integer" && !Number.isInteger(Number(v))) errors[field] = "Must be a whole number.";
        else if (name === "gte" && Number(v) < +arg) errors[field] = `Must be at least ${arg}.`;
        else if (name === "confirmed" && v !== body[field + "_confirmation"]) errors[field] = "Confirmation does not match.";
        else if (name === "in" && !arg.split(",").includes(String(v))) errors[field] = "Invalid value.";
      }
    }
    if (Object.keys(errors).length) throw new ApiError(422, "The given data was invalid.", errors);
  }

  /* ---------- resources (bentuk JSON yang dikembalikan; nanti = Laravel API Resource) ---------- */
  const lifecycle = e => {
    if (e.status !== "approved") return null;
    const n = new Date(), s = new Date(e.start_at), en = new Date(e.end_at);
    return n < s ? "upcoming" : n <= en ? "ongoing" : "completed";
  };
  const evRegs = e => load().registrations.filter(r => r.event_id === e.id);
  const activeCount = e => evRegs(e).filter(r => r.status !== "cancelled").length;
  const userPublic = u => u && ({ id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone, organization_name: u.organization_name, is_active: u.is_active, created_at: u.created_at });
  function eventRes(e, user) {
    const d = load(), c = activeCount(e), org = d.users.find(u => u.id === e.organizer_id);
    const mine = user && d.registrations.find(r => r.event_id === e.id && r.user_id === user.id);
    return { ...e, category: d.categories.find(x => x.id === e.category_id) || null,
      organizer: org ? { id: org.id, name: org.name, organization_name: org.organization_name } : null,
      lifecycle: lifecycle(e), registered_count: c,
      seats_left: e.capacity == null ? null : Math.max(0, e.capacity - c),
      is_full: e.capacity != null && c >= e.capacity,
      my_registration: mine ? { id: mine.id, status: mine.status, registered_at: mine.registered_at } : null };
  }
  const liveEvents = () => load().events.filter(e => !e.deleted_at);
  const isPublic = e => !e.deleted_at && e.status === "approved";
  const findEvent = key => liveEvents().find(e => String(e.id) === String(key) || e.slug === key);
  const sortSched = (a, b) => a.start_at.localeCompare(b.start_at) || a.sort_order - b.sort_order;

  function paginate(list, q) {
    const per = Math.max(1, +q.per_page || C.PER_PAGE), page = Math.max(1, +q.page || 1);
    const last = Math.max(1, Math.ceil(list.length / per));
    return { data: list.slice((page - 1) * per, page * per), meta: { page: Math.min(page, last), per_page: per, total: list.length, last_page: last } };
  }

  /* ---------- guard (meniru middleware auth + role + Policy) ---------- */
  const need = (user, roles) => {
    if (!user) throw new ApiError(401, "Unauthenticated.");
    if (roles && !roles.includes(user.role)) throw new ApiError(403, "You are not allowed to do this.");
    return user;
  };
  function ownEvent(user, key, { allowLocked = false } = {}) {
    need(user, ["organizer", "admin"]);
    const e = findEvent(key);
    if (!e) throw new ApiError(404, "Event not found.");
    if (user.role === "organizer" && e.organizer_id !== user.id) throw new ApiError(403, "This event belongs to another organizer.");
    if (!allowLocked && user.role === "organizer" && e.status === "pending_review")
      throw new ApiError(409, "This event is locked while it is being reviewed by an admin.");
    return e;
  }

  /* ---------- handlers (satu per Controller action) ---------- */
  const H = [];
  const route = (method, path, fn) => H.push({ method, fn, re: new RegExp("^" + path.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "$") });

  /* AUTH */
  route("POST", "/auth/login", ({ body }) => {
    validate(body, { email: "required|email", password: "required" });
    const d = load(), u = d.users.find(x => x.email.toLowerCase() === body.email.toLowerCase());
    if (!u || u.password_hash !== hashPw(u.email, body.password)) throw new ApiError(422, "The given data was invalid.", { email: "These credentials do not match our records." });
    if (!u.is_active) throw new ApiError(403, "Your account has been deactivated. Please contact an admin.");
    const token = "local-" + u.id + "-" + Math.random().toString(36).slice(2, 12);
    d.tokens[token] = u.id;
    return { token, user: userPublic(u) };
  });
  route("POST", "/auth/register", ({ body }) => {          // registrasi publik SELALU role = user
    validate(body, { name: "required|min:2|max:100", email: "required|email|max:150", password: "required|min:8|confirmed" });
    const d = load();
    if (d.users.some(u => u.email.toLowerCase() === body.email.toLowerCase())) throw new ApiError(422, "The given data was invalid.", { email: "This email is already registered." });
    const u = { id: nextId("users"), name: body.name.trim(), email: body.email.trim(), role: "user", phone: null, organization_name: null, is_active: true, created_at: nowISO() };
    u.password_hash = hashPw(u.email, body.password);
    d.users.push(u);
    return { message: "Registration successful. Please log in.", user: userPublic(u) };
  });
  route("POST", "/auth/logout", ({ token }) => { delete load().tokens[token]; return { message: "Logged out." }; });
  route("GET", "/auth/me", ({ user }) => ({ data: userPublic(need(user)) }));
  route("PUT", "/profile", ({ user, body }) => {
    need(user); validate(body, { name: "required|min:2|max:100", phone: "max:20" });
    const u = load().users.find(x => x.id === user.id); u.name = body.name.trim(); u.phone = body.phone ? body.phone.trim() : null;
    return { data: userPublic(u), message: "Profile updated." };
  });
  route("PUT", "/profile/password", ({ user, body }) => {
    need(user); validate(body, { current_password: "required", password: "required|min:8|confirmed" });
    const u = load().users.find(x => x.id === user.id);
    if (u.password_hash !== hashPw(u.email, body.current_password)) throw new ApiError(422, "The given data was invalid.", { current_password: "Current password is incorrect." });
    u.password_hash = hashPw(u.email, body.password);
    return { message: "Password updated." };
  });

  /* PUBLIC */
  route("GET", "/categories", () => {
    const d = load();
    return { data: d.categories.map(c => ({ ...c, events_count: liveEvents().filter(e => isPublic(e) && e.category_id === c.id).length })) };
  });
  route("GET", "/events", ({ query: q, user }) => {
    let list = liveEvents().filter(isPublic).map(e => eventRes(e, user));
    if (q.q) { const s = q.q.toLowerCase(); list = list.filter(e => [e.title, e.location, e.description, e.category?.name, e.organizer?.name].join(" ").toLowerCase().includes(s)); }
    if (q.category) list = list.filter(e => e.category && (e.category.slug === q.category || String(e.category.id) === String(q.category)));
    if (q.date) list = list.filter(e => e.start_at.slice(0, 10) <= q.date && e.end_at.slice(0, 10) >= q.date);
    if (q.lifecycle) list = list.filter(e => e.lifecycle === q.lifecycle);
    if (q.featured) list = list.filter(e => e.is_featured);
    const rank = { ongoing: 0, upcoming: 1, completed: 2 };
    const sorts = {
      soonest: (a, b) => rank[a.lifecycle] - rank[b.lifecycle] || (a.lifecycle === "completed" ? b.start_at.localeCompare(a.start_at) : a.start_at.localeCompare(b.start_at)),
      newest: (a, b) => b.start_at.localeCompare(a.start_at), title: (a, b) => a.title.localeCompare(b.title)
    };
    list.sort(sorts[q.sort] || sorts.soonest);
    return q.limit ? { data: list.slice(0, +q.limit), meta: { total: list.length } } : paginate(list, q);
  });
  route("GET", "/events/:key", ({ params, user }) => {
    const e = findEvent(params.key);
    const canSee = e && (isPublic(e) || (user && (user.role === "admin" || (user.role === "organizer" && e.organizer_id === user.id))));
    if (!canSee) throw new ApiError(404, "Event not found.");
    const d = load(), r = eventRes(e, user);
    r.schedules = d.schedules.filter(s => s.event_id === e.id).sort(sortSched).map(s => ({ ...s, speaker: d.speakers.find(x => x.id === s.speaker_id) || null }));
    r.speakers = d.speakers.filter(s => s.event_id === e.id);
    r.committees = d.committees.filter(c => c.event_id === e.id);
    return { data: r };
  });
  route("GET", "/schedules", ({ query: q }) => {
    const d = load();
    let list = d.schedules.map(s => ({ s, e: liveEvents().find(e => e.id === s.event_id) })).filter(x => x.e && isPublic(x.e));
    if (q.event) list = list.filter(x => String(x.e.id) === String(q.event));
    if (q.category) list = list.filter(x => d.categories.find(c => c.id === x.e.category_id)?.slug === q.category);
    if (q.date) list = list.filter(x => x.s.start_at.slice(0, 10) === q.date);
    list.sort((a, b) => sortSched(a.s, b.s));
    return { data: list.map(x => ({ ...x.s, speaker: d.speakers.find(p => p.id === x.s.speaker_id) || null, event: { id: x.e.id, title: x.e.title, slug: x.e.slug, category: d.categories.find(c => c.id === x.e.category_id), lifecycle: lifecycle(x.e) } })) };
  });
  route("GET", "/speakers", ({ query: q }) => {
    const d = load();
    let list = d.speakers.map(s => ({ s, e: liveEvents().find(e => e.id === s.event_id) })).filter(x => x.e && isPublic(x.e));
    if (q.event) list = list.filter(x => String(x.e.id) === String(q.event));
    return { data: list.map(x => ({ ...x.s, event: { id: x.e.id, title: x.e.title, slug: x.e.slug } })) };
  });

  /* USER: registrasi event */
  route("POST", "/events/:id/register", ({ params, user }) => {
    need(user, ["user"]);
    const e = findEvent(params.id);
    if (!e || !isPublic(e)) throw new ApiError(404, "Event not found.");
    if (new Date() >= new Date(e.start_at)) throw new ApiError(422, "Registration is closed because this event has already started.");
    const d = load(), existing = d.registrations.find(r => r.event_id === e.id && r.user_id === user.id);
    if (existing && existing.status !== "cancelled") throw new ApiError(422, "You are already registered for this event.");
    if (e.capacity != null && activeCount(e) >= e.capacity) throw new ApiError(422, "Sorry, this event is full.");
    if (existing) { existing.status = "registered"; existing.cancelled_at = null; existing.registered_at = nowISO(); }   // daftar ulang = baris yang sama (UNIQUE event_id,user_id)
    else d.registrations.push({ id: nextId("registrations"), event_id: e.id, user_id: user.id, status: "registered", registered_at: nowISO(), cancelled_at: null });
    return { message: "You are registered for this event.", data: eventRes(e, user) };
  });
  route("DELETE", "/events/:id/register", ({ params, user }) => {
    need(user, ["user"]);
    const e = findEvent(params.id), r = e && load().registrations.find(x => x.event_id === e.id && x.user_id === user.id && x.status === "registered");
    if (!r) throw new ApiError(404, "No active registration found.");
    if (new Date() >= new Date(e.start_at)) throw new ApiError(422, "You can only cancel before the event starts.");
    r.status = "cancelled"; r.cancelled_at = nowISO();                  // baris tidak dihapus -> riwayat tetap ada
    return { message: "Registration cancelled.", data: eventRes(e, user) };
  });
  route("GET", "/my-events", ({ user }) => {
    need(user, ["user"]);
    const list = load().registrations.filter(r => r.user_id === user.id).map(r => {
      const e = liveEvents().find(x => x.id === r.event_id); return e ? { ...r, event: eventRes(e, user) } : null;
    }).filter(Boolean).sort((a, b) => b.event.start_at.localeCompare(a.event.start_at));
    return { data: list };
  });

  /* ORGANIZER */
  const eventRules = { title: "required|max:150", category_id: "required", description: "required", location: "required|max:200", start_at: "required", end_at: "required", capacity: "integer|gte:1" };
  function checkEventBody(body) {
    validate(body, eventRules);
    if (!load().categories.some(c => c.id === Number(body.category_id))) throw new ApiError(422, "The given data was invalid.", { category_id: "Choose a valid category." });
    if (new Date(body.end_at) <= new Date(body.start_at)) throw new ApiError(422, "The given data was invalid.", { end_at: "End must be after start." });
  }
  const applyEventBody = (e, b) => Object.assign(e, {
    title: b.title.trim(), category_id: Number(b.category_id), description: b.description.trim(), location: b.location.trim(),
    start_at: b.start_at, end_at: b.end_at, capacity: b.capacity === null || b.capacity === "" || b.capacity === undefined ? null : Number(b.capacity),
    poster_path: b.poster_path || e.poster_path || "assets/images/poster-tech-innovation-day-2026.svg" });
  const uniqueSlug = (title, selfId) => { let s = slugify(title) || "event", n = s, i = 2; while (load().events.some(e => e.slug === n && e.id !== selfId)) n = s + "-" + i++; return n; };

  route("GET", "/organizer/dashboard", ({ user }) => {
    need(user, ["organizer"]);
    const mine = liveEvents().filter(e => e.organizer_id === user.id), res = mine.map(e => eventRes(e, user));
    return { data: {
      stats: { total_events: mine.length, published_events: mine.filter(e => e.status === "approved").length, pending_events: mine.filter(e => e.status === "pending_review").length,
               draft_events: mine.filter(e => e.status === "draft" || e.status === "rejected").length, total_participants: res.reduce((s, e) => s + e.registered_count, 0) },
      events: res.sort((a, b) => b.start_at.localeCompare(a.start_at)) } };
  });
  route("GET", "/organizer/events", ({ user, query: q }) => {
    need(user, ["organizer"]);
    let list = liveEvents().filter(e => e.organizer_id === user.id).map(e => eventRes(e, user));
    if (q.status) list = list.filter(e => e.status === q.status);
    if (q.q) list = list.filter(e => e.title.toLowerCase().includes(q.q.toLowerCase()));
    return { data: list.sort((a, b) => b.start_at.localeCompare(a.start_at)) };
  });
  route("POST", "/organizer/events", ({ user, body }) => {
    need(user, ["organizer"]); checkEventBody(body);
    const e = { id: nextId("events"), organizer_id: user.id, slug: uniqueSlug(body.title), is_featured: false, status: "draft", submitted_at: null, reviewed_by: null, reviewed_at: null, review_note: null, created_at: nowISO(), deleted_at: null };
    applyEventBody(e, body); load().events.push(e);
    return { message: "Event saved as draft.", data: eventRes(e, user) };
  });
  route("PUT", "/organizer/events/:id", ({ user, params, body }) => {
    const e = ownEvent(user, params.id); checkEventBody(body);
    if (e.status === "cancelled") throw new ApiError(409, "A cancelled event can no longer be edited.");
    applyEventBody(e, body); e.slug = uniqueSlug(e.title, e.id);
    if (e.status === "rejected") e.status = "draft";            // diedit setelah ditolak -> kembali ke draft
    return { message: "Event updated.", data: eventRes(e, user) };
  });
  const removeEvent = (user, e) => {
    if (e.status === "approved" && activeCount(e) > 0) throw new ApiError(422, "This event already has registrants. Cancel the event instead of deleting it.");
    e.deleted_at = nowISO();                                    // soft delete
    return { message: "Event deleted." };
  };
  route("DELETE", "/organizer/events/:id", ({ user, params }) => removeEvent(user, ownEvent(user, params.id)));
  route("POST", "/organizer/events/:id/submit", ({ user, params }) => {
    const e = ownEvent(user, params.id);
    if (!["draft", "rejected"].includes(e.status)) throw new ApiError(422, "Only draft or rejected events can be submitted.");
    e.status = "pending_review"; e.submitted_at = nowISO(); e.reviewed_by = null; e.reviewed_at = null; e.review_note = null;
    return { message: "Event submitted for review.", data: eventRes(e, user) };
  });
  route("POST", "/events/:id/cancel", ({ user, params }) => {
    const e = ownEvent(user, params.id);
    if (e.status !== "approved") throw new ApiError(422, "Only approved events can be cancelled.");
    e.status = "cancelled"; return { message: "Event cancelled.", data: eventRes(e, user) };
  });

  /* Schedule / Speaker / Committee: dipakai Organizer (miliknya) dan Admin (moderasi) */
  const child = {
    schedules: { table: "schedules", rules: { title: "required|max:150", start_at: "required", end_at: "required" },
      check: b => { if (new Date(b.end_at) <= new Date(b.start_at)) throw new ApiError(422, "The given data was invalid.", { end_at: "End must be after start." }); },
      fields: b => ({ title: b.title.trim(), session_name: b.session_name || null, description: b.description || null, location: b.location || null,
        person_in_charge: b.person_in_charge || null, speaker_id: b.speaker_id ? Number(b.speaker_id) : null, start_at: b.start_at, end_at: b.end_at }) },
    speakers: { table: "speakers", rules: { name: "required|max:120", title: "max:120", role: "required|max:60", topic: "max:150" }, check() {},
      fields: b => ({ name: b.name.trim(), title: b.title || null, role: (b.role || "Speaker").trim(), topic: b.topic || null, bio: b.bio || null, photo: b.photo || "" }) },
    committees: { table: "committees", rules: { name: "required|max:120", role: "required|max:60" }, check() {},
      fields: b => ({ name: b.name.trim(), role: b.role.trim(), organization: b.organization || null, contact: b.contact || null }) }
  };
  Object.entries(child).forEach(([key, cfg]) => {
    route("GET", `/events/:id/${key}`, ({ user, params }) => {
      const e = ownEvent(user, params.id, { allowLocked: true }), d = load();
      let list = d[cfg.table].filter(x => x.event_id === e.id);
      if (key === "schedules") list = list.sort(sortSched).map(s => ({ ...s, speaker: d.speakers.find(p => p.id === s.speaker_id) || null }));
      return { data: list };
    });
    route("POST", `/events/:id/${key}`, ({ user, params, body }) => {
      const e = ownEvent(user, params.id); validate(body, cfg.rules); cfg.check(body);
      const row = { id: nextId(cfg.table), event_id: e.id, ...cfg.fields(body) };
      if (key === "schedules") row.sort_order = load().schedules.filter(s => s.event_id === e.id).length;
      load()[cfg.table].push(row); return { message: "Saved.", data: row };
    });
    route("PUT", `/events/:id/${key}/:rid`, ({ user, params, body }) => {
      const e = ownEvent(user, params.id); validate(body, cfg.rules); cfg.check(body);
      const row = load()[cfg.table].find(x => x.id === +params.rid && x.event_id === e.id);
      if (!row) throw new ApiError(404, "Not found."); Object.assign(row, cfg.fields(body)); return { message: "Saved.", data: row };
    });
    route("DELETE", `/events/:id/${key}/:rid`, ({ user, params }) => {
      const e = ownEvent(user, params.id), d = load(), i = d[cfg.table].findIndex(x => x.id === +params.rid && x.event_id === e.id);
      if (i < 0) throw new ApiError(404, "Not found.");
      d[cfg.table].splice(i, 1);
      if (key === "speakers") d.schedules.forEach(s => { if (s.speaker_id === +params.rid) s.speaker_id = null; });   // FK ON DELETE SET NULL
      return { message: "Deleted." };
    });
  });
  const participantRows = (events, q) => {
    const d = load(); let list = [];
    events.forEach(e => d.registrations.filter(r => r.event_id === e.id).forEach(r => {
      const u = d.users.find(x => x.id === r.user_id); list.push({ ...r, user: { id: u.id, name: u.name, email: u.email }, event: { id: e.id, title: e.title } }); }));
    if (q.event) list = list.filter(r => String(r.event_id) === String(q.event));
    if (q.status) list = list.filter(r => r.status === q.status);
    if (q.q) { const s = q.q.toLowerCase(); list = list.filter(r => (r.user.name + " " + r.user.email).toLowerCase().includes(s)); }
    return list.sort((a, b) => b.registered_at.localeCompare(a.registered_at));
  };
  route("GET", "/organizer/participants", ({ user, query }) => { need(user, ["organizer"]); return { data: participantRows(liveEvents().filter(e => e.organizer_id === user.id), query) }; });
  route("GET", "/events/:id/participants", ({ user, params, query }) => { const e = ownEvent(user, params.id, { allowLocked: true }); return { data: participantRows([e], query) }; });

  /* ADMIN */
  route("GET", "/admin/dashboard", ({ user }) => {
    need(user, ["admin"]); const d = load(), evs = liveEvents();
    return { data: {
      stats: { total_users: d.users.length, total_organizers: d.users.filter(u => u.role === "organizer").length, total_events: evs.length,
               pending_events: evs.filter(e => e.status === "pending_review").length, total_registrations: d.registrations.filter(r => r.status !== "cancelled").length },
      pending: evs.filter(e => e.status === "pending_review").sort((a, b) => a.submitted_at.localeCompare(b.submitted_at)).map(e => eventRes(e, user)),
      by_status: ["draft", "pending_review", "approved", "rejected", "cancelled"].map(s => ({ status: s, count: evs.filter(e => e.status === s).length })),
      by_category: d.categories.map(c => ({ name: c.name, color: c.color, registrations: evs.filter(e => e.category_id === c.id).reduce((n, e) => n + activeCount(e), 0) })) } };
  });
  route("GET", "/admin/users", ({ user, query: q }) => {
    need(user, ["admin"]); let list = load().users.map(userPublic);
    if (q.role) list = list.filter(u => u.role === q.role);
    if (q.q) list = list.filter(u => (u.name + " " + u.email).toLowerCase().includes(q.q.toLowerCase()));
    return { data: list.map(u => ({ ...u, events_count: liveEvents().filter(e => e.organizer_id === u.id).length })) };
  });
  const userBody = (b, id) => {
    validate(b, { name: "required|min:2|max:100", email: "required|email|max:150", role: "required|in:user,organizer,admin" });
    if (load().users.some(u => u.email.toLowerCase() === b.email.toLowerCase() && u.id !== id)) throw new ApiError(422, "The given data was invalid.", { email: "This email is already registered." });
  };
  route("POST", "/admin/users", ({ user, body }) => {
    need(user, ["admin"]); userBody(body); validate(body, { password: "required|min:8" });
    const u = { id: nextId("users"), name: body.name.trim(), email: body.email.trim(), role: body.role, phone: null, organization_name: body.organization_name || null, is_active: true, created_at: nowISO() };
    u.password_hash = hashPw(u.email, body.password); load().users.push(u); return { message: "User created.", data: userPublic(u) };
  });
  route("PUT", "/admin/users/:id", ({ user, params, body }) => {
    need(user, ["admin"]); const u = load().users.find(x => x.id === +params.id); if (!u) throw new ApiError(404, "User not found.");
    userBody(body, u.id);
    if (u.id === user.id && body.role !== "admin") throw new ApiError(422, "You cannot remove your own admin role.");
    Object.assign(u, { name: body.name.trim(), email: body.email.trim(), role: body.role, organization_name: body.organization_name || null });
    if (body.password) { validate(body, { password: "min:8" }); u.password_hash = hashPw(u.email, body.password); }
    return { message: "User updated.", data: userPublic(u) };
  });
  route("POST", "/admin/users/:id/toggle", ({ user, params }) => {
    need(user, ["admin"]); const u = load().users.find(x => x.id === +params.id); if (!u) throw new ApiError(404, "User not found.");
    if (u.id === user.id) throw new ApiError(422, "You cannot deactivate your own account.");
    u.is_active = !u.is_active; return { message: u.is_active ? "Account activated." : "Account deactivated.", data: userPublic(u) };
  });
  route("DELETE", "/admin/users/:id", ({ user, params }) => {
    need(user, ["admin"]); const d = load(), u = d.users.find(x => x.id === +params.id); if (!u) throw new ApiError(404, "User not found.");
    if (u.id === user.id) throw new ApiError(422, "You cannot delete your own account.");
    if (d.events.some(e => e.organizer_id === u.id)) throw new ApiError(422, "This user still owns events (FK RESTRICT). Deactivate the account instead.");
    d.users = d.users.filter(x => x.id !== u.id); d.registrations = d.registrations.filter(r => r.user_id !== u.id);   // FK CASCADE
    return { message: "User deleted." };
  });
  route("GET", "/admin/organizers", ({ user }) => {
    need(user, ["admin"]);
    return { data: load().users.filter(u => u.role === "organizer").map(u => ({ ...userPublic(u), events_count: liveEvents().filter(e => e.organizer_id === u.id).length })) };
  });
  const catBody = (b, id) => {
    validate(b, { name: "required|max:80", description: "max:255", color: "required" });
    if (load().categories.some(c => c.name.toLowerCase() === b.name.trim().toLowerCase() && c.id !== id)) throw new ApiError(422, "The given data was invalid.", { name: "This category already exists." });
  };
  route("POST", "/admin/categories", ({ user, body }) => {
    need(user, ["admin"]); catBody(body);
    const c = { id: nextId("categories"), name: body.name.trim(), slug: slugify(body.name), description: body.description || null, color: body.color };
    load().categories.push(c); return { message: "Category created.", data: c };
  });
  route("PUT", "/admin/categories/:id", ({ user, params, body }) => {
    need(user, ["admin"]); const c = load().categories.find(x => x.id === +params.id); if (!c) throw new ApiError(404, "Category not found.");
    catBody(body, c.id); Object.assign(c, { name: body.name.trim(), slug: slugify(body.name), description: body.description || null, color: body.color });
    return { message: "Category updated.", data: c };
  });
  route("DELETE", "/admin/categories/:id", ({ user, params }) => {
    need(user, ["admin"]); const d = load(), c = d.categories.find(x => x.id === +params.id); if (!c) throw new ApiError(404, "Category not found.");
    if (d.events.some(e => e.category_id === c.id && !e.deleted_at)) throw new ApiError(422, "This category still has events and cannot be deleted (FK RESTRICT).");
    d.categories = d.categories.filter(x => x.id !== c.id); return { message: "Category deleted." };
  });
  route("GET", "/admin/events", ({ user, query: q }) => {
    need(user, ["admin"]); let list = liveEvents().map(e => eventRes(e, user));
    if (q.status) list = list.filter(e => e.status === q.status);
    if (q.category) list = list.filter(e => String(e.category_id) === String(q.category));
    if (q.organizer) list = list.filter(e => String(e.organizer_id) === String(q.organizer));
    if (q.q) list = list.filter(e => e.title.toLowerCase().includes(q.q.toLowerCase()));
    return { data: list.sort((a, b) => (b.submitted_at || b.created_at).localeCompare(a.submitted_at || a.created_at)) };
  });
  route("PUT", "/admin/events/:id", ({ user, params, body }) => {
    need(user, ["admin"]); const e = findEvent(params.id); if (!e) throw new ApiError(404, "Event not found.");
    validate(body, { title: "required|max:150", category_id: "required", location: "required|max:200", capacity: "integer|gte:1" });
    Object.assign(e, { title: body.title.trim(), category_id: Number(body.category_id), location: body.location.trim(), is_featured: !!body.is_featured,
      capacity: body.capacity === null || body.capacity === "" ? null : Number(body.capacity) });
    e.slug = uniqueSlug(e.title, e.id); return { message: "Event updated.", data: eventRes(e, user) };
  });
  route("DELETE", "/admin/events/:id", ({ user, params }) => { need(user, ["admin"]); const e = findEvent(params.id); if (!e) throw new ApiError(404, "Event not found."); return removeEvent(user, e); });
  const review = (user, params, status, note) => {
    need(user, ["admin"]); const e = findEvent(params.id); if (!e) throw new ApiError(404, "Event not found.");
    if (e.status !== "pending_review") throw new ApiError(422, "Only events with status pending_review can be reviewed.");
    e.status = status; e.reviewed_by = user.id; e.reviewed_at = nowISO(); e.review_note = note || null; return e;
  };
  route("POST", "/admin/events/:id/approve", ({ user, params, body }) => ({ message: "Event approved and published.", data: eventRes(review(user, params, "approved", body.review_note), user) }));
  route("POST", "/admin/events/:id/reject", ({ user, params, body }) => {
    validate(body, { review_note: "required|min:5" });          // alasan penolakan wajib
    return { message: "Event rejected.", data: eventRes(review(user, params, "rejected", body.review_note), user) };
  });

  /* ---------- transport ---------- */
  const readAuth = () => { try { return JSON.parse(localStorage.getItem(C.AUTH_KEY) || sessionStorage.getItem(C.AUTH_KEY) || "null"); } catch (e) { return null; } };

  async function localRequest(method, path, { query = {}, body = null } = {}) {
    if (!window.ES_SEED || !window.ES_SEED.events) throw new ApiError(500, "Local demo mode needs data/*.js (not included in the Laravel build). Use API_MODE = 'remote'.");
    load(); await new Promise(r => setTimeout(r, 40));          // simulasi latensi jaringan
    const auth = readAuth(), uid = auth && load().tokens[auth.token];
    const user = uid ? load().users.find(u => u.id === uid && u.is_active) : null;
    for (const h of H) {
      if (h.method !== method) continue;
      const m = h.re.exec(path); if (!m) continue;
      try { const out = h.fn({ user, token: auth && auth.token, params: m.groups || {}, query: query || {}, body: clone(body) || {} }); save(); return clone(out); }
      catch (e) { if (e instanceof ApiError) throw e; console.error(e); throw new ApiError(500, "Server error: " + e.message); }
    }
    throw new ApiError(404, `No route for ${method} ${path}`);
  }
  async function remoteRequest(method, path, { query = {}, body = null } = {}) {
    const auth = readAuth(), qs = new URLSearchParams(Object.entries(query || {}).filter(([, v]) => v !== "" && v != null)).toString();
    const base = C.API_BASE === "auto" ? (document.body.dataset.root || "./") + "api" : C.API_BASE;
    let res;
    try {
      res = await fetch(base + path + (qs ? "?" + qs : ""), { method,
        headers: { Accept: "application/json", "Content-Type": "application/json", ...(auth ? { Authorization: "Bearer " + auth.token } : {}) },
        body: body && method !== "GET" ? JSON.stringify(body) : undefined });
    } catch (e) { throw new ApiError(0, "Cannot reach the server. Check your connection and try again."); }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, json.message || res.statusText, json.errors);
    return json;
  }
  const request = (m, p, o) => (C.API_MODE === "remote" ? remoteRequest : localRequest)(m, p, o);

  window.API = {
    ApiError, request, mode: C.API_MODE,
    get: (p, query) => request("GET", p, { query }),
    post: (p, body) => request("POST", p, { body }),
    put: (p, body) => request("PUT", p, { body }),
    del: p => request("DELETE", p),
    reset() { db = null; localStorage.removeItem(C.STORAGE_KEY); localStorage.removeItem(C.AUTH_KEY); sessionStorage.removeItem(C.AUTH_KEY); }
  };
})();
