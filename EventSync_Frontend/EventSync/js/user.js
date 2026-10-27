/* EventSync — user.js
   Halaman area peserta: Dashboard, My Events (upcoming + history), Profile (dipakai semua role). */
(function () {
  const esc = ES.esc;
  const isUpcoming = r => r.status === "registered" && ["upcoming", "ongoing"].includes(r.event.lifecycle);
  const regBadge = r => ES.badge(r.status) + (r.event.lifecycle ? " " + ES.badge(r.event.lifecycle) : "");
  const line = r => `<div class="ev-line">${ES.img(r.event)}<div class="grow"><b><a href="${ES.detailUrl(r.event)}" style="text-decoration:none;color:inherit">${esc(r.event.title)}</a></b><small>${esc(ES.dateRange(r.event))} · ${esc(r.event.location)}</small></div>${regBadge(r)}</div>`;

  /* cancel registration dipakai di dashboard & my-events */
  async function cancelFlow(ev) {
    if (!(await ES.confirm({ title: "Cancel registration?", message: `You will no longer be registered for <b>${esc(ev.title)}</b>.`, confirmText: "Cancel registration", danger: true }))) return false;
    return !!(await ES.run(() => API.del(`/events/${ev.id}/register`)));
  }

  ES.pages["user-dashboard"] = async app => {
    const u = Auth.user(), rows = (await API.get("/my-events")).data;
    const up = rows.filter(isUpcoming).sort((a, b) => a.event.start_at.localeCompare(b.event.start_at)), hist = rows.filter(r => !isUpcoming(r));
    app.innerHTML = `<div class="dash-head"><div><h2>Welcome back, ${esc(u.name.split(" ")[0])}!</h2><p>Here is what is coming up for you.</p></div><div class="actions"><a class="btn btn-primary" href="${ES.url("pages/events.html")}">${ES.icon("search", 18)} Browse Events</a></div></div>
      <div class="kpis">${ES.kpi("ticket", up.length, "Upcoming registrations")}${ES.kpi("check", rows.filter(r => r.status === "attended").length, "Events attended")}${ES.kpi("history", hist.length, "In history")}${ES.kpi("ban", rows.filter(r => r.status === "cancelled").length, "Cancelled")}</div>
      <div class="cols-2"><section class="card"><div class="card-h"><h3>Upcoming registered events</h3><a href="${ES.url("pages/my-events.html")}" class="btn btn-ghost btn-sm">My Events</a></div>
        ${up.length ? up.map(line).join("") : ES.empty(`You have no upcoming registrations. <a href="${ES.url("pages/events.html")}">Find an event</a>`)}</section>
        <div class="stack"><section class="card"><div class="card-h"><h3>Event history</h3></div>${hist.length ? hist.slice(0, 4).map(line).join("") : '<p class="muted" style="margin:0">Your past and cancelled events will appear here.</p>'}</section>
        <section class="card"><div style="display:flex;gap:14px;align-items:center">${ES.avatar(u.name)}<div style="flex:1"><b>${esc(u.name)}</b><br><small class="muted">${esc(u.email)}</small></div><a class="btn btn-ghost btn-sm" href="${ES.url("pages/profile.html")}">Profile</a></div></section></div></div>`;
  };

  ES.pages["my-events"] = async app => {
    let tab = ES.q().tab === "history" ? "history" : "upcoming", rows = [];
    app.innerHTML = `<div class="dash-head"><div><h2>My Events</h2><p>Events you registered for and your event history.</p></div></div><div class="seg" role="tablist"><button role="tab" data-tab="upcoming">Upcoming</button><button role="tab" data-tab="history">History</button></div><div id="out"></div>`;
    const out = ES.$("#out", app);
    function draw() {
      ES.$$("[data-tab]", app).forEach(b => b.setAttribute("aria-selected", b.dataset.tab === tab));
      const list = rows.filter(r => (tab === "upcoming") === isUpcoming(r));
      out.innerHTML = `<div style="margin-top:16px">${ES.table([
        { label: "Event", cls: "t-title", render: r => `<b><a href="${ES.detailUrl(r.event)}" style="text-decoration:none">${esc(r.event.title)}</a></b><small>${esc(r.event.category?.name || "")}</small>` },
        { label: "Date", render: r => esc(ES.dateRange(r.event)) }, { label: "Location", render: r => esc(r.event.location) },
        { label: "Registered on", render: r => esc(ES.fmtDate(r.registered_at)) }, { label: "Status", render: regBadge },
        { label: "Action", cls: "t-actions-cell", render: r => `<div class="t-actions">${ES.iconLink(ES.detailUrl(r.event), "eye", "View event")}${r.status === "registered" && r.event.lifecycle === "upcoming" ? ES.iconBtn("cancel", "x", "Cancel registration", r.event.id, "danger") : ""}</div>` }],
        list, tab === "upcoming" ? "No upcoming registrations yet." : "No history yet.")}</div>`;
    }
    const load = async () => { rows = (await API.get("/my-events")).data; draw(); };
    ES.on(app, "click", "[data-tab]", b => { tab = b.dataset.tab; ES.setQ({ tab: tab === "history" ? "history" : "" }); draw(); });
    ES.on(app, "click", "[data-act=cancel]", async b => { const r = rows.find(x => x.event.id === +b.dataset.id); if (await cancelFlow(r.event)) load(); });
    await load();
  };

  ES.pages.profile = async app => {
    const me = (await API.get("/auth/me")).data;
    const pf = [{ name: "name", label: "Full name", required: true, minLength: 2, col: "full" }, { name: "email", label: "Email", type: "email", readonly: true, col: "full", hint: "Email cannot be changed in this prototype." },
      { name: "phone", label: "Phone", col: "full", placeholder: "08xx-xxxx-xxxx" }];
    if (me.role === "organizer") pf.splice(2, 0, { name: "organization_name", label: "Organization", readonly: true, col: "full", hint: "Set by an administrator." });
    const wf = [{ name: "current_password", label: "Current password", type: "password", required: true, col: "full", autocomplete: "current-password" },
      { name: "password", label: "New password", type: "password", required: true, minLength: 8, col: "full" },
      { name: "password_confirmation", label: "Confirm new password", type: "password", required: true, col: "full", validate: d => (d.password !== d.password_confirmation ? "Passwords do not match." : "") }];
    app.innerHTML = `<div class="dash-head"><div><h2>Manage Profile</h2><p>Update your personal information and password.</p></div></div>
      <div class="cols-2" style="grid-template-columns:1.2fr 1fr"><div class="stack">
        <section class="card"><h3>Personal information</h3><form id="pf" novalidate class="fgrid" style="margin-top:14px">${ES.formHTML(pf, me)}<div class="field full"><button class="btn btn-primary" type="submit">Save profile</button></div></form></section>
        <section class="card"><h3>Change password</h3><form id="wf" novalidate class="fgrid" style="margin-top:14px">${ES.formHTML(wf)}<div class="field full"><button class="btn btn-primary" type="submit">Update password</button></div></form></section></div>
        <section class="card"><h3>Account</h3><div class="person">${ES.avatar(me.name)}<div><b>${esc(me.name)}</b><small>${esc(me.email)}</small></div></div>
          <p style="margin:14px 0 6px">Role: ${ES.badge(me.role)}</p><p class="muted" style="margin:0;font-size:.88rem">Member since ${esc(ES.fmtDate(me.created_at))}</p>
          <p class="muted" style="margin:14px 0 0;font-size:.82rem">Prototype note: passwords are never stored as plain text here, but real security is handled by the Laravel backend.</p></section></div>`;
    const bind = (id, fields, call, after) => {
      const f = ES.$(id, app); ES.bindForm(f);
      f.addEventListener("submit", async ev => { ev.preventDefault(); const d = ES.collect(f, fields), er = ES.check(fields, d); ES.showErrors(f, er); if (Object.keys(er).length) return;
        try { const r = await call(d); ES.toast(r.message); after && after(r, f); } catch (e) { if (e.errors) ES.showErrors(f, e.errors); else ES.toast(e.message, "err"); } });
    };
    bind("#pf", pf, d => API.put("/profile", { name: d.name, phone: d.phone }), r => { Auth.updateUser(r.data); ES.$(".top-user").innerHTML = `${ES.avatar(r.data.name)}<div>${esc(r.data.name)}<small>${esc(ES.label(r.data.role))}</small></div>`; });
    bind("#wf", wf, d => API.put("/profile/password", d), (r, f) => f.reset());
  };
})();
