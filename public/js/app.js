(() => {
  const $ = s => document.querySelector(s);
  const ACCENTS = [
    { v: "#3b5bdb", label: "Blue" }, { v: "#1f7a5c", label: "Green" }, { v: "#b4532a", label: "Terracotta" },
    { v: "#c0262d", label: "Red" }, { v: "#6d4bd8", label: "Violet" }, { v: "ink", label: "Ink" }
  ];
  const SIZES = { 15: "15 px", 16: "16 px", 17: "17 px", 18: "18 px" };
  const VIEWS = [{ v: "both", label: "Both", icon: "split" }, { v: "site", label: "Website", icon: "monitor" }, { v: "app", label: "App", icon: "phone" }];

  const state = { heading: "Fraunces", body: "Inter", slot: "heading", view: "both", template: "startup", weight: 700, size: 16, theme: "light", accent: null, cat: "all", query: "", url: "" };
  const LIVE = "url";
  const isLive = () => state.template === LIVE;
  const tplOf = () => TEMPLATES[state.template] || TEMPLATES.startup;
  let preview = null;
  let previewTimer = 0;
  let activeIndex = -1;
  let visible = [];
  const custom = new Map();
  const info = new Map();
  const local = new Map();
  const SAVED_KEY = "fontroom:saved";
  let saved = [];
  try { saved = JSON.parse(localStorage.getItem(SAVED_KEY) || "[]").filter(x => x && typeof x.h === "string" && typeof x.b === "string").slice(0, 40); } catch (e) { saved = []; }

  const stage = $("#stage"), list = $("#fontList"), q = $("#q");

  const catOf = n => (BY_NAME.get(n.toLowerCase()) || custom.get(n) || { cat: "custom" }).cat;
  const stack = n => `"${n}", ${FALLBACK[catOf(n)]}`;
  const canonical = n => (BY_NAME.get(n.toLowerCase()) || {}).name || n;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function toast(msg, kind, key) {
    if (key) document.querySelectorAll("#toasts .toast").forEach(t => { if (t.dataset.key === key) t.remove(); });
    const el = document.createElement("div");
    el.className = "toast" + (kind === "err" ? " err" : "");
    if (key) el.dataset.key = key;
    el.textContent = msg;
    $("#toasts").append(el);
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 220); }, kind === "err" ? 4600 : 2600);
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.append(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
      ta.remove();
      return ok;
    }
  }

  function injectCss(css) {
    const s = document.createElement("style");
    s.textContent = css;
    document.head.append(s);
  }
  function linkLoad(url) {
    return new Promise(res => {
      const l = document.createElement("link");
      l.rel = "stylesheet"; l.crossOrigin = "anonymous"; l.href = url;
      l.onload = () => {
        let css = "";
        try { css = [...l.sheet.cssRules].map(r => r.cssText).join("\n"); } catch (e) { css = ""; }
        res({ css });
      };
      l.onerror = () => { l.remove(); res(null); };
      document.head.append(l);
    });
  }

  const TRIES = [":wght@100..900", ":wght@200;300;400;500;600;700;800", ":wght@300;400;500;600;700", ":wght@400;500;600;700", ":wght@400;700", ""];
  function loadFont(name) {
    if (info.has(name)) return info.get(name).promise;
    const rec = { status: "loading", weights: null, reason: "" };
    rec.promise = (async () => {
      let useFetch = true, networkFailed = false;
      for (const t of TRIES) {
        const url = `https://fonts.googleapis.com/css2?family=${familyParam(name)}${t}&display=swap`;
        if (useFetch) {
          try {
            const r = await fetch(url);
            if (!r.ok) continue;
            const css = await r.text();
            injectCss(css);
            rec.weights = parseWeights(css);
            rec.url = url;
            rec.status = "ok";
            return rec;
          } catch (e) { useFetch = false; networkFailed = true; }
        }
        const linked = await linkLoad(url);
        if (linked) {
          rec.weights = /font-weight/.test(linked.css) ? parseWeights(linked.css) : weightsFromQuery(t);
          rec.url = url;
          rec.status = "ok";
          return rec;
        }
      }
      rec.status = "fail";
      rec.reason = networkFailed ? "network" : "missing";
      return rec;
    })();
    info.set(name, rec);
    rec.promise.then(() => { renderSlots(); renderWeight(); applyFonts(); renderCode(); });
    return rec.promise;
  }
  const weightsOf = n => { const r = info.get(n); return r && r.status === "ok" ? r.weights : null; };
  const effWeight = n => nearestWeight(weightsOf(n), state.weight);

  const pvDone = new Set();
  let pvBlocked = false;
  async function loadPreview(name) {
    if (pvDone.has(name) || pvBlocked || local.has(name)) return;
    pvDone.add(name);
    try {
      const r = await fetch(`https://fonts.googleapis.com/css2?family=${familyParam(name)}&text=${encodeURIComponent(name)}&display=swap`);
      if (!r.ok) return;
      const css = (await r.text()).replace(/font-family:\s*'[^']+'/g, `font-family:'pv ${name}'`);
      injectCss(css);
    } catch (e) { pvBlocked = true; }
  }
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { loadPreview(e.target.dataset.name); io.unobserve(e.target); }
  }, { root: list, rootMargin: "240px 0px" });

  const effective = slot => (preview && state.slot === slot ? preview : state[slot]);

  function applyFonts() {
    const h = effective("heading"), b = effective("body");
    stage.style.setProperty("--fh", stack(h));
    stage.style.setProperty("--fb", stack(b));
    stage.style.setProperty("--hw", effWeight(h));
    stage.style.setProperty("--bs", state.size + "px");
    const acc = state.accent || tplOf().accent;
    if (acc === "ink") {
      stage.style.setProperty("--acc", "var(--m-fg)");
      stage.style.setProperty("--on-acc", "var(--m-bg)");
    } else {
      stage.style.setProperty("--acc", acc);
      stage.style.setProperty("--on-acc", onAccent(acc));
    }
    stage.dataset.theme = state.theme;
    sendFontsAll();
  }

  function onAccent(hex) {
    const m = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!m) return "#ffffff";
    const ch = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    const L = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
    return (1.05 / (L + 0.05)) >= ((L + 0.05) / 0.05) ? "#ffffff" : "#111317";
  }

  function slotMeta(n) {
    const r = info.get(n);
    if (!r || r.status === "loading") return { state: "loading", meta: CAT_LABEL[catOf(n)] };
    if (r.status === "fail") return { state: "fail", meta: "Could not load" };
    const c = r.weights.length;
    return { state: "ok", meta: `${CAT_LABEL[catOf(n)]} · ${c} weight${c === 1 ? "" : "s"}` };
  }

  function renderSlots() {
    document.querySelectorAll(".slot").forEach(el => {
      const slot = el.dataset.slot;
      const n = effective(slot);
      const isPrev = !!(preview && state.slot === slot);
      el.setAttribute("aria-checked", String(state.slot === slot));
      el.classList.toggle("previewing", isPrev);
      const nameEl = el.querySelector(".slot-name");
      nameEl.textContent = n;
      nameEl.style.fontFamily = `"${n}", "pv ${n}", var(--ui)`;
      const m = slotMeta(n);
      el.querySelector(".slot-meta").textContent = m.meta;
      el.querySelector(".slot-state").innerHTML = isPrev ? "Previewing" : (m.state === "loading" ? '<span class="loading-dot"></span>Loading' : (state.slot === slot ? "Editing" : ""));
      el.setAttribute("aria-label", `${slot === "heading" ? "Headings" : "Body text"}: ${n}`);
    });
  }

  function filtered() {
    const qq = state.query.trim().toLowerCase();
    let arr = [...FONTS, ...custom.values()];
    if (state.cat !== "all") arr = arr.filter(f => f.cat === state.cat);
    if (qq) {
      arr = arr.filter(f => f.name.toLowerCase().includes(qq));
      arr.sort((a, b) => (b.name.toLowerCase().startsWith(qq) - a.name.toLowerCase().startsWith(qq)) || a.name.localeCompare(b.name));
    }
    return arr;
  }

  function renderList() {
    io.disconnect();
    const arr = filtered();
    const qq = state.query.trim();
    visible = arr.map(f => ({ type: "font", name: f.name, cat: f.cat }));
    if (qq && !arr.some(f => f.name.toLowerCase() === qq.toLowerCase())) visible.push({ type: "custom", name: qq });
    const current = state[state.slot];
    list.innerHTML = visible.map((o, i) => {
      if (o.type === "custom") {
        return `<div class="opt custom" role="option" id="opt-${i}" aria-selected="false" data-i="${i}"><span class="opt-name">Load “${esc(o.name)}” from Google Fonts</span></div>`;
      }
      const cur = o.name === current;
      return `<div class="opt${cur ? " current" : ""}" role="option" id="opt-${i}" aria-selected="${cur}" data-i="${i}" data-name="${esc(o.name)}"><span class="opt-name" style="font-family:'pv ${esc(o.name)}','${esc(o.name)}',var(--ui)">${esc(o.name)}</span>${cur ? '<span class="opt-badge">In use</span>' : `<span class="opt-cat">${CAT_LABEL[o.cat]}</span>`}</div>`;
    }).join("");
    if (!visible.length) list.innerHTML = `<p class="empty">No fonts in this category match. Try All, or type the exact Google Fonts name.</p>`;
    list.querySelectorAll(".opt[data-name]").forEach(el => io.observe(el));
    const n = arr.length;
    $("#listCount").textContent = `${n} font${n === 1 ? "" : "s"}`;
    activeIndex = -1;
    q.removeAttribute("aria-activedescendant");
  }

  function setActive(i, scroll) {
    list.querySelectorAll(".opt.active").forEach(el => el.classList.remove("active"));
    activeIndex = i;
    const el = document.getElementById("opt-" + i);
    if (!el) { q.removeAttribute("aria-activedescendant"); return; }
    el.classList.add("active");
    q.setAttribute("aria-activedescendant", el.id);
    if (scroll) el.scrollIntoView({ block: "nearest" });
    const o = visible[i];
    if (o.type === "font") startPreview(o.name);
    else clearPreview();
  }

  function startPreview(name) {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      if (name === state[state.slot]) { clearPreview(); return; }
      preview = name;
      loadFont(name);
      applyFonts(); renderSlots(); renderWeight();
    }, 70);
  }
  function clearPreview() {
    clearTimeout(previewTimer);
    if (preview) { preview = null; applyFonts(); renderSlots(); renderWeight(); }
  }

  async function commit(i) {
    const o = visible[i];
    if (!o) return;
    if (o.type === "custom") {
      clearPreview();
      const raw = o.name.trim();
      const titled = raw.replace(/\b([a-z])/g, c => c.toUpperCase());
      toast(`Looking up “${raw}” on Google Fonts`);
      let name = raw, rec = await loadFont(raw);
      if (rec.status !== "ok" && titled !== raw) { info.delete(raw); name = titled; rec = await loadFont(titled); }
      if (rec.status !== "ok") {
        info.delete(raw); info.delete(titled);
        toast(rec.reason === "network" ? "Couldn't reach Google Fonts. Check your connection and try again." : `“${raw}” isn't on Google Fonts. Check the spelling, then try again.`, "err");
        return;
      }
      if (!BY_NAME.has(name.toLowerCase())) custom.set(name, { name, cat: "custom" });
      setFont(state.slot, name);
      return;
    }
    setFont(state.slot, o.name);
  }

  async function setFont(slot, name) {
    preview = null;
    state[slot] = canonical(name);
    applyFonts(); renderSlots(); renderWeight(); renderList(); syncHash(); renderCode(); renderSaved();
    const rec = await loadFont(state[slot]);
    if (rec.status !== "ok") toast(rec.reason === "network" ? "Couldn't reach Google Fonts. Check your connection and try again." : `“${name}” didn't load from Google Fonts.`, "err");
  }

  function radioGroup(root, items, get, set, render) {
    root.innerHTML = items.map(it => render(it)).join("");
    const btns = [...root.querySelectorAll("[role=radio]")];
    const update = () => btns.forEach(b => {
      const on = b.dataset.v === String(get());
      b.setAttribute("aria-checked", String(on));
      b.tabIndex = on ? 0 : -1;
    });
    btns.forEach((b, i) => {
      b.addEventListener("click", () => { set(b.dataset.v); update(); });
      b.addEventListener("keydown", e => {
        const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        const n = btns[(i + d + btns.length) % btns.length];
        n.focus(); set(n.dataset.v); update();
      });
    });
    update();
    return update;
  }

  function dropdown(root, cfg) {
    const id = root.id;
    root.innerHTML = `<button type="button" class="dd-btn" id="${id}-btn" aria-haspopup="listbox" aria-expanded="false" aria-controls="${id}-pop"><span class="dd-k">${cfg.label}</span><span class="dd-v"></span><svg class="ic sm"><use href="#i-chev"/></svg></button><ul class="dd-pop" id="${id}-pop" role="listbox" tabindex="-1" aria-label="${cfg.label}" hidden></ul>`;
    const btn = root.querySelector(".dd-btn"), pop = root.querySelector(".dd-pop");
    let opts = [], act = -1;
    const isOpen = () => !pop.hidden;
    function paint() {
      pop.querySelectorAll(".dd-opt").forEach((el, i) => el.classList.toggle("active", i === act));
      const el = pop.children[act];
      if (el) { pop.setAttribute("aria-activedescendant", el.id); el.scrollIntoView({ block: "nearest" }); }
    }
    function build() {
      opts = cfg.options();
      const v = String(cfg.get());
      pop.innerHTML = opts.map((o, i) => `<li class="dd-opt" role="option" id="${id}-o${i}" aria-selected="${String(o.value) === v}"${o.disabled ? ' aria-disabled="true"' : ""} data-i="${i}"><svg class="ic sm tick"><use href="#i-check"/></svg><span>${esc(o.label)}</span>${o.sub ? `<span class="dd-sub">${esc(o.sub)}</span>` : ""}</li>`).join("");
      act = Math.max(0, opts.findIndex(o => String(o.value) === v));
    }
    function open() {
      document.querySelectorAll(".dd-pop:not([hidden])").forEach(p => p !== pop && p.dispatchEvent(new Event("dd-close")));
      build(); pop.hidden = false; btn.setAttribute("aria-expanded", "true"); pop.focus(); paint();
      document.addEventListener("pointerdown", outside, true);
    }
    function close(refocus) {
      if (!isOpen()) return;
      pop.hidden = true; btn.setAttribute("aria-expanded", "false");
      document.removeEventListener("pointerdown", outside, true);
      if (refocus) btn.focus();
    }
    function outside(e) { if (!root.contains(e.target)) close(false); }
    function choose(i) {
      const o = opts[i];
      if (!o || o.disabled) return;
      cfg.set(o.value); close(true); update();
    }
    function move(d) {
      if (!opts.length) return;
      let i = act;
      for (let k = 0; k < opts.length; k++) {
        i = (i + d + opts.length) % opts.length;
        if (!opts[i].disabled) break;
      }
      act = i; paint();
    }
    pop.addEventListener("dd-close", () => close(false));
    btn.addEventListener("click", () => (isOpen() ? close(true) : open()));
    btn.addEventListener("keydown", e => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); open(); } });
    pop.addEventListener("keydown", e => {
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Home") { e.preventDefault(); act = -1; move(1); }
      else if (e.key === "End") { e.preventDefault(); act = opts.length; move(-1); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(act); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(true); }
      else if (e.key === "Tab") close(false);
    });
    pop.addEventListener("click", e => { const li = e.target.closest(".dd-opt"); if (li) choose(+li.dataset.i); });
    pop.addEventListener("pointermove", e => { const li = e.target.closest(".dd-opt"); if (li && +li.dataset.i !== act && !opts[+li.dataset.i].disabled) { act = +li.dataset.i; paint(); } });
    function update() { root.querySelector(".dd-v").textContent = cfg.display(cfg.get()); if (isOpen()) { build(); paint(); } }
    update();
    return { update };
  }

  const tplDD = dropdown($("#tplDD"), {
    label: "Site",
    options: () => [{ value: LIVE, label: "Your website", sub: "Any link" }, ...Object.entries(TEMPLATES).map(([k, t]) => ({ value: k, label: t.label, sub: t.sub }))],
    get: () => state.template,
    set: v => { setTemplate(v); if (v === LIVE && !state.url) setTimeout(() => urlInput.focus(), 0); },
    display: v => (v === LIVE ? "Your website" : TEMPLATES[v].label)
  });
  function setTemplate(v) {
    state.template = v; state.accent = null;
    renderMocks(); applyFonts(); updateSwatches(); layoutStage(); syncHash();
  }
  const weightDD = dropdown($("#weightDD"), {
    label: "Weight",
    options: () => {
      const n = effective("heading"), ws = weightsOf(n);
      return ALL_WEIGHTS.map(w => ({ value: w, label: `${w} ${WEIGHT_LABELS[w]}`, disabled: !!ws && !ws.includes(w), sub: ws && !ws.includes(w) ? "Not in font" : "" }));
    },
    get: () => effWeight(effective("heading")),
    set: v => { state.weight = +v; applyFonts(); syncHash(); renderCode(); },
    display: v => String(v)
  });
  const sizeDD = dropdown($("#sizeDD"), {
    label: "Body",
    options: () => Object.entries(SIZES).map(([v, l]) => ({ value: +v, label: l, sub: +v === 16 ? "Browser default" : "" })),
    get: () => state.size,
    set: v => { state.size = +v; applyFonts(); syncHash(); renderCode(); },
    display: v => SIZES[v]
  });
  function renderWeight() { weightDD.update(); }

  const updateView = radioGroup($("#viewSeg"), VIEWS, () => state.view, v => { state.view = v; stage.dataset.view = v; layoutStage(); syncHash(); },
    it => `<button type="button" role="radio" data-v="${it.v}"><svg class="ic sm"><use href="#i-${it.icon}"/></svg>${it.label}</button>`);
  const updateCats = radioGroup($("#cats"), CATS.map(c => ({ v: c.id, label: c.label })), () => state.cat, v => { state.cat = v; renderList(); },
    it => `<button type="button" class="chip" role="radio" data-v="${it.v}">${it.label}</button>`);
  const updateSwatchRadios = radioGroup($("#swatches"), ACCENTS, () => state.accent || tplOf().accent, v => { state.accent = v; applyFonts(); syncHash(); renderPick(); },
    it => `<button type="button" class="sw" role="radio" data-v="${it.v}" style="--c:${it.v}" aria-label="${it.label}" title="${it.label}"></button>`);
  const pick = $("#accentPick"), pickWrap = $("#pickWrap");
  const isCustomAccent = () => !!state.accent && !ACCENTS.some(a => a.v === state.accent);
  function renderPick() {
    const on = isCustomAccent();
    pickWrap.classList.toggle("on", on);
    pickWrap.style.setProperty("--c", on ? state.accent : "transparent");
    const cur = state.accent || tplOf().accent;
    pick.value = /^#[0-9a-f]{6}$/i.test(cur) ? cur : "#3b5bdb";
    pickWrap.title = on ? `Custom colour ${state.accent}` : "Custom colour";
  }
  function updateSwatches() { updateSwatchRadios(); renderPick(); }
  pick.addEventListener("input", () => { state.accent = pick.value.toLowerCase(); applyFonts(); updateSwatchRadios(); renderPick(); });
  pick.addEventListener("change", () => syncHash());

  const slotBtns = [...document.querySelectorAll(".slot")];
  function selectSlot(s) {
    state.slot = s; preview = null;
    renderSlots(); renderList(); applyFonts(); syncSlotTabs();
  }
  slotBtns.forEach((b, i) => {
    b.addEventListener("click", () => { selectSlot(b.dataset.slot); if (isNarrow()) setSheet(true); else q.focus(); });
    b.addEventListener("keydown", e => {
      if (!["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
      e.preventDefault();
      const n = slotBtns[1 - i]; n.focus(); selectSlot(n.dataset.slot);
    });
  });
  const syncSlotTabs = () => slotBtns.forEach(b => { b.tabIndex = b.dataset.slot === state.slot ? 0 : -1; });

  const appEl = $(".app"), sideEl = $(".side"), sheetBtn = $("#sheetBtn"), sideBody = $("#sideBody");
  const narrowMq = window.matchMedia ? window.matchMedia("(max-width:980px)") : null;
  const isNarrow = () => !!(narrowMq && narrowMq.matches);
  const sheetOpen = () => appEl.classList.contains("sheet-open");
  function setSheet(open) {
    open = !!open && isNarrow();
    appEl.classList.toggle("sheet-open", open);
    sheetBtn.setAttribute("aria-expanded", String(open));
    $("#sheetLabel").textContent = open ? "Hide fonts" : "Show fonts";
    sideBody.inert = isNarrow() && !open;
  }
  sheetBtn.addEventListener("click", () => setSheet(!sheetOpen()));
  $("#stageWrap").addEventListener("pointerdown", () => { if (sheetOpen()) setSheet(false); });
  if (narrowMq && narrowMq.addEventListener) narrowMq.addEventListener("change", () => setSheet(false));
  new ResizeObserver(() => { if (!sheetOpen()) appEl.style.setProperty("--sheet-h", `${sideEl.offsetHeight}px`); }).observe(sideEl);
  setSheet(false);

  function renderTheme() {
    const dark = state.theme === "dark";
    $("#themeBtn").innerHTML = `<svg class="ic"><use href="#i-${dark ? "sun" : "moon"}"/></svg>`;
    $("#themeBtn").setAttribute("aria-label", dark ? "Show preview in light mode" : "Show preview in dark mode");
    $("#themeBtn").title = dark ? "Light preview" : "Dark preview";
  }
  $("#themeBtn").addEventListener("click", () => { state.theme = state.theme === "dark" ? "light" : "dark"; renderTheme(); applyFonts(); syncHash(); });

  const urlInput = $("#urlInput");
  const frames = [
    { el: $("#siteFrame"), msg: $("#siteMsg"), mobile: false, ready: false, sent: new Set() },
    { el: $("#phoneFrame"), msg: $("#phoneMsg"), mobile: true, ready: false, sent: new Set() }
  ];
  const liveBack = [];
  const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return String(u); } };

  function fontSpec(f, n) {
    const o = { family: n, stack: stack(n) };
    const l = local.get(n);
    if (l) {
      if (l.buf && !f.sent.has(n)) { o.file = { data: l.buf, weight: l.descriptor }; f.sent.add(n); }
    } else {
      const r = info.get(n);
      if (r && r.url) o.url = r.url;
    }
    return o;
  }
  function sendFonts(f) {
    if (!isLive() || !f.ready || !f.el.contentWindow) return;
    const h = effective("heading"), b = effective("body");
    try { f.el.contentWindow.postMessage({ fontroom: 1, type: "fonts", heading: fontSpec(f, h), body: fontSpec(f, b), weight: effWeight(h) }, "*"); } catch (e) { /* frame gone */ }
  }
  function sendFontsAll() { frames.forEach(sendFonts); }

  function setMsg(f, text, loading) {
    f.msg.hidden = !text;
    f.msg.innerHTML = text ? (loading ? '<span class="loading-dot"></span>' : "") + esc(text) : "";
  }
  function unloadFrames() {
    frames.forEach(f => { f.ready = false; f.sent.clear(); if (f.el.getAttribute("src") && f.el.getAttribute("src") !== "about:blank") f.el.src = "about:blank"; });
  }
  function renderLive(force) {
    const url = state.url;
    $("#domain").textContent = url ? hostOf(url) : "your-website.com";
    if (document.activeElement !== urlInput) urlInput.value = url;
    $("#urlBack").hidden = !liveBack.length;
    frames.forEach(f => {
      if (!url) {
        f.el.hidden = true;
        setMsg(f, f.mobile ? "The mobile version shows here." : "Paste a link above to see your fonts on a real website.");
        return;
      }
      const src = `api/preview?url=${encodeURIComponent(url)}${f.mobile ? "&ua=mobile" : ""}`;
      f.el.hidden = false;
      if (!force && f.el.getAttribute("src") === src) return;
      f.ready = false; f.sent.clear();
      setMsg(f, `Loading ${hostOf(url)}`, true);
      f.el.src = src;
    });
  }
  function openUrl(raw, force) {
    const url = normalizeSiteUrl(raw);
    if (!url) { toast("That doesn't look like a web address. Try something like stripe.com.", "err", "live"); return false; }
    if (state.url && state.url !== url) { liveBack.push(state.url); if (liveBack.length > 30) liveBack.shift(); }
    state.url = url;
    urlInput.value = url;
    renderLive(force); syncHash();
    return true;
  }
  frames.forEach(f => f.el.addEventListener("load", () => {
    const src = f.el.getAttribute("src");
    if (src && src !== "about:blank") setMsg(f, "");
  }));
  window.addEventListener("message", e => {
    const f = frames.find(x => x.el.contentWindow && x.el.contentWindow === e.source);
    const d = e.data;
    if (!f || !d || d.fontroom !== 1 || !isLive()) return;
    if (d.type === "ready") { f.ready = true; setMsg(f, ""); sendFonts(f); }
    else if (d.type === "navigate" && typeof d.url === "string") openUrl(d.url);
    else if (d.type === "error") { setMsg(f, ""); toast(String(d.message || "This page couldn't be loaded.").slice(0, 220), "err", "live"); }
  });
  $("#urlBar").addEventListener("submit", e => {
    e.preventDefault();
    if (urlInput.value.trim()) openUrl(urlInput.value, true);
    else { toast("Paste a link first, like linear.app.", "err", "live"); urlInput.focus(); }
  });
  urlInput.addEventListener("paste", () => setTimeout(() => { if (normalizeSiteUrl(urlInput.value)) openUrl(urlInput.value); }, 0));
  urlInput.addEventListener("keydown", e => { if (e.key === "Escape" && urlInput.value !== state.url) { e.preventDefault(); urlInput.value = state.url; } });
  $("#urlBack").addEventListener("click", () => {
    const prev = liveBack.pop();
    if (!prev) return;
    state.url = prev; urlInput.value = prev;
    renderLive(); syncHash();
    if (!liveBack.length) urlInput.focus();
  });

  function renderMocks() {
    const live = isLive();
    $(".app").classList.toggle("is-live", live);
    $("#urlBar").hidden = !live;
    $("#site").hidden = live; $("#screen").hidden = live;
    $("#siteLive").hidden = !live; $("#phoneLive").hidden = !live;
    $("#phoneLabel").textContent = live ? "Mobile" : "Mobile app";
    if (live) { renderLive(); tplDD.update(); return; }
    unloadFrames();
    const t = TEMPLATES[state.template];
    const site = $("#site"), screen = $("#screen");
    site.dataset.t = state.template; screen.dataset.t = state.template;
    site.innerHTML = t.site(); screen.innerHTML = t.app();
    $("#domain").textContent = t.domain;
    document.querySelectorAll(".mock .h, .mock p, .mock .m-btn, .mock .mg-quote").forEach(el => {
      el.setAttribute("contenteditable", "plaintext-only");
      el.spellcheck = false;
    });
    tplDD.update();
  }

  function layoutStage() {
    const browser = $("#browser");
    const live = isLive();
    const w = $("#stageWrap").clientWidth - (window.innerWidth <= 520 ? 32 : 56);
    let stacked = false, siteW = w;
    if (state.view === "both") {
      if (w < 900) stacked = true;
      else siteW = w - 395 - 28;
    }
    stage.classList.toggle("stacked", stacked);
    let zoom = 1, logical = 0;
    if (state.view === "both" && !stacked && siteW < 1040) { logical = 1200; zoom = siteW / 1200; }
    if (live) {
      const frame = $("#siteFrame");
      const visH = Math.round(Math.min(900, Math.max(480, (window.innerHeight || 900) - 190)));
      browser.style.width = ""; browser.style.zoom = "";
      $("#siteLive").style.height = visH + "px";
      frame.style.width = logical ? logical + "px" : "";
      frame.style.height = logical ? Math.round(visH / zoom) + "px" : "";
      frame.style.transform = logical ? `scale(${zoom.toFixed(4)})` : "";
    } else {
      browser.style.width = logical ? logical + "px" : "";
      browser.style.zoom = zoom === 1 ? "" : zoom.toFixed(4);
    }
    const shown = state.view === "site" ? Math.min(siteW, 1440) : siteW;
    $("#siteWidth").textContent = logical ? `${logical} px wide` : `${Math.round(shown)} px wide`;
    $("#siteScale").textContent = logical ? `Scaled to ${Math.round(zoom * 100)}% to fit` : "Actual size";
    $("#phoneWidth").textContent = `${(live ? $("#phoneLive") : $("#screen")).offsetWidth} px wide`;
  }
  const ro = new ResizeObserver(layoutStage);
  ro.observe($("#stageWrap"));
  ro.observe($("#screen"));
  ro.observe($("#phoneLive"));
  window.addEventListener("resize", layoutStage);

  let codeTab = "css";
  const TABS = [{ v: "css", label: "HTML + CSS" }, { v: "tailwind", label: "Tailwind" }, { v: "next", label: "Next.js" }, { v: "flutter", label: "Flutter" }, { v: "expo", label: "Expo" }];
  const usesLocal = () => local.has(state.heading) || local.has(state.body);
  const tabsNow = () => (usesLocal() ? TABS.filter(x => x.v === "css" || x.v === "next") : TABS);
  function codeInput() {
    const h = state.heading, b = state.body;
    const hw = weightsOf(h) || ALL_WEIGHTS, bwList = weightsOf(b) || [400, 700];
    return { heading: h, body: b, hWeight: nearestWeight(hw, state.weight), hWeights: hw, bWeights: bodyWeights(bwList), hCat: catOf(h), bCat: catOf(b), bodyPx: state.size, hLocal: local.get(h) || null, bLocal: local.get(b) || null };
  }
  function renderTabs() {
    const t = $("#tabs");
    const tabs = tabsNow();
    if (!tabs.some(x => x.v === codeTab)) codeTab = "css";
    t.innerHTML = tabs.map(x => `<button type="button" role="tab" id="tab-${x.v}" aria-controls="codeBody" aria-selected="${x.v === codeTab}" tabindex="${x.v === codeTab ? 0 : -1}" data-v="${x.v}">${x.label}</button>`).join("");
    $("#codeBody").setAttribute("aria-labelledby", "tab-" + codeTab);
  }
  $("#tabs").addEventListener("click", e => { const b = e.target.closest("[role=tab]"); if (b) { codeTab = b.dataset.v; renderTabs(); renderCode(); } });
  $("#tabs").addEventListener("keydown", e => {
    const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!d) return;
    const tabs = tabsNow();
    const i = tabs.findIndex(x => x.v === codeTab);
    codeTab = tabs[(i + d + tabs.length) % tabs.length].v;
    renderTabs(); renderCode(); $("#tab-" + codeTab).focus();
  });
  let blocks = [];
  function renderCode() {
    if ($("#drawer").hidden) return;
    const inp = codeInput();
    renderTabs();
    $("#drawerSub").textContent = `${inp.heading} ${inp.hWeight} for headings, ${inp.body} for body text` + (usesLocal() ? ". Your own font file needs self-hosting, so this shows HTML + CSS and Next.js setup." : "");
    blocks = (usesLocal() ? buildLocalCode(inp) : buildCode(inp))[codeTab];
    $("#codeBody").innerHTML = blocks.map((bk, i) => `<div class="code-block"><div class="code-head"><span>${esc(bk.label)}</span><button type="button" class="copy" data-i="${i}"><svg class="ic sm"><use href="#i-copy"/></svg>Copy</button></div><pre><code>${esc(bk.code)}</code></pre></div>`).join("");
  }
  $("#codeBody").addEventListener("click", async e => {
    const b = e.target.closest(".copy");
    if (!b) return;
    const ok = await copyText(blocks[+b.dataset.i].code);
    if (ok) {
      b.innerHTML = '<svg class="ic sm"><use href="#i-check"/></svg>Copied';
      setTimeout(() => { b.innerHTML = '<svg class="ic sm"><use href="#i-copy"/></svg>Copy'; }, 1600);
    } else toast("Your browser blocked the clipboard. Select the code and copy it manually.", "err");
  });
  function openDrawer() { $("#drawer").hidden = false; renderTabs(); renderCode(); $("#tab-" + codeTab).focus(); }
  function closeDrawer() { $("#drawer").hidden = true; $("#codeBtn").focus(); }
  $("#codeBtn").addEventListener("click", () => ($("#drawer").hidden ? openDrawer() : closeDrawer()));
  $("#drawerClose").addEventListener("click", closeDrawer);

  $("#shareBtn").addEventListener("click", async () => {
    syncHash();
    const ok = await copyText(location.href);
    if (!ok) { toast("Couldn't copy the link. Copy it from the address bar instead.", "err"); return; }
    toast(usesLocal() ? "Link copied. Your own font file stays on this device, so the link opens with the default font in its place." : "Link copied. It opens with this exact setup.");
  });

  function refreshAll() { applyFonts(); renderSlots(); renderWeight(); renderList(); syncHash(); renderCode(); renderSaved(); }
  function swapFonts() {
    preview = null;
    [state.heading, state.body] = [state.body, state.heading];
    refreshAll();
  }
  function shufflePair() {
    const opts = PAIRS.filter(p => p[0] !== state.heading || p[1] !== state.body);
    const [h, b] = opts[Math.floor(Math.random() * opts.length)];
    preview = null;
    state.heading = h; state.body = b;
    loadFont(h); loadFont(b);
    refreshAll();
  }
  $("#swapBtn").addEventListener("click", swapFonts);
  $("#shuffleBtn").addEventListener("click", shufflePair);

  const savedIndex = () => saved.findIndex(x => x.h === state.heading && x.b === state.body);
  function storeSaved() { try { localStorage.setItem(SAVED_KEY, JSON.stringify(saved)); return true; } catch (e) { return false; } }
  function renderSaved() {
    const i = savedIndex();
    const btn = $("#saveBtn");
    btn.setAttribute("aria-pressed", String(i >= 0));
    btn.setAttribute("aria-label", i >= 0 ? "Remove this pairing from Saved" : "Save this pairing");
    btn.title = i >= 0 ? "Saved. Click to remove" : "Save this pairing";
    $("#savedCount").textContent = saved.length ? String(saved.length) : "";
    const el = $("#savedList");
    if (!saved.length) {
      el.innerHTML = `<p class="empty">Nothing saved yet. Press the bookmark next to “Try a pairing” to keep the current pair here. Saved pairings stay in this browser.</p>`;
      return;
    }
    const flip = saved.length > 1 ? `<div class="flip"><button type="button" class="icon-btn flip-btn" data-d="-1" aria-label="Previous saved pairing"><svg class="ic sm"><use href="#i-back"/></svg></button><span>Flip through these on the preview <kbd>[</kbd> <kbd>]</kbd></span><button type="button" class="icon-btn flip-btn" data-d="1" aria-label="Next saved pairing"><svg class="ic sm"><use href="#i-next"/></svg></button></div>` : "";
    el.innerHTML = flip + saved.map((x, k) => `<div class="saved-row${k === i ? " current" : ""}"><button type="button" class="saved-apply" data-i="${k}" aria-label="Use ${esc(x.h)} ${x.w} with ${esc(x.b)}"><span class="saved-h" style="font-family:'pv ${esc(x.h)}','${esc(x.h)}',var(--ui)">${esc(x.h)}</span><span class="saved-b"><span style="font-family:'pv ${esc(x.b)}','${esc(x.b)}',var(--ui)">${esc(x.b)}</span> <small>· heading ${x.w}</small></span></button><button type="button" class="icon-btn saved-del" data-i="${k}" aria-label="Remove ${esc(x.h)} with ${esc(x.b)}"><svg class="ic sm"><use href="#i-x"/></svg></button></div>`).join("");
    saved.forEach(x => { loadPreview(x.h); loadPreview(x.b); });
  }
  function toggleSave() {
    const i = savedIndex();
    if (i >= 0) {
      saved.splice(i, 1);
      storeSaved();
      renderSaved();
      toast("Removed from Saved.");
      return;
    }
    if (usesLocal()) { toast("Pairings with your own font file can't be saved, because the file isn't stored anywhere.", "err"); return; }
    saved.unshift({ h: state.heading, b: state.body, w: effWeight(state.heading) });
    saved = saved.slice(0, 40);
    const ok = storeSaved();
    renderSaved();
    toast(ok ? `Saved ${state.heading} with ${state.body}.${saved.length === 2 ? " Press [ and ] to flip between your saved pairings." : ""}` :"Saved for this visit only. Your browser blocked storage, so it won't be here after a reload.", ok ? "" : "err");
  }
  $("#saveBtn").addEventListener("click", toggleSave);
  $("#savedList").addEventListener("click", e => {
    const del = e.target.closest(".saved-del");
    if (del) {
      saved.splice(+del.dataset.i, 1);
      storeSaved(); renderSaved();
      const next = $("#savedList").querySelector(".saved-del") || $("#tab-saved");
      next.focus();
      return;
    }
    const fb = e.target.closest(".flip-btn");
    if (fb) { flipSaved(+fb.dataset.d); return; }
    const ap = e.target.closest(".saved-apply");
    if (ap) applySaved(+ap.dataset.i);
  });
  function flipSaved(d) {
    if (saved.length < 2) {
      toast(saved.length ? "Save one more pairing, then flip between them with [ and ]." : "Save a few pairings with S, then flip between them with [ and ].", "", "flip");
      return;
    }
    const i = savedIndex();
    const k = i < 0 ? (d > 0 ? 0 : saved.length - 1) : (i + d + saved.length) % saved.length;
    applySaved(k);
    toast(`${k + 1} of ${saved.length}: ${saved[k].h} with ${saved[k].b}`, "", "flip");
  }
  function applySaved(k) {
    const x = saved[k];
    preview = null;
    state.heading = canonical(x.h); state.body = canonical(x.b);
    if (ALL_WEIGHTS.includes(+x.w)) state.weight = +x.w;
    [x.h, x.b].forEach(n => { if (!BY_NAME.has(n.toLowerCase())) custom.set(n, { name: n, cat: "custom" }); });
    loadFont(state.heading); loadFont(state.body);
    refreshAll();
  }

  const sideTabs = [$("#tab-fonts"), $("#tab-saved")];
  function showSideTab(which, focus) {
    sideTabs.forEach(t => {
      const on = t.id === "tab-" + which;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      $("#" + t.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) $("#tab-" + which).focus();
  }
  sideTabs.forEach(t => t.addEventListener("click", () => showSideTab(t.id.slice(4))));
  $("#sideTabs").addEventListener("keydown", e => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    showSideTab($("#tab-fonts").getAttribute("aria-selected") === "true" ? "saved" : "fonts", true);
  });

  async function addFontFile(file) {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!FONT_FILE_EXT[ext]) { toast(`“${file.name}” isn't a font file. Use .woff2, .woff, .ttf or .otf.`, "err"); return; }
    if (file.size > 15 * 1024 * 1024) { toast("That file is over 15 MB. Try the .woff2 version of the font.", "err"); return; }
    let buf;
    try { buf = await file.arrayBuffer(); } catch (e) { toast("Couldn't read that file. Try choosing it again.", "err"); return; }
    const meta = parseFontFile(buf);
    let name = familyFromFile(file.name);
    if (BY_NAME.has(name.toLowerCase())) name += " (yours)";
    const descriptor = meta.variable || !meta.weight ? "100 900" : String(meta.weight);
    let face;
    try {
      face = new FontFace(name, buf, { weight: descriptor, style: "normal", display: "swap" });
      await face.load();
    } catch (e) { toast(`“${file.name}” couldn't be read as a font. The file may be damaged.`, "err"); return; }
    const old = local.get(name);
    if (old && old.face) document.fonts.delete(old.face);
    document.fonts.add(face);
    local.set(name, { file: file.name, format: meta.format || FONT_FILE_EXT[ext], variable: meta.variable, weight: meta.weight, face, buf, descriptor });
    custom.set(name, { name, cat: "local" });
    const weights = meta.variable ? ALL_WEIGHTS.slice() : [meta.weight ? nearestWeight(ALL_WEIGHTS, meta.weight) : 400];
    const rec = { status: "ok", weights, reason: "" };
    rec.promise = Promise.resolve(rec);
    info.set(name, rec);
    showSideTab("fonts");
    await setFont(state.slot, name);
    toast(`Showing “${name}” for ${state.slot === "heading" ? "headings" : "body text"}. The file stays on this device.`);
  }
  $("#uploadBtn").addEventListener("click", () => $("#fontFile").click());
  $("#fontFile").addEventListener("change", e => { const f = e.target.files && e.target.files[0]; if (f) addFontFile(f); e.target.value = ""; });
  const hasFiles = e => !!e.dataTransfer && [...(e.dataTransfer.types || [])].includes("Files");
  let dragDepth = 0;
  window.addEventListener("dragenter", e => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth++; $("#drop").hidden = false; });
  window.addEventListener("dragover", e => { if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener("dragleave", e => { if (!hasFiles(e)) return; dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) $("#drop").hidden = true; });
  window.addEventListener("drop", e => {
    if (!hasFiles(e)) return;
    e.preventDefault(); dragDepth = 0; $("#drop").hidden = true;
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) addFontFile(f);
  });

  const keys = $("#keys");
  function openKeys() { if (keys.hasAttribute("open")) return; if (typeof keys.showModal === "function") keys.showModal(); else keys.setAttribute("open", ""); $("#keysClose").focus(); }
  function closeKeys() { if (typeof keys.close === "function") keys.close(); else keys.removeAttribute("open"); }
  $("#keysBtn").addEventListener("click", openKeys);
  $("#keysClose").addEventListener("click", () => { closeKeys(); $("#keysBtn").focus(); });
  keys.addEventListener("click", e => { if (e.target === keys) closeKeys(); });

  function setView(v) { state.view = v; stage.dataset.view = v; layoutStage(); syncHash(); updateView(); }

  q.addEventListener("input", () => { state.query = q.value; clearPreview(); renderList(); });
  q.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { e.preventDefault(); if (visible.length) setActive(Math.min(activeIndex + 1, visible.length - 1), true); }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (visible.length) setActive(Math.max(activeIndex - 1, 0), true); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) commit(activeIndex);
      else if (visible.length) commit(0);
    }
    else if (e.key === "Escape") {
      if (preview || activeIndex >= 0) { clearPreview(); setActive(-1); }
      else if (q.value) { q.value = ""; state.query = ""; renderList(); }
    }
  });
  list.addEventListener("pointerover", e => {
    const el = e.target.closest(".opt");
    if (el && +el.dataset.i !== activeIndex) setActive(+el.dataset.i, false);
  });
  list.addEventListener("pointerleave", () => { clearPreview(); setActive(-1); });
  list.addEventListener("click", e => { const el = e.target.closest(".opt"); if (el) commit(+el.dataset.i); });

  document.addEventListener("keydown", e => {
    const tag = (e.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea" || e.target.isContentEditable;
    if (e.key === "Escape" && !$("#drawer").hidden && !e.defaultPrevented) { closeDrawer(); return; }
    if (typing || e.metaKey || e.ctrlKey || e.altKey || keys.hasAttribute("open")) return;
    if (e.key === "Escape" && sheetOpen()) { setSheet(false); return; }
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const actions = {
      "/": () => { showSideTab("fonts"); setSheet(true); q.focus(); q.select(); },
      "?": openKeys,
      x: swapFonts,
      r: shufflePair,
      s: toggleSave,
      "[": () => flipSaved(-1),
      "]": () => flipSaved(1),
      d: () => $("#themeBtn").click(),
      c: () => $("#codeBtn").click(),
      u: () => $("#fontFile").click(),
      l: () => { if (!isLive()) setTemplate(LIVE); urlInput.focus(); urlInput.select(); },
      h: () => selectSlot("heading"),
      b: () => selectSlot("body"),
      1: () => setView("both"),
      2: () => setView("site"),
      3: () => setView("app")
    };
    const fn = actions[k];
    if (fn) { e.preventDefault(); fn(); }
  });

  function syncHash() {
    const p = new URLSearchParams();
    if (!local.has(state.heading)) p.set("h", state.heading);
    if (!local.has(state.body)) p.set("b", state.body);
    p.set("site", state.template);
    if (isLive() && state.url) p.set("url", state.url);
    p.set("view", state.view);
    p.set("w", state.weight); p.set("size", state.size); p.set("theme", state.theme);
    if (state.accent) p.set("accent", state.accent.replace("#", ""));
    history.replaceState(null, "", "#" + p.toString());
    syncSlotTabs();
  }
  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    const h = p.get("h"), b = p.get("b");
    if (h) { state.heading = canonical(h); if (!BY_NAME.has(h.toLowerCase())) custom.set(h, { name: h, cat: "custom" }); }
    if (b) { state.body = canonical(b); if (!BY_NAME.has(b.toLowerCase())) custom.set(b, { name: b, cat: "custom" }); }
    if (TEMPLATES[p.get("site")] || p.get("site") === LIVE) state.template = p.get("site");
    const u = normalizeSiteUrl(p.get("url"));
    if (u) state.url = u;
    if (VIEWS.some(v => v.v === p.get("view"))) state.view = p.get("view");
    if (ALL_WEIGHTS.includes(+p.get("w"))) state.weight = +p.get("w");
    if (SIZES[p.get("size")]) state.size = +p.get("size");
    if (p.get("theme") === "dark" || p.get("theme") === "light") state.theme = p.get("theme");
    const a = p.get("accent");
    if (a) { const v = a === "ink" ? "ink" : "#" + a.toLowerCase(); if (v === "ink" || /^#[0-9a-f]{6}$/.test(v)) state.accent = v; }
  }

  readHash();
  $("#fontCount").textContent = `${FONTS.length} fonts`;
  q.placeholder = `Search ${FONTS.length} Google Fonts`;
  stage.dataset.view = state.view;
  renderMocks(); renderTheme(); updateView(); updateCats(); updateSwatches(); sizeDD.update();
  applyFonts(); renderSlots(); renderList(); renderSaved(); syncHash(); layoutStage();
  loadFont(state.heading); loadFont(state.body);
})();
