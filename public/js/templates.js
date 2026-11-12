const I = n => `<svg class="mi" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const STATUS = `<div class="statusbar"><span>9:41</span><span class="island"></span><span class="icons"><svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg><svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true"><path d="M8 2.5c2.3 0 4.4.9 6 2.4l1.2-1.3A10.4 10.4 0 0 0 8 .7 10.4 10.4 0 0 0 .8 3.6L2 4.9a8.6 8.6 0 0 1 6-2.4Zm0 3.6c1.3 0 2.5.5 3.4 1.3l1.2-1.3A6.8 6.8 0 0 0 8 4.3a6.8 6.8 0 0 0-4.6 1.8l1.2 1.3c.9-.8 2.1-1.3 3.4-1.3Zm0 3.5-2.1 2.2L8 12l2.1-2.2A3 3 0 0 0 8 9.6Z"/></svg><svg width="27" height="13" viewBox="0 0 27 13" aria-hidden="true"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2"/><path d="M25 4.5v4c.8-.3 1.5-1 1.5-2s-.7-1.7-1.5-2Z" opacity=".4"/></svg></span></div>`;
const ART = {
  loaf: `<svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><ellipse cx="200" cy="330" rx="150" ry="96" fill="currentColor" opacity=".28"/><ellipse cx="200" cy="312" rx="122" ry="74" fill="currentColor" opacity=".34"/><path d="M120 300c40-26 120-26 160 0M140 330c34-18 86-18 120 0" stroke="currentColor" stroke-width="6" fill="none" opacity=".45" stroke-linecap="round"/><circle cx="300" cy="140" r="46" fill="currentColor" opacity=".16"/></svg>`,
  cup: `<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><ellipse cx="100" cy="150" rx="70" ry="16" fill="currentColor" opacity=".2"/><path d="M58 80h84l-8 62a12 12 0 0 1-12 10H78a12 12 0 0 1-12-10z" fill="currentColor" opacity=".38"/><path d="M142 92h8a14 14 0 0 1 0 28h-11" stroke="currentColor" stroke-width="7" fill="none" opacity=".38"/></svg>`,
  roll: `<svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><circle cx="100" cy="104" r="58" fill="currentColor" opacity=".3"/><path d="M100 104m-34 0a34 34 0 1 0 68 0 24 24 0 1 0-48 0 14 14 0 1 0 28 0" stroke="currentColor" stroke-width="7" fill="none" opacity=".5" stroke-linecap="round"/></svg>`,
  arch: `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect x="0" y="210" width="400" height="90" fill="currentColor" opacity=".18"/><path d="M70 210V120a40 40 0 0 1 80 0v90M170 210V120a40 40 0 0 1 80 0v90M270 210V120a40 40 0 0 1 80 0v90" fill="currentColor" opacity=".26"/><rect x="40" y="60" width="330" height="10" fill="currentColor" opacity=".22"/></svg>`,
  shelves: `<svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="currentColor" opacity=".32"><rect x="40" y="40" width="14" height="50"/><rect x="58" y="48" width="10" height="42"/><rect x="72" y="36" width="16" height="54"/><rect x="92" y="52" width="12" height="38"/><rect x="150" y="44" width="12" height="46"/><rect x="166" y="38" width="18" height="52"/><rect x="40" y="114" width="18" height="48"/><rect x="62" y="122" width="10" height="40"/><rect x="180" y="118" width="14" height="44"/><rect x="198" y="110" width="12" height="52"/><rect x="214" y="124" width="16" height="38"/></g><g fill="currentColor" opacity=".2"><rect x="30" y="90" width="240" height="6"/><rect x="30" y="162" width="240" height="6"/></g></svg>`,
  waves: `<svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><circle cx="210" cy="70" r="30" fill="currentColor" opacity=".25"/><path d="M0 130c50-20 100 20 150 0s100-20 150 0v70H0z" fill="currentColor" opacity=".25"/><path d="M0 155c50-20 100 20 150 0s100-20 150 0v45H0z" fill="currentColor" opacity=".3"/></svg>`,
  grid: `<svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="currentColor" opacity=".28"><rect x="60" y="40" width="50" height="50" rx="25"/><rect x="125" y="40" width="50" height="50"/><rect x="190" y="40" width="50" height="50" rx="8"/><rect x="60" y="105" width="50" height="50"/><rect x="125" y="105" width="50" height="50" rx="25"/><rect x="190" y="105" width="50" height="50"/></g></svg>`
};

const TEMPLATES = {
  startup: {
    label: "Northwind", sub: "SaaS", domain: "northwind.app", accent: "#3b5bdb",
    site: () => `
<header class="m-nav">
  <div class="m-logo"><span class="m-logomark">N</span><span class="h m-logotext">Northwind</span></div>
  <nav class="m-links"><a>Product</a><a>Pricing</a><a>Customers</a><a>Docs</a></nav>
  <div class="m-navcta"><a class="m-link">Sign in</a><a class="m-btn">Start free</a></div>
</header>
<section class="su-hero">
  <h1 class="h m-h1">Spend management your finance team will actually like</h1>
  <p class="m-lede">Corporate cards, approvals and reimbursements in one place. Close the books in days, not weeks.</p>
  <div class="m-actions"><a class="m-btn lg">Start free trial</a><a class="m-btn ghost lg">Book a demo</a></div>
  <p class="m-note">Free for 30 days. No card required.</p>
</section>
<section class="su-product">
  <div class="su-panel">
    <div>
      <div class="su-head">
        <div><p class="mut sm">Spend this month</p><p class="h su-big num">$248,310.42</p></div>
        <span class="su-pill num">12.4% under budget</span>
      </div>
      <div class="su-bars" aria-hidden="true"><i style="height:42%"></i><i style="height:55%"></i><i style="height:48%"></i><i style="height:62%"></i><i style="height:58%"></i><i style="height:71%"></i><i style="height:66%"></i><i style="height:60%"></i><i style="height:74%"></i><i style="height:69%"></i><i style="height:80%"></i><i style="height:88%"></i></div>
      <div class="su-months" aria-hidden="true"><span>D</span><span>J</span><span>F</span><span>M</span><span>A</span><span>M</span><span>J</span><span>J</span><span>A</span><span>S</span><span>O</span><span>N</span></div>
    </div>
    <div>
      <p class="su-side-title">Needs your approval</p>
      <ul class="su-rows">
        <li><span class="su-av">Fi</span><span><b>Figma Organization</b><span class="mut sm">Design · Kemi A.</span></span><span class="amt num">$1,440.00</span></li>
        <li><span class="su-av">Ae</span><span><b>Aer Lingus</b><span class="mut sm">Travel · Daniel O.</span></span><span class="amt num">$612.80</span></li>
        <li><span class="su-av">Ws</span><span><b>WeWork Lagos</b><span class="mut sm">Office · Tolu B.</span></span><span class="amt num">$2,100.00</span></li>
        <li><span class="su-av">Gh</span><span><b>GitHub Enterprise</b><span class="mut sm">Engineering · Sam K.</span></span><span class="amt num">$873.50</span></li>
      </ul>
    </div>
  </div>
</section>
<section class="su-logos">
  <p class="mut sm">Finance teams at these companies run on Northwind</p>
  <div class="su-logo-row"><span class="h">Lumen</span><span class="h">Kestrel</span><span class="h">Halcyon</span><span class="h">Orbital</span><span class="h">Fieldnote</span></div>
</section>
<section class="m-section">
  <h2 class="h m-h2">Every expense, accounted for</h2>
  <p class="m-lede">Set the rules once. Northwind applies them to every card swipe, invoice and receipt.</p>
  <div class="su-feats">
    <div><span class="su-ficon">${I("card")}</span><h3 class="h m-h3">Cards with limits built in</h3><p>Issue virtual and physical cards in seconds, each with its own budget, merchant rules and expiry.</p></div>
    <div><span class="su-ficon">${I("zap")}</span><h3 class="h m-h3">Approvals in Slack</h3><p>Managers approve spend where they already work. Receipts are matched automatically.</p></div>
    <div><span class="su-ficon">${I("layers")}</span><h3 class="h m-h3">Sync to your ledger</h3><p>Every transaction lands in Xero, QuickBooks or NetSuite, coded and ready to reconcile.</p></div>
  </div>
</section>
<section class="su-cta">
  <h2 class="h m-h2">Close your month in three days</h2>
  <p>Set up takes an afternoon. Your first 30 days are on us.</p>
  <a class="m-btn lg inv">Start free trial</a>
</section>
<footer class="m-foot"><span>© 2026 Northwind Inc.</span><nav><a>Privacy</a><a>Terms</a><a>Security</a><a>Status</a></nav></footer>`,
    app: () => `${STATUS}
<div class="a-scroll">
  <div class="a-top"><div><p class="mut sm">Good morning</p><p class="h a-title-sm">Ada Okonkwo</p></div><span class="a-av">AO</span></div>
  <div class="su-bal-card">
    <div class="row"><span class="sm">Available balance</span><span class="su-chip">USD</span></div>
    <p class="h su-bal num">$48,920.15</p>
    <p class="sm num">+$1,140.20 this week</p>
  </div>
  <div class="su-quick">
    <a><span>${I("send")}</span>Send</a><a><span>${I("request")}</span>Request</a><a><span>${I("card")}</span>Cards</a><a><span>${I("more")}</span>More</a>
  </div>
  <div class="a-sec"><h2 class="h a-h2">Recent activity</h2><a>See all</a></div>
  <ul class="a-list">
    <li><span class="su-av">Fi</span><span><b>Figma</b><span class="sub">Software · Today</span></span><span class="amt num">−$45.00</span></li>
    <li><span class="su-av">Ub</span><span><b>Uber</b><span class="sub">Travel · Today</span></span><span class="amt num">−$23.10</span></li>
    <li><span class="su-av">Ac</span><span><b>Acme Studio</b><span class="sub">Client payment · Yesterday</span></span><span class="amt num pos">+$4,200.00</span></li>
    <li><span class="su-av">Aw</span><span><b>AWS</b><span class="sub">Infrastructure · Nov 9</span></span><span class="amt num">−$312.44</span></li>
  </ul>
  <div class="su-budget">
    <div class="row"><b>Software budget</b><span class="mut sm num">68%</span></div>
    <div class="su-track"><i></i></div>
    <p class="mut sm num">$3,400 of $5,000 used this month</p>
  </div>
</div>
<nav class="tabbar"><a class="on">${I("home")}Home</a><a>${I("card")}Cards</a><a>${I("activity")}Activity</a><a>${I("user")}Profile</a></nav>`
  },

  cafe: {
    label: "Ember & Rye", sub: "Café", domain: "emberandrye.com", accent: "#b4532a",
    site: () => `
<header class="cf-nav">
  <nav class="m-links"><a>Menu</a><a>Visit</a><a>Catering</a><a>Journal</a></nav>
  <p class="h cf-logo">Ember &amp; Rye</p>
  <div class="end"><a class="m-btn">Order online</a></div>
</header>
<section class="cf-hero">
  <div>
    <h1 class="h m-h1">Wood-fired bread, slow coffee, long tables.</h1>
    <p class="m-lede">A neighbourhood bakery and café on Harlow Street. Ovens on at five, doors open at seven.</p>
    <div class="m-actions"><a class="m-btn lg">See the menu</a><a class="m-btn ghost lg">Reserve a table</a></div>
    <div class="cf-hours-mini"><span>${I("clock")}Open today 7:00 to 17:00</span><span>${I("pin")}48 Harlow Street</span></div>
  </div>
  <div class="ph b">${ART.loaf}</div>
</section>
<section class="m-section">
  <div class="cf-menu-head"><h2 class="h m-h2">Today's menu</h2><p class="mut">Baked this morning. Served until it's gone.</p></div>
  <div class="cf-cols">
    <div>
      <h3 class="h m-h3">Bakery</h3>
      <ul class="cf-items">
        <li><div class="cf-top"><span class="cf-name">Country sourdough</span><i></i><span class="cf-price num">$9.00</span></div><p>Wild yeast, 36-hour ferment, rye and spelt.</p></li>
        <li><div class="cf-top"><span class="cf-name">Cardamom bun</span><i></i><span class="cf-price num">$5.50</span></div><p>Laminated dough, brown butter, pearl sugar.</p></li>
        <li><div class="cf-top"><span class="cf-name">Almond croissant</span><i></i><span class="cf-price num">$6.00</span></div><p>Twice baked with frangipane and toasted almonds.</p></li>
        <li><div class="cf-top"><span class="cf-name">Seeded rye</span><i></i><span class="cf-price num">$10.00</span></div><p>Dense, dark and good for a week.</p></li>
      </ul>
    </div>
    <div>
      <h3 class="h m-h3">Coffee</h3>
      <ul class="cf-items">
        <li><div class="cf-top"><span class="cf-name">Flat white</span><i></i><span class="cf-price num">$4.75</span></div><p>Double ristretto, whole or oat milk.</p></li>
        <li><div class="cf-top"><span class="cf-name">Filter of the week</span><i></i><span class="cf-price num">$4.25</span></div><p>Washed Ethiopian, stone fruit and black tea.</p></li>
        <li><div class="cf-top"><span class="cf-name">Cortado</span><i></i><span class="cf-price num">$4.00</span></div><p>Equal parts espresso and steamed milk.</p></li>
        <li><div class="cf-top"><span class="cf-name">Hojicha latte</span><i></i><span class="cf-price num">$5.25</span></div><p>Roasted green tea, lightly sweetened.</p></li>
      </ul>
    </div>
  </div>
</section>
<section class="cf-visit">
  <div><h2 class="h m-h2">Visit us</h2><p>48 Harlow Street<br>Brookfield, BK2 4RT</p><a class="m-link">Get directions ${I("arrow")}</a></div>
  <dl class="cf-hours">
    <div><dt>Monday to Friday</dt><dd class="num">7:00 to 17:00</dd></div>
    <div><dt>Saturday</dt><dd class="num">8:00 to 16:00</dd></div>
    <div><dt>Sunday</dt><dd class="num">8:00 to 14:00</dd></div>
  </dl>
</section>
<footer class="m-foot"><span>© 2026 Ember &amp; Rye</span><nav><a>Instagram</a><a>Careers</a><a>Wholesale</a></nav></footer>`,
    app: () => `${STATUS}
<div class="a-scroll">
  <div class="a-top"><div><p class="h a-title-sm">Ember &amp; Rye</p><p class="mut sm">Harlow St · Open until 17:00</p></div><span class="a-icon-btn">${I("bag")}<span class="a-badge">3</span></span></div>
  <h1 class="h a-h1">What are you having today?</h1>
  <div class="a-search">${I("search")}Search the menu</div>
  <div class="a-chips"><a class="on">All</a><a>Bakery</a><a>Coffee</a><a>Lunch</a><a>Retail</a></div>
  <div class="cf-feat">
    <div class="ph b">${ART.loaf}</div>
    <div class="cf-feat-body">
      <p class="h a-h3">Country sourdough</p>
      <p class="mut sm">Wild yeast, 36-hour ferment, rye and spelt</p>
      <div class="row"><span class="price num">$9.00</span><span class="add">${I("plus")}</span></div>
    </div>
  </div>
  <div class="a-sec"><h2 class="h a-h2">Coffee</h2><a>See all</a></div>
  <ul class="cf-alist">
    <li><span class="ph">${ART.cup}</span><span><b>Flat white</b><span class="sub">Double ristretto, whole or oat</span><span class="price num">$4.75</span></span><span class="add">${I("plus")}</span></li>
    <li><span class="ph c">${ART.cup}</span><span><b>Filter of the week</b><span class="sub">Washed Ethiopian</span><span class="price num">$4.25</span></span><span class="add">${I("plus")}</span></li>
    <li><span class="ph b">${ART.roll}</span><span><b>Cardamom bun</b><span class="sub">Brown butter, pearl sugar</span><span class="price num">$5.50</span></span><span class="add">${I("plus")}</span></li>
  </ul>
</div>
<div class="cf-cart"><span>View order · 3 items</span><span class="num">$19.75</span></div>`
  },

  mag: {
    label: "The Margin", sub: "Magazine", domain: "themargin.press", accent: "#c0262d",
    site: () => `
<header class="mg-mast">
  <div class="mg-top"><span class="mut sm date">Wednesday, November 11, 2026</span><p class="h mg-title">The Margin</p><div class="end"><a class="m-btn">Subscribe</a></div></div>
  <nav class="mg-sections"><a>World</a><a>Culture</a><a>Science</a><a>Design</a><a>Books</a><a>Opinion</a></nav>
</header>
<section class="mg-lead">
  <div class="ph d">${ART.arch}</div>
  <div>
    <span class="mg-tag">Culture</span>
    <h1 class="h m-h1">The quiet return of the neighbourhood library</h1>
    <p class="m-lede">Cities spent a decade cutting branch hours. Now the reading rooms are full again, and nobody planned for it.</p>
    <div class="mg-by"><span class="mg-av"></span><span><b>Amara Okafor</b> · 12 min read</span></div>
  </div>
</section>
<section class="mg-grid">
  <article><div class="ph c">${ART.waves}</div><h3 class="h m-h3">What the tide gauges are telling us now</h3><p>Fifty years of harbour records, read again with better tools.</p></article>
  <article><div class="ph b">${ART.shelves}</div><h3 class="h m-h3">The last independent bindery in the city</h3><p>Three people, one guillotine and a waiting list into spring.</p></article>
  <article><div class="ph">${ART.grid}</div><h3 class="h m-h3">Why every new building looks the same</h3><p>Blame the spreadsheet, not the architect.</p></article>
</section>
<article class="mg-art">
  <h2 class="h m-h2">The reading room at nine</h2>
  <p class="mg-drop">By nine in the morning every seat by the window is taken. A retired engineer works through a crossword with a fountain pen. Two students share a charger and a bag of oranges. Nobody is buying anything, and that is exactly the point.</p>
  <p>Branch libraries were supposed to fade out quietly. Budgets moved to digital lending, opening hours shrank, and several buildings were sold. What the plans missed was how many people needed somewhere warm, quiet and free to sit for a few hours.</p>
  <blockquote class="h mg-quote">“People come here to be alone together. You can't buy that anywhere else on this street.”</blockquote>
  <p>Librarians describe the change in practical terms. More requests for printing and forms help, more children after school, more people who simply want a table. The shelves matter less than the space between them.</p>
</article>
<footer class="m-foot"><span>© 2026 The Margin</span><nav><a>About</a><a>Newsletter</a><a>Contact</a></nav></footer>`,
    app: () => `${STATUS}
<div class="mg-bar"><a>${I("back")}</a><div><a>${I("bookmark")}</a><a>${I("share")}</a></div></div>
<div class="mg-progress"><i></i></div>
<div class="a-scroll mg-read">
  <span class="mg-tag">Culture</span>
  <h1 class="h a-h1">The quiet return of the neighbourhood library</h1>
  <p class="dek">Cities spent a decade cutting branch hours. Now the reading rooms are full again.</p>
  <div class="mg-by"><span class="mg-av"></span><span><b>Amara Okafor</b> · 12 min read</span></div>
  <div class="ph d">${ART.arch}</div>
  <p class="cap">The Harlow Street branch reopened in March.</p>
  <p class="body">By nine in the morning every seat by the window is taken. A retired engineer works through a crossword with a fountain pen. Two students share a charger and a bag of oranges.</p>
  <p class="body">Branch libraries were supposed to fade out quietly. What the plans missed was how many people needed somewhere warm, quiet and free to sit for a few hours.</p>
  <blockquote class="h mg-quote">“People come here to be alone together.”</blockquote>
  <p class="body">Librarians describe the change in practical terms. More children after school, more people who simply want a table.</p>
</div>
<nav class="tabbar"><a class="on">${I("book")}Today</a><a>${I("list")}Sections</a><a>${I("bookmark")}Saved</a><a>${I("user")}Account</a></nav>`
  },
  docs: {
    label: "Relay", sub: "Docs", domain: "docs.relay.dev", accent: "#1f7a5c",
    site: () => `
<header class="m-nav dc-nav">
  <div class="m-logo"><span class="m-logomark">R</span><span class="h m-logotext">Relay</span><span class="dc-badge">Docs</span></div>
  <div class="dc-search">${I("search")}<span>Search the docs</span><kbd>⌘K</kbd></div>
  <div class="m-navcta"><a class="m-link">Changelog</a><a class="m-btn">Dashboard</a></div>
</header>
<div class="dc-layout">
  <nav class="dc-side">
    <p class="dc-group">Getting started</p>
    <a>Introduction</a><a class="on">Quickstart</a><a>Authentication</a>
    <p class="dc-group">Guides</p>
    <a>Webhooks</a><a>Retries and backoff</a><a>Idempotency keys</a><a>Testing locally</a>
    <p class="dc-group">API reference</p>
    <a>Events</a><a>Endpoints</a><a>Deliveries</a>
  </nav>
  <article class="dc-main">
    <p class="mut sm dc-crumb">Getting started / Quickstart</p>
    <h1 class="h dc-h1">Send your first event in five minutes</h1>
    <p class="m-lede">Relay delivers webhooks to your customers with retries, signing and a full delivery log. This guide takes you from an API key to a delivered event.</p>
    <h2 class="h dc-h2">Install the SDK</h2>
    <p>Relay has official libraries for Node, Python and Go. Install the one that matches your stack, then add your secret key to the environment.</p>
    <pre class="dc-code"><code>npm install @relay/node</code></pre>
    <h2 class="h dc-h2">Send an event</h2>
    <p>Create a client with your secret key, then send an event. Relay signs the payload and retries for up to three days if the endpoint is down.</p>
    <pre class="dc-code"><code>const relay = new Relay(process.env.RELAY_KEY);

await relay.events.send({
  type: "invoice.paid",
  data: { id: "inv_2041", amount: 4900 },
});</code></pre>
    <div class="dc-callout"><p class="h dc-callout-t">Keep your secret key on the server</p><p>Anyone with it can send events as you. Use a restricted key in CI and rotate it from the dashboard.</p></div>
    <div class="dc-pager"><a><span class="mut sm">Previous</span><b>Introduction</b></a><a class="next"><span class="mut sm">Next</span><b>Authentication</b></a></div>
  </article>
  <nav class="dc-toc"><p class="sm">On this page</p><a class="on">Install the SDK</a><a>Send an event</a><a>Check the log</a></nav>
</div>
<footer class="m-foot"><span>© 2026 Relay Labs</span><nav><a>Status</a><a>Support</a><a>GitHub</a></nav></footer>`,
    app: () => `${STATUS}
<div class="a-scroll">
  <div class="a-top"><div><p class="mut sm">Production</p><p class="h a-title-sm">Deliveries</p></div><span class="a-icon-btn">${I("search")}</span></div>
  <div class="dc-stats">
    <div><p class="mut sm">Delivered today</p><p class="h dc-stat num">18,204</p></div>
    <div><p class="mut sm">Success rate</p><p class="h dc-stat num">99.93%</p></div>
  </div>
  <div class="a-sec"><h2 class="h a-h2">Needs attention</h2><a>Retry all</a></div>
  <ul class="dc-events">
    <li><span class="dc-dot err"></span><span><b>invoice.paid</b><span class="sub">hooks.acme.com · 503 · retry 3 of 8</span></span><span class="sub num">2m</span></li>
    <li><span class="dc-dot err"></span><span><b>customer.updated</b><span class="sub">api.lumen.io · timeout after 10s</span></span><span class="sub num">9m</span></li>
  </ul>
  <div class="a-sec"><h2 class="h a-h2">Recent</h2><a>See all</a></div>
  <ul class="dc-events">
    <li><span class="dc-dot"></span><span><b>invoice.paid</b><span class="sub">hooks.kestrel.app · 200 · 84ms</span></span><span class="sub num">now</span></li>
    <li><span class="dc-dot"></span><span><b>subscription.created</b><span class="sub">api.orbital.dev · 200 · 131ms</span></span><span class="sub num">1m</span></li>
    <li><span class="dc-dot"></span><span><b>payment.refunded</b><span class="sub">hooks.fieldnote.co · 204 · 96ms</span></span><span class="sub num">4m</span></li>
  </ul>
</div>
<nav class="tabbar"><a class="on">${I("activity")}Activity</a><a>${I("layers")}Endpoints</a><a>${I("book")}Docs</a><a>${I("user")}Account</a></nav>`
  }
};
