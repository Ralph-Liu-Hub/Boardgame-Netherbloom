const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:8765";
(async () => {
  const browser = await chromium.launch();
  const problems = [];
  const mk = async name => {
    const ctx = await browser.newContext({ viewport: { width: 1300, height: 850 } });
    // the sandbox cannot reach unpkg or the public PeerJS server: serve the same library locally and use a local server
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
    p.on("console", m => { if (m.type() === "error" && !/fonts|insights|api\//.test(m.text())) problems.push(name + " console " + m.text()); });
    await p.goto(BASE + "/index.html"); await p.waitForSelector("#lb-local");
    return p;
  };
  const A = await mk("host"), B = await mk("guest");
  await A.selectOption("#lb-players", "3");
  await A.click("#lb-host");
  await A.waitForFunction(() => /\b[A-Z0-9]{5}\b/.test(document.querySelector("#tt-code")?.textContent || ""), null, { timeout: 30000 });
  const code = (await A.textContent("#tt-code")).match(/[A-Z0-9]{5}/)[0];
  console.log("code", code);
  const join = async (P, name) => { await P.fill("#lb-code", code); await P.fill("#lb-myname", name); await P.click("#lb-join"); await P.waitForSelector("#tt-world", { timeout: 30000 }); };
  await join(B, "Bea");
  const seatsA = await A.$$eval("#tt-seats .seat", b => b.map(x => x.textContent.trim()));
  console.log("host seats", seatsA);
  if (!seatsA.some(s => s.startsWith("Bea"))) problems.push("host does not show Bea");
  // guest draws by double-click; host sees the hand count
  await B.click("#tt-fit"); await B.click('.zoombtn[data-zoom="ledger"]');
  await B.dblclick('.stack[data-stack="deck"]');
  await A.waitForTimeout(1500);
  const hcA = await A.$$eval("#tt-seats .seat b", b => b.map(x => +x.textContent));
  console.log("host hand counts", hcA);
  if (hcA[1] !== 1) problems.push("host did not see the guest's draw: " + hcA);
  // host moves a track; guest sees it
  await A.click("#tt-fit"); await A.click('.zoombtn[data-zoom="ledger"]');
  await A.click('.tcell[data-track="light"][data-val="4"]');
  await B.waitForTimeout(1500);
  const lightB = await B.evaluate(() => document.querySelector('.tmarker[data-track="light"]').title);
  console.log("guest light", lightB);
  if (!/4$/.test(lightB)) problems.push("guest did not see Light 4: " + lightB);
  // guest moves Light to 6, then the host presses undo: the guest's move must stay
  await B.click('.tcell[data-track="light"][data-val="6"]');
  await A.waitForTimeout(1500);
  await A.keyboard.press("Control+z");
  await A.waitForTimeout(1500);
  const lightA = await A.evaluate(() => document.querySelector('.tmarker[data-track="light"]').title);
  console.log("host light after undo", lightA);
  if (!/6$/.test(lightA)) problems.push("host undo wiped the guest's move: " + lightA);
  // live movement: while the guest drags a card, the host sees it travel; then it lands where the guest put it
  {
    await B.click("#tt-fit"); await B.click('.zoombtn[data-zoom="ledger"]');
    const r = await B.locator('.stack[data-stack="deck"]').boundingBox();
    const sx = r.x + r.width / 2, sy = r.y + r.height / 2;
    const deckBefore = await A.evaluate(() => JSON.parse(localStorage.getItem("nb-table-v5f")).stacks.deck.items.length);
    await B.mouse.move(sx, sy); await B.mouse.down();
    for (let i = 1; i <= 8; i++) { await B.mouse.move(sx + i * 25, sy + i * 6); await B.waitForTimeout(60); }
    await A.waitForTimeout(500);
    const seen = await A.evaluate(() => !!document.querySelector(".piece.ghost, .piece.remote-moving"));
    console.log("host sees the drag live:", seen);
    if (!seen) problems.push("host did not see the guest's drag while it happened");
    await B.mouse.up(); await A.waitForTimeout(1500);
    const deckAfter = await A.evaluate(() => JSON.parse(localStorage.getItem("nb-table-v5f")).stacks.deck.items.length);
    console.log("host's deck before/after the drag:", deckBefore, deckAfter);
    if (deckAfter !== deckBefore - 1) problems.push("the dragged card did not leave the host's deck");
  }
  // guest reloads (drops) and rejoins: same seat
  await B.reload(); await B.waitForSelector("#lb-local");
  await A.waitForTimeout(1500);
  await join(B, "Bea");
  await A.waitForTimeout(1500);
  const seatsA2 = await A.$$eval("#tt-seats .seat", b => b.map(x => x.textContent.trim()));
  console.log("host seats after rejoin", seatsA2);
  const handB = await B.$$("#tt-hand [data-hid]");
  if (handB.length !== 1) problems.push("rejoined guest lost their hand/seat: " + handB.length);
  // a third player joins: seat 2
  const C = await mk("guest2");
  await join(C, "Cid");
  await A.waitForTimeout(1500);
  const seatsA3 = await A.$$eval("#tt-seats .seat", b => b.map(x => x.textContent.trim()));
  console.log("host seats with 3", seatsA3);
  if (!seatsA3[2]?.startsWith("Cid")) problems.push("third player seat wrong: " + seatsA3);
  // the static test server has no /api: those 404/501s are expected and not counted
  const real = problems.filter(p => !/Failed to load resource/.test(p));
  console.log("PROBLEMS", real.length, real);
  if (real.length) process.exitCode = 1;
  await browser.close();
})().catch(e => { console.error("CRASH", e.message); process.exit(1); });
