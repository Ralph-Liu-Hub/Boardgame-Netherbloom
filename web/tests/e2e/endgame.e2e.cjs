// Ending games: only the player who hosted a table can end it from the menu; a guest who goes back to the menu sees
// only "Continue the game"; an admin ends live tables from the menu (one or more) or from the Dashboard, and every
// player at them goes back to the menu.
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:8765";
(async () => {
  const browser = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"] });
  const problems = [];
  const expect = (c, m) => { if (!c) problems.push(m); };
  const mk = async (name, user) => {
    const ctx = await browser.newContext({ viewport: { width: 1400, height: 860 }, permissions: ["microphone"] });
    await ctx.route(/unpkg\.com\/peerjs/, r => r.fulfill({ path: require.resolve("peerjs/dist/peerjs.min.js"), contentType: "application/javascript" }));
    await ctx.addInitScript(() => {
      let real;
      Object.defineProperty(window, "Peer", {
        configurable: true,
        get() { return real; },
        set(P) {
          real = class extends P {
            constructor(id, opts) {
              if (typeof id === "object") { opts = id; id = undefined; }
              const o = { ...(opts || {}), host: "127.0.0.1", port: 9000, path: "/", secure: false };
              o.config = { iceServers: [] };
              id === undefined ? super(o) : super(id, o);
            }
          };
        },
      });
    });
    const p = await ctx.newPage();
    p.on("pageerror", e => problems.push(name + " pageerror " + e.message));
    p.on("dialog", d => d.accept());
    await p.goto(BASE + "/index.html"); await p.waitForSelector("#lb-local");
    const ok = await p.evaluate(async u => (await fetch("/api/login", { method: "POST", body: JSON.stringify({ user: u, pass: "pw" }) })).ok, user);
    expect(ok, `${name} signs in as ${user}`);
    await p.reload(); await p.waitForSelector("#lb-local");
    return p;
  };
  const codeOf = async P => { await P.waitForFunction(() => /\b[A-Z0-9]{5}\b/.test(document.querySelector("#tt-code")?.textContent || ""), null, { timeout: 30000 }); return (await P.textContent("#tt-code")).match(/[A-Z0-9]{5}/)[0]; };
  const host2 = async (A, B) => {
    await A.selectOption("#lb-players", "2"); await A.click("#lb-host");
    const code = await codeOf(A);
    await B.fill("#lb-code", code); await B.fill("#lb-myname", "Bea"); await B.click("#lb-join"); await B.waitForSelector("#tt-world", { timeout: 30000 });
    await A.waitForTimeout(1500);
    return code;
  };
  const atMenu = P => P.waitForSelector("#lb-local", { timeout: 20000 }).then(() => true, () => false);

  const A = await mk("host", "player"), B = await mk("guest", "player"), W = await mk("admin", "admin");
  // 1) a guest back at the menu: Continue only, and it takes them back to the same seat
  const code = await host2(A, B);
  await B.click("#tt-menu"); await atMenu(B);
  expect(await B.locator("#lb-rejoin").isVisible(), "the guest sees Continue the game");
  expect(await B.locator("#lb-end").count() === 0 && await B.locator("#lb-resume").count() === 0, "the guest has no End the game");
  await B.click("#lb-rejoin"); await B.waitForSelector("#tt-world", { timeout: 30000 });
  await B.click("#tt-menu"); await atMenu(B);

  // 2) a player cannot end tables; the admin ends this one from the menu's live tables
  const refused = await A.evaluate(async c => (await fetch("/api/live", { method: "POST", body: JSON.stringify({ end: [c] }) })).status, code);
  expect(refused === 403, "a player cannot end tables (" + refused + ")");
  await W.click("#lb-live"); await W.waitForSelector(`[data-endpick="${code}"]`, { timeout: 8000 });
  await W.check(`[data-endpick="${code}"]`); await W.click("#live-end");
  await W.waitForTimeout(800);
  const st = await W.evaluate(async c => (await fetch(`/api/live?status=${c}`)).json(), code);
  expect(st.endedByAdmin && !st.live, "the table is ended on the server: " + JSON.stringify(st));
  // the host hears of it at its next report (here: when the guest comes back) and everyone goes to the menu
  await B.click("#lb-rejoin");
  expect(await atMenu(A), "the host is back at the menu");
  expect(await A.locator("#lb-resume").count() === 0, "the host's saved game is gone");
  expect(await atMenu(B), "the guest is back at the menu");
  await B.waitForTimeout(1500);
  expect(await B.locator("#lb-rejoin").count() === 0, "the guest no longer sees Continue for the ended table");

  // 3) the host's own menu has End; the Dashboard ends a table too
  await W.keyboard.press("Escape").catch(() => {});
  const code2 = await host2(A, B);
  await W.goto(BASE + "/admin.html");
  await W.waitForSelector(`[data-endone="${code2}"]`, { timeout: 20000 }).catch(() => problems.push("the Dashboard lists the table with End"));
  await W.click(`[data-endone="${code2}"]`);
  await W.waitForTimeout(800);
  // a guest's hello makes the host report at once (otherwise it reports within 45 s)
  await B.click("#tt-menu"); await atMenu(B); await B.fill("#lb-code", code2); await B.fill("#lb-myname", "Bea"); await B.click("#lb-join");
  expect(await atMenu(A), "the Dashboard's End sends the host to the menu");
  expect(await atMenu(B), "and the guest");

  // 4) the host leaves and comes back: Continue reopens the table online under the same code, and the guest rejoins
  const code4 = await host2(A, B);
  await A.click("#tt-menu"); await atMenu(A);
  expect((await A.textContent("body")).includes(code4), "the host's menu names the online table");
  await A.click("#lb-resume"); await A.waitForSelector("#tt-world");
  await A.waitForFunction(c => (document.querySelector("#tt-code")?.textContent || "").includes(c), code4, { timeout: 30000 }).catch(() => problems.push("the host reopens the table under the same code"));
  await A.waitForTimeout(1500);
  await B.click("#tt-menu"); await atMenu(B);
  await B.waitForTimeout(1500);
  if (await B.locator("#lb-rejoin").count()) await B.click("#lb-rejoin");
  else { await B.fill("#lb-code", code4); await B.fill("#lb-myname", "Bea"); await B.click("#lb-join"); }
  await B.waitForSelector("#tt-world", { timeout: 30000 }).then(() => true, () => problems.push("the guest gets back in after the host's Continue"));
  await B.click("#tt-menu"); await atMenu(B);
  await A.click("#tt-menu"); await atMenu(A);
  await A.click("#lb-end");   // the dialog is accepted

  // 5) a code with no table: a few quiet retries, then words the player can act on
  await B.evaluate(() => { window.__toasts = []; new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.classList?.contains("toast") && window.__toasts.push(n.textContent)))).observe(document.body, { childList: true, subtree: true }); });
  await B.fill("#lb-code", "ZZZZZ"); await B.fill("#lb-myname", "Bea"); await B.click("#lb-join");
  await B.waitForFunction(() => [...document.querySelectorAll(".toast")].some(t => t.textContent.includes("找不到這張桌子")), null, { timeout: 60000 })
    .catch(async () => problems.push("a missing table explains itself: " + JSON.stringify(await B.evaluate(() => window.__toasts))));

  await A.selectOption("#lb-players", "1"); await A.click("#lb-local"); await A.waitForSelector("#tt-world");
  await A.click("#tt-menu"); await atMenu(A);
  expect(await A.locator("#lb-resume").isVisible() && await A.locator("#lb-end").isVisible(), "the player who opened a table sees Continue and End");

  console.log("PROBLEMS", problems.length, problems);
  if (problems.length) process.exitCode = 1;
  await browser.close();
})().catch(e => { console.error("CRASH", e.message); process.exit(1); });
