/* EventSync — events.js
   Halaman publik: Home, Event List, Event Detail (+ registrasi), Schedule, Speakers.
   Nanti di Laravel: tiap halaman = satu view Blade; panggilan API.get(...) = query di Controller. */
(function () {
  const esc = ES.esc;
  const personOf = s => (s.speaker ? s.speaker.name : s.person_in_charge || "");

  /* ---------- HOME ---------- */
  ES.pages.home = async app => {
    const u = Auth.user();
    const [feat, upc, cats, all, spk] = await Promise.all([API.get("/events", { featured: 1, limit: 3 }), API.get("/events", { lifecycle: "upcoming", limit: 4 }),
      API.get("/categories"), API.get("/events", { limit: 100 }), API.get("/speakers")]);
    const hero = feat.data[0] || upc.data[0];
    app.innerHTML = `<section class="hero"><div class="container"><div>
        <span class="eyebrow"><i></i>Event Management &amp; Scheduling</span>
        <h1>Find Your Next <em>Event</em></h1>
        <p class="lead">Discover seminars, workshops, conferences and competitions — see the schedule, meet the speakers and register in a few clicks.</p>
        <form class="hero-search" action="${ES.url("pages/events.html")}" role="search"><input name="q" placeholder="Search events, locations, categories…" aria-label="Search events"><button class="btn btn-primary" type="submit">${ES.icon("search", 18)} Search</button></form>
        <div class="cta"><a class="btn btn-ghost" href="${ES.url("pages/events.html")}">Explore Events</a>${u ? `<a class="btn btn-ghost" href="${ES.homeFor(u.role)}">Go to Dashboard</a>` : `<a class="btn btn-ghost" href="${ES.url("pages/register.html")}">Create Account</a>`}</div></div>
      ${hero ? `<div class="hero-visual"><a class="hv-main" href="${ES.detailUrl(hero)}">${ES.img(hero)}<div class="hv-cap glass"><small>${esc(hero.category?.name || "")} · ${esc(ES.dateRange(hero))}</small><b>${esc(hero.title)}</b></div></a>
        <div class="float f1 glass"><span class="fl-ic">${ES.icon("calendar", 20)}</span><div><b>${all.meta.total}</b><span class="l">Events</span></div></div>
        <div class="float f2 glass"><span class="fl-ic">${ES.icon("mic", 20)}</span><div><b>${spk.data.length}</b><span class="l">Speakers</span></div></div></div>` : ""}</div></section>
      <div class="container"><div class="strip">
        <div class="stat"><b>${all.meta.total}</b><span>Published events</span></div><div class="stat"><b>${all.data.filter(e => e.lifecycle === "upcoming").length}</b><span>Upcoming</span></div>
        <div class="stat"><b>${cats.data.length}</b><span>Categories</span></div><div class="stat"><b>${spk.data.length}</b><span>Speakers</span></div></div></div>
      <section class="section"><div class="container"><div class="section-head"><div><span class="kicker">Don't miss</span><h2>Featured Events</h2></div><a class="btn btn-ghost btn-sm" href="${ES.url("pages/events.html")}">All events ${ES.icon("right", 16)}</a></div>
        <div class="grid">${feat.data.map(ES.eventCard).join("") || ES.empty("No featured events yet.")}</div></div></section>
      <section class="section sec-white"><div class="container"><div class="section-head"><div><span class="kicker">Coming soon</span><h2>Upcoming Events</h2></div></div>
        <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">${upc.data.map(ES.eventCard).join("") || ES.empty("No upcoming events.")}</div></div></section>
      <section class="section"><div class="container"><div class="section-head"><div><span class="kicker">Browse by topic</span><h2>Categories</h2></div></div>
        <div class="cats">${cats.data.map(c => `<a class="cat-tile" href="${ES.url("pages/events.html")}?category=${esc(c.slug)}" style="background:linear-gradient(160deg,${esc(c.color)},#3B176D)"><div><b>${esc(c.name)}</b><span>${c.events_count} event${c.events_count === 1 ? "" : "s"}</span></div></a>`).join("")}</div></div></section>
      <section class="section sec-soft" style="padding-top:0"><div class="container"><div class="section-head"><div><span class="kicker">How it works</span><h2>From idea to attendance</h2></div></div>
        <div class="steps"><div class="step"><div class="num">1</div><h3>Organizers create</h3><p>Organizers build an event with its schedule and speakers, then submit it for review.</p></div>
        <div class="step"><div class="num">2</div><h3>Admins review</h3><p>Admins check each submission and approve or reject it with a note.</p></div>
        <div class="step"><div class="num">3</div><h3>Participants register</h3><p>Approved events appear publicly. Participants register, track them in My Events and cancel if plans change.</p></div></div></div></section>
      <section class="cta-band"><div class="container"><h2>Ready to find your next event?</h2><p>Browse upcoming events or create a free account to start registering.</p>
        <div class="cta"><a class="btn btn-white" href="${ES.url("pages/events.html")}">Explore Events</a>${u ? "" : `<a class="btn btn-outline-w" href="${ES.url("pages/register.html")}">Register</a>`}</div></div></section>`;
  };

  /* ---------- EVENT LIST (search + filter) ---------- */
  ES.pages.events = async app => {
    const cats = (await API.get("/categories")).data, st = { q: "", category: "", date: "", lifecycle: "", sort: "soonest", page: 1, ...ES.q() };
    st.page = +st.page || 1;
    app.innerHTML = `<section class="page-head"><div class="container"><span class="kicker">Discover</span><h1>Events</h1><p>Search and filter published events by category, date and status.</p></div></section>
      <div class="container"><form class="filters" id="flt" role="search" onsubmit="return false">
        <div class="field"><label for="q">Search</label><input id="q" type="search" placeholder="Title, location, organizer…" value="${esc(st.q)}"></div>
        <div class="field"><label for="category">Category</label><select id="category"><option value="">All categories</option>${cats.map(c => `<option value="${esc(c.slug)}" ${c.slug === st.category ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>
        <div class="field"><label for="date">Date</label><input id="date" type="date" value="${esc(st.date)}"></div>
        <div class="field"><label for="lifecycle">Status</label><select id="lifecycle">${[["", "Any status"], ["upcoming", "Upcoming"], ["ongoing", "Ongoing"], ["completed", "Completed"]].map(o => `<option value="${o[0]}" ${o[0] === st.lifecycle ? "selected" : ""}>${o[1]}</option>`).join("")}</select></div>
        <div class="field"><label for="sort">Sort by</label><select id="sort">${[["soonest", "Soonest first"], ["newest", "Latest date"], ["title", "Title A–Z"]].map(o => `<option value="${o[0]}" ${o[0] === st.sort ? "selected" : ""}>${o[1]}</option>`).join("")}</select></div>
        <button type="button" class="btn btn-ghost" id="clr">Reset</button></form>
      <div class="count" id="cnt" aria-live="polite"></div><div class="grid" id="grid"></div><div id="pg"></div></div>`;
    const grid = ES.$("#grid", app), cnt = ES.$("#cnt", app), pg = ES.$("#pg", app);
    async function load() {
      grid.innerHTML = ES.loading();
      const r = await API.get("/events", { q: st.q, category: st.category, date: st.date, lifecycle: st.lifecycle, sort: st.sort, page: st.page });
      ES.setQ(st); st.page = r.meta.page;
      cnt.textContent = r.meta.total ? `Showing ${r.data.length} of ${r.meta.total} event${r.meta.total === 1 ? "" : "s"}` : "";
      grid.style.display = r.data.length ? "" : "block";
      grid.innerHTML = r.data.length ? r.data.map(ES.eventCard).join("") : ES.empty("No events match your filters. Try a different keyword, category or date.", "search");
      pg.innerHTML = ES.pager(r.meta);
    }
    const bind = (id, key) => ES.$("#" + id, app).addEventListener(key === "q" ? "input" : "change", ES.debounce(ev => { st[id] = ev.target.value; st.page = 1; load(); }, key === "q" ? 250 : 0));
    ["q", "category", "date", "lifecycle", "sort"].forEach(id => bind(id, id));
    ES.$("#clr", app).addEventListener("click", () => { Object.assign(st, { q: "", category: "", date: "", lifecycle: "", sort: "soonest", page: 1 }); ["q", "category", "date", "lifecycle", "sort"].forEach(i => (ES.$("#" + i, app).value = st[i])); load(); });
    ES.on(pg, "click", "[data-page]", b => { st.page = +b.dataset.page; load().then(() => scrollTo({ top: 0, behavior: "smooth" })); });
    await load();
  };

  /* ---------- EVENT DETAIL (+ register / cancel) ---------- */
  function scheduleHTML(list) {
    if (!list.length) return `<p class="muted">The schedule has not been published yet.</p>`;
    const days = {}; list.forEach(s => (days[ES.dayKey(s.start_at)] = days[ES.dayKey(s.start_at)] || []).push(s));
    return Object.entries(days).map(([day, items]) => {
      const sessions = {}; items.forEach(s => (sessions[s.session_name || "Schedule"] = sessions[s.session_name || "Schedule"] || []).push(s));
      return `<div class="sched-day">${esc(ES.fmtDate(day, true))}</div>` + Object.entries(sessions).map(([name, rows]) =>
        `<div class="sched-sess">${esc(name)}</div><ul class="timeline">${rows.map(s => `<li class="tl-item"><div class="tl-time">${ES.fmtTime(s.start_at)} – ${ES.fmtTime(s.end_at)}</div><div class="tl-body"><h4>${esc(s.title)}</h4><p>${[s.location, personOf(s)].filter(Boolean).map(esc).join(" · ")}</p></div></li>`).join("")}</ul>`).join("");
    }).join("");
  }
  const speakerCards = list => list.length ? `<div class="spk-grid">${list.map(s => `<div class="spk-card"><div class="top">${ES.avatar(s.name, s.photo)}<div><h4>${esc(s.name)}</h4><span class="chip">${esc(s.role)}</span></div></div>
      ${s.title ? `<p><b>${esc(s.title)}</b></p>` : ""}${s.topic ? `<div class="topic">${esc(s.topic)}</div>` : ""}${s.bio ? `<p>${esc(s.bio)}</p>` : ""}</div>`).join("")}</div>` : `<p class="muted">No speakers announced yet.</p>`;

  function regPanel(e) {
    const u = Auth.user(), here = encodeURIComponent(location.pathname + location.search);
    let body = "";
    if (e.status !== "approved") body = `<div class="notice">This event is <b>${esc(ES.label(e.status))}</b> and is not visible to participants.</div>`;
    else if (e.lifecycle === "completed") body = `<div class="notice" style="background:#F5F2FA;border-color:#DDD6E8;color:#4A4160">This event has ended.</div>${u && u.role === "user" && e.my_registration && e.my_registration.status === "attended" ? `<div class="reg-state">${ES.icon("check", 18)} You attended this event</div>` : ""}`;
    else if (!u) body = e.lifecycle === "ongoing" ? `<div class="notice">Registration is closed — this event has started.</div>` : `<a class="btn btn-primary" href="${ES.url("pages/login.html")}?next=${here}">Login to Register</a><p class="muted" style="margin:10px 0 0;font-size:.85rem;text-align:center">No account? <a href="${ES.url("pages/register.html")}">Register here</a></p>`;
    else if (u.role !== "user") body = `<div class="notice">You are logged in as <b>${esc(ES.label(u.role))}</b>. Only participant accounts can register for events.</div>`;
    else if (e.my_registration && e.my_registration.status === "registered")
      body = `<div class="reg-state">${ES.icon("check", 18)} Registered</div>${e.lifecycle === "upcoming" ? `<button class="btn btn-danger" data-cancel>Cancel Registration</button>` : ""}<a class="btn btn-ghost" style="margin-top:10px" href="${ES.url("pages/my-events.html")}">View My Events</a>`;
    else if (e.my_registration && e.my_registration.status === "attended") body = `<div class="reg-state">${ES.icon("check", 18)} You attended this event</div>`;
    else if (e.lifecycle === "ongoing") body = `<div class="notice">Registration is closed — this event has started.</div>`;
    else if (e.is_full) body = `<button class="btn btn-primary" disabled>Event Full</button>`;
    else body = `<button class="btn btn-primary" data-register>${ES.icon("ticket", 18)} Register for Event</button>`;
    const pct = e.capacity ? Math.min(100, Math.round((e.registered_count / e.capacity) * 100)) : 0;
    return `<div class="card reg-panel"><h3 style="margin-bottom:12px">Registration</h3>
      <div class="seats"><small><span>${e.registered_count} registered</span><span>${e.capacity ? e.capacity + " seats" : "Unlimited seats"}</span></small>${e.capacity ? `<div class="progress"><i style="width:${pct}%"></i></div>` : ""}</div>${body}</div>`;
  }

  ES.pages["event-detail"] = async app => {
    const key = ES.q().id;
    if (!key) { app.innerHTML = `<div class="container" style="padding:56px 0">${ES.empty("No event selected. <a href='" + ES.url("pages/events.html") + "'>Browse events</a>", "search")}</div>`; return; }
    let e;
    try { e = (await API.get("/events/" + encodeURIComponent(key))).data; }
    catch (err) { app.innerHTML = `<div class="container" style="padding:56px 0">${ES.empty(esc(err.message) + " <a href='" + ES.url("pages/events.html") + "'>Back to events</a>", "alert")}</div>`; return; }
    document.title = e.title + " — EventSync";
    const draw = () => {
      app.innerHTML = `<div class="container"><div class="detail-hero"><div><a class="back" href="${ES.url("pages/events.html")}" style="display:inline-flex;gap:6px;align-items:center;text-decoration:none;margin-bottom:14px">${ES.icon("left", 16)} All events</a>
        <div class="badge-row" style="margin-bottom:12px">${e.status === "approved" ? ES.eventBadge(e) : ES.statusBadges(e)}${e.is_featured ? '<span class="badge st-featured">Featured</span>' : ""}<span class="chip"><i style="background:${esc(e.category?.color || "#999")}"></i>${esc(e.category?.name || "")}</span></div>
        <h1>${esc(e.title)}</h1>
        <div class="facts"><div>${ES.icon("calendar", 20)}<span><b>Date</b>${esc(ES.dateRange(e))}</span></div><div>${ES.icon("clock", 20)}<span><b>Time</b>${esc(ES.timeRange(e))}</span></div>
        <div>${ES.icon("pin", 20)}<span><b>Location</b>${esc(e.location)}</span></div><div>${ES.icon("building", 20)}<span><b>Organizer</b>${esc(e.organizer?.name || "")}</span></div></div></div>
        <div>${ES.img(e)}</div></div>
        ${e.status === "rejected" && e.review_note ? `<div class="review-note"><b>Admin note:</b> ${esc(e.review_note)}</div>` : ""}
        <div class="layout" style="margin-top:28px"><div class="stack">
          <section class="card"><h3>About this event</h3><p style="margin:0">${esc(e.description)}</p></section>
          <section class="card" id="schedule"><h3>Schedule</h3>${scheduleHTML(e.schedules)}</section>
          <section class="card" id="speakers"><h3>Speakers</h3>${speakerCards(e.speakers)}</section>
          ${e.committees.length ? `<section class="card"><h3>Committee</h3>${e.committees.map(c => `<div class="person">${ES.avatar(c.name)}<div><b>${esc(c.name)}</b><small>${esc(c.role)}${c.organization ? " · " + esc(c.organization) : ""}</small></div></div>`).join("")}</section>` : ""}
        </div><aside>${regPanel(e)}</aside></div></div>`;
    };
    draw();
    const reload = async () => { e = (await API.get("/events/" + encodeURIComponent(e.id))).data; draw(); };
    ES.on(app, "click", "[data-register]", async b => { b.classList.add("is-loading"); const r = await ES.run(() => API.post(`/events/${e.id}/register`)); if (r) await reload(); else b.classList.remove("is-loading"); });
    ES.on(app, "click", "[data-cancel]", async () => {
      if (!(await ES.confirm({ title: "Cancel registration?", message: `You will no longer be registered for <b>${esc(e.title)}</b>. You can register again later if seats are available.`, confirmText: "Cancel registration", danger: true }))) return;
      if (await ES.run(() => API.del(`/events/${e.id}/register`))) await reload();
    });
  };

  /* ---------- SCHEDULE (semua event) ---------- */
  ES.pages.schedule = async app => {
    const [evs, cats] = await Promise.all([API.get("/events", { limit: 100, sort: "soonest" }), API.get("/categories")]), st = { event: "", category: "", date: "", ...ES.q() };
    app.innerHTML = `<section class="page-head"><div class="container"><span class="kicker">Timeline</span><h1>Schedule</h1><p>Sessions and activities of all published events.</p></div></section>
      <div class="container"><form class="filters f4" id="flt" onsubmit="return false" style="grid-template-columns:repeat(3,1fr) auto">
        <div class="field"><label for="event">Event</label><select id="event"><option value="">All events</option>${evs.data.map(e => `<option value="${e.id}" ${String(e.id) === st.event ? "selected" : ""}>${esc(e.title)}</option>`).join("")}</select></div>
        <div class="field"><label for="category">Category</label><select id="category"><option value="">All categories</option>${cats.data.map(c => `<option value="${esc(c.slug)}" ${c.slug === st.category ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>
        <div class="field"><label for="date">Date</label><input id="date" type="date" value="${esc(st.date)}"></div><button type="button" class="btn btn-ghost" id="clr">Reset</button></form>
      <div id="out" style="margin-top:20px"></div></div>`;
    const out = ES.$("#out", app);
    async function load() {
      const r = (await API.get("/schedules", { event: st.event, category: st.category, date: st.date })).data; ES.setQ(st);
      if (!r.length) { out.innerHTML = ES.empty("No schedule items match your filters.", "clock"); return; }
      const by = {}; r.forEach(s => (by[s.event.id] = by[s.event.id] || { ev: s.event, items: [] }).items.push(s));
      out.innerHTML = Object.values(by).map(g => `<section class="card" style="margin-bottom:20px"><div class="card-h"><div><h3><a href="${ES.detailUrl(g.ev)}" style="text-decoration:none">${esc(g.ev.title)}</a></h3><span class="chip" style="margin-top:6px"><i style="background:${esc(g.ev.category?.color || "#999")}"></i>${esc(g.ev.category?.name || "")}</span></div>${ES.badge(g.ev.lifecycle)}</div>${scheduleHTML(g.items)}</section>`).join("");
    }
    ["event", "category", "date"].forEach(id => ES.$("#" + id, app).addEventListener("change", e => { st[id] = e.target.value; load(); }));
    ES.$("#clr", app).addEventListener("click", () => { Object.assign(st, { event: "", category: "", date: "" }); ["event", "category", "date"].forEach(i => (ES.$("#" + i, app).value = "")); load(); });
    await load();
  };

  /* ---------- SPEAKERS ---------- */
  ES.pages.speakers = async app => {
    const evs = (await API.get("/events", { limit: 100 })).data, st = { event: ES.q().event || "" };
    app.innerHTML = `<section class="page-head"><div class="container"><span class="kicker">People</span><h1>Speakers</h1><p>Meet the speakers, mentors and judges of published events.</p></div></section>
      <div class="container"><div class="toolbar"><div class="field" style="min-width:260px"><label for="event">Event</label><select id="event"><option value="">All events</option>${evs.map(e => `<option value="${e.id}" ${String(e.id) === st.event ? "selected" : ""}>${esc(e.title)}</option>`).join("")}</select></div></div><div class="grid" id="grid"></div></div>`;
    const grid = ES.$("#grid", app);
    async function load() {
      const r = (await API.get("/speakers", { event: st.event })).data;
      grid.style.display = r.length ? "" : "block";
      grid.innerHTML = r.length ? r.map(s => `<article class="spk"><div class="spk-cover"></div><div class="spk-body">${ES.avatar(s.name, s.photo)}<h3>${esc(s.name)}</h3><span class="chip">${esc(s.role)}</span>
        ${s.title ? `<p style="margin:0"><b>${esc(s.title)}</b></p>` : ""}${s.topic ? `<p style="margin:0;color:var(--primary);font-weight:600">${esc(s.topic)}</p>` : ""}<p class="muted" style="margin:0">${esc(s.bio || "")}</p>
        <a href="${ES.detailUrl(s.event)}" style="font-size:.88rem">${esc(s.event.title)}</a></div></article>`).join("") : ES.empty("No speakers for this selection.", "mic");
    }
    ES.$("#event", app).addEventListener("change", e => { st.event = e.target.value; ES.setQ(st); load(); });
    await load();
  };
})();
