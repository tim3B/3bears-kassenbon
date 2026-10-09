/*
 * bears-signal.js — the 3Bears Signal widget for tools that are not Next.js
 * apps (Order Intake, Planning, Sales, Kassenbon, AI Hub). #80, Tim 09.10.2026:
 * "All tools should have the Signal function and standard implemented."
 *
 * The standard is docs/SIGNAL_STANDARD.md in tim3B/3bears-cockpit; the cockpit
 * is the reference. This file is copied verbatim into each tool — change it in
 * one place, copy it to all (the header comment carries the version).
 *
 * Version 1 · 09.10.2026
 *
 * USE
 *   <script src="/bears-signal.js" defer><\/script>  (in <head>)
 *   <bears-signal endpoint="/.netlify/functions/signal"></bears-signal>   (in the header)
 *   window.bearsSignalToken = async () => "<the signed-in user's access token>";
 * Optional attributes: lang="de|en" (default: <html lang>, else de),
 *   banner-target="<css selector>" (where the missing-data strip goes;
 *   default: top of <body>).
 *
 * The endpoint returns { rows: [...], checkedAt } with rows in the standard
 * shape: feed_code, label_de, label_en, cadence, latest_date, loaded_at, status
 * ('fresh' | 'due' | 'stale' | 'old' | 'none' | 'annual').
 *
 * Levels (the standard, §3): fresh = green; due = amber ("due today, not
 * loaded"); stale / old / none = RED "Data missing"; annual = muted; a failed
 * read = grey, never a fabricated green. Read on load and every 15 minutes.
 * On screen only.
 */
(function () {
  if (customElements.get("bears-signal")) return;

  const REFRESH_MS = 15 * 60 * 1000;
  const T = {
    de: {
      button: "Signal", title: "Signal", checked: "Geprüft {time} · aktualisiert alle 15 Min.",
      all: "Alle {n} Datenquellen aktuell", ok: "{ok} von {n} aktuell", due: "{n} heute fällig", missing: "{n} fehlen",
      unavailable: "Signal ist gerade nicht verfügbar. Bitte Seite neu laden.", loading: "Prüfe Datenquellen…",
      colFeed: "Datenquelle", colUpTo: "Daten bis", colLoaded: "Geladen", colStatus: "Status",
      sOk: "Aktuell", sDue: "Heute fällig – nicht geladen", sMissing: "Daten fehlen", sNone: "Keine Daten", sAnnual: "Jährlich",
      kOk: "Aktuell", kDue: "Fällig", kMissing: "Daten fehlen",
      note: "Bewertet wird das Alter der Daten, nicht ob ein Job gelaufen ist.",
      bTitle: "Daten fehlen", bUpTo: "Daten bis {date}", bNo: "keine Daten",
      bBody: "Zahlen, die diese Daten nutzen, sind unvollständig, bis sie geladen sind. Details in Signal.",
      close: "Schließen",
    },
    en: {
      button: "Signal", title: "Signal", checked: "Checked {time} · refreshes every 15 min",
      all: "All {n} data feeds up to date", ok: "{ok} of {n} up to date", due: "{n} due today", missing: "{n} missing",
      unavailable: "Signal is unavailable right now. Reload the page to try again.", loading: "Checking data feeds…",
      colFeed: "Feed", colUpTo: "Data up to", colLoaded: "Loaded", colStatus: "Status",
      sOk: "Up to date", sDue: "Due today – not loaded", sMissing: "Data missing", sNone: "No data", sAnnual: "Annual",
      kOk: "Up to date", kDue: "Due", kMissing: "Data missing",
      note: "Judged on the age of the data, not on whether a job ran.",
      bTitle: "Data missing", bUpTo: "data up to {date}", bNo: "no data",
      bBody: "Figures that use this data are incomplete until it loads. Details in Signal.",
      close: "Close",
    },
  };

  const level = (s) =>
    s === "fresh" ? "ok" : s === "due" ? "late" : s === "annual" ? "annual" : "out"; // stale/old/none = out
  const fill = (t, v) => t.replace(/\{(\w+)\}/g, (_, k) => (v[k] == null ? "" : String(v[k])));
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const CSS = `
    :host { --ok:#1d7f4e; --warn:#b97e14; --break:#b3362b; --muted:#6E665A; --fg:#23201B; --bg:#ffffff; --line:#E4DFD5; --head:#F5F3EE;
            position: relative; display: inline-block; font: 14px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--fg); }
    @media (prefers-color-scheme: dark) {
      :host { --ok:#5CC28C; --warn:#E0A84A; --break:#EE7A6E; --muted:#A8A093; --fg:#EDE8DE; --bg:#1E1B16; --line:#34302A; --head:#15130F; }
    }
    button.sig { display:flex; align-items:center; gap:8px; padding:5px 10px; border:1px solid var(--line); border-radius:6px;
                 background: var(--bg); color: var(--fg); font: inherit; cursor: pointer; line-height: 1; }
    button.sig:focus-visible, button.x:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
    .dot { display:inline-block; width:8px; height:8px; border-radius:50%; flex-shrink:0; }
    .badge { font-size: 12px; }
    .panel { position:absolute; right:0; top:calc(100% + 8px); z-index: 9999; width: min(40rem, calc(100vw - 2rem));
             background: var(--bg); color: var(--fg); border:1px solid var(--line); border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,.18); }
    .hd { display:flex; justify-content:space-between; align-items:center; gap:12px; padding: 10px 14px; border-bottom:1px solid var(--line); }
    .hd b { font-size: 15px; }
    .hd span { font-size: 12px; color: var(--muted); display:flex; gap:10px; align-items:center; }
    button.x { border:0; background:none; color: inherit; font-size:16px; cursor:pointer; padding:0 4px; }
    .sum { padding: 8px 14px; border-bottom:1px solid var(--line); }
    .pill { display:inline-flex; align-items:center; gap:6px; padding:3px 8px; border-radius:6px; font-size:13px; font-weight:600; }
    .body { max-height: 60vh; overflow:auto; }
    table { width:100%; border-collapse: collapse; font-size: 13px; }
    th { text-align:left; font-weight:500; font-size:12px; color: var(--muted); padding: 8px 14px 4px; }
    td { padding: 7px 14px; border-top: 1px solid var(--line); vertical-align: middle; }
    td.num { white-space: nowrap; font-variant-numeric: tabular-nums; }
    td.muted { color: var(--muted); }
    .st { display:inline-flex; align-items:center; gap:6px; padding:2px 8px; border-radius:6px; font-size:12px; font-weight:600; white-space:nowrap; }
    .ft { display:flex; flex-wrap:wrap; gap:6px 14px; align-items:center; padding: 8px 14px; border-top:1px solid var(--line); font-size:12px; color: var(--muted); }
    .ft .k { display:flex; align-items:center; gap:6px; }
    .ft .n { margin-left:auto; }
    .msg { padding: 14px; color: var(--muted); }
    @media (max-width: 520px) { .hide-sm { display:none; } }
  `;

  const BANNER_CSS = `
    .bears-signal-banner { margin: 8px 12px 12px; padding: 8px 12px; border: 1px solid #b3362b; border-radius: 6px;
      background: rgba(179,54,43,.10); color: inherit; font: 14px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif;
      display:flex; flex-wrap:wrap; gap:4px 12px; align-items:flex-start; }
    .bears-signal-banner .t { color:#b3362b; font-weight:600; display:flex; align-items:center; gap:8px; }
    .bears-signal-banner .t i { display:inline-block; width:8px; height:8px; border-radius:50%; background:#b3362b; }
    .bears-signal-banner .m { flex:1; min-width:0; }
    .bears-signal-banner .m small { display:block; opacity:.75; font-size:12px; }
    @media (prefers-color-scheme: dark) {
      .bears-signal-banner { border-color:#EE7A6E; background: rgba(238,122,110,.12); }
      .bears-signal-banner .t { color:#EE7A6E; } .bears-signal-banner .t i { background:#EE7A6E; }
    }
  `;

  class BearsSignal extends HTMLElement {
    constructor() {
      super();
      this.root = this.attachShadow({ mode: "open" });
      this.data = null; // { rows, checkedAt } — rows null = read failed
      this.open = false;
      this.onDoc = (e) => { if (this.open && !e.composedPath().includes(this)) { this.open = false; this.render(); } };
      this.onKey = (e) => { if (e.key === "Escape" && this.open) { this.open = false; this.render(); } };
    }
    get lang() {
      const l = (this.getAttribute("lang") || document.documentElement.lang || "de").slice(0, 2).toLowerCase();
      return l === "en" ? "en" : "de";
    }
    get t() { return T[this.lang]; }
    connectedCallback() {
      this.render();
      this.load();
      this.timer = setInterval(() => this.load(), REFRESH_MS);
      document.addEventListener("mousedown", this.onDoc);
      document.addEventListener("keydown", this.onKey);
    }
    disconnectedCallback() {
      clearInterval(this.timer);
      document.removeEventListener("mousedown", this.onDoc);
      document.removeEventListener("keydown", this.onKey);
      this.banner && this.banner.remove();
    }
    async load() {
      const endpoint = this.getAttribute("endpoint") || "/.netlify/functions/signal";
      try {
        const headers = {};
        const getTok = window.bearsSignalToken;
        const tok = typeof getTok === "function" ? await getTok() : null;
        if (tok) headers.Authorization = "Bearer " + tok;
        const res = await fetch(endpoint, { headers, cache: "no-store" });
        const body = await res.json();
        this.data = { rows: res.ok && Array.isArray(body.rows) ? body.rows : null, checkedAt: new Date(body.checkedAt || Date.now()) };
      } catch (_) {
        this.data = { rows: null, checkedAt: new Date() };
      }
      this.render();
    }
    fmtDay(iso, cadence) {
      if (!iso) return "—";
      const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
      const loc = this.lang === "de" ? "de-DE" : "en-GB";
      return cadence === "monthly"
        ? d.toLocaleDateString(loc, { month: "short", year: "numeric" })
        : d.toLocaleDateString(loc, { day: "2-digit", month: "2-digit" });
    }
    fmtStamp(iso) {
      if (!iso) return "—";
      const d = new Date(iso);
      const loc = this.lang === "de" ? "de-DE" : "en-GB";
      return d.toLocaleDateString(loc, { day: "2-digit", month: "2-digit" }) + ", " + d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit" });
    }
    summary() {
      const rows = this.data && this.data.rows;
      const s = { level: "unknown", total: 0, ok: 0, late: 0, out: 0, annual: 0 };
      if (!rows || rows.length === 0) return s;
      for (const r of rows) {
        s.total++;
        const l = level(r.status);
        if (l === "annual") s.annual++; else s[l]++;
      }
      s.level = s.out ? "out" : s.late ? "late" : "ok";
      return s;
    }
    colour(l) { return l === "ok" ? "var(--ok)" : l === "late" ? "var(--warn)" : l === "out" ? "var(--break)" : "var(--muted)"; }
    render() {
      const t = this.t;
      const s = this.summary();
      const loading = this.data === null;
      const c = loading ? "var(--muted)" : this.colour(s.level);
      const badge = s.level === "out" ? fill(t.missing, { n: s.out }) : s.level === "late" ? fill(t.due, { n: s.late }) : "";
      let html = `<style>${CSS}</style>
        <button class="sig" type="button" aria-haspopup="dialog" aria-expanded="${this.open}" title="${esc(badge ? t.button + " · " + badge : t.button)}"
          style="border-color:${s.level === "out" || s.level === "late" ? c : "var(--line)"}">
          <span class="dot" style="background:${c}"></span><b style="font-weight:500">${esc(t.button)}</b>
          ${badge ? `<span class="badge hide-sm" style="color:${c}">· ${esc(badge)}</span>` : ""}
        </button>`;
      if (this.open) html += this.panelHtml(s);
      this.root.innerHTML = html;
      this.root.querySelector("button.sig").onclick = () => {
        this.open = !this.open;
        if (this.open && this.data && Date.now() - this.data.checkedAt.getTime() > 60000) this.load();
        this.render();
      };
      const x = this.root.querySelector("button.x");
      if (x) x.onclick = () => { this.open = false; this.render(); };
      this.renderBanner();
    }
    panelHtml(s) {
      const t = this.t;
      const hd = `<div class="hd"><b>${esc(t.title)}</b><span>${this.data ? esc(fill(t.checked, { time: this.data.checkedAt.toLocaleTimeString(this.lang === "de" ? "de-DE" : "en-GB", { hour: "2-digit", minute: "2-digit" }) })) : ""}<button class="x" type="button" aria-label="${esc(t.close)}">×</button></span></div>`;
      if (!this.data) return `<div class="panel" role="dialog" aria-label="${esc(t.title)}">${hd}<div class="msg">${esc(t.loading)}</div></div>`;
      const rows = this.data.rows;
      if (!rows || rows.length === 0) return `<div class="panel" role="dialog" aria-label="${esc(t.title)}">${hd}<div class="msg">${esc(t.unavailable)}</div></div>`;
      const tracked = s.total - s.annual;
      const parts = s.level === "ok" ? [fill(t.all, { n: tracked })] : [fill(t.ok, { ok: s.ok, n: tracked }), ...(s.late ? [fill(t.due, { n: s.late })] : []), ...(s.out ? [fill(t.missing, { n: s.out })] : [])];
      const sc = this.colour(s.level);
      const body = rows.map((r) => {
        const l = level(r.status);
        const c = this.colour(l);
        const st = r.status === "fresh" ? t.sOk : r.status === "due" ? t.sDue : r.status === "none" ? t.sNone : r.status === "annual" ? t.sAnnual : t.sMissing;
        return `<tr><td>${esc(this.lang === "de" ? r.label_de : r.label_en)}</td>
          <td class="num">${esc(this.fmtDay(r.latest_date, r.cadence))}</td>
          <td class="num muted hide-sm">${esc(this.fmtStamp(r.loaded_at))}</td>
          <td><span class="st" style="color:${c};background:color-mix(in srgb, ${c} 14%, transparent)"><span class="dot" style="width:6px;height:6px;background:${c}"></span>${esc(st)}</span></td></tr>`;
      }).join("");
      return `<div class="panel" role="dialog" aria-label="${esc(t.title)}">${hd}
        <div class="sum"><span class="pill" style="color:${sc};background:color-mix(in srgb, ${sc} 14%, transparent)"><span class="dot" style="background:${sc}"></span>${esc(parts.join(" · "))}</span></div>
        <div class="body"><table><thead><tr><th>${esc(t.colFeed)}</th><th>${esc(t.colUpTo)}</th><th class="hide-sm">${esc(t.colLoaded)}</th><th>${esc(t.colStatus)}</th></tr></thead><tbody>${body}</tbody></table></div>
        <div class="ft"><span class="k"><span class="dot" style="width:7px;height:7px;background:var(--ok)"></span>${esc(t.kOk)}</span>
          <span class="k"><span class="dot" style="width:7px;height:7px;background:var(--warn)"></span>${esc(t.kDue)}</span>
          <span class="k"><span class="dot" style="width:7px;height:7px;background:var(--break)"></span>${esc(t.kMissing)}</span>
          <span class="n">${esc(t.note)}</span></div></div>`;
    }
    renderBanner() {
      const rows = (this.data && this.data.rows) || [];
      const missing = rows.filter((r) => level(r.status) === "out");
      if (missing.length === 0) { if (this.banner) { this.banner.remove(); this.banner = null; } return; }
      if (!document.getElementById("bears-signal-banner-css")) {
        const st = document.createElement("style");
        st.id = "bears-signal-banner-css";
        st.textContent = BANNER_CSS;
        document.head.appendChild(st);
      }
      if (!this.banner) {
        this.banner = document.createElement("div");
        this.banner.className = "bears-signal-banner";
        this.banner.setAttribute("role", "status");
        const target = document.querySelector(this.getAttribute("banner-target") || "body") || document.body;
        target.insertBefore(this.banner, target.firstChild);
      }
      const t = this.t;
      const list = missing.map((r) =>
        `<b style="font-weight:600">${esc(this.lang === "de" ? r.label_de : r.label_en)}</b> (${esc(r.latest_date ? fill(t.bUpTo, { date: this.fmtDay(r.latest_date, r.cadence) }) : t.bNo)})`
      ).join(" · ");
      this.banner.innerHTML = `<span class="t"><i></i>${esc(t.bTitle)}</span><span class="m">${list}<small>${esc(t.bBody)}</small></span>`;
    }
  }
  customElements.define("bears-signal", BearsSignal);
})();
