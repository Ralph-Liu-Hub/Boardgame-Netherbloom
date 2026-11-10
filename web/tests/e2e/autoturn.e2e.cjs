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

  console.log("PROBLEMS", problems.length, problems);
  if (problems.length) process.exitCode = 1;
  await browser.close();
})();
