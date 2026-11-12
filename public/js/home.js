(() => {
  const $ = id => document.getElementById(id);
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;

  const PICKS = [
    { name: "Syne", w: 700 },
    { name: "Fraunces", w: 700 },
    { name: "Instrument Serif", w: 400 },
    { name: "Space Grotesk", w: 700 },
    { name: "Playfair Display", w: 700 },
    { name: "Unbounded", w: 600 }
  ].map(f => {
    const meta = typeof BY_NAME !== "undefined" ? BY_NAME.get(f.name.toLowerCase()) : null;
    const cat = meta ? meta.cat : "sans";
    return { ...f, cat, stack: `"${f.name}", ${FALLBACK[cat] || "sans-serif"}` };
  });

  const mq = q => (window.matchMedia ? window.matchMedia(q).matches : false);
  const small = mq("(max-width: 760px)");
  const fine = mq("(pointer: fine)");

  if (!reduce && fine && typeof window.Lenis === "function") {
    const lenis = new window.Lenis({ autoRaf: true, lerp: 0.1, allowNestedScroll: true, anchors: true });
    window.lenis = lenis;
    window.addEventListener("load", () => lenis.resize());
  }

  if (window.LightRays) {
    const base = { color: "#fff4ee", speed: 0.6, density: 1.3, sharpness: 0.55, haze: 0.25, atmosphere: 0.85, saturation: 0.7, maxRatio: small ? 1.25 : 2 };
    const hero = $("heroRays");
    if (hero) window.LightRays(hero, { ...base, spread: 1.7, length: 3, glow: 0.4, intensity: 1.15, opacity: 0.95, follow: fine, influence: 0.08, cursorShadow: fine });
    const cta = $("ctaRays");
    if (cta) window.LightRays(cta, { ...base, spread: 1.1, length: 2, glow: 0.55, intensity: 1.15, opacity: 0.9, follow: false, cursorShadow: false });
  }

  const reveals = [...document.querySelectorAll("[data-reveal]")];
  if (reduce || typeof IntersectionObserver !== "function") {
    reveals.forEach(el => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    const vh = window.innerHeight || 800;
    const first = reveals.filter(el => el.getBoundingClientRect().top < vh);
    reveals.filter(el => !first.includes(el)).forEach(el => io.observe(el));
    requestAnimationFrame(() => requestAnimationFrame(() => first.forEach(el => el.classList.add("in"))));
  }

  const say = $("say");
  if (say) {
    const words = say.textContent.trim().split(/\s+/);
    say.innerHTML = words.map(w => `<span class="w">${esc(w)}</span>`).join(" ");
    const spans = [...say.querySelectorAll(".w")];
    if (reduce) {
      spans.forEach(sp => sp.classList.add("on"));
    } else {
      let lit = -1, queued = false;
      const paintWords = () => {
        queued = false;
        const r = say.getBoundingClientRect(), vh = window.innerHeight || 800;
        const start = vh * 0.85, end = vh * 0.4;
        const p = Math.min(1, Math.max(0, (start - r.top) / (start - end + r.height)));
        const n = Math.round(p * spans.length);
        if (n === lit) return;
        lit = n;
        spans.forEach((sp, i) => sp.classList.toggle("on", i < n));
      };
      const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(paintWords); } };
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      paintWords();
    }
  }

  const toastEl = $("toast");
  let toastT = 0;
  const toast = msg => {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("on");
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove("on"), 3400);
  };
  const watch = (el, cb) => {
    if (typeof IntersectionObserver === "function") new IntersectionObserver(en => cb(en.some(x => x.isIntersecting))).observe(el);
  };
  const autoplay = (el, ms, tick) => {
    let seen = false, timer = 0, off = reduce;
    const run = () => { clearInterval(timer); timer = !off && seen && !document.hidden ? setInterval(tick, ms) : 0; };
    watch(el, s => { seen = s; run(); });
    document.addEventListener("visibilitychange", run);
    return { stop: () => { off = true; run(); }, seen: () => seen };
  };

  if (fine) document.querySelectorAll(".bento .cell").forEach(cell => {
    cell.addEventListener("pointermove", e => {
      const r = cell.getBoundingClientRect();
      cell.style.setProperty("--mx", `${e.clientX - r.left}px`);
      cell.style.setProperty("--my", `${e.clientY - r.top}px`);
      cell.classList.add("lit");
    });
    cell.addEventListener("pointerleave", () => cell.classList.remove("lit"));
  });

  const dropCell = document.querySelector(".cell-drop"), drop = $("drop"), dropInput = $("dropInput");
  if (dropCell && drop && dropInput) {
    const done = $("dropDone");
    let loaded = 0, depth = 0;
    const kb = n => n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
    const load = async file => {
      if (!file) return;
      if (!/\.(woff2?|ttf|otf)$/i.test(file.name)) { toast("That isn't a font file. Try a .woff2, .woff, .ttf or .otf."); return; }
      if (file.size > 20 * 1048576) { toast("That file is over 20 MB. Try a smaller font file."); return; }
      try {
        if (typeof FontFace !== "function" || !document.fonts) throw new Error("unsupported");
        const family = `Dropped font ${++loaded}`;
        const face = new FontFace(family, await file.arrayBuffer());
        await face.load();
        document.fonts.add(face);
        const stack = `"${family}", ${FALLBACK.sans}`;
        $("dropAa").style.fontFamily = stack;
        $("dropGlyphs").style.fontFamily = stack;
        $("dropName").textContent = file.name;
        $("dropSize").textContent = kb(file.size);
        done.hidden = true;
        void done.offsetWidth;
        done.hidden = false;
        drop.classList.add("has");
      } catch {
        toast("Couldn't read that font. The file may be damaged.");
      }
    };
    const files = e => e.dataTransfer && [...(e.dataTransfer.types || [])].includes("Files");
    dropCell.addEventListener("dragenter", e => { if (!files(e)) return; e.preventDefault(); depth++; drop.classList.add("over"); });
    dropCell.addEventListener("dragover", e => { if (!files(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = "copy"; });
    dropCell.addEventListener("dragleave", () => { depth = Math.max(0, depth - 1); if (!depth) drop.classList.remove("over"); });
    dropCell.addEventListener("drop", e => {
      if (!files(e)) return;
      e.preventDefault();
      depth = 0;
      drop.classList.remove("over");
      load(e.dataTransfer.files[0]);
    });
    const pick = () => dropInput.click();
    $("dropBtn").addEventListener("click", pick);
    $("dropAgain").addEventListener("click", pick);
    dropInput.addEventListener("change", () => { load(dropInput.files[0]); dropInput.value = ""; });
  }

  const wt = $("wt");
  if (wt) {
    const spec = $("wtSpec"), now = $("wtNow");
    const real = [...wt.querySelectorAll('[role="radio"]')];
    let cur = Math.max(0, real.findIndex(b => b.getAttribute("aria-checked") === "true")), dir = 1, missT = 0;
    const set = (i, focus) => {
      cur = i;
      real.forEach((b, j) => { b.setAttribute("aria-checked", String(j === i)); b.tabIndex = j === i ? 0 : -1; });
      spec.style.fontWeight = real[i].dataset.w;
      now.textContent = real[i].dataset.w;
      now.classList.remove("miss");
      if (focus) real[i].focus();
    };
    const play = autoplay(wt, 1400, () => {
      if (cur + dir < 0 || cur + dir >= real.length) dir = -dir;
      set(cur + dir);
    });
    real.forEach((b, i) => {
      b.addEventListener("click", () => { play.stop(); set(i); });
      b.addEventListener("keydown", e => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        const n = step ? (cur + step + real.length) % real.length : e.key === "Home" ? 0 : e.key === "End" ? real.length - 1 : null;
        if (n === null) return;
        e.preventDefault();
        play.stop();
        set(n, true);
      });
    });
    wt.querySelectorAll(".no").forEach(b => b.addEventListener("click", () => {
      play.stop();
      b.classList.remove("shake");
      void b.offsetWidth;
      b.classList.add("shake");
      now.textContent = `No ${b.dataset.w} in this font`;
      now.classList.add("miss");
      clearTimeout(missT);
      missT = setTimeout(() => set(cur), 1600);
    }));
    set(cur);
  }

  const share = $("share");
  if (share) {
    const OPTS = {
      h: [["Syne", "sans-serif", 700], ["Fraunces", "serif", 700], ["Unbounded", "sans-serif", 600], ["Playfair Display", "serif", 700]],
      accent: [["Red", "ff5a36"], ["Blue", "3b5bdb"], ["Green", "2f7d5b"], ["Gold", "e9c46a"]],
      theme: [["Dark", "dark"], ["Light", "light"]]
    };
    const at = { h: 0, accent: 0, theme: 0 };
    const head = $("shareH"), link = $("shareUrl"), text = $("shareText"), copy = $("shareCopy");
    const btns = [...share.querySelectorAll(".share-opts button")];
    let qs = "", hotT = 0, copyT = 0;
    const render = hot => {
      const [name, cat, w] = OPTS.h[at.h];
      const p = [["h", name], ["b", "Inter"], ["w", String(w)], ["accent", OPTS.accent[at.accent][1]], ["theme", OPTS.theme[at.theme][1]]];
      qs = new URLSearchParams(p).toString();
      link.href = `app.html#${qs}`;
      const hotKeys = hot === "h" ? ["h", "w"] : [hot];
      text.innerHTML = "fontroom.vercel.app/app#" + qs.split("&").map(kv => {
        const [k, v] = kv.split("=");
        return `${k}=<b${hotKeys.includes(k) ? ' class="hot"' : ""}>${esc(v)}</b>`;
      }).join("&amp;");
      clearTimeout(hotT);
      hotT = setTimeout(() => text.querySelectorAll(".hot").forEach(el => el.classList.remove("hot")), 900);
      head.style.fontFamily = `"${name}", ${cat}`;
      head.style.fontWeight = w;
      share.style.setProperty("--sc-acc", `#${OPTS.accent[at.accent][1]}`);
      share.dataset.theme = OPTS.theme[at.theme][1];
      btns.forEach(b => { b.querySelector("span").textContent = OPTS[b.dataset.k][at[b.dataset.k]][0]; });
    };
    btns.forEach(b => b.addEventListener("click", () => {
      const k = b.dataset.k;
      at[k] = (at[k] + 1) % OPTS[k].length;
      if (k === "h" && !reduce) {
        head.classList.add("swap");
        setTimeout(() => { render(k); head.classList.remove("swap"); }, 180);
      } else render(k);
    }));
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(`https://fontroom.vercel.app/app#${qs}`);
        copy.querySelector("use").setAttribute("href", "#i-check");
        copy.setAttribute("aria-label", "Link copied");
        clearTimeout(copyT);
        copyT = setTimeout(() => {
          copy.querySelector("use").setAttribute("href", "#i-copy");
          copy.setAttribute("aria-label", "Copy link");
        }, 1600);
      } catch {
        toast("Couldn't copy the link. Open it and copy it from the address bar.");
      }
    });
    render(null);
  }

  const flipper = $("flipper");
  if (flipper) {
    const cards = [...flipper.querySelectorAll(".flip-card")];
    const count = $("flipCount"), prev = $("flipPrev"), next = $("flipNext");
    let at = 0;
    count.setAttribute("aria-live", "off");
    const go = dir => {
      const from = cards[at];
      at = (at + dir + cards.length) % cards.length;
      cards.forEach((c, i) => { c.dataset.pos = String((i - at + cards.length) % cards.length); });
      if (!reduce) {
        const el = dir > 0 ? from : cards[at], cls = dir > 0 ? "out" : "in";
        el.classList.remove("out", "in");
        void el.offsetWidth;
        el.classList.add(cls);
        el.addEventListener("animationend", () => el.classList.remove(cls), { once: true });
      }
      count.textContent = `${at + 1} of ${cards.length}`;
    };
    const play = autoplay(flipper, 2800, () => go(1));
    const press = (btn, dir) => {
      play.stop();
      count.setAttribute("aria-live", "polite");
      const k = btn.querySelector("kbd");
      k.classList.add("press");
      setTimeout(() => k.classList.remove("press"), 140);
      go(dir);
    };
    prev.addEventListener("click", () => press(prev, -1));
    next.addEventListener("click", () => press(next, 1));
    document.addEventListener("keydown", e => {
      if ((e.key !== "[" && e.key !== "]") || e.metaKey || e.ctrlKey || e.altKey || !play.seen()) return;
      const t = e.target;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      press(e.key === "[" ? prev : next, e.key === "[" ? -1 : 1);
    });
  }

  function tabs(list, onSelect) {
    const btns = [...list.querySelectorAll('[role="tab"]')];
    const select = (i, focus) => {
      btns.forEach((b, j) => {
        b.setAttribute("aria-selected", String(j === i));
        b.tabIndex = j === i ? 0 : -1;
      });
      if (focus) btns[i].focus();
      onSelect(i, btns[i]);
    };
    btns.forEach((b, i) => {
      b.addEventListener("click", () => select(i));
      b.addEventListener("keydown", e => {
        const cur = btns.indexOf(e.currentTarget);
        let n = null;
        if (e.key === "ArrowRight") n = (cur + 1) % btns.length;
        else if (e.key === "ArrowLeft") n = (cur - 1 + btns.length) % btns.length;
        else if (e.key === "Home") n = 0;
        else if (e.key === "End") n = btns.length - 1;
        if (n === null) return;
        e.preventDefault();
        select(n, true);
      });
    });
    return select;
  }

  const shotTabs = $("shotTabs"), shots = $("shots");
  if (shotTabs && shots) {
    const imgs = [...shots.querySelectorAll("img")];
    tabs(shotTabs, (i, btn) => {
      imgs.forEach((img, j) => {
        if (j === i) img.loading = "eager";
        img.classList.toggle("is-on", j === i);
      });
      shots.scrollLeft = 0;
      shots.setAttribute("aria-labelledby", btn.id);
    });
  }

  const STACKS = [
    { key: "css", label: "HTML + CSS" },
    { key: "tailwind", label: "Tailwind" },
    { key: "next", label: "Next.js" },
    { key: "flutter", label: "Flutter" },
    { key: "expo", label: "Expo" }
  ];
  let pick = 0, stack = 2, current = [];

  const paint = code => esc(code)
    .replace(/(&quot;|"[^"\n]*")/g, m => `<span class="tok-s">${m}</span>`)
    .replace(/\b(import|from|export|default|function|return|const|final)\b/g, '<span class="tok-k">$1</span>');

  function renderCode() {
    if (typeof buildCode !== "function") return;
    const f = PICKS[pick];
    const out = buildCode({ heading: f.name, body: "Inter", hWeight: f.w, hWeights: [f.w], bWeights: [400, 600], hCat: f.cat, bCat: "sans", bodyPx: 16 });
    current = out[STACKS[stack].key] || [];
    $("codeFile").textContent = current.map(s => s.label).join("  +  ");
    $("codeOut").innerHTML = current.map(s => paint(s.code)).join("\n\n");
  }

  const stackTabs = $("stackTabs");
  if (stackTabs) {
    stackTabs.innerHTML = STACKS.map((s, i) => `<button type="button" role="tab" id="stack-${s.key}" aria-controls="codePanel" aria-selected="${i === stack}" tabindex="${i === stack ? 0 : -1}">${s.label}</button>`).join("");
    tabs(stackTabs, (i, btn) => {
      stack = i;
      $("codePanel").setAttribute("aria-labelledby", btn.id);
      renderCode();
    });
    $("codePanel").setAttribute("aria-labelledby", "stack-" + STACKS[stack].key);
  }

  const copyBtn = $("copyBtn");
  if (copyBtn) {
    let t = 0;
    copyBtn.addEventListener("click", async () => {
      const text = current.map(s => s.code).join("\n\n");
      try {
        await navigator.clipboard.writeText(text);
        copyBtn.querySelector("span").textContent = "Copied";
        copyBtn.querySelector("use").setAttribute("href", "#i-check");
      } catch {
        copyBtn.querySelector("span").textContent = "Copy failed";
      }
      clearTimeout(t);
      t = setTimeout(() => {
        copyBtn.querySelector("span").textContent = "Copy";
        copyBtn.querySelector("use").setAttribute("href", "#i-copy");
      }, 1600);
    });
  }

  const STATUS = `<div class="p-status"><span>9:41</span><i></i><span class="p-sig"><b></b><b></b><b></b><b></b></span></div>`;
  const row = (a, b, c, cls = "") => `<div class="p-row ${cls}"><span class="p-ic">${a.slice(0, 1)}</span><span class="p-rt"><b>${a}</b><small>${b}</small></span><span class="p-amt">${c}</span></div>`;
  const TEMPLATES = [
    {
      key: "fin", label: "Fintech", domain: "northwind.app",
      site: `<div class="m-nav"><span class="m-logo"><i></i><b class="h">Northwind</b></span><span class="m-links"><span>Product</span><span>Pricing</span><span>Customers</span></span><span class="m-btn sm alt">Sign in</span></div>
        <div class="m-hero"><span class="m-pill"><i></i>Bill pay now works in 30 countries</span><p class="m-h h">Spend management your team will actually like</p><p class="m-p">Cards, approvals and reimbursements in one place. Close the books in days, not weeks.</p><div class="m-ctas"><span class="m-btn">Start free trial</span><span class="m-btn alt">Book a demo</span></div></div>
        <div class="m-stats"><div><b class="h">$248,310</b><span>Spent this month</span></div><div><b class="h">12</b><span>Waiting for approval</span></div><div><b class="h">4 days</b><span>To close the books</span></div></div>`,
      phone: `${STATUS}<p class="p-small">Good morning</p><p class="p-h h">Ada Okonkwo</p>
        <div class="p-card"><span class="p-small">Available balance</span><b class="p-big h">$48,920.15</b><span class="p-small">+$1,140.20 this week</span></div>
        <div class="p-acts"><span><i><svg viewBox="0 0 24 24"><path d="M7 17 17 7M8 7h9v9"/></svg></i>Send</span><span><i><svg viewBox="0 0 24 24"><path d="M17 7 7 17M16 17H7V8"/></svg></i>Request</span><span><i><svg viewBox="0 0 24 24"><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18"/></svg></i>Cards</span></div>
        <p class="p-sub h">Recent activity</p>${row("Figma", "Software", "-$45.00")}${row("Acme Studio", "Client", "+$4,200", "pos")}${row("Uber", "Travel", "-$23.10")}`
    },
    {
      key: "cafe", label: "Café", domain: "juniper.cafe",
      site: `<div class="m-nav"><span class="m-logo"><i></i><b class="h">Juniper</b></span><span class="m-links"><span>Menu</span><span>Visit</span><span>Our story</span></span><span class="m-btn sm">Order</span></div>
        <div class="m-hero"><span class="m-pill"><i></i>Open today, 7am to 3pm</span><p class="m-h h">Bread baked before the sun comes up</p><p class="m-p">Sourdough, pastries and slow coffee on Mill Street. Order ahead and skip the line.</p><div class="m-ctas"><span class="m-btn">Order for pickup</span><span class="m-btn alt">See the menu</span></div></div>
        <div class="m-menu"><div><b class="h">Country loaf</b><span>$9.00</span></div><div><b class="h">Cardamom bun</b><span>$4.50</span></div><div><b class="h">Flat white</b><span>$4.00</span></div></div>`,
      phone: `${STATUS}<p class="p-small">Pickup at 8:15</p><p class="p-h h">Your order</p>
        <div class="p-items">${row("Country loaf", "1 × whole", "$9.00")}${row("Cardamom bun", "2 × warm", "$9.00")}${row("Flat white", "Oat milk", "$4.50")}</div>
        <div class="p-total"><span>Total</span><b class="h">$22.50</b></div><div class="p-pay">Pay and pick up</div>`
    },
    {
      key: "docs", label: "Docs", domain: "relay.dev/docs",
      site: `<div class="m-nav"><span class="m-logo"><i></i><b class="h">Relay</b></span><span class="m-search">Search docs<kbd>⌘K</kbd></span><span class="m-btn sm">Dashboard</span></div>
        <div class="m-docs"><div class="m-side"><b>Get started</b><span>Quickstart</span><span class="on">Webhooks</span><span>Retries</span><b>API</b><span>Events</span><span>Customers</span></div>
        <div class="m-hero"><span class="m-crumb">Guides / Webhooks</span><p class="m-h h">Send your first webhook</p><p class="m-p">Relay signs every event and retries for up to three days. Here's the five minute setup.</p><pre class="m-code"><span>$</span> curl https://api.relay.dev/v1/events \\
  -d type=invoice.paid</pre></div></div>`,
      phone: `${STATUS}<p class="p-small">Production</p><p class="p-h h">Events</p>
        <div class="p-items">${row("invoice.paid", "2s ago", "200", "ok")}${row("customer.created", "1m ago", "200", "ok")}${row("payout.failed", "Retrying in 4m", "500", "bad")}${row("invoice.sent", "6m ago", "200", "ok")}</div>`
    },
    {
      key: "mag", label: "Magazine", domain: "themargin.co",
      site: `<div class="m-nav"><span class="m-links"><span>Essays</span><span>Culture</span></span><span class="m-logo center"><b class="h">The Margin</b></span><span class="m-btn sm">Subscribe</span></div>
        <div class="m-hero"><span class="m-kicker">Essay</span><p class="m-h h">The quiet return of the long read</p><p class="m-p">Why people are choosing slow, careful writing again, and what it means for the web.</p><p class="m-by">By Lena Ortiz <i></i> 12 min read</p></div>
        <div class="m-more"><div><span>Culture</span><b class="h">A field guide to good rooms</b></div><div><span>Design</span><b class="h">Notes on quiet interfaces</b></div></div>`,
      phone: `${STATUS}<p class="p-small">Thursday</p><p class="p-h h">Today</p>
        <div class="p-lead"><span class="p-small">Essay</span><b class="h">The quiet return of the long read</b><span class="p-small">12 min read</span></div>
        <div class="p-items">${row("A field guide to good rooms", "Culture", "")}${row("Notes on quiet interfaces", "Design", "")}</div>`
    }
  ];

  const tplTabs = $("tplTabs"), stageEl = $("stage");
  if (tplTabs && stageEl) {
    tplTabs.innerHTML = TEMPLATES.map((t, i) => `<button type="button" role="tab" id="tpl-${t.key}" aria-controls="stage" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${t.label}</button>`).join("");
    tabs(tplTabs, (i, btn) => {
      const t = TEMPLATES[i];
      stageEl.dataset.tpl = t.key;
      stageEl.setAttribute("aria-labelledby", btn.id);
      $("tplDomain").textContent = t.domain;
      $("siteBody").innerHTML = t.site;
      $("phoneBody").innerHTML = t.phone;
    });
    tplTabs.querySelector('[role="tab"]').click();
  }

  const fonts = $("fonts"), stage = $("stage");
  if (fonts && stage) {
    fonts.innerHTML = PICKS.map((f, i) => `<button type="button" class="font-opt" role="radio" data-i="${i}"><b style="font-family:${esc(f.stack).replace(/"/g, "'")};font-weight:${f.w}">${f.name}</b><span>${CAT_LABEL[f.cat] || ""}</span></button>`).join("");
    const btns = [...fonts.querySelectorAll(".font-opt")];
    const select = (i, focus) => {
      pick = i;
      const f = PICKS[i];
      stage.style.setProperty("--fh", f.stack);
      stage.style.setProperty("--hw", f.w);
      btns.forEach((b, j) => {
        b.setAttribute("aria-checked", String(j === i));
        b.tabIndex = j === i ? 0 : -1;
      });
      if (focus) btns[i].focus();
      if (fonts.scrollWidth > fonts.clientWidth) {
        const b = btns[i], left = b.offsetLeft - fonts.offsetLeft;
        if (left < fonts.scrollLeft || left + b.offsetWidth > fonts.scrollLeft + fonts.clientWidth) fonts.scrollTo({ left: left - 20, behavior: reduce ? "auto" : "smooth" });
      }
      renderCode();
    };
    btns.forEach((b, i) => {
      b.addEventListener("click", () => select(i));
      b.addEventListener("keydown", e => {
        const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        select((pick + d + PICKS.length) % PICKS.length, true);
      });
    });
    select(0);

    const pin = $("tryPin");
    if (pin && !reduce) {
      let on = false, top = 0, run = 0, last = 0, queued = false;
      const sec = pin.firstElementChild;
      const measure = () => {
        const vh = window.innerHeight || 800;
        const pad = parseFloat(getComputedStyle(sec).paddingTop) || 0;
        const body = sec.offsetHeight - pad;
        on = mq("(min-width: 981px)") && body > 0 && body <= vh - 48;
        pin.classList.toggle("is-pinned", on);
        if (!on) { sec.style.top = ""; pin.style.height = ""; return; }
        const step = Math.round(Math.min(360, Math.max(240, vh * 0.38)));
        run = step * PICKS.length;
        top = Math.round((vh - body) / 2 - pad);
        sec.style.top = top + "px";
        pin.style.height = sec.offsetHeight + run + "px";
      };
      const follow = () => {
        queued = false;
        if (!on) return;
        const p = (top - pin.getBoundingClientRect().top) / run;
        const i = Math.min(PICKS.length - 1, Math.max(0, Math.floor(p * PICKS.length)));
        if (i === last) return;
        last = i;
        if (i !== pick) select(i);
      };
      const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(follow); } };
      const refit = () => { measure(); last = -1; follow(); };
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", refit);
      window.addEventListener("load", refit);
      measure();
      follow();
    }
  } else {
    renderCode();
  }
})();
