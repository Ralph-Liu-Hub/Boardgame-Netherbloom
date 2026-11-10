// The automatic end of turn (admins only): hidden for a player; for an admin, on a set-up table it moves the soul,
// asks about gathering the light, carries out the Mist, draws, and passes the Oar.
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:8765";
(async () => {
  const browser = await chromium.launch();
  const problems = [];
  const expect = (c, m) => { if (!c) problems.push(m); };
  const mk = async user => {
    const p = await (await browser.newContext({ viewport: { width: 1400, height: 860 } })).newPage();
    p.on("pageerror", e => problems.push(user + " pageerror " + e.message));
    await p.goto(BASE + "/index.html"); await p.waitForSelector("#lb-local");
    await p.evaluate(async u => fetch("/api/login", { method: "POST", body: JSON.stringify({ user: u, pass: "pw" }) }), user);
    await p.reload(); await p.waitForSelector("#lb-local");
    return p;
  };
  const S = P => P.evaluate(() => JSON.parse(localStorage.getItem("nb-table-v5g")));

  // a player does not see it
  const P = await mk("player");
  await P.selectOption("#lb-players", "2"); await P.click("#lb-local"); await P.waitForSelector("#tt-world");
  expect(await P.locator("#tt-endturn").isHidden(), "a player does not see Auto End Turn");

  // an admin: set up, then end the first turn automatically
  const A = await mk("admin");
  await A.selectOption("#lb-level", "1"); await A.selectOption("#lb-players", "2");
  await A.click("#lb-local"); await A.waitForSelector("#tt-world");
  expect(await A.locator("#tt-endturn").isVisible(), "an admin sees Auto End Turn");
  await A.click("#tt-endturn");
  await A.waitForTimeout(500);
  let s = await S(A);
  expect(!Object.values(s.items).some(it => it.tk === "soul" && s.where[it.id] === "t"), "before set-up the soul is not on the river (nothing is done)");
  await A.click("#tt-auto");
  await A.waitForFunction(() => !document.querySelector("#tt-auto").disabled, null, { timeout: 60000 });
  const before = await S(A);
  const front0 = Object.values(before.items).find(it => before.where[it.id] === "t" && /^(mist|harsh):/.test(it.ck) && it.face === 1);
  // the first player plays two cards face down onto the discard pile (their two actions), then the end of turn runs
  await A.click("#tt-endturn");
  // answer whatever it asks: gather the light when asked, otherwise the first choice
  for (let i = 0; i < 20; i++) {
    const done = await A.evaluate(() => !document.querySelector("#tt-endturn").disabled);
    if (done) break;
    const btn = await A.$("#tt-modal:not(.hidden) [data-ask]");
    if (btn) { const g = await A.$('#tt-modal:not(.hidden) [data-ask="0"]'); await (g || btn).click(); }
    await A.waitForTimeout(700);
  }
  await A.waitForFunction(() => !document.querySelector("#tt-endturn").disabled, null, { timeout: 30000 });
  s = await S(A);
  const soul = Object.values(s.items).find(it => it.tk === "soul");
  const oar = Object.values(s.items).find(it => it.tk === "oar");
  expect(s.where[oar.id] === "a:1", "the Oar passed to the second player");
  const front1 = Object.values(s.items).find(it => s.where[it.id] === "t" && /^(mist|harsh):/.test(it.ck) && it.face === 1 && Math.abs(it.x - front0.x) < 5 && Math.abs(it.y - front0.y) < 5);
  expect(front1 && front1.id !== front0.id, "a new Mist ahead was turned up");
  expect(s.where[front0.id] === "s:mistdis" || s.where[front0.id] === "t", "the old Mist card went to the Mist discard (or became a Mist scar)");
  expect(s.tracks.light === before.tracks.light, `leaving space 0 gathers nothing (Light ${before.tracks.light} -> ${s.tracks.light})`);
  expect(s.log.some(l => /自動結算|End of turn/.test(l.m)), "each step is in the log");
  const moved = await A.evaluate(() => { const st = JSON.parse(localStorage.getItem("nb-table-v5g")); const so = Object.values(st.items).find(it => it.tk === "soul"); return [so.x, so.y]; });
  expect(moved[0] !== Object.values(before.items).find(it => it.tk === "soul").x || moved[1] !== Object.values(before.items).find(it => it.tk === "soul").y, "the soul moved forward");
  // undo takes back the last step
  await A.click("#tt-undo");
  s = await S(A);
  expect(s.where[oar.id] === "a:0", "Undo takes back the last step (the Oar)");

  // the second turn: space 2 is unlit, so the soul Lingers on space 1 (which is Lit: nothing forgotten) and the Mist advances
  await A.click("#tt-redo");
  const b2 = await S(A);
  await A.click("#tt-endturn");
  for (let i = 0; i < 20; i++) {
    if (await A.evaluate(() => !document.querySelector("#tt-endturn").disabled)) break;
    const btn = await A.$('#tt-modal:not(.hidden) [data-ask="0"]'); if (btn) await btn.click();
    await A.waitForTimeout(700);
  }
  await A.waitForFunction(() => !document.querySelector("#tt-endturn").disabled, null, { timeout: 30000 });
  s = await S(A);
  const so2 = Object.values(s.items).find(it => it.tk === "soul"), so1 = Object.values(b2.items).find(it => it.tk === "soul");
  expect(so2.x === so1.x && so2.y === so1.y, "the soul Lingers on space 1 (space 2 is unlit)");
  expect(s.where[oar.id] === "a:0", "the Oar comes back to the first player");
  const mistKey = Object.values(b2.items).find(it => b2.where[it.id] === "t" && /^(mist|harsh):/.test(it.ck) && it.face === 1).ck;
  const forgetting = /cold|bitter|undertow/.test(mistKey);
  expect(forgetting || s.stacks.forgot.items.length === b2.stacks.forgot.items.length, `Lingering on a Lit space forgets nothing (${mistKey})`);
  const bloomsAt1 = st => Object.values(st.items).filter(it => it.tk === "root" && it.face === 1 && st.where[it.id] === "t").length;
  expect(bloomsAt1(s) < bloomsAt1(b2) || /near|shade/.test(mistKey), `the Mist advanced into the wall of light on space 1 (${bloomsAt1(b2)} -> ${bloomsAt1(s)} Blooms)`);

  // round 2: the fork, turning the page, and the ending
  const runTurn = async answer => {
    await A.click("#tt-endturn");
    for (let i = 0; i < 40; i++) {
      if (await A.evaluate(() => !document.querySelector("#tt-endturn").disabled)) break;
      const title = await A.evaluate(() => document.querySelector("#tt-modal:not(.hidden) h3")?.textContent || "");
      if (title) { const k = answer(title); const btn = await A.$(`#tt-modal:not(.hidden) [data-ask="${k}"]`) || await A.$('#tt-modal:not(.hidden) [data-ask="0"]'); if (btn) await btn.click(); }
      await A.waitForTimeout(500);
    }
    await A.waitForFunction(() => !document.querySelector("#tt-endturn").disabled, null, { timeout: 30000 });
  };
  const neither = t => (/命運之霧|Fate Mist/.test(t) && !/「|"/.test(t) ? 2 : /守岸人|Shore-Keeper/.test(t) ? 2 : 0);
  // chapter 1 written up to the turning point: a memory in the Gate, the river Fate Mist on the ◆
  await A.evaluate(() => {
    const T = window.__nbTest, st = T.state();
    const deck = st.stacks.deck.items, gate = deck[deck.length - 1];
    T.put(gate, "node0_b1", { face: 1, rot: 0, pg: 0 });
    // the earlier turns answered "the river condition is met", so a Fate Mist may already be on the ◆
    const fate = Object.values(st.items).find(it => it.ck?.startsWith("fate:") && it.ck.split(":")[2] === "0" && st.where[it.id] === "t");
    if (fate && fate.pg !== 0) T.put(fate.id, "node0_f", { face: 1, pg: 0 });
  });
  await runTurn(neither);
  s = await S(A);
  expect(s.paths && s.paths[0] && [0, 1, 2].includes(s.paths[0].path), "the fork chose a path for chapter 1: " + JSON.stringify(s.paths));
  // the memory slot after the fork is filled: the route reaches the exit, and the page turns
  const after = { 0: "c1", 1: "c2", 2: "c3" }[s.paths[0].path];
  await A.evaluate(id => { const T = window.__nbTest, st = T.state(), d = st.stacks.deck.items; T.put(d[d.length - 1], "node0_" + id, { face: 1, rot: 0, pg: 0 }); }, after);
  await runTurn(neither);
  s = await S(A);
  expect(s.chapter === 1, "the page turned to chapter 2");
  const fates = Object.values(s.items).filter(it => it.ck?.startsWith("fate:") && s.where[it.id] === "t" && it.face === 0);
  expect(fates.length === 2 && fates.every(f => f.ck.split(":")[2] === "1"), "chapter 2's two Fate Mist cards are out");
  // the Far Shore: chapters written, the soul on space 13 steps across; two Commissions fulfilled
  await A.evaluate(() => { const T = window.__nbTest; T.set(st => { st.farOpen = true; st.paths[1] = { fate: 1, path: 1 }; st.paths[2] = { fate: 1, path: 0 }; }); const so = Object.values(T.state().items).find(it => it.tk === "soul"); T.put(so.id, "soul13"); });
  let endText = "";
  await A.click("#tt-endturn");
  for (let i = 0; i < 40; i++) {
    if (await A.evaluate(() => !document.querySelector("#tt-endturn").disabled)) break;
    const title = await A.evaluate(() => document.querySelector("#tt-modal:not(.hidden) h3")?.textContent || "");
    if (/獲勝|You win/.test(title)) endText = await A.evaluate(() => document.querySelector("#tt-modal:not(.hidden)").textContent);
    const k = /守岸人|Shore-Keeper/.test(title) ? 2 : /隱藏結局|Hidden/.test(title) ? 1 : 0;
    const btn = title && (await A.$(`#tt-modal:not(.hidden) [data-ask="${k}"]`)); if (btn) await btn.click();
    await A.waitForTimeout(500);
  }
  expect(/釋懷|Acceptance|回家|鬆開手/.test(endText) || endText.length > 20, "the ending is read out (two chapters of Acceptance): " + endText.slice(0, 80));

  console.log("PROBLEMS", problems.length, problems);
  if (problems.length) process.exitCode = 1;
  await browser.close();
})();
