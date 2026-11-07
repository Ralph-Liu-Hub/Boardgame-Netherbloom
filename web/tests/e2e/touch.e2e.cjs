// touch: drag the deck's top card into the hand and a hand card onto the table with touch pointer events (CDP)
const { chromium, devices } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices["iPhone 13"] });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.goto((process.env.BASE || "http://localhost:8765") + "/index.html"); await p.waitForSelector("#lb-local");
  await p.tap("#lb-local"); await p.waitForSelector("#tt-world");
  await p.tap("#tt-fit"); await p.tap('.zoombtn[data-zoom="ledger"]');
  const cdp = await ctx.newCDPSession(p);
  const touchDrag = async (a, z) => {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: a.x, y: a.y }] });
    for (let i = 1; i <= 12; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: a.x + (z.x - a.x) * i / 12, y: a.y + (z.y - a.y) * i / 12 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await p.waitForTimeout(150);
  };
  const c = async sel => { const r = await p.locator(sel).first().boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
  const hb = await p.locator("#tt-hand").boundingBox();
  await touchDrag(await c('.stack[data-stack="deck"]'), { x: hb.x + 100, y: hb.y + 80 });
  let S = await p.evaluate(() => JSON.parse(localStorage.getItem("nb-table-v5d")));
  console.log("hand after touch draw:", S.hands[0].length);
  if (S.hands[0].length !== 1) process.exitCode = 1;
  const v = await p.locator("#tt-view").boundingBox();
  await touchDrag(await c("#tt-hand [data-hid]"), { x: v.x + v.width / 2, y: v.y + v.height / 2 });
  S = await p.evaluate(() => JSON.parse(localStorage.getItem("nb-table-v5d")));
  console.log("hand after touch play:", S.hands[0].length, "errors:", errs);
  if (S.hands[0].length !== 0 || errs.length) process.exitCode = 1;
  await b.close();
})();
