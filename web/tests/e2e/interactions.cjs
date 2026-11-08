// Phase 3: interactions on a 2-player table. Each check names the behaviour it expects.
module.exports = async (page, setStage, note, BASE) => {
  const S = () => page.evaluate(() => JSON.parse(localStorage.getItem("nb-table-v5g")));
  const center = async sel => { const b = await page.locator(sel).first().boundingBox(); if (!b) throw new Error("no box " + sel); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
  const dragTo = async (from, to, opts = {}) => {
    await page.mouse.move(from.x, from.y); await page.mouse.down();
    await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 5 });
    if (opts.alt) await page.keyboard.down("Alt");
    await page.mouse.move(to.x, to.y, { steps: 5 }); await page.mouse.up();
    if (opts.alt) await page.keyboard.up("Alt");
    await page.waitForTimeout(60);
  };
  // other players' fronts sit outside the full view: zoom out with the wheel to reach them
  const zoomClick = async sel => {
    await page.click("#tt-fit");
    if (/mat[1-9]/.test(sel)) {
      const v = await page.locator("#tt-view").boundingBox();
      await page.mouse.move(v.x + v.width / 2, v.y + v.height / 2);
      for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 300); await page.waitForTimeout(30); }
    }
    await page.click(sel); await page.waitForTimeout(50);
  };
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
  const handBox = await page.locator("#tt-hand .my-hand").boundingBox();
  await dragTo(await center('.stack[data-stack="deck"]'), { x: handBox.x + handBox.width / 2, y: handBox.y + handBox.height / 2 });
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

  // k0) the magnifier of a zoomed board becomes an X that goes back to the whole table
  stage("p3 zoom X");
  await page.click("#tt-fit"); await page.click('.zoombtn[data-zoom="loom"]');
  expect((await page.textContent('.zoombtn[data-zoom="loom"]')).trim() === "✕", "the zoomed board's button shows ✕");
  const zoomedScale = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector("#tt-world")).transform).a);
  await page.click('.zoombtn[data-zoom="loom"]');
  const backScale = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector("#tt-world")).transform).a);
  expect(backScale < zoomedScale && (await page.textContent('.zoombtn[data-zoom="loom"]')).trim() === "⌕", "✕ goes back to the whole table");
  // k) every zoom button, fit, drawers
  stage("p3 zoom/drawers");
  // the full view: the boards fill the window; my front at the bottom; the others' fronts outside it
  await page.click("#tt-fit");
  {
    const v = await page.locator("#tt-view").boundingBox(), f = await page.locator(".felt").boundingBox();
    const m0 = await page.locator('.board.mat[data-region="mat0"]').boundingBox(), m1 = await page.locator('.board.mat[data-region="mat1"]').boundingBox();
    // the frame holds the boards; my front sits below it; together they fill the window
    const all = { x: f.x, y: f.y, w: f.width, h: m0.y + m0.height - f.y };
    expect(m0.y >= f.y + f.height - 2, "my front is outside the table's frame");
    expect((Math.abs(all.x - v.x) < 20 && Math.abs(all.x + all.w - v.x - v.width) < 20) || (Math.abs(all.y - v.y) < 20 && Math.abs(all.y + all.h - v.y - v.height) < 20), "the table fills the window");
    expect(Math.abs(all.w / all.h - v.width / v.height) < 0.05, `the table takes the window's shape (${(all.w / all.h).toFixed(2)} vs ${(v.width / v.height).toFixed(2)})`);
    expect(m0.y >= v.y && m0.y + m0.height <= v.y + v.height + 1, "my front is in the full view");
    expect(m1.x + m1.width <= v.x || m1.x >= v.x + v.width || m1.y + m1.height <= v.y || m1.y >= v.y + v.height, "another player's front is outside the full view");
  }
  for (const z of await page.$$eval(".zoombtn", b => b.map(x => x.dataset.zoom))) await zoomClick(`.zoombtn[data-zoom="${z}"]`);
  await page.click("#tt-fit");
  // the Rulebook's search: every match highlighted, "x / n", Enter and the buttons step through them
  await page.click("#tt-rules"); await page.fill("#rq", "織機"); await page.waitForTimeout(300);
  {
    const n = await page.$$eval("#tt-drawer mark.rqm", m => m.length);
    const c1 = await page.textContent("#rqc");
    expect(n > 5 && c1 === `1 / ${n}`, `search highlights every match and counts them (${c1}, ${n} marks)`);
    await page.press("#rq", "Enter"); await page.press("#rq", "Enter");
    expect((await page.textContent("#rqc")) === `3 / ${n}`, "Enter goes to the next match");
    await page.press("#rq", "Shift+Enter"); await page.click("#rqprev");
    expect((await page.textContent("#rqc")) === `1 / ${n}` && (await page.$$eval("#tt-drawer mark.rqm.cur", m => m.length)) === 1, "Shift+Enter and the previous button go back; one match is current");
    await page.click("#rqprev");
    expect((await page.textContent("#rqc")) === `${n} / ${n}`, "previous from the first wraps to the last");
    expect(await page.locator("#rqc").isVisible(), "the search bar stays in view while the drawer scrolls");
    await page.fill("#rq", ""); await page.waitForTimeout(300);
    expect((await page.$$eval("#tt-drawer mark.rqm", m => m.length)) === 0, "clearing the search takes the highlights away");
  }
  await page.click("#tt-rules");
  // the Loom: one track per thread (0-10); the Scar marker stands on the threshold and moves left with each Scar
  await zoomClick('.zoombtn[data-zoom="loom"]');
  expect((await page.$$('.tcell[data-track="knot0"]')).length === 11, "the knot track runs 0-10");
  {   // drag the Scar marker one cell left: one Scar, the threshold drops by one
    const st0 = await S(), thr = st0.players === 1 ? 10 : 7;
    expect(await page.locator(`.tcell[data-track="knot2"][data-val="${thr}"]`).evaluate(e => e.classList.contains("scarcell") && /傷疤0|Scar 0/.test(e.textContent)), "the threshold cell is pale red and says Scar 0");
    await dragTo(await center('.tmarker[data-track="scar2"]'), await center(`.tcell[data-track="knot2"][data-val="${thr - 1}"]`));
    const st = await S(), sm = await page.locator('.tmarker[data-track="scar2"]').boundingBox(), c = await page.locator(`.tcell[data-track="knot2"][data-val="${thr - 1}"]`).boundingBox();
    expect(st.tracks.scar2 === 1 && Math.abs(sm.x + sm.width / 2 - (c.x + c.width / 2)) < 3 && Math.abs(sm.y + sm.height / 2 - (c.y + c.height / 2)) < 3, "one Scar: the Scar marker sits in the next cell down, the new threshold");
    await dragTo(await center('.tmarker[data-track="scar2"]'), await center(`.tcell[data-track="knot2"][data-val="${thr}"]`));
  }
  // the Ledger: the forgotten track is moved by hand, like Light
  await zoomClick('.zoombtn[data-zoom="ledger"]');
  await page.click('.tcell[data-track="forgot"][data-val="3"]'); await page.waitForTimeout(400);   // the marker glides there
  {
    const st = await S(), m = await page.locator('.tmarker[data-track="forgot"]').boundingBox(), c = await page.locator('.tcell[data-track="forgot"][data-val="3"]').boundingBox();
    expect(st.tracks.forgot === 3 && Math.abs(m.x + m.width / 2 - (c.x + c.width / 2)) < 3, `a click on the forgotten track moves its marker there (${st.tracks.forgot}, ${Math.round(m.x + m.width / 2)} vs ${Math.round(c.x + c.width / 2)})`);
    await dragTo(await center('.tmarker[data-track="forgot"]'), await center('.tcell[data-track="forgot"][data-val="5"]'));
    expect((await S()).tracks.forgot === 5, "the forgotten marker can be dragged");
  }
  await page.click('.tcell[data-track="forgot"][data-val="0"]');
  await page.click("#tt-log"); expect((await page.$$("#tt-drawer .log li")).length > 5, "log lists moves"); await page.click("#tt-log");

  // l) shift-drag a stack moves it; undo puts it back
  stage("p3 move stack");
  await zoomClick('.zoombtn[data-zoom="ledger"]');
  s0 = await S();
  const dc = await center('.stack[data-stack="discard"]');
  await page.keyboard.down("Shift"); await dragTo(dc, { x: dc.x + 80, y: dc.y + 10 }); await page.keyboard.up("Shift");
  s1 = await S(); expect(s1.stacks.discard.x !== s0.stacks.discard.x, "shift-drag moves the pile");

  // l2) each player's front at the edge of the table: commissions dealt face down; my commission shows its face only to me
  stage("p3 fronts");
  await zoomClick('.zoombtn[data-zoom="supply"]');
  await page.click('.stack[data-stack="bin_push"]', { button: "right" });
  await page.click("#tt-ctx button >> text=每人 1 個到各自的區域");
  await zoomClick('.zoombtn[data-zoom="fate"]');
  await page.click('.stack[data-stack="comm"]', { button: "right" });
  await page.click("#tt-ctx button >> text=每人發 1 張到各自的區域");
  s1 = await S();
  const myComm = s1.areas[0].find(id => s1.items[id].ck?.startsWith("comm:"));
  const theirComm = s1.areas[1].find(id => s1.items[id].ck?.startsWith("comm:"));
  expect(s1.areas.every(a => a.some(id => s1.items[id].ck?.startsWith("comm:"))), "every front got a commission");
  expect(myComm && s1.items[myComm].face === 0, "the commission lies face down");
  expect(!(await page.getAttribute(`[data-aid="${myComm}"]`, "class")).includes(" back"), "I see my own commission's face");
  expect((await page.getAttribute(`[data-aid="${theirComm}"]`, "class")).includes(" back"), "I see only the back of theirs");
  expect((await page.textContent('[data-fan="1"]')).includes("1"), "their front shows their hand as card backs");
  // double-click Push Through on my front: spent, and the seat bar shows it to everyone
  const pushId = s1.areas[0].find(id => s1.items[id].tk === "push");
  await zoomClick('.zoombtn[data-zoom="mat0"]');
  await page.dblclick(`[data-aid="${pushId}"]`);
  s1 = await S(); expect(s1.items[pushId].face === 0, "double-click spends Push Through");
  expect(!!(await page.$('#tt-seats [data-seat="0"] .pushused')), "the seat bar shows Push Through spent");
  // someone else's front cannot be moved from my screen
  await zoomClick('.zoombtn[data-zoom="mat1"]');
  await dragTo(await center(`[data-aid="${theirComm}"]`), await center("#tt-view"));
  s1 = await S(); expect(s1.where[theirComm] === "a:1", "another player's commission stays on their front");
  // a Mantle from its pile onto my front: the seat bar names it
  await page.click("#tt-fit");
  const mantle = (await S()).stacks.mantles.items.slice(-1)[0];
  const matBox = await page.locator('.board.mat[data-region="mat0"]').boundingBox();
  await dragTo(await center('.stack[data-stack="mantles"]'), { x: matBox.x + matBox.width * .5, y: matBox.y + matBox.height * .5 });
  s1 = await S(); expect(s1.where[mantle] === "a:0", "a Mantle dropped on my front goes there");
  expect(!!(await page.$('#tt-seats [data-seat="0"] .mbadge')), "the seat bar names my Mantle");
  // my commission out to the table stays face down; back onto my front
  await page.click("#tt-fit");
  await dragTo(await center(`[data-aid="${myComm}"]`), await center('.board[data-region="play"]'));
  s1 = await S(); expect(s1.where[myComm] === "t" && s1.items[myComm].face === 0, "a commission taken off my front stays face down");
  const mb0 = await page.locator('.board.mat[data-region="mat0"]').boundingBox();
  await dragTo(await center(`.piece[data-id="${myComm}"]`), { x: mb0.x + mb0.width * .4, y: mb0.y + mb0.height / 2 });
  s1 = await S(); expect(s1.where[myComm] === "a:0", "and goes back onto my front");
  // a card played from the hand goes to the Play area, labelled with who played it
  await page.click("#tt-fit");
  const playId = (await S()).hands[0][0];
  await page.click("#tt-hand [data-hid] >> nth=0", { button: "right" });
  await page.click("#tt-ctx button >> text=背面打出");
  s1 = await S();
  const pc = s1.items[playId];
  const PLAYR = await page.evaluate(() => { const b = document.querySelector('.board[data-region="play"]'); return { x: +b.dataset.cx, y: +b.dataset.cy, w: +b.dataset.cw, h: +b.dataset.ch }; });   // the table's own coordinates
  expect(s1.where[playId] === "t" && pc.face === 0 && pc.x > PLAYR.x && pc.x < PLAYR.x + PLAYR.w && pc.y > PLAYR.y && pc.y < PLAYR.y + PLAYR.h, "a card played face down lands in the Play area");
  expect((await page.getAttribute(`.piece[data-id="${playId}"]`, "data-by")) === "擺渡人 1", "it shows who played it");

  // l3) layout: one top bar; my hand in a column on the right; the board fills the rest; hints as a strip under the board
  stage("p3 layout");
  expect(await page.locator(".topbar").isHidden(), "the page header hides at the table: one top bar");
  const vw = page.viewportSize().width, vh = page.viewportSize().height;
  let vb = await page.locator("#tt-view").boundingBox(), db = await page.locator("#tt-hand").boundingBox();
  expect(Math.abs(db.x + db.width - vw) < 2 && Math.abs(vb.x + vb.width - db.x) < 2, "my hand's column on the right, the board up to it");
  expect(Math.abs(vb.y + vb.height - vh) < 2, "the board reaches the bottom of the window");
  if (!(await page.isChecked("#tt-hints"))) await page.click("#tt-hints");
  const hb2 = await page.locator("#tt-hint").boundingBox();
  vb = await page.locator("#tt-view").boundingBox(); db = await page.locator("#tt-hand").boundingBox();
  expect(Math.abs(hb2.y + hb2.height - vh) < 2 && hb2.height < 260 && Math.abs(hb2.x + hb2.width - db.x) < 2, `hint strip along the bottom of the board (${Math.round(hb2.y)}+${Math.round(hb2.height)})`);
  expect(Math.abs(vb.y + vb.height - hb2.y) < 2, "the board stops at the hint strip");
  await page.click("#tt-hints");
  const vb2 = await page.locator("#tt-view").boundingBox();
  expect(Math.abs(vb2.y + vb2.height - vh) < 2, "with hints off the board reaches the bottom again");
  // the context menu opens at the top-right corner of the card; a click elsewhere closes it
  await page.click("#tt-hand [data-hid] >> nth=0", { button: "right" });
  const cb = await page.locator("#tt-hand [data-hid] >> nth=0").boundingBox(), menu = await page.locator("#tt-ctx").boundingBox();
  expect(Math.abs(menu.y - cb.y) < 2 && (Math.abs(menu.x - (cb.x + cb.width)) < 2 || Math.abs(menu.x + menu.width - (cb.x + cb.width)) < 2), "the menu starts at the card's top-right corner");
  expect((await page.$$eval("#tt-ctx button", b => b.map(x => x.textContent))).some(t => t.includes("放大檢視")), "a hand card's menu has Look closer");
  await page.mouse.click(db.x + db.width - 10, db.y + db.height - 10);
  expect(await page.locator("#tt-ctx").isHidden(), "a click elsewhere closes the menu");
  // the rulebook: readable contents links and a way back to the top
  await page.click("#tt-rules");
  const linkColor = await page.$eval("#tt-drawer .rules a", a => getComputedStyle(a).color);
  expect(!/0, 0, 238|0, 0, 255/.test(linkColor), "contents links are not browser blue: " + linkColor);
  await page.$eval("#tt-drawer", d => { d.scrollTop = 4000; });
  await page.click("#tt-drawer .totop");
  expect(await page.$eval("#tt-drawer", d => d.scrollTop) === 0, "the top button goes back to the contents");
  await page.click("#tt-rules");

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
  s1 = await S(); expect(s1.tracks.knot1 === 6 && s1.hands[0].length >= 2, "resume restores the game");

  // the game bar's Player Aid button
  await page.click("#tt-aid"); await page.waitForTimeout(80);
  expect((await page.getAttribute("#tt-drawer", "data-kind")) === "aid", "the game's Player Aid button opens the player aid");
  await page.click("#tt-aid");

  // o) phone size: the table still opens and fits
  stage("p3 phone");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click("#tt-fit");
  await zoomClick('.zoombtn[data-zoom="river"]');
  await page.screenshot({ path: (process.env.OUT || require("os").tmpdir()) + "/nb-e2e-phone.png" });
  await page.setViewportSize({ width: 1440, height: 900 });

  // p) the menu: the tables that help choose a Soul and a difficulty; End the game clears the save
  stage("p3 end game");
  await page.click("#tt-menu"); await page.waitForSelector("#lb-local");
  expect((await page.$$(".lobby .choose table")).length === 3, "the menu shows the difficulty, set-up and Soul tables");
  expect(!!(await page.$("#lb-end")), "End the game sits next to Continue");
  // the menu's top bar: the Rulebook and the Player Aid open in a drawer
  await page.click("#btn-rules"); await page.waitForTimeout(80);
  expect((await page.getAttribute("#tt-drawer", "data-kind")) === "rules" && await page.locator("#tt-drawer").isVisible(), "the menu's Rulebook button opens the rulebook");
  await page.click("#btn-aid"); await page.waitForTimeout(80);
  expect((await page.getAttribute("#tt-drawer", "data-kind")) === "aid" && (await page.textContent("#tt-drawer")).includes("回合結束"), "the menu's Player Aid button opens the player aid");
  await page.click("#tt-drawer .hclose");
  page.once("dialog", d => d.accept());
  await page.click("#lb-end"); await page.waitForTimeout(150);
  expect(!(await page.$("#lb-resume")) && (await S()) === null, "End the game clears the save");
};
