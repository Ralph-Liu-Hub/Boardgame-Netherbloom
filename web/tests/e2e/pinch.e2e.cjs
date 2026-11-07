const { chromium, devices } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ ...devices["iPhone 13"] });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", e => errs.push(e.message));
  await p.goto((process.env.BASE || "http://localhost:8765") + "/index.html"); await p.waitForSelector("#lb-local");
  await p.tap("#lb-local"); await p.waitForSelector("#tt-world");
  const cdp = await ctx.newCDPSession(p);
  const sc = () => p.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector("#tt-world")).transform).a);
  const s0 = await sc();
  const v = await p.locator("#tt-view").boundingBox(); const cx = v.x + v.width / 2, cy = v.y + v.height / 2;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cx - 20, y: cy, id: 1 }, { x: cx + 20, y: cy, id: 2 }] });
  for (let i = 1; i <= 10; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: cx - 20 - i * 8, y: cy, id: 1 }, { x: cx + 20 + i * 8, y: cy, id: 2 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  const s1 = await sc();
  // one-finger pan afterwards still works
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cx, y: cy, id: 3 }] });
  for (let i = 1; i <= 5; i++) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: cx + i * 10, y: cy, id: 3 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  const tx = await p.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector("#tt-world")).transform).e);
  console.log("scale", s0.toFixed(3), "->", s1.toFixed(3), "pan e", tx.toFixed(1), "errors", errs);
  if (!(s1 > s0 * 3) || errs.length) process.exitCode = 1;
  await b.close();
})();
