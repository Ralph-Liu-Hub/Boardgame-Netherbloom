// Broad UI sweep of the manual table: collects every console error / page error / failed same-origin request.
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:8765";
const problems = [];
const note = (where, what) => { problems.push(`${where}: ${what}`); console.log("PROBLEM", where, what); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  let stage = "load";
  page.on("pageerror", e => note(stage, "pageerror " + e.message));
  page.on("console", m => { if (m.type() === "error" && !/fonts|peerjs|insights|api\/|Failed to load resource/.test(m.text())) note(stage, "console " + m.text()); });
  page.on("requestfailed", r => { if (r.url().startsWith(BASE) && !/\/api\/|_vercel/.test(r.url())) note(stage, "requestfailed " + r.url()); });
  page.on("response", r => { if (r.url().startsWith(BASE) && r.status() >= 400 && !/\/api\/|_vercel/.test(r.url())) note(stage, `HTTP ${r.status()} ${r.url()}`); });

  await page.goto(BASE + "/index.html");
  await page.waitForSelector("#lb-local");

  if (process.env.ONLY3) { await require("./interactions.cjs")(page, s => { stage = s; }, note, BASE); console.log("TOTAL PROBLEMS", problems.length); await browser.close(); return; }
  // 1) every soul x level x player count opens a table; every item renders; every card face renders in both languages
  const souls = await page.$$eval("#lb-soul option", os => os.map(o => o.value));
  for (const lang of ["zh", "en"]) {
    for (const soul of souls) for (const level of [0, 1, 2]) for (const players of [1, 2, 3, 4]) {
      stage = `open ${lang} ${soul} L${level} ${players}p`;
      await page.click("#tt-menu").catch(() => {});
      await page.waitForSelector("#lb-local");
      if (lang === "en") {
        const names = await page.$$eval("#lb-soul option", os => os.map(o => o.textContent));
        if (names.some(n => /[\u4e00-\u9fff]/.test(n))) note(stage, "Chinese soul names in English mode: " + names.join(", "));
      }
      await page.selectOption("#lb-soul", soul);
      await page.selectOption("#lb-level", String(level));
      await page.selectOption("#lb-players", String(players));
      await page.click("#lb-local");
      await page.waitForSelector("#tt-world");
      const r = await page.evaluate(() => {
        const S = JSON.parse(localStorage.getItem("nb-table-v5g"));
        const out = { items: Object.keys(S.items).length, bad: [] };
        // every table piece has content and lies inside the world
        document.querySelectorAll("#tt-items .piece[data-id]").forEach(el => {
          if (!el.innerHTML.trim()) out.bad.push("empty piece " + el.dataset.id);
        });
        for (const [id, it] of Object.entries(S.items)) {
          if (S.where[id] === "t" && (it.x < 0 || it.y < 0 || it.x > 2920 || it.y > 2560 || Number.isNaN(it.x))) out.bad.push(`off-table ${id} ${it.ck || it.tk} ${it.x},${it.y}`);
          if (!S.where[id]) out.bad.push("nowhere " + id);
        }
        // every stack points at real items, no duplicates anywhere
        const seen = {};
        for (const st of Object.values(S.stacks)) for (const id of st.items) { if (!S.items[id]) out.bad.push("ghost item " + id); seen[id] = (seen[id] || 0) + 1; }
        for (const h of S.hands) for (const id of h) seen[id] = (seen[id] || 0) + 1;
        for (const a of S.areas) for (const id of a) seen[id] = (seen[id] || 0) + 1;
        for (const [id, n] of Object.entries(seen)) if (n > 1) out.bad.push("duplicate " + id);
        // bank tiles: 26 banks filled
        out.tilesOnRiver = Object.values(S.items).filter(it => it.kind === "tile" && S.where[it.id] === "t").length;
        out.tiles = Object.values(S.items).filter(it => it.kind === "tile").length;
        out.bw = Object.values(S.items).filter(it => it.tk === "bw").length;
        out.deck = S.stacks.deck.items.length;
        out.ghost = S.stacks.ghost ? S.stacks.ghost.items.length : 0;
        out.push = Object.values(S.items).filter(it => it.tk === "push").length;
        return out;
      });
      if (r.bad.length) note(stage, r.bad.slice(0, 5).join("; "));
      if (r.tilesOnRiver !== 0 || r.tiles !== 37) note(stage, `tiles: ${r.tilesOnRiver} on the river (0 expected), ${r.tiles} in all (37)`);
      if (r.push !== 4) note(stage, "push tokens " + r.push);
      if ((players === 1) !== (r.ghost > 0)) note(stage, "ghost deck " + r.ghost);
      // render every card face via the search modal of each stack would be slow; check all card faces through the module
      const faces = await page.evaluate(async () => {
        const m = await import("/assets/table.js");
        const S = JSON.parse(localStorage.getItem("nb-table-v5g"));
        const bad = [];
        for (const it of Object.values(S.items)) if (it.kind === "card") {
          try { const c = m._test.cardInfo(it.ck); if (!c.html || /undefined|NaN|\[object/.test(c.html + (c.backHtml || ""))) bad.push(it.ck); } catch (e) { bad.push(it.ck + " " + e.message); }
        }
        return bad;
      });
      if (faces.length) note(stage, "card faces: " + faces.slice(0, 5).join(", "));
      // the whole table HTML must not show undefined/NaN
      const txt = await page.evaluate(() => document.querySelector("#app").innerHTML);
      const m = txt.match(/.{0,60}(undefined|NaN|\[object Object\]).{0,40}/);
      if (m) note(stage, "text: " + m[0]);
    }
    if (lang === "zh") { stage = "lang toggle"; await page.click((await page.$("#tt-lang")) ? "#tt-lang" : "#btn-lang"); await page.waitForTimeout(200); }
  }
  await page.click((await page.$("#tt-lang")) ? "#tt-lang" : "#btn-lang"); // back to zh
  console.log("phase 1 done");
  await page.screenshot({ path: (process.env.OUT || require("os").tmpdir()) + "/nb-e2e-table.png" });

  // 2) every hint step renders for every player count
  for (const players of [1, 2, 3, 4]) {
    stage = `hints ${players}p`;
    await page.click("#tt-menu"); await page.waitForSelector("#lb-local");
    await page.selectOption("#lb-players", String(players));
    await page.click("#lb-local"); await page.waitForSelector("#tt-world");
    if (!(await page.isChecked("#tt-hints"))) await page.click("#tt-hints");
    const n = await page.evaluate(async () => (await import("/assets/table-hints.js")).STEPS.length);
    for (let i = 0; i < n; i++) {
      const h = await page.$eval("#tt-hint", e => e.innerHTML);
      const m = h.match(/.{0,60}(undefined|NaN|\[object Object\]).{0,40}/);
      if (m) note(stage + " step " + i, m[0]);
      await page.click('#tt-hint [data-step="1"]');
    }
    // the phase buttons and loop button
    const nb = await page.$$eval("#tt-hint .phases button", b => b.length);
    for (let i = 0; i < nb; i++) await page.click(`#tt-hint .phases button >> nth=${i}`);
    if (await page.$("#tt-hint .hloop")) await page.click("#tt-hint .hloop");
  }
  console.log("phase 2 done");
  if (!process.env.SKIP3) await require("./interactions.cjs")(page, s => { stage = s; }, note, BASE);
  console.log("TOTAL PROBLEMS", problems.length);
  if (problems.length) process.exitCode = 1;
  await browser.close();
})().catch(e => { console.error("SWEEP CRASH", e); process.exit(1); });
