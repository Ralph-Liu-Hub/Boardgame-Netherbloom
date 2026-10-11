// The searchable Rulebook and the Player Aid sheet. Card and Mist tables are built from cards.js,
// so the reference always matches the cards the engine plays.
import {
  CARDS, TAG_NAMES, TAG_ICONS, MANTLES, SOULS, FIRST_SOUL, LANTERN, MIST, HARSH, MIST_TEXT, opsText, GHOST,
} from "./cards.js";

import { zh } from "./i18n.js";
import { RULEBOOK_ZH, playerAidZh } from "./rules_zh.js";

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const ico = (id, color) => `<svg class="ri" style="color:${color}" aria-hidden="true"><use href="#${id}"/></svg>`;
const TAGCOL = ["#D7263D", "#E6D3A3", "#8FD6E1"];

// One row per distinct card (name + thread + effect), with how many copies are in the core box.
function cardTable() {
  const seen = new Map();
  for (const c of CARDS) {
    const key = `${c.name}|${c.tag}|${JSON.stringify(c.eff)}`;
    if (!seen.has(key)) seen.set(key, { c, n: 0, packs: new Set() });
    const row = seen.get(key);
    row.n += 1;
    row.packs.add(c.id[0] === "C" ? "Core" : c.id[0] === "E" ? "Echo" : "Soul");
  }
  const rows = [...seen.values()].filter(r => r.packs.has("Core") || r.packs.has("Echo") || r.c.key);
  rows.sort((a, b) => a.c.tag - b.c.tag || a.c.name.localeCompare(b.c.name));
  return `<table class="rtable"><thead><tr><th>Card</th><th>Face up</th><th>Resonance</th></tr></thead><tbody>${rows.map(({ c }) =>
    `<tr><td>${ico(TAG_ICONS[c.tag], TAGCOL[c.tag])}<b>${esc(c.name === "Echo" ? "Echo card" : c.name)}</b>${c.name === "Echo" ? ' <span class="rkey" style="color:var(--cyan)">Open Crossing</span>' : ""}${c.key ? ' <span class="rkey">Key Memory</span>' : ""}</td><td>${esc(opsText(c.eff))}</td><td>${c.rr ? "Instead: " : ""}${esc(opsText(c.res))}</td></tr>`).join("")}</tbody></table>`;
}

function mistTable() {
  const names = new Map();
  MIST.forEach((deck, r) => deck.forEach(([n]) => { if (!names.has(n)) names.set(n, new Set()); names.get(n).add(["I", "II", "III"][r]); }));
  const rows = [...names.entries()].map(([n, reaches]) => `<tr><td><b>${esc(n)}</b></td><td>${[...reaches].join(", ")}</td><td>${esc(MIST_TEXT[n] || "")}</td></tr>`).join("");
  const harsh = HARSH.map(([n]) => `<tr><td><b>${esc(n)}</b></td><td>Harsh</td><td>${esc(MIST_TEXT[n] || "")}</td></tr>`).join("");
  return `<table class="rtable"><thead><tr><th>Mist card</th><th>Reach</th><th>What happens</th></tr></thead><tbody>${rows}${harsh}</tbody></table>`;
}

function lanternTable() {
  return `<table class="rtable"><thead><tr><th>Lantern</th><th>Black Water supply</th><th>Faded at</th><th>Harsh Mist per Reach</th></tr></thead><tbody>${
    Object.entries(LANTERN).map(([l, [bw, lim, h]]) => `<tr><td>${"◆".repeat(+l)}${"◇".repeat(5 - l)} ${l}</td><td>${bw}</td><td>${lim} forgotten</td><td>${h}</td></tr>`).join("")}</tbody></table>`;
}

function ghostTable() {
  const what = { root_far: "Roots on the furthest open bank", root_near: "Roots on the nearest open bank", bloom_near: "Blooms the nearest Root",
    bloom_far: "Blooms the furthest Root", banish_forget: "Banishes the nearest Grievance, or drains Black Water", none: "Does nothing" };
  const count = {};
  GHOST.forEach(([t, a]) => { const k = `${t}|${a}`; count[k] = (count[k] || 0) + 1; });
  return `<table class="rtable"><thead><tr><th>Ghost card</th><th>×</th><th>Action</th></tr></thead><tbody>${Object.entries(count).map(([k, n]) => {
    const [t, a] = k.split("|");
    return `<tr><td>${ico(TAG_ICONS[t], TAGCOL[t])}${TAG_NAMES[t]}</td><td>${n}</td><td>${what[a]}</td></tr>`;
  }).join("")}</tbody></table>`;
}

// Each section: id, title, keywords (extra search terms) and body HTML.
export const RULEBOOK = [
  { id: "overview", title: "1. The crossing", body: `
    <p>A soul has woken on the near shore of the river of forgetting. Together you grow a path of spider lilies, the <b>Netherbloom</b>, for it to follow to the <b>Far Shore</b> at space 12. Along the way you choose which of its memories to keep and which to let the river take.</p>
    <p>Netherbloom is a <b>silent co-operative</b> game for 1 to 4 players. You all win or lose together. You may never tell another player what is in your hand or what you plan to do. The cards you play, and the Echo they leave behind, are your only voice.</p>` },
  { id: "board", title: "2. The river", keys: "spaces reach bank slot near shore far shore", body: `
    <p>The river has 13 spaces: the near shore (0), spaces 1 to 11, and the Far Shore (12). Each space from 1 to 11 has an <b>upper</b> and a <b>lower bank</b>, and each bank holds one token.</p>
    <ul><li><b>Reach I, the Asphodel Road</b>: spaces 1–4.</li><li><b>Reach II, the Fields of Mourning</b>: spaces 5–8.</li><li><b>Reach III, the Banks of Lethe</b>: spaces 9–11.</li></ul>
    <p>Each Reach has its own Mist deck and its own page in the Book of Remembrance. When the soul enters a new Reach, the Loom of the Fates is cleared.</p>
    <p>At setup both banks of space 1 hold a Bloom, so the first step is always lit. The banks of spaces 2–11 are hidden under <b>fog</b> tiles.</p>` },
  { id: "tokens", title: "3. Roots, Blooms and the network", keys: "root bloom lit network touch place", body: `
    <p>${ico("nb-root", "#E6D3A3")} A <b>Root</b> is a seed in the dark. ${ico("nb-bloom", "#D7263D")} A <b>Bloom</b> is a Root that has opened into a spider lily.</p>
    <p>A space is <b>Lit</b> when at least one of its banks holds a Bloom. The soul only steps onto a Lit space.</p>
    <p><b>Placing a Root.</b> A Root goes on an empty bank at or ahead of the soul that <b>touches the network</b>:</p>
    <ul><li>it is on the soul's own space or the next one, or</li><li>the opposite bank of the same space holds a token, or</li><li>the same bank of the space before or after holds a token.</li></ul>
    <p><b>Blooming</b> turns one of your Roots, at or ahead of the soul, into a Bloom.</p>` },
  { id: "fog", title: "4. Fog and tiles", keys: "fertile stony memory site grave reveal keepsake", body: `
    <p>${ico("nb-fog", "#9A948C")} Fog hides each bank. Placing a Root on fog reveals the tile beneath, and the tile decides what happens:</p>
    <ul>
      <li><b>Fertile</b>: the Root takes.</li>
      <li>${ico("nb-stony", "#9A948C")} <b>Stony</b>: an ordinary Root will not take, and the Root is lost. Stubborn Roots and the Root-Weaver can grow here.</li>
      <li>${ico("nb-memorysite", "#E6D3A3")} <b>Memory Site</b>: the Root takes and you find a keepsake. In the Open Crossing it also gives +2 Light.</li>
      <li>${ico("nb-grave", "#8FD6E1")} <b>Grave</b>: no Root grows, and a Grievance rises on that bank.</li>
    </ul>
    <p>Reach I has 3 Fertile, 1 Stony and 2 Memory Site tiles. Reach II has 3 Fertile, 2 Stony, 2 Memory Site and 1 Grave. Reach III has 2 Fertile, 1 Stony, 2 Memory Site and 1 Grave. The Mist can roll fog back over empty revealed ground.</p>` },
  { id: "turn", title: "5. Your turn", keys: "turn order sequence summon play draw", body: `
    <ol class="steps">
      <li><b>Summon a Mantle</b> (optional, before your first card).</li>
      <li><b>Play your first card</b>: face up, face down or Burned.</li>
      <li><b>Play your second card.</b></li>
      <li><b>Bloom-Bringer</b>: if you hold this Mantle, Bloom one Root for free.</li>
      <li><b>Soul Step</b>: the soul moves or Lingers.</li>
      <li><b>The Mist</b>: turn the top card of the current Reach's Mist deck.</li>
      <li><b>The river settles</b>: roots drink the flood, and trapped Grievances dissolve.</li>
      <li><b>Draw</b> back up to your hand size. In solo play, the Ghost now takes its turn.</li>
    </ol>
    <p>Hand size is 4 in solo play and 3 with 2–4 players.</p>` },
  { id: "modes", title: "6. Three ways to play a card", keys: "face up face down burn mode", body: `
    <ul>
      <li><b>Face up</b>: do the card's effect, tie one knot on its thread in the Loom, and the card's thread becomes the new <b>Echo</b>. Obsession and Acceptance cards go to the discard pile. <b>Oblivion</b> cards are <b>forgotten</b> after use.</li>
      <li><b>Face down</b>: place 1 Root. No knot is tied and the Echo does not change. The card is discarded.</li>
      <li><b>Burn</b>: do the effect <b>twice</b> and tie a knot. Then the card is forgotten, along with the top card of the deck.</li>
    </ul>` },
  { id: "echo", title: "7. The Echo and Resonance", keys: "echo resonance resonate thread silent signal", body: `
    <p>${ico("nb-echo", "#8FD6E1")} The <b>Echo</b> is the thread of the last card played face up, by anyone. It is how silent players talk.</p>
    <p>If the <b>first</b> card you play on your turn is on the Echo's thread, it <b>Resonates</b>. Do its Resonance effect as well; some Oblivion cards do their Resonance <i>instead</i>. A Resonating card that carries a memory may be <b>inscribed</b> in the Book of Remembrance.</p>
    <p>Leaving an Echo the next player can safely follow is the heart of the game.</p>` },
  { id: "loom", title: "8. The Loom of the Fates and Backlash", keys: "loom knot thread backlash grasping resignation tide karma", body: `
    <p>The Loom has three threads: ${ico(TAG_ICONS[0], TAGCOL[0])}<b>Obsession</b>, ${ico(TAG_ICONS[1], TAGCOL[1])}<b>Acceptance</b> and ${ico(TAG_ICONS[2], TAGCOL[2])}<b>Oblivion</b>. Every card played face up or Burned ties a knot on its thread. A thread holds 4 knots with 2–3 players and 5 in solo play or with 4 players.</p>
    <p>When a thread fills, it snaps in a <b>Backlash</b> and empties:</p>
    <ul>
      <li><b>Obsession, Grasping</b>: a Grievance appears beside the soul.</li>
      <li><b>Acceptance, Resignation</b>: at the next Soul Step the soul sits down and Lingers, forgetting a card.</li>
      <li><b>Oblivion, the Tide Rises</b>: Black Water floods the space ahead.</li>
    </ul>
    <p>The Loom clears whenever the soul enters a new Reach.</p>` },
  { id: "soulstep", title: "9. The Soul Step", keys: "move linger light as ash adrift forget hold", body: `
    <p>After your cards the soul tries to step forward. If the next space is <b>Lit and not flooded</b>, it moves there. It gains 1 Light for each Bloom it leaves behind, and the space it left is cleared.</p>
    <p>Otherwise it <b>Lingers</b>. Beside its own light (its own space is Lit) it simply waits. In the dark it forgets the top card of the deck. <i>Hold Fast</i> and the Spirit Warden stop a Linger.</p>
    <p><b>Light as Ash.</b> Once 6 cards are forgotten, the soul glides one extra space whenever it can.</p>
    <p><b>Adrift.</b> Once 9 cards are forgotten and the soul moves, it drifts one more space even into the dark, and suffers a Fracture.</p>
    <p>If a Grievance sits beside the soul after the step, it feeds: <b>1 Fracture</b>.</p>` },
  { id: "threats", title: "10. Black Water, Grievances and Fractures", keys: "black water flood drink deluge grievance feed fracture shield trapped", body: `
    <p>${ico("nb-blackwater", "#9A948C")} <b>Black Water</b> floods a whole space. The soul cannot step onto it, and Blooms on it wither to Roots. When both banks of a flooded space hold a Root or Bloom at the end of a turn, the roots <b>drink the flood</b> and it drains. Drained water leaves the game, so the supply only shrinks. If water must rise and the supply is empty: <b>Deluge</b>.</p>
    <p>${ico("nb-grievance", "#8FD6E1")} A <b>Grievance</b> takes a bank and blocks it. One beside the soul feeds on it each Soul Step. A Grievance with a Bloom on the same bank both before and after it is <b>trapped in light</b> and dissolves at the end of the turn.</p>
    <p>${ico("nb-fracture", "#D7263D")} <b>Fractures</b> come from feeding Grievances, Adrift, and the Dark Wind. At 3 the soul is <b>Shattered</b>. <i>Hold the Line</i> raises a Shield that stops the next Fracture.</p>` },
  { id: "book", title: "11. The Book of Remembrance", keys: "inscribe page chapter blessing key memory keepsake slot place person deed feeling", body: `
    <p>The Book has one page per Reach. Each page has four slots, <b>Place</b>, <b>Person</b>, <b>Deed</b> and <b>Feeling</b>, which fill a sentence about the soul's life.</p>
    <p>You may <b>inscribe</b> a card when it Resonates, if its memory's slot is still empty on the current page. A <b>Key Memory</b> card may be inscribed whenever it is played face up. An inscribed card leaves the deck for good.</p>
    <p><b>Chapter Blessing.</b> When a page holds 3 memories (2 for the Garland Girl), the river grants the first of these that applies: mend a Fracture, drain Black Water, or return a forgotten card.</p>
    <p>At the end, the Book is read aloud. Slots never filled read "…but this, the river has taken".</p>` },
  { id: "mantles", title: "12. Mantles and Light", keys: "mantle summon light weaver warden bringer breaker", body: `
    <p>Before your first card you may <b>summon</b> a free Mantle: pay Light (3, or 2 for the King) and discard a card of the Mantle's thread. Each player holds at most one Mantle.</p>
    <ul>${Object.values(MANTLES).map(m => `<li>${ico(TAG_ICONS[m.tag], TAGCOL[m.tag])}<b>${esc(m.name)}</b>: ${esc(m.text)}</li>`).join("")}</ul>` },
  { id: "souls", title: "13. The Souls", keys: "child king garland bride open crossing twist first game new players suggested", body: `
    <ul>${Object.values(SOULS).map(s => `<li><b>${esc(s.name)}</b>: ${esc(s.twist)}</li>`).join("")}</ul>
    <p>Each named Soul adds its own 8-card pack, including one <b>Key Memory</b>. The Open Crossing adds the 8 Echo cards instead.</p>
    <p class="rsuggest">${ico("nb-light", "#E6D3A3")}<b>Your first crossing:</b> we suggest <b>${esc(SOULS[FIRST_SOUL].name)}</b> at Lantern 1 or 2. Its twists let a new table learn the river, the Loom and the Book before meeting the other Souls.</p>` },
  { id: "mist", title: "14. The Mist", keys: "mist harsh card deck rising water withering cold wind fog returns severed", body: `
    <p>At the end of every turn the top card of the current Reach's Mist deck is turned. Each deck also holds 2 extra cards (Rising Water and Grievance Drawn Near) and, at higher Lanterns, some <b>harsh</b> cards.</p>${mistTable()}` },
  { id: "lantern", title: "15. Lantern levels", keys: "difficulty lantern level", body: `<p>The Lantern sets the difficulty.</p>${lanternTable()}` },
  { id: "solo", title: "16. Solo play and the Ghost", keys: "solo ghost automaton", body: `
    <p>In solo play you hold 4 cards, each Loom thread holds 5 knots, and after each of your turns the <b>Ghost</b> plays the top card of its own deck. The Ghost ties a knot and sets the Echo, so plan around it.</p>${ghostTable()}` },
  { id: "end", title: "17. Winning and losing", keys: "win lose faded shattered deluge end", body: `
    <p><b>Win</b>: the soul reaches the Far Shore.</p>
    <ul><li><b>Faded</b>: the forgotten pile reaches the Lantern's limit.</li><li><b>Shattered</b>: the third Fracture.</li><li><b>Deluge</b>: Black Water must rise but the supply is empty.</li></ul>` },
  { id: "cards", title: "18. Card reference", keys: "cards reference effects", body: cardTable() },
  { id: "silence", title: "19. Playing in silence", keys: "talk communicate table talk etiquette", body: `
    <p>You may say what is public: the board, the Loom, the Book. You may not name cards in your hand, hint at them, or ask others what to play. A good Echo says more than words.</p>` },
];

// The one-page Player Aid. With a game running, it shows that game's numbers.
export const rulebook = () => (zh() ? RULEBOOK_ZH : RULEBOOK);
export function playerAid(cfg) {
  if (zh()) return playerAidZh(cfg);
  const lim = cfg ? cfg.forgottenLimit : "10–14", cap = cfg ? cfg.karmaCap : "4–5", ash = cfg ? cfg.ashAt : 6, adrift = cfg ? (cfg.adriftAt < 99 ? cfg.adriftAt : "never") : 9;
  return `
  <section class="aid">
    <h3>On your turn</h3>
    <ol class="steps">
      <li><b>Summon</b> <span>optional · pay Light, discard a matching card</span></li>
      <li><b>Card 1</b> <span>matches the Echo? It Resonates</span></li>
      <li><b>Card 2</b></li>
      <li><b>Soul Step</b> <span>Lit and dry ahead: move. Otherwise: Linger</span></li>
      <li><b>Mist</b> <span>turn one card of this Reach</span></li>
      <li><b>Settle and draw</b> <span>roots drink the flood, trapped Grievances dissolve</span></li>
    </ol>
    <h3>Play a card</h3>
    <div class="aidgrid">
      <div><b>Face up</b><span>effect + knot + new Echo</span></div>
      <div><b>Face down</b><span>1 Root only</span></div>
      <div><b>Burn</b><span>effect ×2, forget it + 1</span></div>
    </div>
    <h3>Threads (${cap} knots)</h3>
    <div class="aidgrid">
      <div class="c-obs">${ico(TAG_ICONS[0], TAGCOL[0])}<b>Obsession</b><span>Backlash: Grievance beside the soul</span></div>
      <div class="c-acc">${ico(TAG_ICONS[1], TAGCOL[1])}<b>Acceptance</b><span>Backlash: the soul Lingers</span></div>
      <div class="c-obl">${ico(TAG_ICONS[2], TAGCOL[2])}<b>Oblivion</b><span>Backlash: Black Water ahead. Played cards are forgotten</span></div>
    </div>
    <h3>Roots must touch</h3>
    <p>The soul's space or the next one, the opposite bank, or the same bank next door.</p>
    <h3>Forgetting</h3>
    <div class="aidgrid">
      <div><b>${ash}</b><span>Light as Ash: glide +1</span></div>
      <div><b>${adrift}</b><span>Adrift: drift into the dark, +1 Fracture</span></div>
      <div><b>${lim}</b><span>Faded: the game is lost</span></div>
    </div>
    <h3>Lose if</h3>
    <p><b>Faded</b> (${lim} forgotten) · <b>Shattered</b> (3 Fractures) · <b>Deluge</b> (water must rise, none left)</p>
    <h3>Icons</h3>
    <div class="aidicons">
      <span>${ico("nb-bloom", "#D7263D")}Bloom</span><span>${ico("nb-root", "#E6D3A3")}Root</span><span>${ico("nb-grievance", "#8FD6E1")}Grievance</span>
      <span>${ico("nb-blackwater", "#9A948C")}Black Water</span><span>${ico("nb-fog", "#9A948C")}Fog</span><span>${ico("nb-stony", "#9A948C")}Stony</span>
      <span>${ico("nb-memorysite", "#E6D3A3")}Memory Site</span><span>${ico("nb-grave", "#8FD6E1")}Grave</span><span>${ico("nb-fracture", "#D7263D")}Fracture</span>
      <span>${ico("nb-light", "#E6D3A3")}Light</span><span>${ico("nb-echo", "#8FD6E1")}Echo</span><span>${ico("nb-seal", "#E6D3A3")}Blessing</span>
    </div>
  </section>`;
}
