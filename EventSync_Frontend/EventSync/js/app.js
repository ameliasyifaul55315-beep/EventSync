/* EventSync — app.js
   Komponen UI bersama (ikon, format tanggal, badge, kartu event, toast, modal, form, tabel, shell halaman).
   Nanti di Laravel: tiap fungsi render di sini menjadi Blade component / partial (mis. <x-event-card>, <x-modal>, layouts/dashboard.blade.php). */
(function () {
  const ES = (window.ES = { pages: {} });
  const ROOT = document.body.dataset.root || "./";

  /* ---------- dasar ---------- */
  ES.url = p => ROOT + String(p).replace(/^\//, "");
  ES.esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const e_ = ES.esc;
  ES.$ = (s, r = document) => r.querySelector(s);
  ES.$$ = (s, r = document) => [...r.querySelectorAll(s)];
  ES.on = (root, type, sel, fn) => root.addEventListener(type, ev => { const t = ev.target.closest(sel); if (t && root.contains(t)) fn(t, ev); });
  ES.q = () => Object.fromEntries(new URLSearchParams(location.search));
  ES.setQ = o => { const p = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => { if (v !== "" && v != null) p.set(k, v); }); history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : "")); };
  ES.debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  ES.initials = n => String(n || "?").split(/\s+/).filter(w => /^[A-Za-z]/.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join("") || "?";

  /* ---------- ikon (gaya stroke 24px) ---------- */
  const IC = {
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z"/><circle cx="12" cy="10" r="3"/>',
    user: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>',
    ticket: '<path d="M2 9a3 3 0 010 6v2a2 2 0 002 2h16a2 2 0 002-2v-2a3 3 0 010-6V7a2 2 0 00-2-2H4a2 2 0 00-2 2z"/><path d="M13 5v2M13 11v2M13 17v2"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/>',
    logout: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>',
    dash: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>',
    mic: '<path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4"/>',
    tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L2 12V2h10l8.6 8.6a2 2 0 010 2.8z"/><circle cx="7" cy="7" r="1.5"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
    review: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M9 15l2 2 4-4"/>',
    bar: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    left: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    right: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
    home: '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/>',
    history: '<path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
    star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
    ban: '<circle cx="12" cy="12" r="10"/><path d="M4.9 4.9l14.2 14.2"/>',
    filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>'
  };
  ES.icon = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ""}</svg>`;

  /* ---------- tanggal & waktu ---------- */
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const p2 = n => String(n).padStart(2, "0");
  ES.fmtDate = (s, wd) => { const d = new Date(s); return (wd ? DAY[d.getDay()] + ", " : "") + `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
  ES.fmtTime = s => { const d = new Date(s); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  ES.fmtDT = s => s ? `${ES.fmtDate(s)}, ${ES.fmtTime(s)}` : "—";
  ES.dateRange = e => {
    const a = new Date(e.start_at), b = new Date(e.end_at);
    if (a.toDateString() === b.toDateString()) return ES.fmtDate(e.start_at, true);
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return `${a.getDate()} – ${b.getDate()} ${MON[a.getMonth()]} ${a.getFullYear()}`;
    return `${a.getDate()} ${MON[a.getMonth()]} – ${b.getDate()} ${MON[b.getMonth()]} ${b.getFullYear()}`;
  };
  ES.timeRange = e => `${ES.fmtTime(e.start_at)} – ${ES.fmtTime(e.end_at)}`;
  ES.dayKey = s => String(s).slice(0, 10);
  ES.toInputDate = s => (s ? String(s).slice(0, 10) : "");
  ES.toInputTime = s => (s ? String(s).slice(11, 16) : "");
  ES.combine = (d, t) => (d && t ? `${d}T${t}:00` : "");

  /* ---------- badge & gambar ---------- */
  const LABEL = { draft: "Draft", pending_review: "Pending Review", approved: "Approved", rejected: "Rejected", cancelled: "Cancelled", upcoming: "Upcoming", ongoing: "Ongoing", completed: "Completed",
    registered: "Registered", attended: "Attended", active: "Active", inactive: "Inactive", user: "User", organizer: "Organizer", admin: "Admin" };
  ES.label = k => LABEL[k] || k;
  ES.badge = k => `<span class="badge st-${e_(k)}">${e_(LABEL[k] || k)}</span>`;
  ES.eventBadge = ev => ES.badge(ev.lifecycle || ev.status);                       // tampilan publik
  ES.statusBadges = ev => ES.badge(ev.status) + (ev.lifecycle ? " " + ES.badge(ev.lifecycle) : "");   // tampilan manajemen
  ES.src = p => (!p ? ES.url("assets/images/poster-tech-innovation-day-2026.svg") : /^(data:|https?:)/.test(p) ? p : ES.url(p));
  ES.img = (ev, cls = "") => `<img class="${cls}" src="${e_(ES.src(ev.poster_path))}" alt="Poster ${e_(ev.title)}" data-t="${e_(ev.title)}" loading="lazy" onerror="ES.imgFail(this)">`;
  ES.imgFail = img => {
    img.onerror = null; const t = (img.dataset.t || "EventSync").slice(0, 28);
    img.src = "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5B21B6"/><stop offset="1" stop-color="#EC4899"/></linearGradient></defs><rect width="800" height="600" fill="url(#g)"/><text x="400" y="310" font-family="Georgia,serif" font-size="44" fill="#fff" text-anchor="middle">${ES.esc(t)}</text></svg>`);
  };
  ES.avatar = (name, photo, cls = "") => photo ? `<img class="avatar ${cls}" src="${e_(photo)}" alt="${e_(name)}">` : `<span class="avatar ${cls}" aria-hidden="true">${e_(ES.initials(name))}</span>`;
  ES.seatsText = ev => ev.lifecycle === "completed" ? "Event ended" : ev.is_full ? "Full" : ev.seats_left != null ? `${ev.seats_left} seats left` : "Open registration";
  ES.detailUrl = ev => ES.url("pages/event-detail.html") + "?id=" + encodeURIComponent(ev.slug);

  ES.eventCard = ev => `<article class="ev-card"><a class="ev-poster" href="${ES.detailUrl(ev)}" tabindex="-1" aria-hidden="true">${ES.img(ev)}<div class="badges">${ES.eventBadge(ev)}${ev.is_featured ? '<span class="badge st-featured">Featured</span>' : ""}</div></a>
    <div class="ev-body"><span class="chip"><i style="background:${e_(ev.category?.color || "#999")}"></i>${e_(ev.category?.name || "—")}</span>
    <h3><a href="${ES.detailUrl(ev)}">${e_(ev.title)}</a></h3>
    <div class="meta">${ES.icon("calendar")}<span>${e_(ES.dateRange(ev))}</span></div>
    <div class="meta">${ES.icon("clock")}<span>${e_(ES.timeRange(ev))}</span></div>
    <div class="meta">${ES.icon("pin")}<span>${e_(ev.location)}</span></div>
    <div class="meta">${ES.icon("building")}<span>${e_(ev.organizer?.name || "")}</span></div>
    <div class="ev-foot"><span>${e_(ES.seatsText(ev))}</span><span class="btn btn-ghost btn-sm" style="position:relative;z-index:2">View Detail</span></div></div></article>`;
  ES.empty = (msg, icon = "calendar") => `<div class="empty">${ES.icon(icon, 34)}<p style="margin:10px 0 0">${msg}</p></div>`;
  ES.loading = () => `<div class="empty">Loading…</div>`;
  ES.kpi = (icon, value, label) => `<div class="kpi"><div class="ico">${ES.icon(icon, 22)}</div><div><b>${e_(value)}</b><span>${e_(label)}</span></div></div>`;
  ES.bars = (items, empty = "No data yet.") => {
    if (!items.length) return `<p class="muted">${empty}</p>`;
    const max = Math.max(1, ...items.map(i => i.value));
    return `<div class="hbars">${items.map(i => `<div class="hbar"><span class="lbl" title="${e_(i.label)}">${e_(i.label)}</span><span class="track"><span class="fill" style="display:block;width:${(i.value / max) * 100}%;${i.color ? "background:" + e_(i.color) : ""}"></span></span><b>${i.value}</b></div>`).join("")}</div>`;
  };
  ES.table = (cols, rows, empty = "Nothing here yet.") => !rows.length ? ES.empty(empty, "list") :
    `<div class="table-wrap"><table class="rtable"><thead><tr>${cols.map(c => `<th>${c.label}</th>`).join("")}</tr></thead><tbody>${rows.map(r =>
      `<tr>${cols.map(c => `<td data-label="${e_(c.label)}" class="${c.cls || ""}"><div class="cell">${c.render(r)}</div></td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  ES.iconBtn = (act, icon, tip, id, cls = "") => `<button type="button" class="iconbtn ${cls}" data-act="${act}" data-id="${id}" data-tip="${e_(tip)}" aria-label="${e_(tip)}">${ES.icon(icon, 16)}</button>`;
  ES.iconLink = (href, icon, tip, cls = "") => `<a class="iconbtn ${cls}" href="${e_(href)}" data-tip="${e_(tip)}" aria-label="${e_(tip)}">${ES.icon(icon, 16)}</a>`;
  ES.pager = meta => meta.last_page <= 1 ? "" : `<nav class="pager" aria-label="Pagination"><button data-page="${meta.page - 1}" ${meta.page <= 1 ? "disabled" : ""} aria-label="Previous">${ES.icon("left", 16)}</button>${
    Array.from({ length: meta.last_page }, (_, i) => `<button data-page="${i + 1}" ${i + 1 === meta.page ? 'aria-current="true"' : ""}>${i + 1}</button>`).join("")}<button data-page="${meta.page + 1}" ${meta.page >= meta.last_page ? "disabled" : ""} aria-label="Next">${ES.icon("right", 16)}</button></nav>`;
  ES.errBox = msg => `<div class="notice error" role="alert">${e_(msg)}</div>`;

  /* ---------- toast ---------- */
  ES.toast = (msg, type = "ok") => {
    let box = ES.$(".toasts"); if (!box) { box = document.createElement("div"); box.className = "toasts"; box.setAttribute("aria-live", "polite"); document.body.appendChild(box); }
    const t = document.createElement("div"); t.className = "tst " + type;
    t.innerHTML = ES.icon(type === "ok" ? "check" : type === "err" ? "alert" : "info", 18) + `<span>${e_(msg)}</span>`;
    box.appendChild(t); setTimeout(() => t.remove(), type === "err" ? 5200 : 3200);
  };

  /* ---------- modal & confirm ---------- */
  ES.modal = ({ title, body, footer = "", size = "", onClose }) => {
    const prev = document.activeElement, back = document.createElement("div"); back.className = "modal-back";
    back.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${e_(title)}"><div class="modal-h"><h3>${e_(title)}</h3><button type="button" class="modal-x" data-x aria-label="Close">${ES.icon("x", 18)}</button></div><div class="modal-b">${body}</div>${footer ? `<div class="modal-f">${footer}</div>` : ""}</div>`;
    document.body.appendChild(back); document.body.style.overflow = "hidden";
    const onKey = ev => { if (ev.key === "Escape") close(); };
    const close = () => { if (!back.isConnected) return; back.remove(); if (onClose) onClose(); document.body.style.overflow = ""; document.removeEventListener("keydown", onKey); if (prev && prev.focus) prev.focus(); };
    document.addEventListener("keydown", onKey);
    back.addEventListener("mousedown", ev => { if (ev.target === back) close(); });
    ES.on(back, "click", "[data-x]", close);
    setTimeout(() => (ES.$("input:not([type=hidden]),select,textarea,button.btn", back) || {}).focus?.(), 30);
    return { el: back, root: back.firstElementChild, close };
  };
  ES.confirm = ({ title = "Are you sure?", message, confirmText = "Confirm", danger = false }) => new Promise(res => {
    let done = false; const fin = v => { if (!done) { done = true; res(v); } };
    const m = ES.modal({ title, size: "sm", body: `<p style="margin:0">${message}</p>`,
      footer: `<button type="button" class="btn btn-ghost" data-x>Cancel</button><button type="button" class="btn ${danger ? "btn-del" : "btn-primary"}" data-ok>${e_(confirmText)}</button>`, onClose: () => fin(false) });
    ES.on(m.el, "click", "[data-ok]", () => { fin(true); m.close(); });
  });

  /* ---------- form builder & validasi ---------- */
  ES.fieldHTML = f => {
    const id = "f_" + f.name, v = f.value ?? "", req = f.required ? "<em>*</em>" : "";
    let ctl;
    if (f.type === "textarea") ctl = `<textarea id="${id}" name="${f.name}" rows="${f.rows || 4}" placeholder="${e_(f.placeholder || "")}">${e_(v)}</textarea>`;
    else if (f.type === "select") ctl = `<select id="${id}" name="${f.name}">${f.placeholder !== undefined ? `<option value="">${e_(f.placeholder)}</option>` : ""}${(f.options || []).map(o => `<option value="${e_(o.value)}" ${String(o.value) === String(v) ? "selected" : ""}>${e_(o.label)}</option>`).join("")}</select>`;
    else if (f.type === "checkbox") return `<div class="field ${f.col === "full" ? "full" : ""}" data-field="${f.name}"><label class="check"><input type="checkbox" id="${id}" name="${f.name}" ${v ? "checked" : ""}> ${e_(f.label)}</label></div>`;
    else if (f.type === "file") ctl = `<input type="file" id="${id}" name="${f.name}" accept="image/*" data-value="${e_(v)}"><div class="img-prev">${v ? `<img src="${e_(ES.src(v))}" alt="">` : ""}</div>`;
    else if (f.type === "password") ctl = `<div class="pw-wrap"><input id="${id}" type="password" name="${f.name}" autocomplete="${f.autocomplete || "new-password"}" placeholder="${e_(f.placeholder || "")}"><button type="button" class="pw-toggle" aria-label="Show or hide password">${ES.icon("eye", 18)}</button></div>`;
    else ctl = `<input id="${id}" type="${f.type || "text"}" name="${f.name}" value="${e_(v)}" placeholder="${e_(f.placeholder || "")}" ${f.min != null && f.type === "number" ? `min="${f.min}"` : ""} ${f.readonly ? "readonly" : ""} autocomplete="${f.autocomplete || "off"}">`;
    return `<div class="field ${f.col === "full" ? "full" : ""}" data-field="${f.name}"><label for="${id}">${e_(f.label)}${req}</label>${ctl}${f.hint ? `<small class="hint">${e_(f.hint)}</small>` : ""}<div class="field-error" role="alert"></div></div>`;
  };
  ES.formHTML = (fields, values = {}) => fields.map(f => ES.fieldHTML({ ...f, value: values[f.name] ?? f.value })).join("");
  ES.readImage = (file, max = 800) => new Promise((res, rej) => {
    if (!file.type.startsWith("image/")) return rej(new Error("Please choose an image file."));
    if (file.size > 5 * 1024 * 1024) return rej(new Error("Image is larger than 5 MB."));
    const fr = new FileReader(); fr.onerror = () => rej(new Error("Could not read the file."));
    fr.onload = () => { const im = new Image(); im.onerror = () => rej(new Error("Invalid image."));
      im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", 0.82)); }; im.src = fr.result; };
    fr.readAsDataURL(file);
  });
  ES.bindForm = form => {
    ES.on(form, "change", "input[type=file]", async el => {
      const prev = el.parentElement.querySelector(".img-prev"); if (!el.files[0]) return;
      try { const url = await ES.readImage(el.files[0], el.name === "photo" ? 400 : 900); el.dataset.value = url; prev.innerHTML = `<img src="${url}" alt="">`; }
      catch (err) { el.value = ""; ES.toast(err.message, "err"); }
    });
    ES.on(form, "click", ".pw-toggle", b => { const i = b.parentElement.querySelector("input"); const show = i.type === "password"; i.type = show ? "text" : "password"; b.innerHTML = ES.icon(show ? "eyeoff" : "eye", 18); });
  };
  ES.collect = (form, fields) => {
    const out = {};
    fields.forEach(f => { const el = form.elements[f.name]; if (!el) return;
      out[f.name] = f.type === "checkbox" ? el.checked : f.type === "file" ? (el.dataset.value || "") : f.type === "number" ? (el.value === "" ? null : Number(el.value)) : f.type === "password" ? el.value : el.value.trim(); });
    return out;
  };
  ES.check = (fields, data) => {
    const err = {};
    fields.forEach(f => { const v = data[f.name], empty = v === "" || v == null; let m = "";
      if (f.required && empty && f.type !== "checkbox") m = "This field is required.";
      else if (!empty && f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) m = "Enter a valid email address.";
      else if (!empty && f.minLength && String(v).length < f.minLength) m = `Minimum ${f.minLength} characters.`;
      else if (!empty && f.type === "number" && f.min != null && v < f.min) m = `Must be at least ${f.min}.`;
      else if (f.validate) m = f.validate(data) || "";
      if (m) err[f.name] = m; });
    return err;
  };
  ES.showErrors = (form, errors) => {
    ES.$$(".field", form).forEach(f => { f.classList.remove("invalid"); const b = ES.$(".field-error", f); if (b) b.textContent = ""; });
    let first = null;
    // Nama field server (start_at, end_at, poster_path) berbeda dengan nama input form; petakan, dan bila tetap tidak ada, tampilkan sebagai toast.
    const ALIAS = { start_at: ["start_date", "start_time"], end_at: ["end_time", "end_date"], poster_path: ["poster", "poster_preset"] };
    Object.entries(errors || {}).forEach(([k, msg]) => {
      let f = ES.$(`.field[data-field="${k}"]`, form);
      if (!f) for (const a of ALIAS[k] || []) { f = ES.$(`.field[data-field="${a}"]`, form); if (f) break; }
      if (!f) { ES.toast(msg, "err"); return; }
      f.classList.add("invalid"); ES.$(".field-error", f).textContent = msg; first = first || f;
    });
    if (first) { const i = ES.$("input,select,textarea", first); i && i.focus({ preventScroll: false }); }
  };
  ES.formModal = ({ title, fields, values = {}, submitText = "Save", size = "", note = "", onSubmit }) => {
    const m = ES.modal({ title, size, body: `${note}<form novalidate class="fgrid">${ES.formHTML(fields, values)}</form>`,
      footer: `<button type="button" class="btn btn-ghost" data-x>Cancel</button><button type="button" class="btn btn-primary" data-save>${e_(submitText)}</button>` });
    const form = ES.$("form", m.root), btn = ES.$("[data-save]", m.root); ES.bindForm(form);
    const submit = async () => {
      const data = ES.collect(form, fields), errs = ES.check(fields, data); ES.showErrors(form, errs); if (Object.keys(errs).length) return;
      btn.classList.add("is-loading");
      try { await onSubmit(data, m); m.close(); } catch (e) { if (e.errors) ES.showErrors(form, e.errors); else ES.toast(e.message, "err"); }
      finally { btn.classList.remove("is-loading"); }
    };
    form.addEventListener("submit", ev => { ev.preventDefault(); submit(); }); btn.addEventListener("click", submit);
    return m;
  };
  /* tombol yang menjalankan aksi API: tampilkan loading, toast hasil, tangani error */
  ES.run = async (fn, okMsg) => { try { const r = await fn(); if (okMsg !== false) ES.toast(okMsg || (r && r.message) || "Done."); return r || true; } catch (e) { ES.toast(e.message, "err"); return null; } };

  /* ---------- shell halaman ---------- */
  ES.homeFor = role => ES.url(role === "admin" ? "pages/admin/dashboard.html" : role === "organizer" ? "pages/organizer/dashboard.html" : "pages/dashboard.html");
  const brand = `<a class="brand" href="${"%R%"}index.html"><span class="brand-mark">${"%I%"}</span><span>EventSync</span></a>`;
  const brandHTML = () => brand.replace("%R%", ROOT).replace("%I%", ES.icon("ticket", 20));
  const NAV = {
    user: [["dashboard", "pages/dashboard.html", "dash", "Dashboard"], ["my-events", "pages/my-events.html", "ticket", "My Events"], ["events", "pages/events.html", "search", "Browse Events"], ["profile", "pages/profile.html", "user", "Profile"]],
    organizer: [["dashboard", "pages/organizer/dashboard.html", "dash", "Dashboard"], ["events", "pages/organizer/events.html", "calendar", "My Events"], ["create", "pages/organizer/create-event.html", "plus", "Create Event"],
      ["schedule", "pages/organizer/schedule.html", "clock", "Schedule"], ["speakers", "pages/organizer/speakers.html", "mic", "Speakers & Committee"], ["participants", "pages/organizer/participants.html", "users", "Participants"],
      ["-"], ["site", "index.html", "home", "Public Site"], ["profile", "pages/profile.html", "user", "Profile"]],
    admin: [["dashboard", "pages/admin/dashboard.html", "dash", "Dashboard"], ["users", "pages/admin/users.html", "users", "Users"], ["organizers", "pages/admin/organizers.html", "building", "Organizers"],
      ["categories", "pages/admin/categories.html", "tag", "Categories"], ["events", "pages/admin/events.html", "calendar", "Events"], ["review", "pages/admin/event-review.html", "review", "Event Review"],
      ["-"], ["site", "index.html", "home", "Public Site"], ["profile", "pages/profile.html", "user", "Profile"]]
  };
  const ROLE_NAME = { user: "Participant", organizer: "Organizer", admin: "Administrator" };

  ES.mountPublic = () => {
    const u = Auth.user(), page = document.body.dataset.page;
    const link = (key, href, text) => `<a href="${ES.url(href)}" ${page === key ? 'aria-current="page"' : ""}>${text}</a>`;
    ES.$("#site-header").innerHTML = `<header class="site-header"><div class="container">${brandHTML()}
      <button class="nav-toggle" aria-label="Toggle menu" aria-expanded="false" aria-controls="nav">${ES.icon("menu", 22)}</button>
      <nav class="nav" id="nav" aria-label="Main">${link("home", "index.html", "Home")}${link("events", "pages/events.html", "Events")}${link("schedule", "pages/schedule.html", "Schedule")}${link("speakers", "pages/speakers.html", "Speakers")}
      ${u ? `<a href="${ES.homeFor(u.role)}">Dashboard</a><a class="nav-user" href="${ES.url("pages/profile.html")}">${ES.avatar(u.name)}<span>${e_(u.name.split(" ")[0])}</span></a><button type="button" class="linklike" data-logout>Logout</button>`
           : `${link("login", "pages/login.html", "Login")}<a class="btn" href="${ES.url("pages/register.html")}">Register</a>`}</nav></div></header>`;
    ES.$("#site-footer").innerHTML = `<footer class="site-footer"><div class="container"><div>${brandHTML()}<br>Event Management &amp; Scheduling System. Frontend prototype for an academic project — all data is sample data.</div>
      <div><b>Explore</b><ul><li><a href="${ES.url("pages/events.html")}">Events</a></li><li><a href="${ES.url("pages/schedule.html")}">Schedule</a></li><li><a href="${ES.url("pages/speakers.html")}">Speakers</a></li></ul></div>
      <div><b>Account</b><ul>${u ? `<li><a href="${ES.homeFor(u.role)}">Dashboard</a></li>` : `<li><a href="${ES.url("pages/login.html")}">Login</a></li><li><a href="${ES.url("pages/register.html")}">Register</a></li>`}${API.mode === "local" ? '<li><a href="#" data-reset>Reset demo data</a></li>' : ""}</ul></div></div></footer>`;
    const nav = ES.$("#nav"), tg = ES.$(".nav-toggle");
    tg.addEventListener("click", () => { const o = nav.classList.toggle("open"); tg.setAttribute("aria-expanded", o); });
    const hdr = ES.$(".site-header"); addEventListener("scroll", () => hdr.classList.toggle("scrolled", scrollY > 8), { passive: true });
    return ES.$("#app");
  };

  ES.mountDash = () => {
    const u = Auth.user(), b = document.body, role = u.role, active = b.dataset.nav, title = b.dataset.title || "Dashboard";
    const items = (NAV[role] || NAV.user).map(n => n[0] === "-" ? "<hr>" :
      `<a href="${ES.url(n[1])}" ${n[0] === active ? 'aria-current="page"' : ""}>${ES.icon(n[2], 19)}<span class="sb-label">${n[3]}</span>${n[0] === "review" ? '<span class="sb-count" id="pend-count" hidden></span>' : ""}</a>`).join("");
    ES.$("#shell").innerHTML = `<div class="dash"><aside class="sidebar" id="sidebar" aria-label="Sidebar">${brandHTML()}<div class="sb-role">${ROLE_NAME[role]}</div><nav class="sb-nav">${items}<span style="flex:1"></span><hr><button type="button" data-logout>${ES.icon("logout", 19)}<span class="sb-label">Logout</span></button></nav></aside>
      <div class="sb-backdrop" data-sb-close></div>
      <div class="dash-main"><header class="topbar"><button type="button" class="sb-toggle" id="sb-toggle" aria-label="Toggle sidebar" aria-controls="sidebar">${ES.icon("menu", 20)}</button><h1>${e_(title)}</h1>
        <a class="top-user" href="${ES.url("pages/profile.html")}" title="Profile">${ES.avatar(u.name)}<div>${e_(u.name)}<small>${ROLE_NAME[role]}</small></div></a></header>
        <main class="dash-content" id="app"></main></div></div>`;
    const mobile = () => matchMedia("(max-width:900px)").matches;
    ES.$("#sb-toggle").addEventListener("click", () => b.classList.toggle(mobile() ? "sb-open" : "sb-collapsed"));
    ES.on(b, "click", "[data-sb-close]", () => b.classList.remove("sb-open"));
    addEventListener("resize", () => { if (!mobile()) b.classList.remove("sb-open"); });
    if (role === "admin") API.get("/admin/events", { status: "pending_review" }).then(r => { const c = ES.$("#pend-count"); if (c && r.data.length) { c.textContent = r.data.length; c.hidden = false; } }).catch(() => {});
    return ES.$("#app");
  };

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", async () => {
    const b = document.body, roles = (b.dataset.roles || "").split(",").filter(Boolean);
    if (roles.length && !Auth.guard(roles)) return;
    const app = b.dataset.layout === "dash" ? ES.mountDash() : ES.mountPublic();
    ES.on(document, "click", "[data-logout]", async () => { await Auth.logout(); location.href = ES.url("pages/login.html?loggedout=1"); });
    ES.on(document, "click", "[data-reset]", async (t, ev) => { ev.preventDefault(); if (await ES.confirm({ title: "Reset demo data?", message: "All demo data and the current login will be restored to the original sample data.", confirmText: "Reset", danger: true })) { API.reset(); location.href = ES.url("index.html"); } });
    const fn = ES.pages[b.dataset.page];
    if (fn) { try { await fn(app); } catch (e) { console.error(e); app.innerHTML = ES.errBox(e.message || "Something went wrong."); } }
  });
})();
