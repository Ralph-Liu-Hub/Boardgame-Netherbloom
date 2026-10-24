// The Rulebook's Setup picture: the whole game laid out on a table, seen from above, with numbered markers that
// match the numbered setup steps. Drawn as one SVG from the painted art, like the box back.
// src(name) gives a painting's URL; zh says which language the small captions use.
const NUM = (n, x, y) => `<g class="sf-n" transform="translate(${x},${y})"><circle r="13"/><text y="4.5" text-anchor="middle">${n}</text></g>`;
const use = (id, x, y, s, col, op = 1) => `<use href="#${id}" x="${x - s / 2}" y="${y - s / 2}" width="${s}" height="${s}" style="color:${col}" opacity="${op}"/>`;
const chip = (id, x, y, col, r = 15) => `<g><circle cx="${x}" cy="${y}" r="${r}" fill="#17141b" stroke="#8a6d48" stroke-width="1.4"/>${use(id, x, y, r * 1.25, col)}</g>`;

export function setupFigure(src, zh = false) {
  const T = (en, z) => (zh ? z : en);
  const img = (name, x, y, w, h, extra = "") => `<image href="${src(name)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" ${extra}/>`;
  const card = (name, x, y, w, h, rot = 0, stroke = "#8a6d48") =>
    `<g transform="rotate(${rot} ${x + w / 2} ${y + h / 2})"><rect x="${x - 1.5}" y="${y - 1.5}" width="${w + 3}" height="${h + 3}" rx="5" fill="#0e0c11" stroke="${stroke}" stroke-width="1.2"/>
      <clipPath id="sfc${x}${y}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/></clipPath>${img(name, x, y, w, h, `clip-path="url(#sfc${x}${y})"`)}</g>`;
  const stack = (name, x, y, w, h, n = 3) => Array.from({ length: n }, (_, i) => card(name, x + i * 2, y - i * 2, w, h)).join("");
  const slot = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="rgba(14,12,17,.35)" stroke="#8a6d48" stroke-dasharray="4 3" stroke-width="1.1"/>`;
  const cap = (x, y, text, anchor = "middle") => `<text class="sf-cap" x="${x}" y="${y}" text-anchor="${anchor}">${text}</text>`;

  // The river board: three panels joined, banks and water, bank tiles fog side up in the wells of spaces 2-11.
  const BX = 40, BY = 196, BW = 920, BH = 236, X = sp => BX + 38 + sp * 70.3, RY = BY + BH / 2;
  let board = `<g class="sf-board"><rect x="${BX - 4}" y="${BY - 4}" width="${BW + 8}" height="${BH + 8}" rx="6" fill="#0b0a0d"/>
    <clipPath id="sfboard"><rect x="${BX}" y="${BY}" width="${BW}" height="${BH}" rx="4"/></clipPath>
    <g clip-path="url(#sfboard)">${img("tex-bank", BX, BY, BW, BH, 'opacity=".85"')}<rect x="${BX}" y="${BY}" width="${BW}" height="${BH}" fill="#0f0d11" opacity=".35"/>
      ${img("tex-water", BX, RY - 34, BW, 68, 'opacity=".95"')}<rect x="${BX}" y="${RY - 34}" width="${BW}" height="68" fill="url(#sfwater)"/>
      <rect x="${X(11.6)}" y="${BY}" width="${BW}" height="${BH}" fill="#1a0b10" opacity=".85"/>
      <rect x="${BX}" y="${BY}" width="${X(0.45) - BX}" height="${BH}" fill="#0a090c" opacity=".8"/></g>
    ${[1, 2].map(i => `<line x1="${BX + BW * i / 3}" y1="${BY}" x2="${BX + BW * i / 3}" y2="${BY + BH}" stroke="#000" stroke-width="2" opacity=".7"/>`).join("")}`;
  for (let sp = 1; sp <= 11; sp++) {
    for (const top of [true, false]) {
      const y = top ? BY + 10 : BY + BH - 10 - 58;
      board += `<rect x="${X(sp) - 22}" y="${y - 2}" width="44" height="62" rx="4" fill="#0b0a0d" fill-opacity=".7" stroke="#8a6d48" stroke-width=".9"/>`;
      if (sp === 1) board += `<circle cx="${X(sp)}" cy="${y + 29}" r="17" fill="rgba(20,6,10,.85)" stroke="#E6D3A3" stroke-width="1"/>${use("nb-bloom", X(sp), y + 29, 28, "#D7263D")}`;
      else board += `<clipPath id="sfw${sp}${top}"><rect x="${X(sp) - 20}" y="${y}" width="40" height="58" rx="3"/></clipPath>${img("card-fog", X(sp) - 20, y, 40, 58, `clip-path="url(#sfw${sp}${top})" opacity=".8"`)}`;
    }
    board += `<text class="sf-sp" x="${X(sp)}" y="${RY + 4}" text-anchor="middle">${sp}</text>`;
  }
  board += `<circle cx="${X(0)}" cy="${RY}" r="17" fill="#0e0c11" stroke="#E6D3A3" stroke-width="1.6"/>${use("nb-soul", X(0), RY, 22, "#EFE7D6")}
    ${use("nb-light", X(12), RY, 26, "#E6D3A3")}
    ${["I", "II", "III"].map((r, i) => cap(BX + BW * (i + .5) / 3, BY - 8, zh ? `第${["一", "二", "三"][i]}河段` : `Reach ${r}`)).join("")}</g>`;

  // The players' corner: a hand, a Push Through token and the Oar; the Ghost's deck in solo play.
  const fan = [-12, 0, 12].map((r, i) => card("back-memory", 530 + i * 26, 488 + Math.abs(r) / 2, 44, 64, r)).join("");

  const svg = `<svg class="sf-svg" viewBox="0 0 1000 660" role="img" aria-label="${T("The game set up on a table", "擺好的遊戲")}">
    <defs><linearGradient id="sfwater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d5a62" stop-opacity=".5"/><stop offset=".5" stop-color="#16343b" stop-opacity="0"/><stop offset="1" stop-color="#2d5a62" stop-opacity=".5"/></linearGradient>
      <radialGradient id="sfwood" cx=".55" cy=".55" r=".75"><stop offset="0" stop-color="#3a281c"/><stop offset="1" stop-color="#140e0b"/></radialGradient></defs>
    <rect width="1000" height="660" rx="14" fill="url(#sfwood)"/>
    <rect width="1000" height="660" rx="14" fill="none" stroke="#000" stroke-opacity=".4" stroke-width="6"/>
    ${stack("back-mist", 40, 40, 58, 86)}${stack("back-mist", 112, 40, 58, 86)}${stack("back-mist", 184, 40, 58, 86)}
    ${cap(71, 150, "I")}${cap(143, 150, "II")}${cap(215, 150, "III")}${cap(143, 170, T("Mist decks", "迷霧牌庫"))}
    ${stack("back-memory", 282, 40, 60, 88)}${slot(356, 38, 60, 88)}${slot(428, 38, 60, 88)}
    ${use("nb-fog", 458, 82, 26, "#9A948C", .7)}
    ${cap(314, 150, T("Deck", "牌庫"))}${cap(386, 150, T("Discard", "棄牌堆"))}${cap(458, 150, T("Forgotten", "遺忘堆"))}
    ${card("soul-child", 516, 34, 66, 92, 0, "#E6D3A3")}
    ${[0, 1, 2].map(i => `<circle cx="${602}" cy="${50 + i * 30}" r="11" fill="none" stroke="#D7263D" stroke-dasharray="3 3" stroke-opacity=".8"/>`).join("")}
    ${chip("nb-light", 630, 110, "#E6D3A3", 13)}${cap(560, 150, T("Soul card", "亡魂牌"))}
    <g transform="rotate(2 805 86)"><rect x="660" y="26" width="290" height="124" rx="4" fill="#efe5cf" stroke="#8a6a3e"/><line x1="805" y1="26" x2="805" y2="150" stroke="#c9b48a" stroke-width="2"/>
      <clipPath id="sfbook"><rect x="672" y="36" width="122" height="104"/></clipPath>${img("child-road", 672, 36, 122, 104, 'clip-path="url(#sfbook)" opacity=".85"')}
      ${[0, 1].map(r => [0, 1].map(c => `<rect x="${822 + c * 60}" y="${36 + r * 54}" width="44" height="48" rx="2" fill="none" stroke="#8a6a3e" stroke-dasharray="3 2"/>`).join("")).join("")}</g>
    ${cap(805, 170, T("Book of Remembrance", "憶念之書"))}
    ${board}
    ${["weaver", "warden", "bringer", "breaker"].map((m, i) => card(`card-mantle-${m}`, 40 + (i % 2) * 96, 462 + Math.floor(i / 2) * 76, 86, 64)).join("")}
    ${cap(131, 625, T("Mantles", "稱號"))}
    <g>${[["nb-obsession", "#D7263D"], ["nb-acceptance", "#E6D3A3"], ["nb-oblivion", "#8FD6E1"]].map(([id, col], r) =>
      `<line x1="262" y1="${482 + r * 40}" x2="470" y2="${482 + r * 40}" stroke="${col}" stroke-opacity=".5" stroke-width="2"/>${use(id, 262, 482 + r * 40, 26, col)}
       ${[0, 1, 2, 3, 4].map(k => `<circle cx="${300 + k * 34}" cy="${482 + r * 40}" r="11" fill="#17141b" stroke="${col}" stroke-opacity=".7" stroke-dasharray="${k ? "3 3" : "0"}"/>${k === 0 && r === 0 ? use("nb-knot", 300, 482, 16, col) : ""}`).join("")}`).join("")}
      ${chip("nb-echo", 470, 600, "#8FD6E1", 14)}</g>
    ${cap(360, 625, T("The Loom", "命運織機"))}
    ${fan}${chip("nb-tok-push", 548, 586, "#D7263D", 15)}${chip("nb-tok-oar", 588, 586, "#E6D3A3", 15)}
    ${card("back-ghost", 628, 488, 44, 64)}${cap(650, 568, T("Solo", "單人"), "middle")}
    ${cap(590, 625, T("Your hand and tokens", "你的手牌與標記"))}
    <rect x="714" y="460" width="246" height="150" rx="8" fill="rgba(14,12,17,.45)" stroke="#8a6d48" stroke-opacity=".6"/>
    ${[["nb-root", "#E6D3A3"], ["nb-bloom", "#D7263D"], ["nb-grievance", "#8FD6E1"], ["nb-blackwater", "#9A948C"],
       ["nb-light", "#E6D3A3"], ["nb-fracture", "#D7263D"], ["nb-knot", "#E6D3A3"], ["nb-tok-hold", "#8FD6E1"],
       ["nb-tok-shield", "#E6D3A3"], ["nb-tok-resign", "#E6D3A3"]].map(([id, col], i) => chip(id, 744 + (i % 5) * 46, 498 + Math.floor(i / 5) * 54, col, 16)).join("")}
    ${cap(837, 625, T("Supply", "供應區"))}
    ${NUM(1, 30, 186)}${NUM(2, X(3) + 26, BY + 16)}${NUM(3, X(0), RY - 32)}${NUM(4, 516, 30)}${NUM(5, 282, 30)}${NUM(6, 40, 30)}
    ${NUM(7, 250, 456)}${NUM(8, 30, 456)}${NUM(9, 660, 20)}${NUM(10, 714, 454)}${NUM(11, 520, 470)}
  </svg>`;
  return `<figure class="setupfig-in">${svg}</figure>`;
}
