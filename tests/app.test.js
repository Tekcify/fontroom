const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { openPage, PUBLIC } = require("./helpers");

test("search, preview, keep, weights, templates and code", async () => {
  const p = openPage("app.html");
  const { $, $$, key, type, tick, w } = p;
  await tick(300);
  assert.equal($$("#fontList .opt").length, 180);
  assert.match($("#site").innerHTML, /Spend management/);
  assert.match($("#screen").innerHTML, /Available balance/);
  assert.match($("#stage").style.getPropertyValue("--fh"), /Fraunces/);
  assert.match($(".slot[data-slot=heading] .slot-meta").textContent, /9 weights/);

  const q = $("#q");
  type(q, "playfair");
  assert.equal($$("#fontList .opt").length, 2);
  key(q, "ArrowDown"); await tick();
  assert.match($("#stage").style.getPropertyValue("--fh"), /Playfair Display/);
  assert.match($(".slot[data-slot=heading] .slot-state").textContent, /Previewing/);
  key(q, "Escape"); await tick();
  assert.match($("#stage").style.getPropertyValue("--fh"), /Fraunces/);
  key(q, "ArrowDown"); await tick(); key(q, "Enter"); await tick();
  assert.match(w.location.hash, /h=Playfair\+Display/);

  $(".slot[data-slot=body]").click();
  type(q, "Instrument Serif"); key(q, "Enter"); await tick(300);
  assert.match($(".slot[data-slot=body] .slot-meta").textContent, /1 weight$/);
  $(".slot[data-slot=heading]").click();
  type(q, "Instrument Serif"); key(q, "Enter"); await tick(300);
  assert.equal($("#stage").style.getPropertyValue("--hw"), "400");
  $("#weightDD .dd-btn").click();
  assert.equal($$("#weightDD .dd-opt[aria-disabled=true]").length, 8);
  key($("#weightDD .dd-pop"), "Escape");
  assert.ok($("#weightDD .dd-pop").hidden);

  type(q, "Nope Font");
  $$("#fontList .opt").pop().click(); await tick(400);
  assert.match($("#toasts").textContent, /isn't on Google Fonts/);
  assert.equal($(".slot[data-slot=heading] .slot-name").textContent, "Instrument Serif");

  $("#tplDD .dd-btn").click();
  assert.equal($$("#tplDD .dd-opt").length, 4);
  key($("#tplDD .dd-pop"), "End"); key($("#tplDD .dd-pop"), "Enter");
  assert.match($("#site").innerHTML, /Send your first event/);
  assert.match($("#screen").innerHTML, /Deliveries/);
  assert.equal($("#domain").textContent, "docs.relay.dev");
  assert.ok($$(".mock [contenteditable]").length > 20);

  $("#codeBtn").click();
  assert.ok(!$("#drawer").hidden);
  assert.equal($$("#tabs [role=tab]").length, 5);
  for (const t of ["tailwind", "next", "flutter", "expo"]) { $(`#tab-${t}`).click(); assert.ok($("#codeBody").textContent.length > 50, t); }
  assert.match($("#codeBody").textContent, /InstrumentSerif_400Regular/);
  key(p.d.body, "Escape");
  assert.ok($("#drawer").hidden);
  assert.equal($$("select").length, 0);
  assert.deepEqual(p.errors, []);
});

test("share links restore the full setup, including a custom accent", async () => {
  const p = openPage("app.html", { hash: "#h=Lora&b=Karla&site=docs&view=site&w=600&size=18&theme=dark&accent=FFD60A" });
  await p.tick(200);
  const { $ } = p;
  assert.equal($(".slot[data-slot=heading] .slot-name").textContent, "Lora");
  assert.match($("#site").innerHTML, /Relay/);
  assert.equal($("#stage").dataset.view, "site");
  assert.equal($("#stage").dataset.theme, "dark");
  assert.equal($("#stage").style.getPropertyValue("--bs"), "18px");
  assert.equal($("#stage").style.getPropertyValue("--acc"), "#ffd60a");
  assert.equal($("#stage").style.getPropertyValue("--on-acc"), "#111317");
  assert.ok($("#pickWrap").classList.contains("on"));
  assert.ok(!p.$$("#swatches [aria-checked=true]").length);
});

test("custom accent colour picker", async () => {
  const p = openPage("app.html");
  await p.tick(200);
  const { $, w } = p;
  const pick = $("#accentPick");
  pick.value = "#0b3d2e";
  pick.dispatchEvent(new w.Event("input", { bubbles: true }));
  pick.dispatchEvent(new w.Event("change", { bubbles: true }));
  assert.equal($("#stage").style.getPropertyValue("--acc"), "#0b3d2e");
  assert.equal($("#stage").style.getPropertyValue("--on-acc"), "#ffffff");
  assert.match(w.location.hash, /accent=0b3d2e/);
  p.$$("#swatches [role=radio]").find(b => b.dataset.v === "ink").click();
  assert.ok(!$("#pickWrap").classList.contains("on"));
  assert.equal($("#stage").style.getPropertyValue("--acc"), "var(--m-fg)");
});

test("saved pairings persist and re-apply", async () => {
  const p = openPage("app.html", { storage: { "fontroom:saved": JSON.stringify([{ h: "Syne", b: "Manrope", w: 800 }]) } });
  await p.tick(200);
  const { $, $$, w } = p;
  assert.equal($("#savedCount").textContent, "1");
  assert.equal($("#saveBtn").getAttribute("aria-pressed"), "false");
  $("#saveBtn").click();
  assert.equal($("#saveBtn").getAttribute("aria-pressed"), "true");
  assert.equal($("#savedCount").textContent, "2");
  assert.deepEqual(JSON.parse(w.localStorage.getItem("fontroom:saved"))[0], { h: "Fraunces", b: "Inter", w: 700 });
  $("#tab-saved").click();
  assert.ok($("#fontsPanel").hidden);
  assert.ok(!$("#savedPanel").hidden);
  $$(".saved-apply")[1].click(); await p.tick();
  assert.equal($(".slot[data-slot=heading] .slot-name").textContent, "Syne");
  assert.equal($(".slot[data-slot=body] .slot-name").textContent, "Manrope");
  assert.match(w.location.hash, /h=Syne&b=Manrope/);
  assert.match(w.location.hash, /w=800/);
  assert.ok($$(".saved-row")[1].classList.contains("current"));
  $$(".saved-del")[0].click();
  assert.equal(JSON.parse(w.localStorage.getItem("fontroom:saved")).length, 1);
  $$(".saved-del")[0].click();
  assert.match($("#savedList").textContent, /Nothing saved yet/);
  assert.equal($("#savedCount").textContent, "");
});

test("flip through saved pairings on the preview", async () => {
  const list = [{ h: "Syne", b: "Manrope", w: 800 }, { h: "Lora", b: "Karla", w: 700 }, { h: "Anton", b: "Rubik", w: 400 }];
  const p = openPage("app.html", { storage: { "fontroom:saved": JSON.stringify(list) } });
  await p.tick(200);
  const { $, $$, key, d } = p;
  const heading = () => $(".slot[data-slot=heading] .slot-name").textContent;
  key(d.body, "]"); await p.tick();
  assert.equal(heading(), "Syne");
  assert.match($("#toasts").textContent, /1 of 3: Syne with Manrope/);
  key(d.body, "]"); await p.tick();
  assert.equal(heading(), "Lora");
  assert.equal($$("#toasts .toast").length, 1, "flip toasts replace each other");
  key(d.body, "["); key(d.body, "["); await p.tick();
  assert.equal(heading(), "Anton");
  assert.match(p.w.location.hash, /w=400/);
  $("#tab-saved").click();
  $$(".flip-btn")[1].click(); await p.tick();
  assert.equal(heading(), "Syne");
  assert.ok($$(".saved-row")[0].classList.contains("current"));
  assert.deepEqual(p.errors, []);
});

test("flipping explains itself when fewer than two are saved", async () => {
  const p = openPage("app.html");
  await p.tick(200);
  p.key(p.d.body, "]");
  assert.match(p.$("#toasts").textContent, /Save a few pairings/);
  assert.equal(p.$(".slot[data-slot=heading] .slot-name").textContent, "Fraunces");
  assert.equal(p.$$(".flip").length, 0);
});

test("keyboard shortcuts", async () => {
  const p = openPage("app.html");
  await p.tick(200);
  const { $, key, d } = p;
  key(d.body, "x");
  assert.equal($(".slot[data-slot=heading] .slot-name").textContent, "Inter");
  assert.equal($(".slot[data-slot=body] .slot-name").textContent, "Fraunces");
  key(d.body, "2"); assert.equal($("#stage").dataset.view, "site");
  key(d.body, "3"); assert.equal($("#stage").dataset.view, "app");
  assert.equal(p.$$("#viewSeg [aria-checked=true]")[0].dataset.v, "app");
  key(d.body, "d"); assert.equal($("#stage").dataset.theme, "dark");
  key(d.body, "b"); assert.equal($(".slot[data-slot=body]").getAttribute("aria-checked"), "true");
  key(d.body, "s"); assert.equal($("#saveBtn").getAttribute("aria-pressed"), "true");
  key(d.body, "?"); assert.ok($("#keys").hasAttribute("open"));
  key(d.body, "x"); assert.equal($(".slot[data-slot=heading] .slot-name").textContent, "Inter", "shortcuts pause while the dialog is open");
  $("#keysClose").click(); assert.ok(!$("#keys").hasAttribute("open"));
  key(d.body, "/"); assert.equal(d.activeElement, $("#q"));
  key($("#q"), "x"); assert.equal($(".slot[data-slot=heading] .slot-name").textContent, "Inter", "typing in search is not a shortcut");
  key(d.body, "c"); assert.ok(!$("#drawer").hidden);
  assert.deepEqual(p.errors, []);
});

test("own font file: drop, preview, code and limits", async () => {
  const p = openPage("app.html");
  await p.tick(200);
  const { $, $$, w } = p;
  const b = fs.readFileSync(path.join(PUBLIC, "fonts/OnestVF.woff2"));
  const drop = file => {
    const ev = new w.Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(ev, "dataTransfer", { value: { types: ["Files"], files: [file] } });
    w.dispatchEvent(ev);
  };
  drop({ name: "notes.txt", size: 10, arrayBuffer: async () => new ArrayBuffer(10) });
  await p.tick();
  assert.match($("#toasts").textContent, /isn't a font file/);

  drop({ name: "RidgelineVF.woff2", size: b.length, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.length) });
  await p.tick(200);
  assert.equal($(".slot[data-slot=heading] .slot-name").textContent, "Ridgeline");
  assert.equal($(".slot[data-slot=heading] .slot-meta").textContent, "Your file · 9 weights");
  assert.match($("#stage").style.getPropertyValue("--fh"), /"Ridgeline"/);
  assert.match($("#toasts").textContent, /stays on this device/);
  assert.ok(!/h=Ridgeline/.test(w.location.hash), "own fonts never go into the link");
  assert.ok($$("#fontList .opt").some(o => o.dataset.name === "Ridgeline"));

  $("#codeBtn").click();
  assert.deepEqual($$("#tabs [role=tab]").map(t => t.dataset.v), ["css", "next"]);
  assert.match($("#codeBody").textContent, /url\("\/fonts\/RidgelineVF\.woff2"\)/);
  $("#tab-next").click();
  assert.match($("#codeBody").textContent, /next\/font\/local/);
  $("#drawerClose").click();

  $("#saveBtn").click();
  assert.match($("#toasts").textContent, /can't be saved/);
  assert.equal($("#savedCount").textContent, "");
  assert.deepEqual(p.errors, []);
});
