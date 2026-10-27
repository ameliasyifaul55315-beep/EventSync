/* EventSync — admin.js
   Area Admin: Dashboard, Users, Organizers, Categories, Events, Event Review (approve / reject).
   Endpoint: /admin/... Semua cek role di sini hanya simulasi; di Laravel dilakukan oleh middleware role:admin + Policy. */
(function () {
  const esc = ES.esc;

  /* ---------- aksi review (dipakai Dashboard, Events, Event Review) ---------- */
  async function approve(e) {
    if (!(await ES.confirm({ title: "Approve event?", message: `<b>${esc(e.title)}</b> will be published and visible to participants.`, confirmText: "Approve" }))) return false;
    return !!(await ES.run(() => API.post(`/admin/events/${e.id}/approve`, {})));
  }
  function reject(e) {
    return new Promise(res => {
      let ok = false;
      const m = ES.formModal({ title: "Reject event", size: "sm", submitText: "Reject event", note: `<p style="margin-top:0">Tell the organizer what needs to be fixed for <b>${esc(e.title)}</b>.</p>`,
        fields: [{ name: "review_note", label: "Rejection note", type: "textarea", required: true, minLength: 5, col: "full", rows: 4 }],
        onSubmit: async d => { const r = await API.post(`/admin/events/${e.id}/reject`, d); ES.toast(r.message); ok = true; res(true); } });
      m.el.querySelector("[data-x]").addEventListener("click", () => !ok && res(false));
      m.el.addEventListener("mousedown", ev => { if (ev.target === m.el && !ok) res(false); });
    });
  }
  const pendingRow = e => `<div class="t-actions">${ES.iconLink(ES.url("pages/admin/event-review.html") + "?id=" + e.id, "review", "Review")}${ES.iconBtn("approve", "check", "Approve", e.id, "ok")}${ES.iconBtn("reject", "x", "Reject", e.id, "danger")}</div>`;
  const pendingTable = list => ES.table([
    { label: "Event", cls: "t-title", render: e => `<b>${esc(e.title)}</b><small>${esc(e.category?.name || "")}</small>` }, { label: "Organizer", render: e => esc(e.organizer?.name || "") },
    { label: "Date", render: e => esc(ES.dateRange(e)) }, { label: "Status", render: e => ES.badge(e.status) }, { label: "Action", cls: "t-actions-cell", render: pendingRow }], list, "No events are waiting for review. 🎉");
  function bindReview(root, getList, reload) {
    ES.on(root, "click", "[data-act=approve],[data-act=reject]", async b => {
      const e = getList().find(x => x.id === +b.dataset.id); if (!e) return;
      if (b.dataset.act === "approve" ? await approve(e) : await reject(e)) reload();
    });
  }

  /* ---------- DASHBOARD ---------- */
  ES.pages["admin-dashboard"] = async app => {
    let d;
    const draw = () => {
      const s = d.stats;
      app.innerHTML = `<div class="dash-head"><div><h2>Admin Dashboard</h2><p>System overview and events waiting for review.</p></div></div>
        <div class="kpis">${ES.kpi("users", s.total_users, "Total Users")}${ES.kpi("building", s.total_organizers, "Total Organizers")}${ES.kpi("calendar", s.total_events, "Total Events")}${ES.kpi("review", s.pending_events, "Pending Events")}${ES.kpi("ticket", s.total_registrations, "Total Registrations")}</div>
        <section class="card"><div class="card-h"><h3>Pending Event Review</h3><a class="btn btn-ghost btn-sm" href="${ES.url("pages/admin/event-review.html")}">Open review queue</a></div>${pendingTable(d.pending)}</section>
        <div class="cols-2" style="grid-template-columns:1fr 1fr"><section class="card"><h3 style="margin-bottom:14px">Events by status</h3>${ES.bars(d.by_status.map(x => ({ label: ES.label(x.status), value: x.count })))}</section>
        <section class="card"><h3 style="margin-bottom:14px">Registrations by category</h3>${ES.bars(d.by_category.map(c => ({ label: c.name, value: c.registrations, color: c.color })))}</section></div>`;
    };
    const load = async () => { d = (await API.get("/admin/dashboard")).data; draw(); };
    bindReview(app, () => d.pending, load); await load();
  };

  /* ---------- USERS & ORGANIZERS (satu tabel users, dibedakan role) ---------- */
  const userFields = (fixedRole, editing) => [
    { name: "name", label: "Full name", required: true, minLength: 2, col: "full" }, { name: "email", label: "Email", type: "email", required: true, col: "full" },
    ...(fixedRole ? [] : [{ name: "role", label: "Role", type: "select", required: true, options: [{ value: "user", label: "User / Participant" }, { value: "organizer", label: "Organizer" }, { value: "admin", label: "Admin" }] }]),
    { name: "organization_name", label: "Organization", hint: "For organizers." },
    { name: "password", label: editing ? "New password (optional)" : "Password", type: "password", required: !editing, minLength: 8, col: "full", hint: editing ? "Leave empty to keep the current password." : "At least 8 characters." }];
  function userPage(kind) {
    const org = kind === "organizers";
    return async app => {
      const me = Auth.user(); let rows = [], st = { q: "", role: "" };
      app.innerHTML = `<div class="dash-head"><div><h2>${org ? "Organizers" : "Users"}</h2><p>${org ? "Accounts that can create and manage events." : "All accounts in the system."}</p></div><div class="actions"><button class="btn btn-primary" id="add">${ES.icon("plus", 18)} Add ${org ? "Organizer" : "User"}</button></div></div>
        <div class="table-tools"><div class="field grow"><label for="q">Search</label><input id="q" type="search" placeholder="Name or email…"></div>
        ${org ? "" : `<div class="field"><label for="role">Role</label><select id="role"><option value="">All roles</option><option value="user">User</option><option value="organizer">Organizer</option><option value="admin">Admin</option></select></div>`}</div><div id="out"></div>`;
      const out = ES.$("#out", app);
      const cols = [{ label: "Name", cls: "t-title", render: u => `<b>${esc(u.name)}</b>${u.id === me.id ? "<small>(you)</small>" : ""}` }, { label: "Email", render: u => esc(u.email) },
        ...(org ? [{ label: "Organization", render: u => esc(u.organization_name || "—") }, { label: "Total Events", render: u => u.events_count }] : [{ label: "Role", render: u => ES.badge(u.role) }]),
        { label: "Status", render: u => ES.badge(u.is_active ? "active" : "inactive") },
        { label: "Action", cls: "t-actions-cell", render: u => `<div class="t-actions">${ES.iconBtn("edit", "edit", "Edit", u.id)}${ES.iconBtn("toggle", u.is_active ? "ban" : "check", u.is_active ? "Deactivate" : "Activate", u.id, u.is_active ? "danger" : "ok").replace("<button", u.id === me.id ? "<button disabled" : "<button")}${org ? "" : ES.iconBtn("delete", "trash", "Delete", u.id, "danger").replace("<button", u.id === me.id ? "<button disabled" : "<button")}</div>` }];
      const load = async () => { rows = (await API.get(org ? "/admin/organizers" : "/admin/users", st)).data;
        if (org && st.q) rows = rows.filter(u => (u.name + u.email).toLowerCase().includes(st.q.toLowerCase()));
        out.innerHTML = ES.table(cols, rows, "No accounts match."); };
      const form = (title, u) => ES.formModal({ title, fields: userFields(org, !!u), values: u || { role: org ? "organizer" : "user" }, onSubmit: async d => {
        const body = { ...d, role: org ? "organizer" : d.role }; if (u && !body.password) delete body.password;
        const r = u ? await API.put("/admin/users/" + u.id, body) : await API.post("/admin/users", body); ES.toast(r.message); await load(); } });
      ES.$("#add", app).addEventListener("click", () => form(org ? "Add organizer" : "Add user"));
      ES.$("#q", app).addEventListener("input", ES.debounce(e => { st.q = e.target.value; load(); }));
      if (!org) ES.$("#role", app).addEventListener("change", e => { st.role = e.target.value; load(); });
      ES.on(out, "click", "[data-act]", async b => {
        const u = rows.find(x => x.id === +b.dataset.id), a = b.dataset.act;
        if (a === "edit") form("Edit " + (org ? "organizer" : "user"), u);
        else if (a === "toggle") { if (await ES.confirm({ title: u.is_active ? "Deactivate account?" : "Activate account?", message: `<b>${esc(u.name)}</b> ${u.is_active ? "will no longer be able to log in." : "will be able to log in again."}`, confirmText: u.is_active ? "Deactivate" : "Activate", danger: u.is_active })) { if (await ES.run(() => API.post(`/admin/users/${u.id}/toggle`))) load(); } }
        else if (a === "delete" && (await ES.confirm({ title: "Delete user?", message: `<b>${esc(u.name)}</b> and their registrations will be permanently deleted.`, confirmText: "Delete", danger: true }))) { if (await ES.run(() => API.del("/admin/users/" + u.id))) load(); }
      });
      await load();
    };
  }
  ES.pages["admin-users"] = userPage("users");
  ES.pages["admin-organizers"] = userPage("organizers");

  /* ---------- CATEGORIES ---------- */
  ES.pages["admin-categories"] = async app => {
    let cats = [], events = [];
    app.innerHTML = `<div class="dash-head"><div><h2>Categories</h2><p>Categories used to group and filter events.</p></div><div class="actions"><button class="btn btn-primary" id="add">${ES.icon("plus", 18)} Add Category</button></div></div><div id="out"></div>`;
    const out = ES.$("#out", app);
    const fields = [{ name: "name", label: "Category name", required: true, col: "full" }, { name: "description", label: "Description", type: "textarea", rows: 2, col: "full" }, { name: "color", label: "Color", type: "color", required: true }];
    const load = async () => { [cats, events] = [(await API.get("/categories")).data, (await API.get("/admin/events")).data];
      out.innerHTML = ES.table([{ label: "Category Name", cls: "t-title", render: c => `<b><i style="display:inline-block;width:12px;height:12px;border-radius:4px;background:${esc(c.color)};margin-right:8px"></i>${esc(c.name)}</b><small>${esc(c.slug)}</small>` },
        { label: "Description", render: c => esc(c.description || "—") }, { label: "Total Events", render: c => events.filter(e => e.category_id === c.id).length },
        { label: "Action", cls: "t-actions-cell", render: c => `<div class="t-actions">${ES.iconBtn("edit", "edit", "Edit", c.id)}${ES.iconBtn("delete", "trash", "Delete", c.id, "danger")}</div>` }], cats, "No categories."); };
    const form = (title, c) => ES.formModal({ title, size: "sm", fields, values: c || { color: "#7C3AED" }, onSubmit: async d => { const r = c ? await API.put("/admin/categories/" + c.id, d) : await API.post("/admin/categories", d); ES.toast(r.message); await load(); } });
    ES.$("#add", app).addEventListener("click", () => form("Add category"));
    ES.on(out, "click", "[data-act]", async b => { const c = cats.find(x => x.id === +b.dataset.id);
      if (b.dataset.act === "edit") form("Edit category", c);
      else if (await ES.confirm({ title: "Delete category?", message: `<b>${esc(c.name)}</b> will be deleted. Categories that still have events cannot be deleted.`, confirmText: "Delete", danger: true })) { if (await ES.run(() => API.del("/admin/categories/" + c.id))) load(); } });
    await load();
  };

  /* ---------- EVENTS (semua event) ---------- */
  ES.pages["admin-events"] = async app => {
    const [cats, orgs] = [(await API.get("/categories")).data, (await API.get("/admin/organizers")).data];
    let rows = [], st = { status: ES.q().status || "", category: "", organizer: "", q: "" };
    const sel = (id, label, opts, cur) => `<div class="field"><label for="${id}">${label}</label><select id="${id}"><option value="">All</option>${opts.map(o => `<option value="${o[0]}" ${String(o[0]) === String(cur) ? "selected" : ""}>${esc(o[1])}</option>`).join("")}</select></div>`;
    app.innerHTML = `<div class="dash-head"><div><h2>Events</h2><p>All events from all organizers.</p></div></div>
      <div class="table-tools"><div class="field grow"><label for="q">Search</label><input id="q" type="search" placeholder="Event title…"></div>
      ${sel("status", "Status", ["draft", "pending_review", "approved", "rejected", "cancelled"].map(s => [s, ES.label(s)]), st.status)}${sel("category", "Category", cats.map(c => [c.id, c.name]))}${sel("organizer", "Organizer", orgs.map(o => [o.id, o.name]))}</div><div id="out"></div>`;
    const out = ES.$("#out", app);
    const load = async () => { rows = (await API.get("/admin/events", st)).data;
      out.innerHTML = ES.table([{ label: "Event", cls: "t-title", render: e => `<b>${esc(e.title)}</b>${e.is_featured ? "<small>★ Featured</small>" : ""}` }, { label: "Organizer", render: e => esc(e.organizer?.name || "") },
        { label: "Category", render: e => esc(e.category?.name || "") }, { label: "Date", render: e => esc(ES.dateRange(e)) }, { label: "Status", render: e => ES.statusBadges(e) },
        { label: "Action", cls: "t-actions-cell", render: e => `<div class="t-actions">${ES.iconLink(ES.detailUrl(e), "eye", "View")}${e.status === "pending_review" ? ES.iconLink(ES.url("pages/admin/event-review.html") + "?id=" + e.id, "review", "Review") + ES.iconBtn("approve", "check", "Approve", e.id, "ok") + ES.iconBtn("reject", "x", "Reject", e.id, "danger") : ""}
          ${ES.iconBtn("edit", "edit", "Edit", e.id)}${e.status === "approved" ? ES.iconBtn("cancel", "ban", "Cancel event", e.id, "danger") : ""}${ES.iconBtn("delete", "trash", "Delete", e.id, "danger")}</div>` }], rows, "No events match."); };
    ["status", "category", "organizer"].forEach(k => ES.$("#" + k, app).addEventListener("change", e => { st[k] = e.target.value; load(); }));
    ES.$("#q", app).addEventListener("input", ES.debounce(e => { st.q = e.target.value; load(); }));
    bindReview(out, () => rows, load);
    ES.on(out, "click", "[data-act=edit],[data-act=cancel],[data-act=delete]", async b => {
      const e = rows.find(x => x.id === +b.dataset.id), a = b.dataset.act;
      if (a === "edit") ES.formModal({ title: "Edit event", fields: [{ name: "title", label: "Title", required: true, col: "full" }, { name: "category_id", label: "Category", type: "select", required: true, options: cats.map(c => ({ value: c.id, label: c.name })) },
        { name: "location", label: "Location", required: true }, { name: "capacity", label: "Capacity", type: "number", min: 1 }, { name: "is_featured", label: "Featured on the home page", type: "checkbox", col: "full" }], values: e,
        onSubmit: async d => { const r = await API.put("/admin/events/" + e.id, d); ES.toast(r.message); await load(); } });
      else if (a === "cancel") { if (await ES.confirm({ title: "Cancel event?", message: `<b>${esc(e.title)}</b> will be cancelled and hidden from the public list.`, confirmText: "Cancel event", danger: true })) { if (await ES.run(() => API.post(`/events/${e.id}/cancel`))) load(); } }
      else if (await ES.confirm({ title: "Delete event?", message: `<b>${esc(e.title)}</b> will be removed. Approved events with registrants must be cancelled instead.`, confirmText: "Delete", danger: true })) { if (await ES.run(() => API.del("/admin/events/" + e.id))) load(); }
    });
    await load();
  };

  /* ---------- EVENT REVIEW (antrean + detail + approve/reject + moderasi) ---------- */
  ES.pages["admin-review"] = async app => {
    let tab = "pending", list = [], sel = ES.q().id ? +ES.q().id : null, detail = null;
    app.innerHTML = `<div class="dash-head"><div><h2>Event Review</h2><p>Review submissions, then approve or reject them.</p></div></div><div class="seg"><button data-tab="pending">Pending</button><button data-tab="reviewed">Reviewed</button></div>
      <div class="cols-2" style="grid-template-columns:340px 1fr"><section class="card" id="queue" style="padding:10px 18px"></section><div id="detail"></div></div>`;
    const queue = ES.$("#queue", app), det = ES.$("#detail", app);
    function drawQueue() {
      ES.$$("[data-tab]", app).forEach(b => b.setAttribute("aria-selected", b.dataset.tab === tab));
      queue.innerHTML = list.length ? list.map(e => `<a class="ev-line" href="?id=${e.id}" data-pick="${e.id}" style="text-decoration:none;color:inherit;${e.id === sel ? "background:var(--lav);margin:0 -10px;padding-left:10px;padding-right:10px;border-radius:12px" : ""}">${ES.img(e)}<div class="grow"><b>${esc(e.title)}</b><small>${esc(e.organizer?.name || "")}</small></div>${tab === "reviewed" ? ES.badge(e.status) : ""}</a>`).join("") : `<p class="muted" style="padding:18px 6px;margin:0">${tab === "pending" ? "Nothing is waiting for review." : "No reviewed events yet."}</p>`;
    }
    async function drawDetail() {
      if (!sel) { det.innerHTML = `<div class="card">${ES.empty("Select an event from the list to review it.", "review")}</div>`; return; }
      try { detail = (await API.get("/events/" + sel)).data; } catch (e) { det.innerHTML = `<div class="card">${ES.errBox(e.message)}</div>`; return; }
      const e = detail, pend = e.status === "pending_review";
      det.innerHTML = `<div class="stack"><section class="card"><div style="display:flex;gap:18px;flex-wrap:wrap"><div style="flex:1 1 260px">${ES.img(e, "")}</div><div style="flex:2 1 300px"><div class="badge-row">${ES.statusBadges(e)}<span class="chip"><i style="background:${esc(e.category?.color || "#999")}"></i>${esc(e.category?.name || "")}</span></div>
        <h3 style="font-size:1.4rem;margin:10px 0">${esc(e.title)}</h3><div class="meta">${ES.icon("building")}<span>${esc(e.organizer?.name || "")}</span></div><div class="meta">${ES.icon("calendar")}<span>${esc(ES.dateRange(e))}, ${esc(ES.timeRange(e))}</span></div>
        <div class="meta">${ES.icon("pin")}<span>${esc(e.location)}</span></div><div class="meta">${ES.icon("users")}<span>Capacity: ${e.capacity || "unlimited"}</span></div>
        <div class="meta">${ES.icon("send")}<span>Submitted: ${esc(ES.fmtDT(e.submitted_at))}</span></div></div></div><p style="margin:16px 0 0">${esc(e.description)}</p></section>
        <section class="card"><div class="card-h"><h3>Schedule (${e.schedules.length})</h3></div>${ES.table([{ label: "Date", render: s => esc(ES.fmtDate(s.start_at)) }, { label: "Time", render: s => `${ES.fmtTime(s.start_at)} – ${ES.fmtTime(s.end_at)}` }, { label: "Title", render: s => esc(s.title) },
          { label: "Speaker / PIC", render: s => esc(s.speaker ? s.speaker.name : s.person_in_charge || "—") }, { label: "Action", cls: "t-actions-cell", render: s => ES.iconBtn("del-sch", "trash", "Remove (moderation)", s.id, "danger") }], e.schedules, "No schedule items — consider asking the organizer to add some.")}</section>
        <section class="card"><div class="card-h"><h3>Speakers (${e.speakers.length})</h3></div>${ES.table([{ label: "Name", render: s => `<b>${esc(s.name)}</b>` }, { label: "Role", render: s => esc(s.role) }, { label: "Topic", render: s => esc(s.topic || "—") },
          { label: "Action", cls: "t-actions-cell", render: s => ES.iconBtn("del-spk", "trash", "Remove (moderation)", s.id, "danger") }], e.speakers, "No speakers announced.")}</section>
        ${pend ? `<section class="card"><h3>Decision</h3><p class="muted" style="margin:6px 0 14px;font-size:.9rem">Approving publishes the event. Rejecting requires a note for the organizer.</p><div class="form-actions" style="margin-top:0"><button class="btn btn-ok" data-act="approve" data-id="${e.id}">${ES.icon("check", 18)} Approve Event</button><button class="btn btn-del" data-act="reject" data-id="${e.id}">${ES.icon("x", 18)} Reject Event</button></div></section>`
          : `<section class="card"><h3>Review result</h3><p style="margin:8px 0 0">${ES.badge(e.status)} ${e.reviewed_at ? `<small class="muted">on ${esc(ES.fmtDT(e.reviewed_at))}</small>` : ""}</p>${e.review_note ? `<div class="review-note">${esc(e.review_note)}</div>` : ""}</section>`}</div>`;
    }
    async function load() {
      const all = (await API.get("/admin/events")).data;
      list = tab === "pending" ? all.filter(e => e.status === "pending_review").sort((a, b) => a.submitted_at.localeCompare(b.submitted_at)) : all.filter(e => ["approved", "rejected"].includes(e.status) && e.reviewed_at).sort((a, b) => b.reviewed_at.localeCompare(a.reviewed_at));
      if (!list.some(e => e.id === sel)) sel = list[0] ? list[0].id : null;
      drawQueue(); await drawDetail();
    }
    ES.on(app, "click", "[data-tab]", b => { tab = b.dataset.tab; sel = null; history.replaceState(null, "", location.pathname); load(); });
    ES.on(queue, "click", "[data-pick]", (a, ev) => { ev.preventDefault(); sel = +a.dataset.pick; history.replaceState(null, "", "?id=" + sel); drawQueue(); drawDetail(); });
    ES.on(det, "click", "[data-act=approve],[data-act=reject]", async b => { if (b.dataset.act === "approve" ? await approve(detail) : await reject(detail)) { sel = null; history.replaceState(null, "", location.pathname); load(); } });
    ES.on(det, "click", "[data-act=del-sch],[data-act=del-spk]", async b => {
      const sch = b.dataset.act === "del-sch", key = sch ? "schedules" : "speakers";
      if (await ES.confirm({ title: "Remove item?", message: `This ${sch ? "schedule item" : "speaker"} will be removed from the event (moderation).`, confirmText: "Remove", danger: true })) { if (await ES.run(() => API.del(`/events/${detail.id}/${key}/${b.dataset.id}`))) drawDetail(); }
    });
    if (sel) { const e = (await API.get("/events/" + sel).catch(() => ({ data: null }))).data; if (e && e.status !== "pending_review") tab = "reviewed"; }
    await load();
  };
})();
