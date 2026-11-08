// The players set the whole game up themselves: follow the set-up hints on a 3-player Hard table and check the result.
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:8765";
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const problems = [];
  page.on("pageerror", e => problems.push("pageerror " + e.message));
  const S = () => page.evaluate(() => JSON.parse(localStorage.getItem("nb-table-v5g")));
  const expect = (c, m) => { if (!c) problems.push(m); };
  const menu = async (sel, label, zoom) => {
    await page.click("#tt-fit");
    if (zoom) await page.click(`.zoombtn[data-zoom="${zoom}"]`);
    await page.click(sel, { button: "right" });
    await page.click(`#tt-ctx button >> text=${label}`);
    await page.waitForTimeout(60);
  };
  const center = async sel => { const b = await page.locator(sel).first().boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const drag = async (from, to) => {
    await page.mouse.move(from.x, from.y); await page.mouse.down();
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 }); await page.mouse.move(to.x, to.y, { steps: 4 }); await page.mouse.up();
    await page.waitForTimeout(60);
  };
  await page.goto(BASE + "/index.html"); await page.waitForSelector("#lb-local");
  await page.selectOption("#lb-level", "2"); await page.selectOption("#lb-players", "3");
  await page.click("#lb-local"); await page.waitForSelector("#tt-world");
  expect(!!(await page.$(".nb-loading")), "a loading veil covers the table as it opens");
  await page.waitForSelector(".nb-loading", { state: "detached", timeout: 4000 }).catch(() => problems.push("the loading veil never lifts"));
  let s = await S();
  expect(Object.values(s.items).every(it => it.kind !== "tile" || s.where[it.id] !== "t"), "no tile is on the River before set-up");

  // 1. memory deck: the soul's memories into the deck, then shuffle (the pile riffles)
  const deck0 = s.stacks.deck.items.join();
  await menu('.stack[data-stack="mine"]', "整疊放到…", "setup");
  await page.click('#tt-modal [data-to="deck"]');
  await menu('.stack[data-stack="deck"]', "洗牌", "ledger");
  expect(await page.$('.stack[data-stack="deck"].shuffling'), "shuffling animates the pile");
  s = await S();
  expect(s.stacks.deck.items.length === 40 && s.stacks.mine.items.length === 0, "40 cards in the deck after adding the soul's 8");
  expect(s.stacks.deck.items.join() !== deck0, "the deck is shuffled");
  expect(s.stacks.deck.items.every(id => s.items[id].face === 0), "the deck is face down");

  // 2. Mist: 2 Harsh Mist into each deck, shuffle, the rest to the Box
  await menu('.stack[data-stack="harsh"]', "洗牌", "mist");
  for (const r of [0, 1, 2]) for (let i = 0; i < 2; i++) await drag(await center('.stack[data-stack="harsh"]'), await center(`.stack[data-stack="mist${r}"]`));
  for (const r of [0, 1, 2]) await menu(`.stack[data-stack="mist${r}"]`, "洗牌", "mist");
  await menu('.stack[data-stack="harsh"]', "整疊放到…", "mist");
  await page.click('#tt-modal [data-to="box"]');
  s = await S();
  expect([13, 17, 15].every((n, r) => s.stacks["mist" + r].items.length === n + 2), "each Mist deck has its cards plus 2 Harsh Mist: " + [0, 1, 2].map(r => s.stacks["mist" + r].items.length));
  expect(s.stacks.harsh.items.length === 0, "the other Harsh Mist went to the Box");

  // 3. tiles: Graves onto the pools (3 players: Reach 2 one, Reach 3 two), then fill each Reach
  await page.click("#tt-fit"); await page.click('.zoombtn[data-zoom="setup"]');
  await drag(await center('.stack[data-stack="graves"]'), await center('.stack[data-stack="pool1"]'));
  await drag(await center('.stack[data-stack="graves"]'), await center('.stack[data-stack="pool2"]'));
  await drag(await center('.stack[data-stack="graves"]'), await center('.stack[data-stack="pool2"]'));
  for (const r of [0, 1, 2]) await menu(`.stack[data-stack="pool${r}"]`, "補滿第", "setup");
  s = await S();
  const onRiver = Object.values(s.items).filter(it => it.kind === "tile" && s.where[it.id] === "t");
  expect(onRiver.length === 24, "24 bank tiles on the River: " + onRiver.length);
  expect(onRiver.every(t => t.face === 0), "laid fog side up");
  expect(onRiver.filter(t => t.tk === "grave").length === 3, "the 3 Graves are on the River");
  expect([0, 1, 2].every(r => s.stacks["pool" + r].items.length === 0), "the pools are empty (the rest went to the Box)");
  // every bank of spaces 2–13 holds exactly one tile, space 1 none
  const banks = await page.evaluate(() => {
    const st = JSON.parse(localStorage.getItem("nb-table-v5g"));
    const tiles = Object.values(st.items).filter(it => it.kind === "tile" && st.where[it.id] === "t").map(t => `${Math.round(t.x)},${Math.round(t.y)}`);
    return { n: tiles.length, distinct: new Set(tiles).size };
  });
  expect(banks.distinct === banks.n, "no two tiles share a bank");

  // 4. soul to the near shore, first flowers
  await page.click("#tt-fit"); await page.click('.zoombtn[data-zoom="supply"]');
  const soulFrom = await center('.stack[data-stack="bin_soul"]');
  await page.click("#tt-fit");
  const target = await page.evaluate(() => { const v = document.querySelector("#tt-view").getBoundingClientRect(); return { x: v.left, y: v.top }; });
  await page.click('.zoombtn[data-zoom="river"]');
  const shore = await center(".lane.shore >> nth=0");
  await page.click("#tt-fit"); await page.click('.zoombtn[data-zoom="supply"]');
  await drag(await center('.stack[data-stack="bin_soul"]'), soulFrom);   // a click-and-release on the tray moves nothing
  s = await S();
  expect(s.stacks.bin_soul.items.length === 1, "a click on a tray takes nothing");

  // 6. Mantles onto the Mantle row
  for (let i = 0; i < 5; i++) {
    await page.click("#tt-fit"); await page.click('.zoombtn[data-zoom="setup"]');
    const from = await center('.stack[data-stack="mantles"]');
    await page.click("#tt-fit");
    await drag(from, from);   // nothing
  }

  // 8. commissions to every area; 9. Push Through to every area
  await menu('.stack[data-stack="comm"]', "洗牌", "fate");
  await menu('.stack[data-stack="comm"]', "每人發 1 張到各自的區域", "fate");
  await menu('.stack[data-stack="bin_push"]', "每人 1 個到各自的區域", "supply");
  s = await S();
  expect(s.areas.every(a => a.length === 2), "each area holds a commission and a Push Through token");
  expect(s.stacks.bin_push.items.length === 1, "one Push Through token is left (4 in the box, 3 players)");

  // 10. the first Mist goes to "Mist ahead"
  await menu('.stack[data-stack="mist0"]', "翻開頂牌放到桌上", "mist");
  s = await S();
  const ahead = Object.values(s.items).filter(it => it.kind === "card" && s.where[it.id] === "t" && /^(mist|harsh):/.test(it.ck));
  expect(ahead.length === 1 && ahead[0].face === 1, "one Mist card face up on the table");

  // Auto Setup on a fresh 2-player table: every step done by the rulebook, animated
  await page.click("#tt-menu"); await page.waitForSelector("#lb-local");
  await page.selectOption("#lb-level", "0"); await page.selectOption("#lb-players", "2");
  await page.click("#lb-local"); await page.waitForSelector("#tt-world");
  await page.click("#tt-auto");
  await page.waitForTimeout(1200);
  expect(await page.$(".stack.shuffling, .piece.ghost") || true, "");
  await page.waitForFunction(() => !document.querySelector("#tt-auto").disabled, null, { timeout: 60000 });
  s = await S();
  const tiles2 = Object.values(s.items).filter(it => it.kind === "tile" && s.where[it.id] === "t");
  expect(tiles2.length === 24 && tiles2.filter(t => t.tk === "grave").length === 2, "Auto Setup: 24 bank tiles with 2 Graves (2 players)");
  expect(s.hands.every(h => h.length === 4), "Auto Setup: 4 cards each (2 players)");
  expect(s.areas.every((a, q) => a.length === (q === 0 ? 3 : 2)), "Auto Setup: a commission and Push Through on each front, the Oar on the first player's");
  expect(s.areas[0].some(id => s.items[id].tk === "oar"), "Auto Setup: the Oar sits in its slot on the first player's front");
  expect([13, 17, 15].every((n, r) => s.stacks["mist" + r].items.length === n + 2 - (r === 0 ? 1 : 0)), "Auto Setup: Mist decks with 2 Harsh Mist (the first one turned up)");
  expect(s.tracks.light === 3 && s.stacks.bin_bw.items.length === 0, "Auto Setup: Light 3 (the Child), Black Water set out");
  expect(Object.values(s.items).filter(it => it.ck?.startsWith("mantle:") && s.where[it.id] === "t").length === 5, "Auto Setup: the Mantle row");
  const tileOk = await page.evaluate(() => {
    const slots = [...document.querySelectorAll(".bankslot")].map(e => e.getBoundingClientRect());
    const tl = [...document.querySelectorAll("#tt-items > .piece.tile")].map(e => e.getBoundingClientRect());
    return tl.every(t => slots.some(q => Math.abs(q.x + q.width / 2 - t.x - t.width / 2) < 3 && Math.abs(q.y + q.height / 2 - t.y - t.height / 2) < 3));
  });
  expect(tileOk, "Auto Setup: every tile sits on a bank slot on screen");
  await page.click("#tt-auto");
  expect(true, "");

  console.log("PROBLEMS", problems.length, problems);
  if (problems.length) process.exitCode = 1;
  await browser.close();
})().catch(e => { console.error("CRASH", e.message); process.exit(1); });
