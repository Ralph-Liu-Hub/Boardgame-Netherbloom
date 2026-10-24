// The box, flat, for a lid-and-base board box: lid 300 x 300 x 75 mm, base 296 x 296 x 73 mm, 15 mm turn-ins, 3 mm bleed.
// Pages: lid wrap (top + four sides), lid die line, base wrap (bottom = the box back), base die line, inside-lid liner, base-floor liner.
// Each factory has its own dieline; send these with the measurements and they place the art on theirs.
import { join } from "node:path";
import { BLEED, C, doc, artImg, render, icon, esc } from "./lib.mjs";
import { panel } from "./board.mjs";

export const LID = { L: 300, D: 75 }, BASE = { L: 296, D: 73 }, TURN = 15;
const PX = 96 / 25.4;   // CSS px per mm

const SOULS = ["child", "garland", "king", "bride", "nameless"];
const W = {
  en: {
    souls: ["The Child", "The Garland Girl", "The King", "The Bride", "Open Crossing"], players: "1–4 players · 45–60 min · 14+",
    oneCrossing: "One crossing", five: "Five Souls", lore: "Whoever drinks from the River Lethe forgets.", lore2: "You plant, the soul walks, the river answers.",
    facts: [["1–4", "players"], ["45–60", "minutes"], ["14+", "ages"]], taken: "…but this, the river has taken",
    copy: "You are the Ferrymen, servants of the underworld. Plant Netherblooms along the banks to light one soul's way to the Far Shore, and write what it remembers into its Book of Remembrance. Plan together, but a soul's memories may never be spoken: say them with the flowers you plant and the cards you play.",
    comp: [["72", "Memory cards"], ["42", "Mist cards"], ["12", "Ghost cards"], ["5", "Soul cards"], ["4", "Mantle cards"], ["3", "river board panels"], ["1", "Loom of the Fates board"], ["1", "Ledger board"], ["20", "bank tiles"], ["5", "Soul standees"], ["77", "tokens"], ["5", "Books of Remembrance"]],
  },
  zh: {
    souls: ["最後火光的孩子", "花環少女", "渡船上的國王", "留在冥府的新娘", "無名渡河"], players: "1–4人 · 45–60分鐘 · 14歲以上",
    oneCrossing: "一次渡河", five: "五個亡魂", lore: "凡飲下忘川之水者，終將遺忘。", lore2: "你們種花，亡魂前行，河流回應。",
    facts: [["1–4", "人"], ["45–60", "分鐘"], ["14+", "歲以上"]], taken: "……但這一段，已被河水帶走",
    copy: "你們是擺渡人，冥府的僕役。沿著河岸種下彼岸花，為一個亡魂照亮通往彼岸的路，並把它記起的一切寫進它的憶念之書。你們可以一起商量，但亡魂的記憶絕不能說出口：只能用你種下的花與打出的牌來訴說。",
    comp: [["72", "記憶牌"], ["42", "迷霧牌"], ["12", "幽靈牌"], ["5", "亡魂牌"], ["4", "稱號牌"], ["3", "河流圖板"], ["1", "命運織機圖板"], ["1", "渡帳圖板"], ["20", "河岸板塊"], ["5", "亡魂立牌"], ["77", "標記"], ["5", "憶念之書"]],
  },
};

const latinTitle = "font-family:'IM Fell English SC',Georgia,serif";
// The eight surfaces from the design system (BoxSides), sized in cqw so they fill whatever box they are placed in.
const S = {
  top: (lang, w) => `<div class="sf top">${artImg("cover-f")}
    <div class="tblock">${lang === "en" ? `<div class="ttl" style="font-size:12cqw;${latinTitle}">Netherbloom</div>`
      : `<div class="ttl" style="font-size:10cqw;font-family:'Noto Serif TC',serif;font-weight:600;letter-spacing:.12em">《彼岸花渡》</div><div class="by" style="font-size:3.2cqw;${latinTitle};letter-spacing:.4em;margin-top:1cqw">NETHERBLOOM</div>`}
      <div class="by" style="font-size:2.6cqw;margin:.6cqw 0 0 .4cqw">RALPH LAUXIE</div></div>
    <div class="tfoot">${w.players}</div></div>`,
  // Side A (front) carries the edition's own title; Side C (back) the other language's.
  a: (lang) => `<div class="sf sa">${artImg("cover-f", "50% 88%")}
    <div class="mid">${icon("nb-bloom", C.crimson, "ic s7")}<div>${lang === "en" ? `<div class="ttl" style="font-size:9cqw;${latinTitle}">Netherbloom</div>`
      : `<div class="ttl" style="font-size:7.5cqw;font-family:'Noto Serif TC',serif;font-weight:600;letter-spacing:.14em">《彼岸花渡》</div>`}<div class="by" style="font-size:1.6cqw;margin-top:.4cqw">RALPH LAUXIE</div></div>${icon("nb-bloom", C.crimson, "ic s7")}</div></div>`,
  b: (lang, w) => `<div class="sf sb">${artImg("tex-water")}
    <div class="lab"><small>${w.oneCrossing}</small>${w.five}</div>
    <div class="row">${SOULS.map((k, i) => `<figure><div class="cam">${artImg(`soul-${k}`, "50% 0%")}</div><figcaption>${esc(w.souls[i])}</figcaption></figure>`).join("")}</div></div>`,
  c: (lang) => `<div class="sf sc">${artImg("cover-f", "86% 46%")}
    <div class="zhb">${lang === "en" ? `<div class="zh">《彼岸花渡》</div><div class="zhen">NETHERBLOOM</div>`
      : `<div class="ttl" style="font-size:8cqw;${latinTitle}">Netherbloom</div><div class="zhen">RALPH LAUXIE</div>`}</div></div>`,
  d: (lang, w) => `<div class="sf sd">${artImg("tex-bank")}
    <div class="lore">${w.lore}</div>
    <div class="facts">${w.facts.map(([n, l], i) => `<span>${icon(["nb-soul", "nb-light", "nb-seal"][i], i === 2 ? C.crimson : C.bone, "ic s44")}<b>${n}</b>${l}</span>`).join("")}</div>
    <div class="ttl sm" style="${latinTitle}">Netherbloom<small>RALPH LAUXIE</small></div></div>`,
  ilid: (lang, w) => `<div class="sf ilid">${artImg("tex-water")}
    <svg class="rings" viewBox="0 0 100 100" aria-hidden="true">${[9, 14, 20, 27, 35].map((r, i) => `<ellipse cx="50" cy="52" rx="${r}" ry="${(r * .8).toFixed(1)}" fill="none" stroke="#E6D3A3" stroke-width="${(.32 - i * .04).toFixed(2)}" stroke-dasharray="${14 + i * 6} ${2 + i * 2}" opacity="${(.5 - i * .08).toFixed(2)}"/>`).join("")}</svg>
    <div class="ilore">${w.lore}<small>${w.lore2}</small></div></div>`,
  ibase: (lang, w) => `<div class="sf ibase">${artImg("tex-bank")}<div class="glow"></div>${icon("nb-bloom", C.crimson, "ic bloom")}<div class="taken">${w.taken}</div></div>`,
};

// The box back (design system BoxBack): the game set up on a table, the story, the five Souls, what is in the box.
// Drawn at its 820 px design size and scaled to the base.
function boxBack(lang, w) {
  const pieces = { "1,0": "bloom", "1,1": "bloom", "2,0": "bloom", "2,1": "root", "3,0": "root", "3,1": "bloom", "4,1": "root", "5,0": "card", "6,1": "card" };
  const chip = (id, col) => `<span class="chip">${icon(id, col)}</span>`;
  return `<div class="bb"><div class="table"><div class="plane">
      <div class="board">${[0, 1, 2].map(i => panel(i, lang, pieces)).join("")}</div>
      <div class="deck">${[0, 3, 6].map(o => `<div class="dc" style="left:${o}px;top:${-o}px">${artImg("back-memory")}</div>`).join("")}</div>
      <div class="sc">${artImg("soul-child", "50% 0%")}</div>
      <div class="chips">${chip("nb-tok-oar", C.bone)}${chip("nb-tok-push", C.crimson)}${chip("nb-tok-shield", C.bone)}</div>
      <div class="book"><div class="l"></div><div class="r">${artImg("child-road")}</div></div>
    </div></div><div class="shade"></div>
    <div class="lede">${w.lore}</div>
    <div class="copy">${w.copy}</div>
    <div class="souls">${SOULS.map((k, i) => `<div class="sp"><div class="pi">${artImg(`soul-${k}`, "50% 0%")}</div><span>${esc(w.souls[i])}</span></div>`).join("")}</div>
    <div class="foot"><div class="comp">${w.comp.map(([n, t]) => `<span><b>${n}</b>${t}</span>`).join("")}</div>
      <div class="meta"><span style="${latinTitle}">Netherbloom</span>${lang === "zh" ? "<em>《彼岸花渡》</em>" : ""}<small>${w.players}</small></div></div></div>`;
}

const CSS = `
.sheet { position: absolute; inset: 0; background: ${C.ink}; }
.slot { position: absolute; container-type: inline-size; overflow: hidden; }
.sf { position: absolute; inset: 0; overflow: hidden; container-type: inline-size; background: ${C.water}; color: ${C.paper}; }
.sf > .ai { z-index: 0; }
.sf::after { content: ""; position: absolute; inset: 0; pointer-events: none; box-shadow: inset 0 0 8cqw rgba(0,0,0,.7); }
.sf > :where(:not(.ai)) { position: relative; z-index: 1; }
.ttl { color: ${C.paper}; line-height: 1.05; }
.by { font-family: "IM Fell English SC", Georgia, serif; color: ${C.bone}; letter-spacing: .32em; }
.ic.s7 { width: 7cqw; height: 7cqw; } .ic.s44 { width: 4.4cqw; height: 4.4cqw; }
.top::before { content: none; }
.top .tblock { position: absolute; z-index: 2; top: 4%; left: 50%; transform: translateX(-50%); white-space: nowrap; }
.top .tfoot { position: absolute; z-index: 2; bottom: 2.6%; right: 3.4%; font-family: var(--f-body); font-size: 1.7cqw; letter-spacing: .3em; text-transform: uppercase; color: #b9b1a4; }
.sa { background: #000; } .sa > .ai { opacity: .55; }
.sa .mid { height: 100%; display: flex; align-items: center; justify-content: center; gap: 4cqw; }
.sb { background: #000; } .sb > .ai { opacity: .7; }
.sb { display: flex; align-items: center; gap: 4cqw; padding: 0 4cqw; }
.sb .lab { font-family: var(--f-display); font-size: 4.4cqw; color: ${C.bone}; line-height: 1.1; white-space: nowrap; }
.sb .lab small { display: block; font-family: var(--f-mono); font-size: 1.2cqw; letter-spacing: .3em; text-transform: uppercase; color: ${C.mist}; margin-bottom: .6cqw; }
.sb .row { display: flex; gap: 2.2cqw; flex: 1; justify-content: flex-end; }
.sb figure { margin: 0; display: grid; justify-items: center; gap: .6cqw; }
.sb .cam { position: relative; width: 8.6cqw; height: 11.6cqw; border-radius: 50%; overflow: hidden; border: .3cqw solid ${C.gilt}; box-shadow: 0 0 0 .25cqw #050407; }
.sb figcaption { font-family: var(--f-serif); font-style: italic; font-size: 1.35cqw; color: ${C.bone}; white-space: nowrap; }
.sc { background: #000; } .sc > .ai { opacity: .6; }
.sc::before { content: none; }
.sc .zhb { position: absolute; left: 6cqw; top: 50%; transform: translateY(-50%); }
.sc .zh { font-family: "Noto Serif TC", serif; font-weight: 600; font-size: 8cqw; letter-spacing: .18em; color: ${C.paper}; }
.sc .zhen { font-family: "IM Fell English SC", Georgia, serif; font-size: 1.8cqw; letter-spacing: .4em; color: ${C.bone}; margin-top: .6cqw; padding-left: .4cqw; }
.sd { background: #000; } .sd > .ai { opacity: .42; }
.sd { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 0 4cqw; gap: 3cqw; }
.sd .lore { font-family: var(--f-serif); font-style: italic; font-size: 2.1cqw; color: ${C.bone}; line-height: 1.35; max-width: 22cqw; }
.sd .facts { display: flex; gap: 3.4cqw; }
.sd .facts span { display: grid; justify-items: center; gap: .5cqw; font-family: var(--f-mono); font-size: 1.15cqw; letter-spacing: .2em; text-transform: uppercase; color: ${C.mist}; }
.sd .facts b { font-family: "IM Fell English SC", Georgia, serif; font-weight: 400; font-size: 3.2cqw; letter-spacing: 0; color: ${C.paper}; }
.sd .ttl.sm { justify-self: end; text-align: right; font-size: 4.2cqw; }
.sd .ttl small { display: block; font-size: 1.3cqw; letter-spacing: .32em; color: ${C.bone}; margin-top: .5cqw; }
.ilid .rings { position: absolute; inset: 0; width: 100%; height: 100%; }
.ilid .ilore { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); text-align: center; font-family: var(--f-serif); font-style: italic; font-size: 5.2cqw; color: ${C.bone}; line-height: 1.3; padding: 0 10cqw; }
.ilid .ilore small { display: block; margin-top: 3cqw; font-size: 3.4cqw; color: ${C.mist}; }
.ibase { background: #000; } .ibase > .ai { opacity: .55; }
.ibase .glow { display: none; }
.ibase .bloom { position: absolute; left: 42cqw; top: 36cqw; width: 16cqw; height: 16cqw;  }
.ibase .taken { position: absolute; bottom: 14cqw; left: 0; right: 0; text-align: center; font-family: var(--f-hand); font-style: italic; font-size: 4.4cqw; color: ${C.bone}; }
.base-side { position: absolute; background: ${C.ink}; display: flex; align-items: center; justify-content: center; gap: 6mm; color: ${C.gilt}; font-family: "IM Fell English SC", Georgia, serif; font-size: 9pt; letter-spacing: .5em; }
.base-side .ic { width: 7mm; height: 7mm; }
/* the box back, at its 820 px design size */
.bb { position: absolute; left: 0; top: 0; width: 820px; height: 820px; transform-origin: 0 0; overflow: hidden; color: ${C.paper};
  background: radial-gradient(ellipse at 55% 55%, #2a1e17, #120d0b 70%); display: grid; grid-template-rows: auto auto 1fr auto; padding: 40px 44px 28px; gap: 14px; box-sizing: border-box; }
.bb .table { position: absolute; inset: 0; z-index: 0; perspective: 1400px; perspective-origin: 50% 0%; overflow: hidden;
  background: repeating-linear-gradient(92deg, rgba(0,0,0,.18) 0 2px, transparent 2px 9px), radial-gradient(ellipse at 55% 60%, #3a281c, #160f0b 75%); }
.bb .plane { position: absolute; left: 50%; top: 49%; width: 1140px; height: 640px; transform: translate(-50%, -50%) scale(.64) rotateX(46deg) rotateZ(-5deg); transform-style: preserve-3d; }
.bb .board { position: absolute; left: 60px; top: 250px; width: 1020px; display: grid; grid-template-columns: repeat(3, 1fr); box-shadow: 0 40px 60px rgba(0,0,0,.7); }
.bb .board svg { width: 100%; height: auto; display: block; }
.bb .deck { position: absolute; left: 90px; top: 40px; width: 110px; height: 154px; }
.bb .dc, .bb .sc { position: absolute; width: 110px; height: 154px; border-radius: 7px; overflow: hidden; box-shadow: 0 10px 18px rgba(0,0,0,.6); }
.bb .sc { left: 240px; top: 40px; border: 2px solid ${C.bone}; }
.bb .book { position: absolute; left: 740px; top: 10px; width: 300px; height: 210px; display: flex; box-shadow: 0 16px 26px rgba(0,0,0,.6); transform: rotateZ(4deg); }
.bb .book div { flex: 1; background: radial-gradient(ellipse at 50% 40%, #f4eddf, #e3d7bf); position: relative; overflow: hidden; }
.bb .book div::before { content: ""; position: absolute; inset: 8px; border: 1px solid #8a6a3e; z-index: 2; }
.bb .book .l::after { content: ""; position: absolute; left: 26px; top: 32px; width: 46px; height: 64px; background: ${C.ink2}; border: 1px solid #c9b48a; box-shadow: 54px 0 0 ${C.ink2}, 0 72px 0 ${C.ink2}; }
.bb .book .r .ai { inset: 14px; width: calc(100% - 28px); height: calc(100% - 28px); opacity: .55; mix-blend-mode: multiply; filter: sepia(.7); }
.bb .chips { position: absolute; left: 420px; top: 110px; display: flex; gap: 14px; }
.bb .chip { width: 46px; height: 46px; border-radius: 50%; background: ${C.ink2}; border: 2px solid ${C.gilt}; display: grid; place-items: center; box-shadow: 0 6px 10px rgba(0,0,0,.6); }
.bb .chip .ic { width: 28px; height: 28px; }
.bb .shade { display: none; }
.bb > *:not(.table):not(.shade) { position: relative; z-index: 1; }
.bb .lede { font-family: var(--f-serif); font-style: italic; font-size: 30px; line-height: 1.25; color: ${C.bone}; }
.bb .copy { font-size: 18.5px; line-height: 1.55; color: ${C.paper}; max-width: 40em; }
[lang="en"] .bb .copy { max-width: 50ch; }
.bb .souls { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; align-self: end; }
.bb .sp { display: grid; gap: 5px; text-align: center; }
.bb .pi { position: relative; width: 100%; aspect-ratio: 1; border: 1.5px solid ${C.bone}; border-radius: 6px; overflow: hidden; }
.bb .sp span { font-family: var(--f-serif); font-size: 15px; color: ${C.bone}; }
.bb .foot { display: flex; justify-content: space-between; align-items: end; gap: 20px; border-top: 1px solid ${C.ash}; padding-top: 12px; }
.bb .comp { display: grid; grid-template-columns: repeat(3, auto); gap: 2px 18px; font-size: 13.5px; color: ${C.mist}; }
.bb .comp b { font-family: var(--f-mono); font-weight: 500; color: ${C.bone}; margin-right: 6px; }
.bb .meta { text-align: right; font-size: 26px; color: ${C.paper}; }
.bb .meta em { display: block; font-style: normal; font-family: "Noto Serif TC", serif; font-size: 15px; letter-spacing: .2em; color: ${C.bone}; }
.bb .meta small { display: block; font-family: var(--f-body); font-size: 12.5px; letter-spacing: .3em; text-transform: uppercase; color: ${C.mist}; }
svg.die { position: absolute; inset: 0; width: 100%; height: 100%; }
`;

// A wrap: the centre panel and four sides, each side turned so it reads upright once folded down.
function wrap({ L, D }, centre, sides, die = false) {
  const B = BLEED, size = L + 2 * (D + TURN), o0 = D + TURN;
  if (die) {
    const a = TURN, b = o0, c = o0 + L, d = c + D, e = d + TURN;
    const outline = `M${b} 0 H${c} V${a} H${c} V${b} H${d} H${e} V${c} H${d} H${c} V${e} H${b} V${d} V${c} H${a} H0 V${b} H${a} H${b} V${a} Z`;
    const folds = [[b, b, c, b], [b, c, c, c], [b, b, b, c], [c, b, c, c], [b, a, c, a], [b, d, c, d], [a, b, a, c], [d, b, d, c]];
    return `<div class="sheet" style="background:#fff"><svg class="die" viewBox="${-B} ${-B} ${size + 2 * B} ${size + 2 * B}">
      <path d="${outline}" fill="none" stroke="#ec008c" stroke-width=".35"/>
      ${folds.map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#00a0e0" stroke-width=".3" stroke-dasharray="3 2"/>`).join("")}
      <text x="${b}" y="${b + 8}" font-family="IBM Plex Mono, monospace" font-size="4" fill="#ec008c">DIE LINE · cut (magenta) · fold (cyan, dashed) · ${L} × ${L} × ${D} mm · turn-in ${TURN} mm · bleed ${B} mm</text></svg></div>`;
  }
  const at = (x, y, w, h, rot, inner) => `<div class="slot" style="left:${(x + B + w / 2 - L / 2).toFixed(2)}mm;top:${(y + B + h / 2 - D / 2).toFixed(2)}mm;width:${L}mm;height:${D}mm;transform:rotate(${rot}deg)">${inner}</div>`;
  return `<div class="sheet">
    <div class="slot" style="left:${o0 + B}mm;top:${o0 + B}mm;width:${L}mm;height:${L}mm">${centre}</div>
    ${at(o0, o0 + L, L, D, 0, sides.front)}
    ${at(o0, TURN, L, D, 180, sides.back)}
    ${at(TURN, o0, D, L, 90, sides.left)}
    ${at(o0 + L, o0, D, L, -90, sides.right)}</div>`;
}

export async function build(lang, dir, { png }) {
  const w = W[lang], B = BLEED;
  const lidSize = LID.L + 2 * (LID.D + TURN) + 2 * B, baseSize = BASE.L + 2 * (BASE.D + TURN) + 2 * B;
  const lid = wrap(LID, S.top(lang, w), { front: S.a(lang), back: S.c(lang), left: S.d(lang, w), right: S.b(lang, w) });
  const plain = `<div class="base-side" style="position:absolute;inset:0">${icon("nb-bloom", C.gilt)}<span>NETHERBLOOM</span>${icon("nb-bloom", C.gilt)}</div>`;
  const scale = (BASE.L * PX / 820).toFixed(4);
  const base = wrap(BASE, `<div style="position:absolute;inset:0;overflow:hidden">${boxBack(lang, w).replace('<div class="bb">', `<div class="bb" style="transform:scale(${scale})">`)}</div>`,
    { front: plain, back: plain, left: plain, right: plain });
  const one = (title, size, html, name) => render(join(dir, name), doc({ lang, title, w: size, h: size, css: CSS, pages: [{ name, html }] }), { w: size, h: size, png });
  await one("Box lid wrap", lidSize, lid, "box-lid-wrap");
  await one("Box lid die line", lidSize, wrap(LID, "", {}, true), "box-lid-dieline");
  await one("Box base wrap", baseSize, base, "box-base-wrap");
  await one("Box base die line", baseSize, wrap(BASE, "", {}, true), "box-base-dieline");
  await one("Inside the lid", LID.L + 2 * B, `<div class="slot" style="inset:0;width:100%;height:100%">${S.ilid(lang, w)}</div>`, "box-lid-liner");
  await one("Floor of the base", BASE.L + 2 * B, `<div class="slot" style="inset:0;width:100%;height:100%">${S.ibase(lang, w)}</div>`, "box-base-liner");
}
