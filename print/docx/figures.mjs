// Screenshots each Rulebook figure (and the two halves of the setup spread) from a factory rulebook.html.
const { chromium } = await import(process.env.PLAYWRIGHT_CORE);
const [file, tag, out] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const p = await b.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 2 });
await p.goto("file://" + file, { waitUntil: "networkidle" }); await p.waitForTimeout(1500);
await p.addStyleTag({ content: ".rfig{background:#F2E8D5;padding:3mm}" });
const ids = await p.$$eval(".rfig[data-fig]", e => e.map(x => x.dataset.fig));
for (const id of ids) await p.locator(`.rfig[data-fig="${id}"]`).screenshot({ path: `${out}/${tag}_${id}.png` });
const n = await p.locator(".spread").count();
for (let i = 0; i < n; i++) await p.locator(".spread").nth(i).screenshot({ path: `${out}/${tag}_setup${i}.png` });
console.log(ids.join(" "), "spreads", n);
await b.close();
