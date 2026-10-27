/* EventSync — auth.js
   Autentikasi SEMENTARA (dummy/local). Berisi objek Auth (token + user yang sedang login) dan halaman Login & Register.
   PENTING: ini hanya simulasi untuk frontend. Pengecekan role di sini cuma untuk mengarahkan tampilan;
   keamanan sebenarnya (hash password, session/token, otorisasi) dilakukan di backend Laravel. */
(function () {
  const C = ES_CONFIG;
  const Auth = (window.Auth = {
    read() { try { return JSON.parse(localStorage.getItem(C.AUTH_KEY) || sessionStorage.getItem(C.AUTH_KEY) || "null"); } catch (e) { return null; } },
    user() { const a = this.read(); return a && a.user; },
    clear() { localStorage.removeItem(C.AUTH_KEY); sessionStorage.removeItem(C.AUTH_KEY); },
    save(data, remember) { this.clear(); (remember ? localStorage : sessionStorage).setItem(C.AUTH_KEY, JSON.stringify(data)); },
    async login(email, password, remember) {
      const r = await API.post("/auth/login", { email, password });      // Laravel: POST /api/auth/login  -> { token, user }
      this.save({ token: r.token, user: r.user }, remember); return r.user;
    },
    async logout() { try { await API.post("/auth/logout"); } catch (e) { /* token sudah tidak valid */ } this.clear(); },
    updateUser(u) { const a = this.read(); if (!a) return; a.user = u; (localStorage.getItem(C.AUTH_KEY) ? localStorage : sessionStorage).setItem(C.AUTH_KEY, JSON.stringify(a)); },
    /* guard halaman: belum login -> /login ; role salah -> dashboard role sendiri */
    guard(roles) {
      const u = this.user();
      if (!u) { location.replace(ES.url("pages/login.html") + "?next=" + encodeURIComponent(location.pathname + location.search)); return false; }
      if (!roles.includes(u.role)) { location.replace(ES.homeFor(u.role)); return false; }
      return true;
    }
  });
  /* cek token ke "server" setiap halaman dimuat; bila tidak valid -> logout otomatis */
  document.addEventListener("DOMContentLoaded", () => {
    if (!Auth.user()) return;
    API.get("/auth/me").then(r => Auth.updateUser(r.data)).catch(e => { if (e.status === 401 || e.status === 403) { Auth.clear(); location.replace(ES.url("pages/login.html")); } });
  });

  const safeNext = n => (n && /^\/[^/]/.test(n) && !/login|register/.test(n) ? n : null);

  /* ---------- Login ---------- */
  ES.pages.login = app => {
    const q = ES.q(), u = Auth.user();
    if (u) { location.replace(ES.homeFor(u.role)); return; }
    const fields = [
      { name: "email", label: "Email", type: "email", required: true, col: "full", placeholder: "you@example.com", autocomplete: "username" },
      { name: "password", label: "Password", type: "password", required: true, col: "full", autocomplete: "current-password" },
      { name: "remember", label: "Remember me on this device", type: "checkbox", col: "full" }];
    const demo = [["Admin", "admin@example.test"], ["Organizer", "community@example.test"], ["Participant", "budi@example.test"]];
    app.innerHTML = `<section class="auth"><aside class="auth-side"><span class="eyebrow" style="align-self:flex-start"><i></i>EventSync</span><h2>Plan, schedule and join events in one place.</h2>
      <p>Organizers build events and schedules, admins review them, and participants register — all in one workflow.</p></aside>
      <div class="auth-form"><div class="auth-box"><h1>Welcome back</h1><p class="muted">Log in to continue.</p><div id="msg"></div>
      <form id="lf" novalidate>${ES.formHTML(fields)}<button class="btn btn-primary" style="width:100%;justify-content:center" type="submit">Login</button></form>
      <p style="margin:16px 0 0;text-align:center" class="muted">No account yet? <a href="${ES.url("pages/register.html")}">Register</a></p>
      ${C.SHOW_DEMO_ACCOUNTS ? `<div class="demo-box"><b>Demo accounts</b><div class="demo-btns">${demo.map(d => `<button type="button" class="btn btn-ghost btn-sm" data-demo="${d[1]}">${d[0]}</button>`).join("")}</div>
      <small>${API.mode === "remote" ? "Development accounts created by the database seeder" : "Local demo accounts (browser only, no server)"}. They share the dummy password <code>${ES.esc(C.DEMO_PASSWORD)}</code>. Never seed them on a production server.</small></div>` : ""}</div></div></section>`;
    const msg = ES.$("#msg", app), form = ES.$("#lf", app);
    if (q.registered) msg.innerHTML = `<div class="notice" style="background:#ECFDF5;border-color:#A7F3D0;color:#065F46">Registration successful. Please log in.</div>`;
    else if (q.loggedout) msg.innerHTML = `<div class="notice" style="background:#EEF2FF;border-color:#C7D2FE;color:#3730A3">You have been logged out.</div>`;
    else if (q.next) msg.innerHTML = `<div class="notice">Please log in to continue.</div>`;
    if (q.email) form.elements.email.value = q.email;
    ES.bindForm(form);
    ES.on(app, "click", "[data-demo]", b => { form.elements.email.value = b.dataset.demo; form.elements.password.value = C.DEMO_PASSWORD; ES.showErrors(form, {}); });
    form.addEventListener("submit", async ev => {
      ev.preventDefault(); const data = ES.collect(form, fields), errs = ES.check(fields, data); ES.showErrors(form, errs); if (Object.keys(errs).length) return;
      const btn = ES.$("button[type=submit]", form); btn.classList.add("is-loading");
      try { const user = await Auth.login(data.email, data.password, data.remember); location.href = safeNext(q.next) || ES.homeFor(user.role); }
      catch (e) { if (e.errors) ES.showErrors(form, e.errors); else msg.innerHTML = ES.errBox(e.message); btn.classList.remove("is-loading"); }
    });
  };

  /* ---------- Register (role default = user) ---------- */
  ES.pages.register = app => {
    if (Auth.user()) { location.replace(ES.homeFor(Auth.user().role)); return; }
    const fields = [
      { name: "name", label: "Full name", required: true, col: "full", minLength: 2, autocomplete: "name" },
      { name: "email", label: "Email", type: "email", required: true, col: "full", autocomplete: "email" },
      { name: "password", label: "Password", type: "password", required: true, col: "full", minLength: 8, hint: "At least 8 characters." },
      { name: "password_confirmation", label: "Confirm password", type: "password", required: true, col: "full", validate: d => (d.password !== d.password_confirmation ? "Passwords do not match." : "") }];
    app.innerHTML = `<section class="auth"><aside class="auth-side"><span class="eyebrow" style="align-self:flex-start"><i></i>Join EventSync</span><h2>Find your next event.</h2>
      <p>Create a free participant account to register for events, follow schedules and keep track of everything you attend.</p></aside>
      <div class="auth-form"><div class="auth-box"><h1>Create account</h1><p class="muted">New accounts are participant accounts. Organizer and admin accounts are created by an administrator.</p><div id="msg"></div>
      <form id="rf" novalidate>${ES.formHTML(fields)}<button class="btn btn-primary" style="width:100%;justify-content:center" type="submit">Register</button></form>
      <p style="margin:16px 0 0;text-align:center" class="muted">Already registered? <a href="${ES.url("pages/login.html")}">Login</a></p></div></div></section>`;
    const form = ES.$("#rf", app), msg = ES.$("#msg", app); ES.bindForm(form);
    form.addEventListener("submit", async ev => {
      ev.preventDefault(); const data = ES.collect(form, fields), errs = ES.check(fields, data); ES.showErrors(form, errs); if (Object.keys(errs).length) return;
      const btn = ES.$("button[type=submit]", form); btn.classList.add("is-loading");
      try { await API.post("/auth/register", data); location.href = ES.url("pages/login.html") + "?registered=1&email=" + encodeURIComponent(data.email); }
      catch (e) { if (e.errors) ES.showErrors(form, e.errors); else msg.innerHTML = ES.errBox(e.message); btn.classList.remove("is-loading"); }
    });
  };
})();
