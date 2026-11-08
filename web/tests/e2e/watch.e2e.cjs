// Watching and voice: a player hosts, another joins, an admin watches from the Dashboard's live tables (no seat,
// nothing can move, any player's side), everyone talks in voice; then an admin hosts without playing.
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:8765";
(async () => {
  // fake microphones, granted without a prompt
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
  const S = P => P.evaluate(() => JSON.parse(localStorage.getItem("nb-table-v5g")));

  // 1) a player hosts, a second player joins
  const A = await mk("host", "player"), B = await mk("guest", "player"), W = await mk("admin", "admin");
  await A.selectOption("#lb-players", "2");
  await A.click("#lb-host");
  const code = await codeOf(A);
  await B.fill("#lb-code", code); await B.fill("#lb-myname", "Bea"); await B.click("#lb-join"); await B.waitForSelector("#tt-world", { timeout: 30000 });
  await A.waitForTimeout(800);

  // 2) the live table list: admins only; the Dashboard shows the table with a Watch button
  const asPlayer = await A.evaluate(async c => ({ list: (await fetch("/api/live")).status, pass: (await fetch(`/api/live?token=${c}`)).status, fake: (await (await fetch(`/api/live?verify=123.abc&code=${c}`)).json()).ok }), code);
  expect(asPlayer.list === 403 && asPlayer.pass === 403 && asPlayer.fake === false, "a player cannot list tables or get a pass, and a made-up pass is refused: " + JSON.stringify(asPlayer));
  const live = await W.evaluate(async () => (await (await fetch("/api/live")).json()).live);
  expect(live.some(t => t.code === code && t.names.includes("Bea") && t.online.every(Boolean)), "the admin sees the live table with both players online");
  await W.goto(BASE + "/admin.html");
  await W.waitForSelector(`.livecard a[href="/?watch=${code}"]`, { timeout: 8000 }).catch(() => problems.push("the Dashboard lists the live table with a Watch button"));

  // 3) watch it from the Dashboard: no seat, nothing moves, any player's side
  await W.click(`.livecard a[href="/?watch=${code}"]`);
  await W.waitForSelector("#tt-world", { timeout: 30000 });
  await W.waitForTimeout(500);
  expect(await W.locator("#tt-watch").isVisible(), "the watcher sees the Watching badge");
  expect(await W.locator("#tt-switch").isVisible(), "the watcher can switch tables");
  expect(await W.locator("#tt-auto").isDisabled(), "Auto Setup is off while watching");
  const hostLog = await A.evaluate(() => JSON.parse(localStorage.getItem("nb-table-v5g")).log.map(l => l.m).join(" | "));
  expect(/is watching|開始觀戰/.test(hostLog), "the table's log says someone is watching");
  const before = (await S(A)).rev;
  await W.click("#tt-fit"); await W.click('.zoombtn[data-zoom="ledger"]');
  await W.dblclick('.stack[data-stack="deck"]');
  await W.click('.tcell[data-track="light"][data-val="7"]');
  await A.waitForTimeout(800);
  expect((await S(A)).rev === before, "the watcher's clicks change nothing at the table");
  await W.click('#tt-seats [data-seat="1"]');
  expect((await W.textContent("#tt-watch")).includes("Bea"), "the watcher switches to Bea's side");
  expect((await W.textContent("#tt-hand .hand-title")).includes("Bea"), "and sees Bea's hand");
  // the players' moves reach the watcher
  await A.click("#tt-fit"); await A.click('.zoombtn[data-zoom="ledger"]');
  await A.click('.tcell[data-track="light"][data-val="5"]');
  await W.waitForTimeout(1200);
  expect(/5$/.test(await W.evaluate(() => document.querySelector('.tmarker[data-track="light"]').title)), "the watcher sees the host's move");

  // 4) voice: the two players and the watcher talk
  await A.click("#tt-voice"); await B.click("#tt-voice"); await W.click("#tt-voice");
  const calls = async (P, n) => P.waitForFunction(k => [...document.querySelectorAll("audio[data-voice]")].filter(a => a.srcObject?.getAudioTracks().length).length >= k, n, { timeout: 20000 }).then(() => true).catch(() => false);
  expect(await calls(A, 2) && await calls(B, 2) && await calls(W, 2), "each of the three hears the other two");
  await A.waitForTimeout(600);
  expect(await A.$$eval("#tt-seats .seat.invoice", b => b.length) === 2, "the host's seat bar shows both players in voice");
  expect((await A.textContent("#tt-vchips")).includes("admin"), "the host sees the watcher in voice");
  await B.click("#tt-mute"); await A.waitForTimeout(800);
  expect((await B.textContent("#tt-mute")).match(/Muted|已靜音/), "Bea can mute herself");
  expect(await A.evaluate(() => document.querySelector('#tt-seats [data-seat="1"]').classList.contains("talking")) === false, "a muted player never lights up as talking");
  await B.click("#tt-voice"); await A.waitForTimeout(1200);
  expect(await A.$$eval("audio[data-voice]", a => a.length) === 1, "when Bea leaves voice, the host only hears the watcher");

  // 5) View Not Play: the admin hosts without playing; a player takes the first seat; the admin stands in for the empty one
  await W.click("#tt-menu"); await W.waitForSelector("#lb-local");
  await W.waitForSelector("#lb-watchhost");
  await W.selectOption("#lb-players", "2");
  await W.check("#lb-watchhost");
  await W.click("#lb-host");
  const code2 = await codeOf(W);
  expect(await W.locator("#tt-watch").isVisible(), "a table hosted without playing opens in watch mode");
  const C = await mk("player2", "player");
  await C.fill("#lb-code", code2); await C.fill("#lb-myname", "Cid"); await C.click("#lb-join"); await C.waitForSelector("#tt-world", { timeout: 30000 });
  await W.waitForTimeout(800);
  const sw = await S(W);
  expect(sw.names[0] === "Cid" && sw.online[0] && !sw.online[1], "the first player to join takes seat 1 (the host has no seat)");
  const rev0 = sw.rev;
  await W.click("#tt-fit"); await W.click('.zoombtn[data-zoom="ledger"]');
  await W.click('.tcell[data-track="light"][data-val="3"]');
  expect((await S(W)).rev === rev0, "the host without a seat cannot move anything");
  await W.click('#tt-seats [data-seat="1"]');   // the empty seat: confirm standing in (the dialog is accepted)
  await W.waitForTimeout(300);
  expect((await W.textContent("#tt-watch")).match(/Playing for|代打/), "the host stands in for the empty seat");
  await W.click('.tcell[data-track="light"][data-val="3"]');
  await C.waitForTimeout(1200);
  expect(/3$/.test(await C.evaluate(() => document.querySelector('.tmarker[data-track="light"]').title)), "a move made standing in reaches the player");
  // the switch-table list, from a watcher's seat
  const liveNow = await W.evaluate(async () => (await (await fetch("/api/live")).json()).live.map(t => t.code));
  expect(liveNow.includes(code) && liveNow.includes(code2), "both tables are listed as live: " + liveNow.join(","));

  console.log("PROBLEMS", problems.length, problems);
  if (problems.length) process.exitCode = 1;
  await browser.close();
})().catch(e => { console.error("CRASH", e.message); process.exit(1); });
