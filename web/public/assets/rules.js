// The searchable Rulebook and the Player Aid sheet. Card and Mist tables are built from cards.js,
// so the reference always matches the cards the engine plays.
import {
  CARDS, TAG_NAMES, TAG_ICONS, MANTLES, SOULS, FIRST_SOUL, LANTERN, LANTERN_NAMES, lanternIcon, limitRange, MIST, MIST_EXTRA, HARSH, opsText, GHOST, TILES, PAIR_SLOTS, PAIR_REWARDS, CHAPTER_AT,
} from "./cards.js";
// Forgotten counts at which the soul turns Light as Ash and Adrift (engine makeConfig).
const CFG = { ashAt: 6, adriftAt: 9 };

import { zh } from "./i18n.js";
import { RULEBOOK_ZH, playerAidZh } from "./rules_zh.js";
import { T as FACE_WORDS } from "./cardface.js";
import { iconize } from "./ruleicons.js";

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
  // the instructions exactly as printed on the Mist cards
  const ops = new Map();
  MIST.forEach((deck, r) => deck.forEach(([n, o]) => { if (!names.has(n)) { names.set(n, new Set()); ops.set(n, o); } names.get(n).add(["I", "II", "III"][r]); }));
  const rows = [...names.entries()].map(([n, reaches]) => `<tr><td><b>${esc(n)}</b></td><td>${[...reaches].join(", ")}</td><td>${esc(FACE_WORDS.en.mistJoin(ops.get(n)))}</td></tr>`).join("");
  const harsh = HARSH.map(([n, o]) => `<tr><td><b>${esc(n)}</b></td><td>Harsh</td><td>${esc(FACE_WORDS.en.mistJoin(o))}</td></tr>`).join("");
  return `<table class="rtable"><thead><tr><th>Mist card</th><th>Reach</th><th>Instructions</th></tr></thead><tbody>${rows}${harsh}</tbody></table>`;
}

// The page rewards: one row per page, one column per pair of neighbouring slots.
function pairTable() {
  const pages = ["I · Who I Was", "II · What I Did", "III · What I Carry"];
  return `<table class="rtable"><thead><tr><th>Page</th>${PAIR_SLOTS.map(([a, b]) => `<th>${a} + ${b}</th>`).join("")}</tr></thead><tbody>${
    PAIR_REWARDS.map((row, r) => `<tr><td><b>${pages[r]}</b></td>${row.map(ops => `<td>${esc(opsText(ops))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function lanternTable() {
  return `<table class="rtable"><thead><tr><th>Lantern</th><th>Black Water supply</th><th>Faded at</th><th>Harsh Mist per Reach</th></tr></thead><tbody>${
    Object.entries(LANTERN).map(([l, [bw, lim, h]]) => `<tr><td>${lanternIcon(l)} ${LANTERN_NAMES[l]}</td><td>${bw}</td><td>${lim} forgotten</td><td>${h}</td></tr>`).join("")}</tbody></table>`;
}

function ghostTable() {
  const what = { root_far: "Roots on the furthest open bank", root_near: "Roots on the nearest open bank", bloom_near: "Blooms the nearest Root",
    bloom_far: "Blooms the furthest Root", banish_forget: "Banishes the nearest Shade, or drains Black Water", none: "Does nothing" };
  const count = {};
  GHOST.forEach(([t, a]) => { const k = `${t}|${a}`; count[k] = (count[k] || 0) + 1; });
  return `<table class="rtable"><thead><tr><th>Ghost card</th><th>×</th><th>Action</th></tr></thead><tbody>${Object.entries(count).map(([k, n]) => {
    const [t, a] = k.split("|");
    return `<tr><td>${ico(TAG_ICONS[t], TAGCOL[t])}${TAG_NAMES[t]}</td><td>${n}</td><td>${what[a]}</td></tr>`;
  }).join("")}</tbody></table>`;
}

// A short in-world line that opens a rules section.
// A picture for the section, drawn by rulefigs.js where the Rulebook is shown.
const fig = id => `<div class="rfig" data-fig="${id}"></div>`;
const lore = text => `<p class="lore">${text}</p>`;
// A rules keyword, in the same style as on the cards.
const kw = w => `<span class="kw">${w}</span>`;
// One row of Appendix B: the words on the card, then what you do.
const term = (words, todo) => `<tr><td>${words}</td><td>${todo}</td></tr>`;
// The three ways to lose, boxed at the start of the turn rules.
const LOSE = `<div class="rsuggest rlose"><p><b>You lose at once if:</b></p><ul>
      <li><b>Faded</b>: the forgotten pile reaches your Lantern's ✕ on the Ledger.</li>
      <li><b>Shattered</b>: the soul takes its 3rd Fracture (the last Fracture well on the Ledger).</li>
      <li><b>Deluge</b>: you must place Black Water and the Ledger's Black Water well is empty.</li></ul>
    <p><b>You win</b> when the soul reaches the Far Shore (space 12).</p></div>`;
// Cards in the box.
const MEMORY_N = CARDS.length, MIST_N = MIST.reduce((n, d) => n + d.length + MIST_EXTRA.length, 0) + HARSH.length;
// One row of "The world on your table": icon, piece, what it is in the story, what it does in play.
const piece = (icon, color, name, story, play) =>
  `<tr><td>${icon ? ico(icon, color) : ""}<b>${name}</b></td><td>${story}</td><td>${play}</td></tr>`;

// Each section: id, title, keywords (extra search terms) and body HTML. Story first, then setup, the turn and its end,
// then the details, then the appendices. Story prose appears only in section 1 and the Soul stories.
const BOOK = [
  { id: "story", title: "1. The story and the goal", keys: "story lore setting world lethe ferryman ferrymen servant underworld coin prologue theme who are we role goal mission objective win lose faded shattered deluge silence talk communicate table talk", body: `
    ${lore("Whoever drinks from the River Lethe forgets.")}
    <p class="story">Below the world of the living runs a black river. The dead must cross it to reach the <b>Far Shore</b>, where a veiled <b>Keeper</b> waits with one cup of river water. Drink it, and the weight of a whole life slips away.</p>
    <p class="story">An old ferryman carries the dead across, but only those who were buried with a coin for the fare. The others, the <b>coinless dead</b>, wake alone on the <b>near shore</b> and wander the bank. Fog fills them, and they begin to forget: first the small things, then the faces, then their own names. A soul that forgets everything simply fades into the mist.</p>
    <p class="story">You are the <b>Ferrymen</b>: servants of the underworld, neither living nor dead. The coinless the old ferryman will not carry are given to you. You have no boat. You have something stranger. Along the banks of Lethe grows the <b>Netherbloom</b>, a crimson flower of long, curling petals, blooming on a bare stalk with no leaves, because <i>flower and leaf never meet</i>. Its glow is the only light in the fog that a lost soul can follow. Where you plant Netherblooms, a soul can walk in the river toward the Far Shore.</p>
    <p class="story">One more thing: the servants of the river are bound to silence. No Ferryman may speak on the water, not to the dead and not to one another. Whatever you mean to say to each other, you must say with the flowers you plant and the choices you make.</p>
    <h4>The goal</h4>
    <p>Netherbloom is a co-operative game for 1 to 4 players and lasts about 15 turns. One soul starts on the near shore (space 0). All players win or lose together.</p>
    <p><b>You win</b> when the soul token reaches the Far Shore (space 12). The soul only moves onto spaces with a Bloom, so you place Roots ahead of it and turn them into Blooms. Along the way, some cards can be inscribed in the Book of Remembrance (section 9); the Book does not decide whether you win, but it decides how the story ends.</p>
    <p><b>You lose</b> at once if any of these happens:</p>
    <ul>
      <li><b>Faded</b>: the forgotten pile reaches the Lantern's limit (section 10).</li>
      <li><b>Shattered</b>: the soul has 3 Fractures.</li>
      <li><b>Deluge</b>: you must place a Black Water token but none is left in the supply.</li>
    </ul>
    <p>Forgetting cards helps and hurts. Many strong cards put cards on the forgotten pile, and with 6 or more forgotten cards the soul moves faster (section 4). But each forgotten card brings you closer to Faded.</p>
    <h4>The Rule of Silence</h4>
    <p>From setup until the game ends, players do not talk about the game. Do not name, show or hint at the cards in your hand, point at the board to suggest a move, or ask others what to play. You may talk about what everyone can already see: the board, the Loom and the Book.</p>
    <p>Players communicate through the <b>Echo</b> (section 3). Playing a card on the Echo's thread shows you understood the last player; leaving the Echo on a thread tells the next player which kind of card you hope they can play. When the game ends, the silence ends, and one player reads the Book aloud.</p>` },

  { id: "setup", title: "2. Setting up", keys: "setup set up prepare start begin layout table where put deal shuffle bank cards mist decks supply first player oar", body: `
    <p>The picture shows the table set up for the Child of the Last Flame. Its numbers match the steps below. Appendix A shows every component.</p>
    <div class="setupfig" aria-hidden="false"></div>
    <ol class="steps setuplist">
      <li><b>The river board.</b> Join the three panels in order: Reach I on the left (with the near shore) and Reach III on the right (ending at the Far Shore).</li>
      <li><b>Bank cards.</b> Sort the bank cards by the Reach number on their fog side: ${TILES.map(t => t[1].length).join(", ")} cards for Reaches I, II and III. Shuffle each Reach's cards separately and place them fog side up on the banks of spaces 2–4, 5–8 and 9–11. Do not look at the other side.</li>
      <li><b>The first Blooms and the soul.</b> Space 1 has no bank cards: put a disc Bloom side up on both of its banks. Put the soul token on the near shore (space 0).</li>
      <li><b>The Soul and the Lantern.</b> Choose a Soul and a Lantern (section 10). Put the Soul card face up next to the board. The Child of the Last Flame starts with <b>3 Light</b>; every other Soul starts with 0.</li>
      <li><b>The Memory deck.</b> Shuffle the 32 core Memory cards with the Soul's 8-card pack (the 8 Echo cards for the Open Crossing) and put the deck face down. Leave room next to it for the <b>discard pile</b> (face up).</li>
      <li><b>The Mist decks.</b> Build one deck for each Reach: its ${MIST[0].length} basic Mist cards, plus one <i>Rising Water</i> and one <i>Shade Drawn Near</i>, plus the Lantern's number of harsh Mist cards chosen at random (none at Gentle). Shuffle each deck and put it face down next to its Reach.</li>
      <li><b>The Loom of the Fates.</b> Put the Loom board out with its three threads, Obsession, Acceptance and Oblivion, and put the knots next to it. A thread is full at 4 knots with 2–3 players, and at 5 in solo play or with 4 players. Keep the Echo token next to the Loom: it goes onto a thread when the first card is played face up or Burned.</li>
      <li><b>The Mantles.</b> Put the four Mantle cards face up where everyone can reach them.</li>
      <li><b>The Book of Remembrance.</b> Open the chosen Soul's Book at page I, with the photo corners ready.</li>
      <li><b>The Ledger and the supply.</b> Put the Ledger board next to the Loom: forgotten cards go on its numbered track, Fractures on its Fracture wells. Put only the Lantern's number of Black Water tokens (${Object.values(LANTERN).map(l => l[0]).join(", ")} for ${Object.values(LANTERN_NAMES).join(", ")}) in its Black Water well and the rest back in the box. Put the Root/Bloom discs, Shades, Light, Fractures, knots and the Hold Fast token, Shield token and Resignation token within reach.</li>
      <li><b>The Ferrymen.</b> Deal each player a hand: 4 cards in solo play, 3 with 2–4 players. Each player takes a Push Through token, face up. The first player takes the Oar. In solo play, shuffle the ${GHOST.length} Ghost cards into a face-down Ghost deck next to you.</li>
    </ol>
    <p>Then the Rule of Silence begins, and the first player takes the first turn.</p>` },

  { id: "turn", title: "3. Your turn", keys: "turn order sequence summon play draw action face up face down burn mode offer seek give gift discard push through recall echo resonance resonate thread", body: `
    ${LOSE}
    <p>Players take turns clockwise, starting with the first player, who holds the Oar. On your turn:</p>
    <ol class="steps">
      <li><b>Summon a Mantle</b> (optional, before your first action; section 8).</li>
      <li><b>The Answer</b> (your first action): play a card, Offer, Recall or Push Through.</li>
      <li><b>The Steer</b> (your second action): play a card, Offer or Push Through.</li>
      <li><b>End of turn</b>: carry out the end-of-turn steps (section 4).</li>
    </ol>
    <p>Hand size is 4 in solo play and 3 with 2–4 players.</p>
    <h4>Playing a card</h4>
    <p>Play a card from your hand in one of three ways:</p>
    <ul>
      <li><b>Face up</b>: do the card's effect, add one knot to its thread on the Loom, and move the Echo to that thread. Then put an Obsession or Acceptance card on the discard pile and an Oblivion card on the forgotten pile.</li>
      <li><b>Face down</b>: place 1 Root (section 5). Ignore the card's printed effect. No knot is added and the Echo does not move. Then put the card face up on the discard pile.</li>
      <li><b>Burn</b>: do the card's effect <b>twice</b>, add one knot to its thread, and move the Echo to that thread. Then put the card on the forgotten pile, and also forget the top card of the deck.</li>
    </ul>
    ${fig("card")}
    <h4>Offer, Recall and Push Through</h4>
    <p><b>Offer</b> (once per turn): discard a card from your hand, then draw 2 cards. Keep 1 and give the other to another player of your choice; they add it to their hand (this may take them above their hand size, so they draw fewer at the end of their turn). In solo play, put the other card on the bottom of the deck instead. No card is played, no knot is added and the Echo does not move. The Rule of Silence still holds: you may not say why you give the card.</p>
    <p><b>Recall</b> (Answer only): spend <b>3 Light</b> and choose any card in the forgotten pile; put it on the discard pile, so it can be drawn again later. A forgotten Key Memory can be Recalled.</p>
    <p><b>Push Through</b> (each player only <b>once per game</b>): only when Shades are on <b>both</b> banks of the next space and that space has no Black Water. Return both Shades to the supply, move the soul onto that space (gain its Light as usual, section 8) and flip your Push Through token face down. The soul then takes <b>1 Fracture</b>, plus 1 more for each Push Through token that was already face down, and you forget the top card of the deck. So the first Push Through costs 1 Fracture, the second 2 and the third 3 (which means Shattered). Your turn continues as usual.</p>
    <h4>The Echo and Resonance</h4>
    <p>The <b>Echo</b> token sits on the thread of the last card played face up or Burned, by any player (or the Ghost). It does not move for a card played face down, an Offer, a Recall or a Push Through.</p>
    <p>If your <b>Answer</b> is a card played face up or Burned on the Echo's thread, the card <b>Resonates</b>: also do its Resonance effect. On some Oblivion cards the Resonance replaces the normal effect ("Instead"). A Resonating card may be inscribed in the Book of Remembrance (section 9).</p>
    <p>Your Steer never Resonates. If your Answer is an Offer, a Recall or a Push Through, you cannot Resonate this turn.</p>
    ${fig("echo")}
    <h4>Forgetting and the two piles</h4>
    <p><b>Forget</b> a card: put it face up on the next number of the Ledger's forgotten track, overlapping the card before it. The number above the newest card is how many cards are forgotten. <b>Forget the top card of the deck</b>: put the top card of the Memory deck on the forgotten track without playing it. If a card leaves the forgotten pile (Recall, a Chapter Blessing), slide the later cards back.</p>
    <p>The <b>discard pile</b> (next to the deck) and the <b>forgotten pile</b> (on the Ledger) are both face up, and anyone may look through them. Keep them apart: discarded cards come back when the deck runs out, forgotten cards do not. If the Memory deck is empty when you need to draw or forget, shuffle the discard pile into a new deck first.</p>` },

  { id: "endturn", title: "4. The end of the turn", keys: "end of turn end of round round resolution cleanup upkeep order sequence after actions soul step move linger light as ash adrift forget hold grievance damage mist settle draw oar light collect bloom-bringer", body: `
    <p>The end-of-turn steps happen after <b>every player's turn</b>, not once per round. Do them in this order:</p>
    <ol class="steps">
      <li><b>Bloom-Bringer.</b> If the active player holds the Bloom-Bringer, they may flip one Root on the soul's space or ahead of it to its Bloom side, for free.</li>
      <li><b>Soul Step.</b> Check these in order and do the first that applies:
        <ol type="a">
          <li><b>Is the Resignation token next to the soul?</b> The soul does not move. Forget the top card of the deck (nothing can prevent this), then remove the token. Go to <i>e</i>.</li>
          <li><b>Is the next space Lit and free of Black Water?</b> Move the soul onto it. Gain 1 Light for each Bloom on the space the soul moved off, then return all discs and Shades on that space to the supply. If the soul has moved onto the first space of a new Reach, remove all knots from the Loom (the Echo stays on its thread).</li>
          <li><b>Extra move.</b> If 9 or more cards are forgotten (<b>Adrift</b>), the soul moves one more space. If that space is Lit and free of Black Water, it simply moves there. If not, it moves there anyway and takes 1 Fracture, unless the Spirit Warden is unused: then turn the Warden sideways, and the soul does not take the extra move. Otherwise, if 6 or more cards are forgotten (<b>Light as Ash</b>), the soul moves one more space, but only if that space is Lit and free of Black Water. Each extra move also gives Light for the space the soul moves off.</li>
          <li><b>The soul cannot move: it Lingers</b> (it stays where it is). Check these in order and apply the first that fits: the Hold Fast token is next to the soul, so nothing is forgotten; the Spirit Warden is unused, so turn it sideways and nothing is forgotten; the soul's own space is Lit, so nothing is forgotten; the Bride, once per game, moves back one space instead (section 10). Otherwise, <b>forget the top card of the deck</b>.</li>
          <li><b>Shade damage.</b> If there is a Shade on either bank of the soul's space (one or two), the soul takes <b>1 Fracture</b>. This happens whether the soul moved or Lingered.</li>
        </ol></li>
      <li><b>Mist.</b> Flip the top card of the Mist deck of the Reach the soul is in now and carry out its instructions in order. "Ahead of the soul" is counted from the soul's space: 1 space ahead is the next space. Then put the card face up on that Reach's Mist discard pile. If the deck is empty, first shuffle that Reach's ${MIST[0].length} basic Mist cards (only) into a new deck. Appendix C lists every Mist card.</li>
      <li><b>Cleanup.</b>
        <ul><li>For each space with Black Water and a disc (Root or Bloom) on <b>both</b> banks: remove the Black Water token from the game (put it in the box).</li>
          <li>For each Shade with a Bloom on the same bank of the space directly before it <b>and</b> the space directly after it: return the Shade to the supply.</li></ul></li>
      <li><b>Draw</b> back up to your hand size.</li>
      <li><b>Solo: the Ghost</b> (section 11). Then do Cleanup again.</li>
      <li><b>Pass the Oar</b> to the player on your left. In solo play it comes back to you after the Ghost.</li>
    </ol>
    ${fig("soulstep")}
    <h4>At the start of the next turn</h4>
    <ul>
      <li>Remove the Hold Fast token if it is out.</li>
      <li>If you hold the Spirit Warden, straighten it at the start of your own turn.</li>
      <li>A Shield token that has not cancelled a Fracture is removed at the end of its owner's next turn.</li>
    </ul>
    <h4>Effects that happen immediately</h4>
    <p>A thread that becomes full causes its <b>Backlash</b> at once (section 6). A page reward and a Chapter Blessing happen at once, as soon as the inscription that earns them is made (section 9). A Memory Site gives its keepsake (and, in the Open Crossing, its Light) when its bank card is flipped. The game ends the moment the soul reaches the Far Shore (you win), the forgotten pile reaches the Lantern's limit (Faded), the soul takes its third Fracture (Shattered), or a Black Water token must be placed with none left in the supply (Deluge). A Fracture cancelled by a Shield token or by the Child's rule is not taken.</p>
    ${fig("mist")}` },

  { id: "board", title: "5. The river, Roots and Blooms", keys: "spaces reach bank slot near shore far shore left right root bloom wither lit network touch place fog bank card fertile stony memory site grave reveal keepsake", body: `
    <p>The river has 13 spaces: the near shore (0), spaces 1 to 11, and the Far Shore (12). Each space from 1 to 11 has a <b>left</b> and a <b>right bank</b>, and each bank holds at most one disc or token. Banks are named as you face downstream toward the Far Shore. "Ahead of the soul" means the spaces with a higher number than the soul's space; "the next space" is the space directly ahead.</p>
    <p>The river has three Reaches: <b>Reach I, the Asphodel Road</b> (spaces 1–4), <b>Reach II, the Fields of Mourning</b> (5–8) and <b>Reach III, the Banks of Lethe</b> (9–11). Each Reach has its own Mist deck and its own page in the Book of Remembrance.</p>
    <h4>Roots, Blooms and the network</h4>
    <p>A <b>Root</b> is a disc Root side up; a <b>Bloom</b> is the same disc Bloom side up. A space is <b>Lit</b> when at least one of its banks has a Bloom. The soul only moves onto Lit spaces.</p>
    <p><b>Placing a Root.</b> Put a disc Root side up on an empty bank (no disc, no Shade) on the soul's space or ahead of it. The bank must <b>touch the network</b>, meaning at least one of these is true:</p>
    <ul><li>it is on the soul's space or the next space, or</li><li>the other bank of the same space has a disc, or</li><li>the same bank (left or right) of the space directly before or after it has a disc.</li></ul>
    <p><b>Blooming a Root.</b> Flip a Root on the soul's space or ahead of it to its Bloom side. <b>Withering a Bloom.</b> Flip a Bloom back to its Root side; the space may stop being Lit.</p>
    ${fig("network")}
    <h4>Bank cards</h4>
    <p>When you place a Root on a bank that is still covered by fog, flip its bank card face up. The card stays on the bank, and its type decides what happens:</p>
    <ul>
      <li><b>Fertile</b>: place the Root.</li>
      <li><b>Stony</b>: place the Root only if the card's effect says "even on Stony ground" or you hold the Root-Weaver. Otherwise no Root is placed, and that Root is lost.</li>
      <li><b>Memory Site</b>: place the Root and take a keepsake. In the Open Crossing, also gain 2 Light.</li>
      <li><b>Grave</b>: no Root is placed. Put a Shade on this bank.</li>
    </ul>
    <p>A bank with no bank card (both banks of space 1, or a bank whose Grave card was removed) counts as Fertile. A face-up bank card follows the same rules: Roots can be placed on Fertile and Memory Site banks, on Stony banks only as described above, and never on a Grave. Reach I has 3 Fertile, 1 Stony and 2 Memory Site cards; Reach II has 3 Fertile, 2 Stony, 2 Memory Site and 1 Grave; Reach III has 2 Fertile, 1 Stony, 2 Memory Site and 1 Grave.</p>
    ${fig("tiles")}` },

  { id: "loom", title: "6. The Loom of the Fates and Backlash", keys: "loom knot thread backlash grasping resignation tide karma", body: `
    <p>The Loom has three threads: Obsession, Acceptance and Oblivion. Each card played face up or Burned adds one knot to its thread. A thread is full at 4 knots with 2–3 players, and at 5 in solo play or with 4 players.</p>
    <p>When a thread becomes full, remove all its knots and resolve its <b>Backlash</b>:</p>
    <ul>
      <li><b>Obsession, Grasping</b>: place a Shade on the soul's space: on the left bank if it is free, otherwise on the right bank. If both banks already have a Shade (or the soul is on the near shore), place it on the left bank of the next space instead (or the right bank if the left is taken).</li>
      <li><b>Acceptance, Resignation</b>: put the Resignation token next to the soul. In the next Soul Step the soul does not move and you forget the top card of the deck; then remove the token.</li>
      <li><b>Oblivion, the Tide Rises</b>: place a Black Water token on the next space (section 7).</li>
    </ul>
    <p>When the soul moves onto the first space of a new Reach, remove all knots from all three threads. The Echo stays where it is.</p>
    ${fig("loom")}` },

  { id: "threats", title: "7. Black Water, Shades and Fractures", keys: "black water flood drain deluge grievance fracture shield trapped banish", body: `
    <p><b>Placing Black Water.</b> Put a Black Water token on the space named. If that space already has Black Water, use the first space after it without Black Water; if there is none ahead, use the nearest space between it and the soul. Black Water is never placed on the soul's own space. Flip every Bloom on that space to its Root side. The soul cannot move onto a space with Black Water. Black Water is always taken from the Ledger's Black Water well. If you must place Black Water and the well is empty, you lose (Deluge).</p>
    <p><b>Removing Black Water.</b> In Cleanup, if both banks of a space with Black Water have a disc, remove the Black Water token from the game. Cards that say "drain" remove Black Water the same way. Removed Black Water goes in the box and never returns to the well.</p>
    <p><b>Placing a Shade.</b> Put the Shade on the bank named. If that bank already has a Shade, use the other bank of the same space; if both are taken, continue with the next space ahead. A disc on that bank is returned to the supply. No Root can be placed on a bank with a Shade. Shades on both banks of the next space stop the soul unless a player Pushes Through (section 3).</p>
    <p><b>Removing Shades.</b> In Cleanup, return a Shade to the supply if the same bank of the space directly before it and the space directly after it both have a Bloom. Cards that say "banish" or "wash away" also return Shades to the supply. The bank card under a removed Shade stays as it was.</p>
    <p><b>Fractures</b> come from Shade damage, Push Through, Adrift and the harsh Mist card <i>Dark Wind</i>. Put each one on the next Fracture well of the Ledger; a mended Fracture comes off the highest well. At 3 Fractures you lose (Shattered). The card <i>Hold the Line</i> gives the Shield token: it cancels the next Fracture, then is removed; if unused, it is removed at the end of its owner's next turn.</p>
    ${fig("threats")}` },

  { id: "mantles", title: "8. Light and Mantles", keys: "mantle summon light weaver warden bringer breaker recall resummon lay down solo gain light", body: `
    <p><b>Gaining Light.</b> Light is one shared pool. Each time the soul moves off a space, gain 1 Light for each Bloom on that space (2 Light if both banks have a Bloom); the space is then cleared, so each Bloom gives Light only once. This happens whenever the soul moves: in the Soul Step, in extra moves, by a card that moves the soul, or by a Push Through. Light stays in the pool until it is spent or lost to the harsh Mist card <i>Dark Wind</i>. The Open Crossing also gains 2 Light for each Memory Site flipped.</p>
    <p><b>Spending Light.</b> Recall a forgotten card as your Answer (3 Light, section 3), or summon a Mantle.</p>
    <p><b>Summoning a Mantle</b> (before your Answer): pay 3 Light (2 with the King on the Barge) and discard one card from your hand with the same thread as the Mantle. Take the Mantle card. With 2–4 players, each player holds at most one Mantle and keeps it for the rest of the game. In solo play see section 11.</p>
    <ul>${Object.values(MANTLES).map(m => `<li><b>${esc(m.name)}</b> (${TAG_NAMES[m.tag]}): ${esc(m.text)}</li>`).join("")}</ul>
    <p><b>Spirit Warden.</b> "Once per round" means once between the start of the holder's turn and the start of their next turn; it also works on other players' turns. When it is used, turn the card sideways; straighten it at the start of the holder's turn. When it stops a Linger, the soul stays where it is but no card is forgotten. When it stops Adrift (only when the extra space is not Lit or has Black Water), the soul does not take the extra move and takes no Fracture.</p>
    <p><b>Bloom-Bringer.</b> Its power is used only in end-of-turn step 1 of the holder's own turn.</p>
    ${fig("mantles")}` },

  { id: "book", title: "9. The Book of Remembrance and the ending", keys: "inscribe page chapter blessing key memory keepsake slot place person deed feeling ending inscribed forgotten unspoken read aloud epilogue cup keeper far shore", body: `
    <p>The Book has one page per Reach: page I, <i>Who I Was</i> (Reach I); page II, <i>What I Did</i> (Reach II); page III, <i>What I Carry</i> (Reach III). Each page has four slots, <b>Place</b>, <b>Person</b>, <b>Deed</b> and <b>Feeling</b>, which complete a sentence about the soul's life.</p>
    <p><b>Inscribing.</b> When a card Resonates, you may inscribe it if the slot shown on the card is still empty on the page of the Reach the soul is in. A <b>Key Memory</b> may be inscribed whenever it is played face up, Resonating or not. To inscribe, put the card in its slot with photo corners instead of discarding it; it stays there for the rest of the game. Oblivion cards and Burned cards cannot be inscribed.</p>
    <p><b>Page rewards.</b> Each page pays a small reward for each pair of neighbouring slots: <b>Place + Person</b>, <b>Person + Deed</b> and <b>Deed + Feeling</b>. When an inscription fills the second slot of a pair, do that pair's reward at once. One card can complete two pairs (a Person inscribed next to a Place and a Deed): do both. Each reward happens once per page; tick its box in the Book. The rewards are printed on each page:</p>
    ${pairTable()}
    <p><b>Chapter Blessing.</b> When all ${CHAPTER_AT} slots of a page are filled (${CHAPTER_AT - 1} for the Garland Girl), the page also gives one Chapter Blessing at once (only once per page). The Blessing is not chosen. Check these in order and do the first one that is possible:</p>
    <ol class="steps">
      <li>If the soul has at least one Fracture: remove 1 Fracture (from the highest well).</li>
      <li>Otherwise, if any space has Black Water: remove the Black Water token closest ahead of the soul from the game.</li>
      <li>Otherwise, if the forgotten pile has any cards: move the newest forgotten card to the discard pile.</li>
      <li>Otherwise nothing happens.</li>
    </ol>
    ${fig("book")}
    <h4>The ending</h4>
    <p>When the game ends, the Rule of Silence ends. Check where the soul's <b>Key Memory</b> card is:</p>
    <ul>
      <li><b>Inscribed in the Book</b>: the soul crosses remembering what mattered most.</li>
      <li><b>In the forgotten pile</b>: the soul crosses without it, lighter and emptier.</li>
      <li><b>Anywhere else</b> (deck, a hand or the discard pile): it was never spoken, and the soul crosses with it unsaid.</li>
    </ul>
    <p>Then read the Book aloud, page by page, even after a loss. Empty slots are read as "…but this, the river has taken".</p>` },

  { id: "souls", title: "10. The Souls and the Lantern", keys: "child king garland bride open crossing twist first game new players suggested story difficulty lantern level gentle standard hard heroic", body: `
    ${lore("Four souls the old ferryman would not carry, and one with no name at all.")}
    <p>Each named Soul adds its own 8-card pack of memories, including one <b>Key Memory</b>, and one special rule. The Open Crossing adds the 8 Echo cards instead.</p>
    <h4>${esc(SOULS.child.name)}</h4>
    <p class="story">A small child alone in a doorway on the coldest night of the year, with a handful of little lights to sell and none sold. To keep warm she lights them one by one, and in each flame she sees something: a warm stove, a feast, and at last the one person who ever held her, coming to take her home.</p>
    <p><b>Special rule:</b> ${esc(SOULS.child.twist)} Turn her Soul card sideways when a Fracture is ignored, and straighten it when the soul moves onto the first space of a new Reach. <b>Key Memory:</b> <i>${esc(CARDS.find(c => c.id === "L04").band)}</i>.</p>
    <h4>${esc(SOULS.garland.name)}</h4>
    <p class="story">A young woman who wove a flower for everyone she loved. Her father died, the man who promised to marry her turned cruel, and she gave her flowers away one by one and slipped into a brook still singing. She kept one flower for herself, and no one ever learned which.</p>
    <p><b>Special rule:</b> ${esc(SOULS.garland.twist)} <b>Key Memory:</b> <i>${esc(CARDS.find(c => c.id === "G-04").band)}</i>.</p>
    <h4>${esc(SOULS.king.name)}</h4>
    <p class="story">An old king who won every battle but the last. His closest friend loved his queen, his fellowship broke apart, and he fell on a field of his own making. Dying, he was laid on a black barge. The sword he was lent was never returned to the water it came from, and so he cannot rest.</p>
    <p><b>Special rule:</b> ${esc(SOULS.king.twist)} The active player loses their Mantle when the soul takes a Fracture during their turn (including its end-of-turn steps); put the Mantle back with the others, and it can be summoned again. <b>Key Memory:</b> <i>${esc(CARDS.find(c => c.id === "K04").band)}</i>.</p>
    <h4>${esc(SOULS.bride.name)}</h4>
    <p class="story">She died on her wedding day. Her husband came down into the dark to bring her back, on one condition: he must not look back until they reached the light. One step from the surface, he turned. She has stood in the shadows ever since, deciding whether to remember his face or let it go.</p>
    <p><b>Special rule:</b> ${esc(SOULS.bride.twist)} This happens only when her own space is not Lit and nothing else stops the Linger. Turn her Soul card sideways once it has been used. <b>Key Memory:</b> <i>${esc(CARDS.find(c => c.id === "B04").band)}</i>.</p>
    <h4>${esc(SOULS.open.name)}</h4>
    <p class="story">A nameless soul. You do not learn its story; you write it.</p>
    <p><b>Special rule:</b> ${esc(SOULS.open.twist)} There is no Key Memory; the Book is the soul's whole story.</p>
    ${fig("souls")}
    <h4>The Lantern</h4>
    <p>The Lantern sets the difficulty. <b>Standard</b> is the normal game: an experienced group should win about half its games. Use <b>Gentle</b> for learning, and <b>Hard</b> or <b>Heroic</b> for more challenge.</p>${lanternTable()}
    <p class="rsuggest"><b>Your first game:</b> we suggest <b>${esc(SOULS[FIRST_SOUL].name)}</b> at the Gentle Lantern. Its rules forgive more mistakes while you learn the river, the Loom and the Book.</p>` },

  { id: "solo", title: "11. Solo play and the Ghost", keys: "solo ghost automaton", body: `
    <p>In solo play you hold 4 cards and each Loom thread is full at 5 knots.</p>
    <p><b>The Ghost.</b> After each of your turns (end-of-turn step 6), flip the top card of the Ghost deck and do its action, using the same placement rules as a player (section 5). Then add a knot to its thread (a full thread causes a Backlash) and move the Echo there, so your next Answer can Resonate with it. When the Ghost deck is empty, shuffle all Ghost cards into a new deck.</p>
    <p><b>Replacing a Mantle.</b> You may summon a new Mantle while you hold one. Flip the old Mantle face down: it can never be summoned again. Each Mantle can be summoned only once, and you may summon at most <b>3</b> times per game.</p>${ghostTable()}
    ${fig("solo")}` },

  { id: "pieces", title: "Appendix A. Components and symbols", keys: "components pieces symbols icons meaning legend board tokens what is", body: `
    <p>Each component, what it represents in the story, and what it does in the game.</p>
    <table class="rtable rpieces"><thead><tr><th>Component</th><th>In the story</th><th>In the game</th></tr></thead><tbody>
      ${piece("nb-soul", "#EFE7D6", "Soul token", "A coinless dead person, waking on the near shore with a whole life still inside them.", "Moves from space 0 to space 12, only onto Lit spaces without Black Water.")}
      ${piece("nb-light", "#E6D3A3", "The Far Shore", "Where the veiled Keeper waits with the cup of forgetting.", "Space 12. When the soul reaches it, you win.")}
      ${piece("nb-fog", "#9A948C", "Bank card, fog side", "The mist that hides the bank.", "Covers a bank until a Root is placed there (section 5).")}
      ${piece("nb-fertile", "#6d665e", "Fertile", "Soft riverbank earth.", "A Root is placed.")}
      ${piece("nb-stony", "#9A948C", "Stony", "Hard, grey stone where little can grow.", "A Root is placed only by a card that allows Stony ground or the Root-Weaver.")}
      ${piece("nb-memorysite", "#E6D3A3", "Memory Site", "A place the soul once knew, surfacing through the fog.", "A Root is placed; take a keepsake (Open Crossing: also 2 Light).")}
      ${piece("nb-grave", "#8FD6E1", "Grave", "Something unfinished is buried here.", "No Root; a Shade is placed instead.")}
      ${piece("nb-root", "#E6D3A3", "Root (disc)", "A Netherbloom seed, planted in the dark.", "Extends the network. Does not light a space.")}
      ${piece("nb-bloom", "#D7263D", "Bloom (disc)", "An open Netherbloom, glowing crimson.", "Makes its space Lit.")}
      ${piece("nb-light", "#E6D3A3", "Light", "The glow of the flowers the soul has passed.", "Shared pool; spent on Mantles and Recall.")}
      ${piece(TAG_ICONS[0], TAGCOL[0], "Obsession thread", "Clinging, grudges, things the soul cannot let go.", "Mostly Root cards. Backlash: Grasping.")}
      ${piece(TAG_ICONS[1], TAGCOL[1], "Acceptance thread", "Tenderness, forgiveness, peace.", "Mostly Bloom and Mend cards. Backlash: Resignation.")}
      ${piece(TAG_ICONS[2], TAGCOL[2], "Oblivion thread", "Deliberate forgetting.", "Strong cards; forgotten after use. Backlash: the Tide Rises.")}
      ${piece("nb-knot", "#E6D3A3", "Knot", "The Fates' weaving of the soul's last journey.", "Marks how full a thread is on the Loom.")}
      ${piece("nb-echo", "#8FD6E1", "Echo token", "The shuttle of the Loom. In a silent world, your voice.", "Shows the thread a card must match to Resonate.")}
      ${piece("nb-grievance", "#8FD6E1", "Shade", "A restless shade of the soul's unfinished resentment.", "Blocks a bank; damages the soul beside it.")}
      ${piece("nb-blackwater", "#9A948C", "Black Water", "The river rising to swallow the path.", "The soul cannot enter its space.")}
      ${piece("nb-fracture", "#D7263D", "Fracture", "A crack in the soul's sense of self.", "Goes on the Ledger's Fracture wells. Third one: Shattered.")}
      ${piece("nb-tok-oar", "#E6D3A3", "Oar", "The ferry's oar, passed in silence.", "Shows whose turn it is.")}
      ${piece("nb-tok-push", "#D7263D", "Push Through token", "A Ferryman's one hard shove.", "One per player; flipped face down when used.")}
      ${piece("nb-tok-hold", "#8FD6E1", "Hold Fast token", "An anchor let down beside the soul.", "If the soul Lingers, nothing is forgotten.")}
      ${piece("nb-tok-shield", "#E6D3A3", "Shield token", "A Ferryman between the soul and harm.", "Cancels the next Fracture.")}
      ${piece("nb-tok-resign", "#E6D3A3", "Resignation token", "The soul, sitting down among the reeds.", "The soul does not move in the next Soul Step.")}
      ${piece("nb-seal", "#E6D3A3", "Book of Remembrance", "The spring of Memory the dead were told to seek instead of Lethe.", "Three pages of four slots each (section 9).")}
      ${piece("nb-seal", "#D7263D", "Key Memory", "The memory that matters most to this soul.", "Decides the ending (section 9).")}
      ${piece("", "", "The Ledger", "The river's account of what the soul is losing.", "Holds the forgotten pile on a numbered track, the Fractures and the Black Water supply: the three ways to lose.")}
      ${piece("", "", "Memory cards", "The soul's memories.", "Your hand; each has an effect, a thread and usually a Book slot.")}
      ${piece("", "", "Mist cards", "The underworld itself: rising water, cold wind, returning fog.", "One deck per Reach; one is flipped each turn (Appendix C).")}
      ${piece("", "", "Mantle cards", "Roles a Ferryman can take up on the river.", "Lasting powers bought with Light (section 8).")}
      ${piece("", "", "Soul cards", "The five souls you can carry.", "Each has a special rule (section 10).")}
      ${piece("nb-soul", "#8FD6E1", "Ghost cards (solo)", "A silent Ferryman who travels beside you.", "Played after each of your turns (section 11).")}
    </tbody></table>
    <h4>What is in the box</h4>
    <table class="rtable"><thead><tr><th>Component</th><th>Count</th></tr></thead><tbody>
      <tr><td>Memory cards</td><td>${MEMORY_N}: 32 core, 8 Echo cards (Open Crossing), 4 Soul packs of 8</td></tr>
      <tr><td>Mist cards</td><td>${MIST_N}: ${MIST[0].length} basic for each Reach, ${MIST_EXTRA.length} extra for each Reach (${MIST_EXTRA.map(m => m[0]).join(", ")}), ${HARSH.length} harsh</td></tr>
      <tr><td>Bank cards</td><td>${TILES.reduce((n, t) => n + t[1].length, 0)}: ${TILES.map(t => t[1].length).join(", ")} for Reaches I, II, III</td></tr>
      <tr><td>Soul cards / Mantle cards / Ghost cards</td><td>5 / ${Object.keys(MANTLES).length} / ${GHOST.length}</td></tr>
      <tr><td>Boards</td><td>3 river board panels, 1 Loom of the Fates, 1 Ledger</td></tr>
      <tr><td>Books of Remembrance</td><td>5, one for each Soul</td></tr>
      <tr><td>Root/Bloom discs</td><td>24</td></tr>
      <tr><td>Shades / Black Water / Fractures</td><td>8 / 6 / 3</td></tr>
      <tr><td>Light / knots</td><td>12 / 15</td></tr>
      <tr><td>Echo, Oar, soul (Ghost on the back)</td><td>1 each</td></tr>
      <tr><td>Push Through / Hold Fast / Shield / Resignation tokens</td><td>4 / 1 / 1 / 1</td></tr>
    </tbody></table>
    <p><b>Cards that track their own use.</b> Turn the Spirit Warden card sideways when it is used, and straighten it at the start of its holder's turn. Turn a Soul card sideways when its once-only rule has been used. In solo play, flip a Mantle you give up face down.</p>` },

  { id: "terms", title: "Appendix B. Card terms", keys: "glossary terms keywords bloom banish drain mend wash wither untie tie lift fog forget linger lit guide summon recall burn resonate inscribe backlash", body: `
    <p>Words printed in ${kw("this style")} on the cards are game terms. This table says exactly what to do.</p>
    <table class="rtable rterms"><thead><tr><th>Words on the card</th><th>What you do</th></tr></thead><tbody>
      ${term(`Place N Roots`, "Put N discs Root side up, one at a time, each on an empty bank that touches the network (section 5). <i>Even on Stony ground</i>: Stony banks are allowed too.")}
      ${term(`${kw("Bloom")} N Roots`, "Flip N Roots on the soul's space or ahead of it to the Bloom side.")}
      ${term(`${kw("Wither")}`, "Flip a Bloom to its Root side. The space may stop being Lit.")}
      ${term(`${kw("Lit")}`, "A space with a Bloom on at least one bank. The soul moves only onto Lit spaces.")}
      ${term(`${kw("Mend")} N Fractures`, "Take N Fractures off the Ledger, from the highest well down, and return them to the supply.")}
      ${term(`${kw("Banish")} the nearest Shade`, "Return the Shade closest to the soul (on its space or ahead) to the supply.")}
      ${term(`${kw("Wash away")} the Shades beside the soul`, "Return every Shade on the soul's space to the supply.")}
      ${term(`${kw("Drain")} the nearest Black Water`, "Remove the Black Water token closest ahead of the soul and put it in the box. <i>Drain all Black Water in this Reach</i>: do this for every Black Water token in the soul's Reach.")}
      ${term(`Remove 1 of your choice: the nearest Shade or the nearest Black Water`, "Do one of the two rows above: Banish the nearest Shade, or Drain the nearest Black Water.")}
      ${term(`${kw("Untie")} N knots on the fullest thread`, "Remove N knots from the thread with the most knots. No Backlash. If threads are tied, you choose.")}
      ${term(`Empty the fullest thread`, "Remove every knot from the thread with the most knots. No Backlash. If threads are tied, you choose.")}
      ${term(`${kw("Tie")} N knots`, "Add N knots to the thread named. If this fills it, resolve its Backlash.")}
      ${term(`${kw("Backlash")}`, "What a full thread does (section 6). Resolve it, then remove that thread's knots.")}
      ${term(`${kw("Lift the fog")} across this Reach; Graves turn Fertile`, "Flip every fog-side-up bank card in the soul's Reach face up without placing Roots. Remove every Grave card flipped this way from the board: those banks count as Fertile. Cards flipped this way cause no Shade, keepsake or Light.")}
      ${term(`The soul steps forward now`, "Move the soul to the next space now, if it is Lit and has no Black Water. Gain its Light as usual.")}
      ${term(`The soul waits without forgetting this turn`, "Put the Hold Fast token next to the soul. If the soul Lingers this turn, no card is forgotten.")}
      ${term(`Prevent the next Fracture`, "Take the Shield token (section 7).")}
      ${term(`Read the top 3 Mist cards`, "Look at the top 3 cards of the current Reach's Mist deck and put them back on top in any order.")}
      ${term(`${kw("Forget")} a card / ${kw("forgotten")}`, "Put the card face up on the next number of the Ledger's forgotten track.")}
      ${term(`${kw("Forget")} the top card of the deck`, "Put the top card of the Memory deck on the forgotten track without playing it.")}
      ${term(`${kw("Linger")}`, "The soul does not move in the Soul Step (section 4, step d).")}
      ${term(`${kw("Summon")} a Mantle`, "Before your Answer: pay 3 Light (2 with the King on the Barge) and discard 1 card from your hand of the Mantle's thread. Take the Mantle card.")}
      ${term(`Recall`, "As your Answer: pay 3 Light and move any card from the forgotten pile to the discard pile.")}
      ${term(`Burn`, "Do the card's effect twice, tie 1 knot on its thread and move the Echo there. Then forget the card and the top card of the deck.")}
      ${term(`Resonance / Resonates`, "Your Answer is played face up or Burned on the Echo's thread: also do the card's Resonance effect. <i>Instead</i>: do the Resonance effect in place of the normal one.")}
      ${term(`Inscribe`, "Put a Resonating card in its slot on the current Reach's Book page instead of discarding it (section 9).")}
      ${term(`Remove the Echo from the Loom (Mist)`, "Take the Echo token off its thread. No card can Resonate until a card is played face up or Burned again.")}
    </tbody></table>` },

  { id: "mist", title: "Appendix C. Mist cards", keys: "mist harsh card deck rising water withering cold wind fog returns severed", body: `
    <p>The instructions printed on each Mist card. Each Reach's deck also holds <i>Rising Water</i> and <i>Shade Drawn Near</i> and, at every Lantern except Gentle, harsh cards.</p>${mistTable()}` },

  { id: "cards", title: "Appendix D. Card reference", keys: "cards reference effects", body: cardTable() },
];
export const RULEBOOK = BOOK.map(s => ({ ...s, body: iconize(s.body, "en") }));

// The one-page Player Aid. With a game running, it shows that game's numbers.
export const rulebook = () => (zh() ? RULEBOOK_ZH : RULEBOOK);
export function playerAid(cfg) {
  if (zh()) return playerAidZh(cfg);
  const lim = cfg ? cfg.forgottenLimit : limitRange(), cap = cfg ? cfg.karmaCap : "4–5", ash = cfg ? cfg.ashAt : 6, adrift = cfg ? (cfg.adriftAt < 99 ? cfg.adriftAt : "never") : 9;
  return `
  <section class="aid">
    <div class="rsuggest rlose"><b>You lose at once if:</b> <b>Faded</b>: the forgotten pile reaches your Lantern's ✕ (${lim}) · <b>Shattered</b>: the 3rd Fracture well is filled · <b>Deluge</b>: Black Water must be placed and its well is empty. <b>You win</b> when the soul reaches the Far Shore.</div>
    <h3>On your turn</h3>
    <ol class="steps">
      <li><b>Summon</b> <span>optional · pay Light, discard a matching card${!cfg || cfg.resummon ? ". Solo: you may trade your Mantle for a new one (the old is laid down for good), 3 summons a game" : ""}</span></li>
      <li><b>Answer</b> <span>your first action: a card played face up or Burned on the Echo's thread Resonates</span></li>
      <li><b>Steer</b> <span>your second action. Either may be an Offer (once a turn) or a Push Through (once a game for each Ferryman)</span></li>
      <li><b>End of turn</b> <span>1 Bloom-Bringer · 2 Soul Step: next space Lit and no Black Water, move; otherwise Linger · 3 Mist: flip the top card of this Reach's deck · 4 Cleanup · 5 Draw up · 6 Solo: Ghost · 7 Pass the Oar</span></li>
      <li><b>Cleanup</b> <span>remove Black Water where both banks have a disc; remove a Shade with a Bloom on the same bank before and after it</span></li>
    </ol>
    <h3>Play a card</h3>
    <div class="aidgrid">
      <div><b>Face up</b><span>effect + knot + new Echo</span></div>
      <div><b>Face down</b><span>place 1 Root; no knot, Echo stays</span></div>
      <div><b>Burn</b><span>effect ×2 + knot + new Echo; forget it and the top card of the deck</span></div>
      <div><b>Offer</b><span>once a turn: discard 1, draw 2, keep 1, give 1 to another player (solo: deck bottom); no Resonance this turn if it is your Answer</span></div>
      <div><b>Recall</b><span>your Answer only; 3 Light: a forgotten card of your choice returns to the discard pile</span></div>
      <div><b>Push Through</b><span>Shades on both banks of the next space (no Black Water): remove both and move the soul there; 1 Fracture (+1 per face-down Push Through token), forget 1; once a game for each player</span></div>
    </div>
    <h3>Threads (${cap} knots)</h3>
    <div class="aidgrid">
      <div class="c-obs">${ico(TAG_ICONS[0], TAGCOL[0])}<b>Obsession</b><span>Full: Shade on the soul's space</span></div>
      <div class="c-acc">${ico(TAG_ICONS[1], TAGCOL[1])}<b>Acceptance</b><span>Full: the soul does not move in the next Soul Step</span></div>
      <div class="c-obl">${ico(TAG_ICONS[2], TAGCOL[2])}<b>Oblivion</b><span>Full: Black Water on the next space. Played cards go to the forgotten pile</span></div>
    </div>
    <h3>Roots must touch</h3>
    <p>The soul's space or the next one, the opposite bank, or the same bank next door.</p>
    <h3>Forgetting</h3>
    <div class="aidgrid">
      <div><b>${ash}</b><span>Light as Ash: +1 move onto a Lit space</span></div>
      <div><b>${adrift}</b><span>Adrift: +1 move; onto a dark space it takes 1 Fracture</span></div>
      <div><b>${lim}</b><span>Faded: the game is lost</span></div>
    </div>
    <h3>Icons</h3>
    <div class="aidicons">
      <span>${ico("nb-bloom", "#D7263D")}Bloom</span><span>${ico("nb-root", "#E6D3A3")}Root</span><span>${ico("nb-grievance", "#8FD6E1")}Shade</span>
      <span>${ico("nb-blackwater", "#9A948C")}Black Water</span><span>${ico("nb-fog", "#9A948C")}Fog</span><span>${ico("nb-stony", "#9A948C")}Stony</span>
      <span>${ico("nb-memorysite", "#E6D3A3")}Memory Site</span><span>${ico("nb-grave", "#8FD6E1")}Grave</span><span>${ico("nb-fracture", "#D7263D")}Fracture</span>
      <span>${ico("nb-light", "#E6D3A3")}Light</span><span>${ico("nb-echo", "#8FD6E1")}Echo</span><span>${ico("nb-seal", "#E6D3A3")}Blessing</span>
    </div>
    <h3>Tokens</h3>
    <div class="aidicons">
      <span>${ico("nb-tok-oar", "#E6D3A3")}Oar: whose turn</span><span>${ico("nb-tok-push", "#D7263D")}Push Through: 1 each</span><span>${ico("nb-tok-hold", "#8FD6E1")}Hold Fast</span>
      <span>${ico("nb-tok-shield", "#E6D3A3")}Shield</span><span>${ico("nb-tok-resign", "#E6D3A3")}Resignation</span>
    </div>
    <p>Discard pile and forgotten pile are both face up; the forgotten pile lies on the Ledger.</p>
  </section>`;
}
