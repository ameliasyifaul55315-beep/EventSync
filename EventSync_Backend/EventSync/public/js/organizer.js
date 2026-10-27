/* EventSync — organizer.js
   Area Organizer: Dashboard, My Events, Create/Edit Event, Schedule, Speakers & Committee, Participants.
   Semua data lewat API.* (endpoint /organizer/... dan /events/{id}/schedules|speakers|committees|participants). */
(function () {
  const esc = ES.esc;
  const POSTERS = [["tech-innovation-summit-2026", "Technology — Summit"], ["tech-innovation-day-2026", "Technology — Day"], ["umkm-digital-marketing-workshop", "Business — Workshop"],
    ["indonesia-hackathon-2026", "Competition — Hackathon"], ["ui-ux-design-workshop", "Design workshop"], ["campus-innovation-expo", "Campus — Expo"], ["campus-creative-festival", "Campus — Festival"],
    ["aceh-youth-digital-summit", "Education — Summit"], ["charity-community-day", "Community"], ["startup-networking-night", "Business — Networking"], ["digital-marketing-seminar", "Seminar"]]
    .map(([f, l]) => ({ value: `assets/images/poster-${f}.svg`, label: l }));
  const editable = e => !["pending_review", "cancelled"].includes(e.status);

  /* ---------- tabel event + aksi (dipakai dashboard & My Events) ---------- */
  function eventActions(e) {
    const s = e.status, id = e.id, P = "pages/organizer/";
    return `<div class="t-actions">${ES.iconLink(ES.detailUrl(e), "eye", "View")}
      ${editable(e) ? ES.iconLink(ES.url(P + "create-event.html") + "?id=" + id, "edit", "Edit") : ES.iconBtn("x", "edit", "Locked", id, "").replace("<button", "<button disabled")}
      ${ES.iconLink(ES.url(P + "schedule.html") + "?event=" + id, "clock", "Manage Schedule")}${ES.iconLink(ES.url(P + "speakers.html") + "?event=" + id, "mic", "Manage Speaker")}
      ${ES.iconLink(ES.url(P + "participants.html") + "?event=" + id, "users", "View Participants")}
      ${["draft", "rejected"].includes(s) ? ES.iconBtn("submit", "send", "Submit for Review", id, "ok") : ""}${s === "approved" ? ES.iconBtn("cancel", "ban", "Cancel event", id, "danger") : ""}
      ${s !== "pending_review" && s !== "cancelled" ? ES.iconBtn("delete", "trash", "Delete", id, "danger") : ""}</div>`;
  }
  const eventsTable = (list, empty) => ES.table([
    { label: "Event", cls: "t-title", render: e => `<b>${esc(e.title)}</b><small>${esc(e.category?.name || "")} · ${esc(e.location)}</small>` },
    { label: "Date", render: e => esc(ES.dateRange(e)) }, { label: "Status", render: e => ES.statusBadges(e) },
    { label: "Participants", render: e => `${e.registered_count}${e.capacity ? " / " + e.capacity : ""}` },
    { label: "Action", cls: "t-actions-cell", render: eventActions }], list, empty);

  function bindEventActions(app, getList, reload) {
    ES.on(app, "click", "[data-act]", async b => {
      const e = getList().find(x => x.id === +b.dataset.id); if (!e) return; const a = b.dataset.act;
      if (a === "delete") { if (await ES.confirm({ title: "Delete event?", message: `<b>${esc(e.title)}</b> will be removed from your list.${e.status === "approved" ? " Approved events with registrants must be cancelled instead." : ""}`, confirmText: "Delete", danger: true })) { if (await ES.run(() => API.del("/organizer/events/" + e.id))) reload(); } }
      else if (a === "submit") { if (await ES.confirm({ title: "Submit for review?", message: `<b>${esc(e.title)}</b> will be locked while an admin reviews it.`, confirmText: "Submit" })) { if (await ES.run(() => API.post(`/organizer/events/${e.id}/submit`))) reload(); } }
      else if (a === "cancel") { if (await ES.confirm({ title: "Cancel event?", message: `<b>${esc(e.title)}</b> will be marked as cancelled and hidden from the public list.`, confirmText: "Cancel event", danger: true })) { if (await ES.run(() => API.post(`/events/${e.id}/cancel`))) reload(); } }
    });
  }

  /* ---------- DASHBOARD ---------- */
  ES.pages["org-dashboard"] = async app => {
    let data;
    const draw = () => {
      const s = data.stats, evs = data.events;
      app.innerHTML = `<div class="dash-head"><div><h2>Organizer Dashboard</h2><p>Overview of your events and participants.</p></div><div class="actions"><a class="btn btn-primary" href="${ES.url("pages/organizer/create-event.html")}">${ES.icon("plus", 18)} Create Event</a></div></div>
        <div class="kpis">${ES.kpi("calendar", s.total_events, "Total Events")}${ES.kpi("check", s.published_events, "Published Events")}${ES.kpi("review", s.pending_events, "Pending Events")}${ES.kpi("users", s.total_participants, "Total Participants")}</div>
        <section class="card"><div class="card-h"><h3>My events</h3><a class="btn btn-ghost btn-sm" href="${ES.url("pages/organizer/events.html")}">View all</a></div>${eventsTable(evs.slice(0, 6), "You have no events yet. Create your first event.")}</section>
        <section class="card"><div class="card-h"><h3>Event statistics</h3></div><p class="muted" style="margin:0 0 14px;font-size:.88rem">Registered participants per event</p>${ES.bars(evs.filter(e => e.registered_count || e.status === "approved").map(e => ({ label: e.title, value: e.registered_count, color: e.category?.color })), "No registrations yet.")}</section>`;
    };
    const load = async () => { data = (await API.get("/organizer/dashboard")).data; draw(); };
    bindEventActions(app, () => data.events, load); await load();
  };

  /* ---------- MY EVENTS ---------- */
  ES.pages["org-events"] = async app => {
    let list = [], st = { status: ES.q().status || "", q: "" };
    app.innerHTML = `<div class="dash-head"><div><h2>My Events</h2><p>Create, edit and submit your events for review.</p></div><div class="actions"><a class="btn btn-primary" href="${ES.url("pages/organizer/create-event.html")}">${ES.icon("plus", 18)} Create Event</a></div></div>
      <div class="table-tools"><div class="field grow"><label for="q">Search</label><input id="q" type="search" placeholder="Event title…"></div>
      <div class="field"><label for="status">Status</label><select id="status"><option value="">All</option>${["draft", "pending_review", "approved", "rejected", "cancelled"].map(s => `<option value="${s}" ${s === st.status ? "selected" : ""}>${ES.label(s)}</option>`).join("")}</select></div></div><div id="out"></div>
      <p class="muted" style="font-size:.85rem">Rules: draft/rejected events can be edited and submitted; events under review are locked; approved events can be cancelled (or deleted if nobody registered).</p>`;
    const out = ES.$("#out", app);
    const load = async () => { list = (await API.get("/organizer/events", st)).data; out.innerHTML = eventsTable(list, "No events match."); };
    ES.$("#q", app).addEventListener("input", ES.debounce(e => { st.q = e.target.value; load(); }));
    ES.$("#status", app).addEventListener("change", e => { st.status = e.target.value; load(); });
    bindEventActions(app, () => list, load); await load();
  };

  /* ---------- CREATE / EDIT EVENT ---------- */
  ES.pages["org-event-form"] = async app => {
    const id = ES.q().id, cats = (await API.get("/categories")).data;
    let ev = null;
    if (id) { try { ev = (await API.get("/events/" + id)).data; } catch (e) { app.innerHTML = ES.errBox(e.message); return; } }
    const locked = ev && !editable(ev);
    const v = ev ? { ...ev, start_date: ES.toInputDate(ev.start_at), start_time: ES.toInputTime(ev.start_at), end_date: ES.toInputDate(ev.end_at), end_time: ES.toInputTime(ev.end_at), category_id: ev.category_id, poster_preset: ev.poster_path && !ev.poster_path.startsWith("data:") ? ev.poster_path : "", poster: ev.poster_path && ev.poster_path.startsWith("data:") ? ev.poster_path : "" } : {};
    const fields = [
      { name: "title", label: "Event title", required: true, col: "full", minLength: 3 },
      { name: "category_id", label: "Category", type: "select", required: true, placeholder: "Select a category", options: cats.map(c => ({ value: c.id, label: c.name })) },
      { name: "location", label: "Location", required: true },
      { name: "description", label: "Description", type: "textarea", required: true, col: "full", rows: 5, minLength: 20, hint: "At least 20 characters." },
      { name: "start_date", label: "Start date", type: "date", required: true }, { name: "start_time", label: "Start time", type: "time", required: true },
      { name: "end_date", label: "End date", type: "date", required: true }, { name: "end_time", label: "End time", type: "time", required: true,
        validate: d => (d.start_date && d.end_date && d.start_time && d.end_time && ES.combine(d.end_date, d.end_time) <= ES.combine(d.start_date, d.start_time) ? "End must be after the start." : "") },
      { name: "capacity", label: "Capacity (seats)", type: "number", min: 1, hint: "Leave empty for unlimited." },
      { name: "poster_preset", label: "Poster (choose one)", type: "select", placeholder: "Default poster", options: POSTERS },
      { name: "poster", label: "…or upload your own image", type: "file", col: "full", hint: "JPG/PNG, resized automatically." }];
    const statusLine = ev ? `<p style="margin:6px 0 0">Status: ${ES.statusBadges(ev)}</p>` : `<p style="margin:6px 0 0">Status: ${ES.badge("draft")} <small class="muted">(new events start as draft)</small></p>`;
    app.innerHTML = `<div class="dash-head"><div><h2>${ev ? "Edit Event" : "Create Event"}</h2>${statusLine}</div><div class="actions"><a class="btn btn-ghost" href="${ES.url("pages/organizer/events.html")}">${ES.icon("left", 16)} My Events</a></div></div>
      ${ev && ev.status === "rejected" && ev.review_note ? `<div class="review-note"><b>Admin note:</b> ${esc(ev.review_note)}<br><small>Fix the issues, then submit again.</small></div>` : ""}
      ${locked ? `<div class="notice">This event is <b>${esc(ES.label(ev.status))}</b> and cannot be edited${ev.status === "pending_review" ? " while it is being reviewed" : ""}.</div>` : ""}
      <div class="cols-2" style="grid-template-columns:1.5fr 1fr"><section class="card"><form id="ef" novalidate class="fgrid" ${locked ? "inert" : ""}>${ES.formHTML(fields, v)}
        <div class="field full"><div class="form-actions" style="margin-top:6px"><button class="btn btn-primary" type="submit" data-mode="save">${ES.icon("check", 18)} Save Event</button>
        ${!ev || ["draft", "rejected"].includes(ev.status) ? `<button class="btn btn-ghost" type="submit" data-mode="submit">${ES.icon("send", 18)} Submit for Review</button>` : ""}</div></div></form></section>
        <div class="stack"><section class="card"><h3>Next steps</h3><p class="muted" style="font-size:.9rem">${ev ? "Complete your event so the admin can review it." : "Save the event first, then add schedule items and speakers."}</p>
          ${ev ? `<div class="stack" style="gap:10px"><a class="btn btn-ghost" href="${ES.url("pages/organizer/schedule.html")}?event=${ev.id}">${ES.icon("clock", 16)} Manage Schedule (${ev.schedules.length})</a><a class="btn btn-ghost" href="${ES.url("pages/organizer/speakers.html")}?event=${ev.id}">${ES.icon("mic", 16)} Manage Speakers (${ev.speakers.length})</a><a class="btn btn-ghost" href="${ES.url("pages/organizer/participants.html")}?event=${ev.id}">${ES.icon("users", 16)} Participants (${ev.registered_count})</a></div>` : ""}</section>
        <section class="card"><h3>Review process</h3><p class="muted" style="margin:0;font-size:.9rem">Draft → Submit for Review → Admin approves or rejects. Only approved events appear to participants.</p></section></div></div>`;
    const tb = ES.$(".topbar h1"); if (tb && ev) tb.textContent = "Edit Event";
    const form = ES.$("#ef", app); ES.bindForm(form);
    let mode = "save"; ES.on(form, "click", "button[type=submit]", b => (mode = b.dataset.mode));
    form.addEventListener("submit", async e => {
      e.preventDefault(); const d = ES.collect(form, fields), errs = ES.check(fields, d); ES.showErrors(form, errs); if (Object.keys(errs).length) { ES.toast("Please fix the highlighted fields.", "err"); return; }
      const body = { title: d.title, category_id: d.category_id, description: d.description, location: d.location, capacity: d.capacity,
        start_at: ES.combine(d.start_date, d.start_time), end_at: ES.combine(d.end_date, d.end_time), poster_path: d.poster || d.poster_preset || (ev && ev.poster_path) || "" };
      const btns = ES.$$("button[type=submit]", form); btns.forEach(b => b.classList.add("is-loading"));
      try {
        const r = ev ? await API.put("/organizer/events/" + ev.id, body) : await API.post("/organizer/events", body), saved = r.data;
        if (mode === "submit") { await API.post(`/organizer/events/${saved.id}/submit`); ES.toast("Event saved and submitted for review."); location.href = ES.url("pages/organizer/events.html"); }
        else { ES.toast(r.message); if (!ev) location.href = ES.url("pages/organizer/create-event.html") + "?id=" + saved.id; else btns.forEach(b => b.classList.remove("is-loading")); }
      } catch (err) { if (err.errors) ES.showErrors(form, err.errors); else ES.toast(err.message, "err"); btns.forEach(b => b.classList.remove("is-loading")); }
    });
  };

  /* ---------- helper: pilih event (dipakai Schedule, Speakers, Participants) ---------- */
  async function eventPicker(app, { head, withAll = false }) {
    const evs = (await API.get("/organizer/events")).data;
    if (!evs.length) { app.innerHTML = `<div class="dash-head"><div><h2>${head}</h2></div></div>${ES.empty(`You have no events yet. <a href="${ES.url("pages/organizer/create-event.html")}">Create an event</a>`)}`; return null; }
    const sel = ES.q().event || (withAll ? "" : String(evs[0].id));
    return { evs, sel };
  }
  const evSelect = (evs, sel, withAll) => `<div class="field" style="min-width:260px"><label for="ev">Event</label><select id="ev">${withAll ? '<option value="">All my events</option>' : ""}${evs.map(e => `<option value="${e.id}" ${String(e.id) === String(sel) ? "selected" : ""}>${esc(e.title)}</option>`).join("")}</select></div>`;

  /* ---------- SCHEDULE ---------- */
  ES.pages["org-schedule"] = async app => {
    const p = await eventPicker(app, { head: "Schedule Management" }); if (!p) return;
    let evId = p.sel, ev, rows = [], speakers = [];
    app.innerHTML = `<div class="dash-head"><div><h2>Schedule Management</h2><p>Sessions and activities shown on the event page.</p></div><div class="actions"><button class="btn btn-primary" id="add">${ES.icon("plus", 18)} Add Schedule</button></div></div>
      <div class="table-tools">${evSelect(p.evs, evId)}</div><div id="lock"></div><div id="out"></div>`;
    const out = ES.$("#out", app);
    const fieldsFor = () => [
      { name: "title", label: "Session / activity title", required: true, col: "full" }, { name: "session_name", label: "Session group", placeholder: "e.g. Morning" },
      { name: "location", label: "Location / room" }, { name: "date", label: "Date", type: "date", required: true }, { name: "start_time", label: "Start time", type: "time", required: true },
      { name: "end_time", label: "End time", type: "time", required: true, validate: d => (d.start_time && d.end_time && d.end_time <= d.start_time ? "End must be after the start." : "") },
      { name: "speaker_id", label: "Speaker", type: "select", placeholder: "— none —", options: speakers.map(s => ({ value: s.id, label: `${s.name} (${s.role})` })) },
      { name: "person_in_charge", label: "Or person in charge (text)", placeholder: "e.g. Committee" },
      { name: "description", label: "Notes", type: "textarea", rows: 2, col: "full" }];
    const toBody = d => ({ title: d.title, session_name: d.session_name, location: d.location, speaker_id: d.speaker_id, person_in_charge: d.person_in_charge, description: d.description,
      start_at: ES.combine(d.date, d.start_time), end_at: ES.combine(d.date, d.end_time) });
    async function load() {
      ev = p.evs.find(e => String(e.id) === String(evId)); ES.setQ({ event: evId });
      [rows, speakers] = (await Promise.all([API.get(`/events/${evId}/schedules`), API.get(`/events/${evId}/speakers`)])).map(r => r.data);
      const lk = !editable(ev); ES.$("#add", app).disabled = lk;
      ES.$("#lock", app).innerHTML = lk ? `<div class="notice" style="margin-bottom:14px">This event is <b>${esc(ES.label(ev.status))}</b>, so its schedule is locked.</div>` : "";
      out.innerHTML = ES.table([
        { label: "Date", render: s => esc(ES.fmtDate(s.start_at)) }, { label: "Time", render: s => `${ES.fmtTime(s.start_at)} – ${ES.fmtTime(s.end_at)}` }, { label: "Session", render: s => esc(s.session_name || "—") },
        { label: "Title", cls: "t-title", render: s => `<b>${esc(s.title)}</b><small>${esc(s.location || "")}</small>` }, { label: "Speaker / PIC", render: s => esc(s.speaker ? s.speaker.name : s.person_in_charge || "—") },
        { label: "Action", cls: "t-actions-cell", render: s => `<div class="t-actions">${ES.iconBtn("edit", "edit", "Edit", s.id)}${ES.iconBtn("delete", "trash", "Delete", s.id, "danger")}</div>` }], rows, "No schedule items yet. Click “Add Schedule”.");
      if (lk) ES.$$("[data-act]", out).forEach(b => (b.disabled = true));
    }
    const form = (title, values, call) => ES.formModal({ title, size: "lg", fields: fieldsFor(), values, submitText: "Save", onSubmit: async d => { const r = await call(toBody(d)); ES.toast(r.message); await load(); } });
    ES.$("#ev", app).addEventListener("change", e => { evId = e.target.value; load(); });
    ES.$("#add", app).addEventListener("click", () => form("Add schedule item", { date: ES.toInputDate(ev.start_at), start_time: ES.toInputTime(ev.start_at), end_time: "" }, b => API.post(`/events/${evId}/schedules`, b)));
    ES.on(out, "click", "[data-act]", async b => {
      const s = rows.find(x => x.id === +b.dataset.id);
      if (b.dataset.act === "edit") form("Edit schedule item", { ...s, date: ES.toInputDate(s.start_at), start_time: ES.toInputTime(s.start_at), end_time: ES.toInputTime(s.end_at) }, body => API.put(`/events/${evId}/schedules/${s.id}`, body));
      else if (await ES.confirm({ title: "Delete schedule item?", message: `“${esc(s.title)}” will be removed.`, confirmText: "Delete", danger: true })) { if (await ES.run(() => API.del(`/events/${evId}/schedules/${s.id}`))) load(); }
    });
    await load();
  };

  /* ---------- SPEAKERS & COMMITTEE ---------- */
  ES.pages["org-speakers"] = async app => {
    const p = await eventPicker(app, { head: "Speakers & Committee" }); if (!p) return;
    let evId = p.sel, ev, tab = "speakers", spk = [], com = [];
    app.innerHTML = `<div class="dash-head"><div><h2>Speakers &amp; Committee</h2><p>People who appear on the event page.</p></div><div class="actions"><button class="btn btn-primary" id="add"></button></div></div>
      <div class="table-tools">${evSelect(p.evs, evId)}<div><div class="seg"><button data-tab="speakers">Speakers</button><button data-tab="committee">Committee</button></div></div></div><div id="lock"></div><div id="out"></div>`;
    const out = ES.$("#out", app), add = ES.$("#add", app);
    const sf = () => [{ name: "event_name", label: "Event", readonly: true, col: "full" }, { name: "name", label: "Name", required: true }, { name: "role", label: "Role", required: true, placeholder: "Speaker, Mentor, Judge…" },
      { name: "title", label: "Job title / affiliation" }, { name: "topic", label: "Topic" }, { name: "bio", label: "Bio", type: "textarea", rows: 3, col: "full" }, { name: "photo", label: "Photo", type: "file", col: "full" }];
    const cf = () => [{ name: "name", label: "Name / team", required: true, col: "full" }, { name: "role", label: "Role", required: true }, { name: "organization", label: "Organization" }, { name: "contact", label: "Contact", col: "full" }];
    function draw() {
      ES.$$("[data-tab]", app).forEach(b => b.setAttribute("aria-selected", b.dataset.tab === tab)); const lk = !editable(ev);
      add.innerHTML = `${ES.icon("plus", 18)} Add ${tab === "speakers" ? "Speaker" : "Committee Member"}`; add.disabled = lk;
      ES.$("#lock", app).innerHTML = lk ? `<div class="notice" style="margin-bottom:14px">This event is <b>${esc(ES.label(ev.status))}</b>, so these lists are locked.</div>` : "";
      if (tab === "speakers") out.innerHTML = spk.length ? `<div class="spk-grid">${spk.map(s => `<div class="spk-card"><div class="top">${ES.avatar(s.name, s.photo)}<div><h4>${esc(s.name)}</h4><span class="chip">${esc(s.role)}</span></div></div>
        ${s.title ? `<p><b>${esc(s.title)}</b></p>` : ""}${s.topic ? `<div class="topic">${esc(s.topic)}</div>` : ""}${s.bio ? `<p>${esc(s.bio)}</p>` : ""}
        <div class="foot"><span class="mini-tag">${esc(ev.title)}</span><div class="t-actions">${ES.iconBtn("edit", "edit", "Edit", s.id).replace("<button", lk ? "<button disabled" : "<button")}${ES.iconBtn("delete", "trash", "Delete", s.id, "danger").replace("<button", lk ? "<button disabled" : "<button")}</div></div></div>`).join("")}</div>` : ES.empty("No speakers yet.", "mic");
      else out.innerHTML = ES.table([{ label: "Name", cls: "t-title", render: c => `<b>${esc(c.name)}</b>` }, { label: "Role", render: c => esc(c.role) }, { label: "Organization", render: c => esc(c.organization || "—") }, { label: "Contact", render: c => esc(c.contact || "—") },
        { label: "Action", cls: "t-actions-cell", render: c => `<div class="t-actions">${ES.iconBtn("edit", "edit", "Edit", c.id)}${ES.iconBtn("delete", "trash", "Delete", c.id, "danger")}</div>` }], com, "No committee members yet.");
      if (lk) ES.$$("[data-act]", out).forEach(b => (b.disabled = true));
    }
    async function load() { ev = p.evs.find(e => String(e.id) === String(evId)); ES.setQ({ event: evId }); [spk, com] = (await Promise.all([API.get(`/events/${evId}/speakers`), API.get(`/events/${evId}/committees`)])).map(r => r.data); draw(); }
    const open = (kind, values, call, title) => ES.formModal({ title, fields: kind === "speakers" ? sf() : cf(), values: { event_name: ev.title, ...values }, onSubmit: async d => { const r = await call(d); ES.toast(r.message); await load(); } });
    ES.$("#ev", app).addEventListener("change", e => { evId = e.target.value; load(); });
    ES.on(app, "click", "[data-tab]", b => { tab = b.dataset.tab; draw(); });
    add.addEventListener("click", () => tab === "speakers" ? open("speakers", { role: "Speaker" }, d => API.post(`/events/${evId}/speakers`, d), "Add speaker") : open("committees", {}, d => API.post(`/events/${evId}/committees`, d), "Add committee member"));
    ES.on(out, "click", "[data-act]", async b => {
      const key = tab === "speakers" ? "speakers" : "committees", row = (tab === "speakers" ? spk : com).find(x => x.id === +b.dataset.id);
      if (b.dataset.act === "edit") open(key, row, d => API.put(`/events/${evId}/${key}/${row.id}`, d), "Edit " + (key === "speakers" ? "speaker" : "committee member"));
      else if (await ES.confirm({ title: "Delete?", message: `<b>${esc(row.name)}</b> will be removed.${key === "speakers" ? " Schedule items that reference this speaker will keep working without a speaker." : ""}`, confirmText: "Delete", danger: true })) { if (await ES.run(() => API.del(`/events/${evId}/${key}/${row.id}`))) load(); }
    });
    await load();
  };

  /* ---------- PARTICIPANTS ---------- */
  ES.pages["org-participants"] = async app => {
    const p = await eventPicker(app, { head: "Participants", withAll: true }); if (!p) return;
    const st = { event: p.sel, status: "", q: "" };
    app.innerHTML = `<div class="dash-head"><div><h2>Participants</h2><p>People who registered for your events.</p></div></div>
      <div class="table-tools">${evSelect(p.evs, st.event, true)}<div class="field"><label for="status">Status</label><select id="status"><option value="">All</option>${["registered", "attended", "cancelled"].map(s => `<option value="${s}">${ES.label(s)}</option>`).join("")}</select></div>
      <div class="field grow"><label for="q">Search</label><input id="q" type="search" placeholder="Name or email…"></div></div><div class="kpis" id="k"></div><div id="out"></div>`;
    async function load() {
      ES.setQ({ event: st.event });
      const all = (await API.get("/organizer/participants", { event: st.event })).data, rows = (await API.get("/organizer/participants", st)).data;
      const n = s => all.filter(r => r.status === s).length;
      ES.$("#k", app).innerHTML = ES.kpi("users", n("registered") + n("attended"), "Active participants") + ES.kpi("check", n("attended"), "Attended") + ES.kpi("ban", n("cancelled"), "Cancelled");
      ES.$("#out", app).innerHTML = ES.table([{ label: "Name", cls: "t-title", render: r => `<b>${esc(r.user.name)}</b>` }, { label: "Email", render: r => esc(r.user.email) }, { label: "Event", render: r => esc(r.event.title) },
        { label: "Registration date", render: r => esc(ES.fmtDT(r.registered_at)) }, { label: "Status", render: r => ES.badge(r.status) }], rows, "No participants match.");
    }
    ES.$("#ev", app).addEventListener("change", e => { st.event = e.target.value; load(); });
    ES.$("#status", app).addEventListener("change", e => { st.status = e.target.value; load(); });
    ES.$("#q", app).addEventListener("input", ES.debounce(e => { st.q = e.target.value; load(); }));
    await load();
  };
})();
