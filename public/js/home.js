(() => {
  const $ = id => document.getElementById(id);
  const reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;

  const PICKS = [
    { name: "Fraunces", w: 700 },
    { name: "Syne", w: 700 },
    { name: "Instrument Serif", w: 400 },
    { name: "Space Grotesk", w: 700 },
    { name: "Playfair Display", w: 700 },
    { name: "Unbounded", w: 600 }
  ].map(f => {
    const meta = typeof BY_NAME !== "undefined" ? BY_NAME.get(f.name.toLowerCase()) : null;
    const cat = meta ? meta.cat : "sans";
    return { ...f, cat, stack: `"${f.name}", ${FALLBACK[cat] || "sans-serif"}` };
  });

  if (window.Threads) {
    const white = [0.96, 0.97, 0.98], red = [1, 0.35, 0.21];
    const hero = $("heroThreads");
    if (hero) window.Threads(hero, { color: white, accent: red, amplitude: 1.25, distance: 0.32, lineCount: 64, thickness: 0.55, softness: 1.1, speed: 0.45, angle: -10, mouse: true, brightness: 1.1, opacity: 0.75, taper: 0.9 });
    const oss = $("ossThreads");
    if (oss) window.Threads(oss, { color: white, accent: red, amplitude: 1.1, distance: 0.28, lineCount: 48, thickness: 0.5, speed: 0.35, angle: 8, seed: 3, brightness: 1, opacity: 0.6 });
  }

  const cycle = $("cycle");
  if (cycle && !reduce) {
    let i = -1, timer = 0;
    const next = () => {
      cycle.classList.add("out");
      setTimeout(() => {
        i = (i + 1) % PICKS.length;
        const f = PICKS[i];
        cycle.style.fontFamily = f.stack;
        cycle.style.fontWeight = f.w;
        cycle.style.letterSpacing = "-0.02em";
        cycle.classList.remove("out");
      }, 280);
    };
    const start = () => { if (!timer) timer = setInterval(next, 2200); };
    const stop = () => { clearInterval(timer); timer = 0; };
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    setTimeout(start, 1200);
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

  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
  } else {
    renderCode();
  }
})();
