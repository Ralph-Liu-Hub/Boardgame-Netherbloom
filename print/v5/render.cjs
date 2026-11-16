// Prints each HTML document of the build to PDF with Chromium (the page size comes from the document's @page rule).
//   node print/v5/render.cjs print/v5/out/<lang>/jobs.json [--png]
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
(async () => {
  const jobs = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const png = process.argv.includes("--png");
  const b = await chromium.launch();
  const ctx = await b.newContext();
  for (const j of jobs) {
    const p = await ctx.newPage();
    await p.goto("file://" + j.html, { waitUntil: "load", timeout: 120000 });
    await p.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
    });
    await p.waitForTimeout(300);
    const bad = await p.evaluate(() => window.fitAll ? window.fitAll() : []);
    for (const t of bad) console.log("OVERFLOW", path.basename(j.pdf), t);
    fs.mkdirSync(path.dirname(j.pdf), { recursive: true });
    await p.pdf({ path: j.pdf, preferCSSPageSize: true, printBackground: true });
    if (png && j.png) {
      await p.setViewportSize({ width: 1600, height: 1200 });
      await p.screenshot({ path: j.png, fullPage: false });
    }
    await p.close();
    console.log("pdf", path.relative(process.cwd(), j.pdf));
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
