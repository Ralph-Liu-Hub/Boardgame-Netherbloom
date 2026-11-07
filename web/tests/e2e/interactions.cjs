// Phase 3: interactions on a 2-player table. Each check names the behaviour it expects.
module.exports = async (page, setStage, note, BASE) => {
  const S = () => page.evaluate(() => JSON.parse(localStorage.getItem("nb-table-v5d")));
  const center = async sel => { const b = await page.locator(sel).first().boundingBox(); if (!b) throw new Error("no box " + sel); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const dragTo = async (from, to, opts = {}) => {
    await page.mouse.move(from.x, from.y); await page.mouse.down();
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 5 });
    if (opts.alt) await page.keyboard.down("Alt");
    await page.mouse.move(to.x, to.y, { steps: 5 }); await page.mouse.up();
    if (opts.alt) await page.keyboard.up("Alt");
    await page.waitForTimeout(60);
  };
  const zoomClick = async sel => { await page.click("#tt-fit"); await page.click(sel); await page.waitForTimeout(50); };
  const expect = (cond, msg) => { if (!cond) note(stageName, "EXPECTED " + msg); };
  let stageName = "";
  const stage = n => { stageName = n; setStage(n); };

  stage("p3 open");
  await page.setViewportSize({ width: 1440, height: 900 });
  if (await page.$("#tt-menu")) await page.click("#tt-menu");
  await page.waitForSelector("#lb-local");
  await page.selectOption("#lb-soul", "bride"); await page.selectOption("#lb-level", "1"); await page.selectOption("#lb-players", "2");
  await page.click("#lb-local"); await page.waitForSelector("#tt-world");
  if (await page.isChecked("#tt-hints")) await page.click("#tt-hints");
  await zoomClick('.zoombtn[data-zoom="ledger"]');

  // a) a plain click on the deck changes nothing (no log line, no undo step)
  stage("p3 click deck");
  let s0 = await S();
  await page.click('.stack[data-stack="deck"]');
  let s1 = await S();
  expect(s1.log.length === s0.log.length && s1.stacks.deck.items.length === s0.stacks.deck.items.length && s1.rev === s0.rev, `click on deck is a no-op (log ${s0.log.length}->${s1.log.length}, rev ${s0.rev}->${s1.rev})`);

  // b) drag the top card into the hand
  stage("p3 draw by drag");
  const handBox = await page.locator("#tt-hand").boundingBox();
  await dragTo(await center('.stack[data-stack="deck"]'), { x: handBox.x + 300, y: handBox.y + handBox.height / 2 });
  s1 = await S();
  expect(s1.hands[0].length === 1 && s1.stacks.deck.items.length === s0.stacks.deck.items.length - 1, "drag deck -> hand draws 1");
  // double-click the deck draws too
  await page.dblclick('.stack[data-stack="deck"]');
  s1 = await S();
  expect(s1.hands[0].length === 2, "double-click deck draws 1 (hand " + s1.hands[0].length + ")");
  // a plain click on a hand card changes nothing
  stage("p3 click hand card");
  s0 = await S();
  await page.click("#tt-hand [data-hid] >> nth=0");
  s1 = await S();
  expect(s1.rev === s0.rev && s1.hands[0].length === 2, `click on a hand card is a no-op (rev ${s0.rev}->${s1.rev}, hand ${s1.hands[0].length})`);

  // c) play a hand card onto a memory slot of the open page
  stage("p3 inscribe");
  await zoomClick('.zoombtn[data-zoom="book"]');
  const hid = await page.getAttribute("#tt-hand [data-hid] >> nth=0", "data-hid");
  await dragTo(await center("#tt-hand [data-hid] >> nth=0"), await center("#tt-book .node.mem >> nth=0"));
  s1 = await S();
  expect(s1.where[hid] === "t" && s1.items[hid].pg === 0, "card on a page slot belongs to page 0 (pg " + s1.items[hid].pg + ")");
  // d) flipping to chapter 2 hides it; back shows it
  await page.click('#tt-book .booktab[data-view="1"]');
  expect(await page.locator(`.piece[data-id="${hid}"]`).isHidden(), "card hidden on another page");
  await page.click('#tt-book .booktab[data-view="0"]');
  expect(await page.locator(`.piece[data-id="${hid}"]`).isVisible(), "card visible on its page");
  // e) double-click flips, R rotates
  stage("p3 flip/rotate");
  await page.dblclick(`.piece[data-id="${hid}"]`);
  s1 = await S(); expect(s1.items[hid].face === 0, "dblclick flips the card");
  await page.dblclick(`.piece[data-id="${hid}"]`);
  await page.hover(`.piece[data-id="${hid}"]`); await page.keyboard.press("r");
  s1 = await S(); expect(s1.items[hid].rot === 90, "R turns the card sideways");
  // f) context menu on a table card: zoom, take into hand, box
  stage("p3 card menu");
  await page.click(`.piece[data-id="${hid}"]`, { button: "right" });
  const items = await page.$$eval("#tt-ctx button", b => b.map(x => x.textContent));
  expect(items.length >= 4, "card menu has options: " + items.join("|"));
  await page.click("#tt-ctx button >> text=放大檢視"); await page.waitForSelector("#tt-modal:not(.hidden)");
  await page.click("#tt-modal .mclose");
  await page.click(`.piece[data-id="${hid}"]`, { button: "right" });
  await page.click("#tt-ctx button >> text=放進我的手牌");
  s1 = await S(); expect(s1.hands[0].includes(hid) && s1.items[hid].pg === undefined, "take into hand clears the page");
  // g) deck menu: turn top, deal, shuffle, search & pick, turn pile up/down
  stage("p3 deck menu");
  await zoomClick('.zoombtn[data-zoom="ledger"]');
  for (const label of ["翻開頂牌放到桌上", "每人發 1 張", "洗牌"]) {
    await page.click('.stack[data-stack="deck"]', { button: "right" });
    await page.click(`#tt-ctx button >> text=${label}`);
  }
  s1 = await S(); expect(s1.hands[0].length === 3 && s1.hands[1].length === 1, `deal gives one each (hands ${s1.hands[0].length}/${s1.hands[1].length})`);
  await page.click('.stack[data-stack="deck"]', { button: "right" });
  await page.click("#tt-ctx button >> text=查看與搜尋");
  await page.click("#tt-modal [data-pick] >> nth=3");
  s1 = await S(); expect(s1.hands[0].length === 4, "search pick goes to hand");
  // discard: drop a hand card on it
  await dragTo(await center("#tt-hand [data-hid] >> nth=0"), await center('.stack[data-stack="discard"]'));
  s1 = await S(); expect(s1.stacks.discard.items.length === 1, "hand card dropped on the discard pile");

  // h) roots: take a root from the bin, bloom it, put it back, take it again: it is a root
  stage("p3 roots");
  await zoomClick('.zoombtn[data-zoom="supply"]');
  const binC = await center('.stack[data-stack="bin_root"]');
  await dragTo(binC, { x: binC.x + 200, y: binC.y - 60 });
  s1 = await S();
  let rid = Object.values(s1.items).filter(it => it.tk === "root" && s1.where[it.id] === "t").map(it => it.id)[0];
  expect(rid && s1.items[rid].face === 0, "a token from the root bin is a Root");
  await page.dblclick(`.piece[data-id="${rid}"]`);
  s1 = await S(); expect(s1.items[rid].face === 1, "dblclick turns the Root into a Bloom");
  await dragTo(await center(`.piece[data-id="${rid}"]`), binC);
  s1 = await S(); expect(s1.where[rid] === "s:bin_root", "the Bloom goes back into the bin");
  await dragTo(binC, { x: binC.x + 200, y: binC.y - 60 });
  s1 = await S();
  const back = Object.values(s1.items).filter(it => it.tk === "root" && s1.where[it.id] === "t");
  expect(back.length === 1 && back[0].face === 0, "a token taken from the bin again is a Root (face " + back[0]?.face + ")");
  // searching the bin also gives a Root
  await page.click('.stack[data-stack="bin_root"]', { button: "right" });
  await page.click("#tt-ctx button >> text=查看與搜尋");
  await page.click("#tt-modal [data-pick] >> nth=0");
  s1 = await S();
  const two = Object.values(s1.items).filter(it => it.tk === "root" && s1.where[it.id] === "t");
  expect(two.length === 2 && two.every(t => t.face === 0), "a token picked from the bin by search is a Root (" + two.map(t => t.face) + ")");

  // i) tracks: click a cell, drag the marker
  stage("p3 tracks");
  await zoomClick('.zoombtn[data-zoom="ledger"]');
  await page.click('.tcell[data-track="light"][data-val="5"]');
  s1 = await S(); expect(s1.tracks.light === 5, "click Light 5");
  await dragTo(await center('.tmarker[data-track="crack"]'), await center('.tcell[data-track="crack"][data-val="2"]'));
  s1 = await S(); expect(s1.tracks.crack === 2, "drag Fractures to 2 (" + s1.tracks.crack + ")");
  await zoomClick('.zoombtn[data-zoom="loom"]');
  await dragTo(await center('.tmarker[data-track="knot1"]'), await center('.tcell[data-track="knot1"][data-val="6"]'));
  s1 = await S(); expect(s1.tracks.knot1 === 6, "drag knot1 to 6");

  // j) undo / redo
  stage("p3 undo");
  await page.keyboard.press("Control+z");
  s1 = await S(); expect(s1.tracks.knot1 === 0, "undo knot");
  await page.keyboard.press("Control+y");
  s1 = await S(); expect(s1.tracks.knot1 === 6, "redo knot");

  // k) every zoom button, fit, drawers
  stage("p3 zoom/drawers");
  for (const z of await page.$$eval(".zoombtn", b => b.map(x => x.dataset.zoom))) await zoomClick(`.zoombtn[data-zoom="${z}"]`);
  await page.click("#tt-fit");
  await page.click("#tt-rules"); await page.fill("#rq", "織機"); await page.waitForTimeout(100); await page.click("#tt-rules");
  await page.click("#tt-log"); expect((await page.$$("#tt-drawer .log li")).length > 5, "log lists moves"); await page.click("#tt-log");

  // l) shift-drag a stack moves it; undo puts it back
  stage("p3 move stack");
  await zoomClick('.zoombtn[data-zoom="ledger"]');
  s0 = await S();
  const dc = await center('.stack[data-stack="discard"]');
  await page.keyboard.down("Shift"); await dragTo(dc, { x: dc.x + 80, y: dc.y + 10 }); await page.keyboard.up("Shift");
  s1 = await S(); expect(s1.stacks.discard.x !== s0.stacks.discard.x, "shift-drag moves the pile");

  // m) seats: pass the device
  stage("p3 seats");
  await page.click('#tt-seats [data-seat="1"]');
  await page.click("#seatok");
  expect((await page.$$("#tt-hand [data-hid]")).length === 1, "seat 2 sees their own hand");
  await page.click('#tt-seats [data-seat="0"]'); await page.click("#seatok");

  // n) the lobby: resize, keys and the language button must not touch the saved game
  stage("p3 lobby");
  s0 = await S();
  await page.click("#tt-menu"); await page.waitForSelector("#lb-local");
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(100);
  s1 = await S(); expect(s1.rev === s0.rev, "Ctrl+Z in the lobby leaves the saved game alone");
  await page.click("#btn-lang"); await page.waitForTimeout(150);
  expect(!!(await page.$("#lb-local")), "the language button keeps the lobby open");
  await page.click("#btn-lang"); await page.waitForTimeout(150);
  if (!(await page.$("#lb-resume"))) { await page.click("#tt-menu").catch(() => {}); }
  await page.click("#lb-resume"); await page.waitForSelector("#tt-world");
  s1 = await S(); expect(s1.tracks.knot1 === 6 && s1.hands[0].length >= 3, "resume restores the game");

  // o) phone size: the table still opens and fits
  stage("p3 phone");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click("#tt-fit");
  await zoomClick('.zoombtn[data-zoom="river"]');
  await page.screenshot({ path: (process.env.OUT || require("os").tmpdir()) + "/nb-e2e-phone.png" });
  await page.setViewportSize({ width: 1440, height: 900 });
};
