// Saves an HTML drawing (in mm) as a high-resolution PNG:  node print/v5/shot.cjs job.json  ({html, out, w, h} in mm)
const { chromium } = require("playwright");
const fs = require("fs");
(async () => {
  const j = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const px = mm => Math.ceil(mm * 96 / 25.4);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: px(j.w), height: px(j.h) }, deviceScaleFactor: 1.6 });
  await p.goto("file://" + j.html, { waitUntil: "load", timeout: 120000 });
  await p.evaluate(async () => { await document.fonts.ready; });
  await p.waitForTimeout(800);
  const bad = await p.evaluate(() => window.fitAll ? window.fitAll() : []);
  for (const t of bad) console.log("OVERFLOW", t);
  await p.screenshot({ path: j.out, clip: { x: 0, y: 0, width: px(j.w), height: px(j.h) } });
  await b.close();
  console.log("png", j.out);
})().catch(e => { console.error(e); process.exit(1); });
