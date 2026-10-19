// The searchable Rulebook and the Player Aid sheet. Card and Mist tables are built from cards.js,
// so the reference always matches the cards the engine plays.
import {
  CARDS, TAG_NAMES, TAG_ICONS, MANTLES, SOULS, FIRST_SOUL, LANTERN, LANTERN_NAMES, lanternIcon, limitRange, MIST, HARSH, opsText, GHOST, TILES,
} from "./cards.js";
// Forgotten counts at which the soul turns Light as Ash and Adrift (engine makeConfig).
const CFG = { ashAt: 6, adriftAt: 9 };

import { zh } from "./i18n.js";
import { RULEBOOK_ZH, playerAidZh } from "./rules_zh.js";
import { T as FACE_WORDS } from "./cardface.js";

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

function lanternTable() {
  return `<table class="rtable"><thead><tr><th>Lantern</th><th>Black Water supply</th><th>Faded at</th><th>Harsh Mist per Reach</th></tr></thead><tbody>${
    Object.entries(LANTERN).map(([l, [bw, lim, h]]) => `<tr><td>${lanternIcon(l)} ${LANTERN_NAMES[l]}</td><td>${bw}</td><td>${lim} forgotten</td><td>${h}</td></tr>`).join("")}</tbody></table>`;
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

// A short in-world line that opens a rules section.
// A picture for the section, drawn by rulefigs.js where the Rulebook is shown.
const fig = id => `<div class="rfig" data-fig="${id}"></div>`;
const lore = text => `<p class="lore">${text}</p>`;
// One row of "The world on your table": icon, piece, what it is in the story, what it does in play.
const piece = (icon, color, name, story, play) =>
  `<tr><td>${icon ? ico(icon, color) : ""}<b>${name}</b></td><td>${story}</td><td>${play}</td></tr>`;

// Each section: id, title, keywords (extra search terms) and body HTML.
// Part one tells the story and what every piece means in it; part two is the rules, each section opened by a line of lore.
export const RULEBOOK = [
  { id: "story", title: "1. Prologue: the river of forgetting", keys: "story lore setting world lethe ferryman ferrymen servant underworld coin prologue theme who are we role", body: `
    ${lore("Whoever drinks from the River Lethe forgets.")}
    <p>Below the world of the living runs a black river. The dead must cross it to reach the <b>Far Shore</b>, where a veiled <b>Keeper</b> waits with one cup of river water. Drink it, and the weight of a whole life slips away.</p>
    <p>An old ferryman carries the dead across, but only those who were buried with a coin for the fare. The others, the <b>coinless dead</b>, wake alone on the <b>near shore</b> and wander the bank. Fog fills them, and they begin to forget: first the small things, then the faces, then their own names. A soul that forgets everything simply fades into the mist.</p>
    <p>You are the <b>Ferrymen</b>: servants of the underworld, neither living nor dead. The coinless the old ferryman will not carry are given to you. You have no boat. You have something stranger. Along the banks of Lethe grows the <b>Netherbloom</b>, a crimson flower of long, curling petals, blooming on a bare stalk with no leaves, because <i>flower and leaf never meet</i>. Its glow is the only light in the fog that a lost soul can follow. Where you plant Netherblooms, a soul can walk in the river toward the Far Shore.</p>
    <p>One more thing: the servants of the river are bound to silence. No Ferryman may speak on the water, not to the dead and not to one another. Whatever you mean to say to each other, you must say with the flowers you plant and the choices you make.</p>` },

  { id: "mission", title: "2. Your mission", keys: "goal mission objective win lose escort remember purpose", body: `
    <p>Netherbloom is a co-operative game for 1 to 4 players. Each game, one soul starts on the near shore (space 0). All players win or lose together.</p>
    <ol class="steps">
      <li><b>Win:</b> move the soul token to the Far Shore (space 12). The soul only moves onto spaces with a Bloom, so you must place Roots and turn them into Blooms ahead of it.</li>
      <li><b>The Book of Remembrance:</b> some cards you play can be placed in the Book (section 18). The Book does not decide whether you win, but it decides how the story ends (section 24) and is read aloud after the game.</li>
    </ol>
    <p>You <b>lose</b> at once if any of these happens:</p>
    <ul>
      <li>${ico("nb-fog", "#9A948C")} <b>Faded</b>: the forgotten pile reaches the Lantern's limit (section 21).</li>
      <li>${ico("nb-fracture", "#D7263D")} <b>Shattered</b>: the soul has 3 Fracture tokens.</li>
      <li>${ico("nb-blackwater", "#9A948C")} <b>Deluge</b>: you must place a Black Water token but none is left in the supply.</li>
    </ul>
    <p>Forgetting cards helps and hurts. Many strong cards put cards on the forgotten pile, and with 6 or more forgotten cards the soul moves faster (section 15). But each forgotten card brings you closer to Faded.</p>` },

  { id: "silence", title: "3. The Rule of Silence", keys: "talk communicate table talk etiquette silent quiet speak oath servants", body: `
    <p>From setup until the game ends, players do not talk about the game. Do not name, show or hint at the cards in your hand, point at the board to suggest a move, or ask others what to play.</p>
    <p>You may talk about information everyone can already see: the board, the Loom and the Book. Players communicate through the <b>Echo</b>, the thread of the last card played face up or Burned (section 13). Playing a card on the current Echo's thread shows you understood the last player. Leaving an Echo on a thread tells the next player which kind of card you hope they can play.</p>
    <p>When the game ends, the silence ends. One player reads the Book aloud, page by page.</p>` },

  { id: "pieces", title: "4. The world on your table", keys: "components pieces symbols icons meaning legend board tokens what is", body: `
    <p>Each piece below, what it represents in the story, and what it does in the game. The icons match the board and the cards.</p>
    <table class="rtable rpieces"><thead><tr><th>Piece</th><th>In the story</th><th>In the game</th></tr></thead><tbody>
      ${piece("nb-soul", "#EFE7D6", "The soul", "A coinless dead person, waking on the near shore with a whole life still inside them.", "The pawn you move from space 0 to space 12. It only moves onto Lit spaces without Black Water.")}
      ${piece("", "", "The river", "The River Lethe, winding from the near shore to the Far Shore.", "Spaces 0 to 12. Spaces 1–11 each have a left and a right bank. Each bank holds at most one disc or token.")}
      ${piece("", "", "The three Reaches", "Three stretches of the underworld: the grey <b>Asphodel Road</b>, the <b>Fields of Mourning</b> where grief lingers, and the <b>Banks of Lethe</b> where the water is deepest.", "Spaces 1–4, 5–8 and 9–11. Each Reach has its own Mist deck and its own page in the Book. When the soul enters a new Reach, remove all knots from the Loom.")}
      ${piece("nb-light", "#E6D3A3", "The Far Shore", "Where the veiled Keeper waits with the cup of forgetting.", "Space 12. When the soul reaches it, you win.")}
      ${piece("nb-fog", "#9A948C", "Fog", "The mist that hides the bank. Nobody knows what lies under it.", "The back of a bank card. Each bank of spaces 2–11 starts with a bank card fog side up. Flip it when a Root is placed there (section 9).")}
      ${piece("nb-fertile", "#6d665e", "Fertile ground", "Soft riverbank earth.", "Bank card: the Root is placed.")}
      ${piece("nb-stony", "#9A948C", "Stony ground", "Hard, grey stone where little can grow.", "Bank card: a Root can only be placed here by a card that says \"even on Stony ground\" or by the Root-Weaver.")}
      ${piece("nb-memorysite", "#E6D3A3", "Memory Site", "A place the soul once knew, surfacing through the fog.", "Bank card: the Root is placed and you find a keepsake. In the Open Crossing, also gain 2 Light.")}
      ${piece("nb-grave", "#8FD6E1", "Grave", "A grave on the bank. Something unfinished is buried here.", "Bank card: no Root is placed. Put a Grievance on this bank instead.")}
      ${piece("nb-root", "#E6D3A3", "Root", "A Netherbloom seed, planted in the dark.", "A disc, Root side up. Extends your network (section 8). A Root does not make a space Lit.")}
      ${piece("nb-bloom", "#D7263D", "Bloom", "An open Netherbloom, glowing crimson. The only light a lost soul can follow.", "A disc, Bloom side up. A space with a Bloom on at least one bank is <b>Lit</b>.")}
      ${piece("nb-light", "#E6D3A3", "Light", "The glow of the flowers the soul has passed, gathered and carried.", "Shared tokens. Gain 1 Light for each Bloom on a space when the soul moves off it. Spend Light to summon Mantles or to Recall a forgotten card.")}
      ${piece("", "", "Memory cards", "The soul's memories. Your hands together are what the soul still remembers.", "Your hand. Each turn you take two actions: play a card, Seek, Recall or Push Through (section 12). Each card has an effect, a thread and usually a memory for the Book.")}
      ${piece(TAG_ICONS[0], TAGCOL[0], "Obsession thread", "The thread that is spun and held: clinging, grudges, things the soul cannot let go.", "Mostly Root cards. When the thread is full: <b>Grasping</b>, place a Grievance next to the soul (section 14).")}
      ${piece(TAG_ICONS[1], TAGCOL[1], "Acceptance thread", "The thread that is measured: tenderness, forgiveness, peace.", "Mostly Bloom and Mend cards. When the thread is full: <b>Resignation</b>, the soul does not move in the next Soul Step (section 14).")}
      ${piece(TAG_ICONS[2], TAGCOL[2], "Oblivion thread", "The thread that is cut: deliberate forgetting.", "Strong cards that remove threats. After use they go to the forgotten pile. When the thread is full: <b>the Tide Rises</b>, place Black Water ahead of the soul (section 14).")}
      ${piece("nb-knot", "#E6D3A3", "The Loom of the Fates", "The great loom where the three Fates weave every soul's last journey.", "A board with three threads. Each card played face up or Burned adds a knot to its thread. A full thread causes a Backlash.")}
      ${piece("nb-echo", "#8FD6E1", "The Echo", "The shuttle of the Loom, resting on the last thread you pulled. In a silent world it is your voice.", "A token on the thread of the last card played face up or Burned. If the first card of your turn is on that thread, it <b>Resonates</b> (section 13).")}
      ${piece("nb-grievance", "#8FD6E1", "Grievance", "A restless shade of the soul's own unfinished resentment.", "A token on a bank. No Root can be placed on that bank. If one is on the soul's space at the end of the Soul Step, the soul takes 1 Fracture. Grievances on both banks of the next space stop the soul (section 16).")}
      ${piece("nb-blackwater", "#9A948C", "Black Water", "The river rising to swallow the path.", "A token on a space. The soul cannot move onto it, and Blooms there are flipped to Roots. The supply is limited by the Lantern.")}
      ${piece("nb-fracture", "#D7263D", "Fracture", "A crack in the soul's sense of self.", "Tokens on the Soul card. At 3, you lose (Shattered).")}
      ${piece("", "", "Forgotten pile", "Everything the river has taken.", "Face-up pile of forgotten cards. Its size triggers Light as Ash (6), Adrift (9) and Faded (the Lantern's limit).")}
      ${piece("nb-fog", "#9A948C", "Mist cards", "The underworld itself: rising water, cold wind, returning fog.", "One deck per Reach. At the end of every turn, flip the top card of the current Reach's deck and carry out its instructions.")}
      ${piece("", "", "Mantles", "Roles a Ferryman can take up on the river: the Root-Weaver, the Spirit Warden, the Bloom-Bringer, the Fog-Breaker.", "Four cards. Pay Light to take one; it gives you a lasting power (section 17).")}
      ${piece("", "", "The Lantern", "How dark the river is tonight.", "The difficulty level: Gentle, Standard, Hard or Heroic (section 21).")}
      ${piece("nb-seal", "#E6D3A3", "Book of Remembrance", "The spring of Memory the old grave-texts told the dead to seek instead of Lethe. What is written here, the soul keeps.", "Three pages, one per Reach. Each page has four slots for cards (section 18).")}
      ${piece("nb-slot-place", "#E6D3A3", "Place · Person · Deed · Feeling", "The four parts of a remembered moment: where, who, what was done, and what it left behind.", "The four slots on each page. Each memory card shows which slot it fits.")}
      ${piece("nb-seal", "#D7263D", "Key Memory", "The one memory that matters most to this soul.", "One card in each named Soul's pack. It can be inscribed whenever it is played face up. Where it ends up decides the ending (section 24).")}
      ${piece("nb-soul", "#8FD6E1", "The Ghost (solo)", "A silent Ferryman who travels beside you.", "Solo only. After each of your turns, flip a Ghost card and carry it out (section 22).")}
      ${piece("nb-tok-oar", "#E6D3A3", "The Oar", "The ferry's oar, passed from hand to hand in silence.", "Shows whose turn it is. Pass it to the left at the end of your turn. In solo play, put it on the Ghost deck while the Ghost plays.")}
      ${piece("nb-tok-push", "#D7263D", "Push Through tokens", "A Ferryman's one hard shove against the shades.", "One per player, face up. Flip yours face down when you Push Through. The number of face-down tokens sets the cost of the next Push Through.")}
      ${piece("nb-tok-hold", "#8FD6E1", "Hold Fast token", "An anchor let down beside the soul.", "Put next to the soul when <i>Hold Fast</i> is played. If the soul does not move in the Soul Step, no card is forgotten. Remove it at the start of the next turn.")}
      ${piece("nb-tok-shield", "#E6D3A3", "Shield token", "A Ferryman standing between the soul and harm.", "Put in front of the player who plays <i>Hold the Line</i>. It cancels the next Fracture and is then removed. If it is not used, remove it at the end of that player's next turn. If <i>Hold the Line</i> is played again, move the token to the new player.")}
      ${piece("nb-tok-resign", "#E6D3A3", "Resignation token", "The soul, sitting down among the reeds.", "Put next to the soul when the Acceptance thread is full. In the next Soul Step the soul does not move and you forget the top card of the deck; then remove it.")}
    </tbody></table>
    <p><b>Cards that track their own use.</b> Some powers use the card itself instead of a token. Turn the <b>Spirit Warden</b> card sideways when it is used, and straighten it at the start of its holder's turn. Turn a Soul card sideways when its once-only rule has been used (section 19). In solo play, flip a Mantle you give up face down (section 17).</p>` },

  { id: "setup", title: "5. Setting up", keys: "setup set up prepare start begin layout table where put deal shuffle bank cards mist decks supply first player oar", body: `
    <p>The picture shows the table set up for the Child of the Last Flame. Its numbers match the steps below.</p>
    <div class="setupfig" aria-hidden="false"></div>
    <ol class="steps setuplist">
      <li><b>The river board.</b> Join the three panels in order: Reach I on the left (with the near shore) and Reach III on the right (ending at the Far Shore).</li>
      <li><b>Bank cards.</b> Sort the bank cards by the Reach number on their fog side: ${TILES.map(t => t[1].length).join(", ")} cards for Reaches I, II and III. Shuffle each Reach's cards separately and place them <b>fog side up</b> on the banks of spaces 2–4, 5–8 and 9–11. Do not look at the other side.</li>
      <li><b>The first Blooms and the soul.</b> Space 1 has no bank cards: put a disc Bloom side up on both of its banks. Put the soul token on the near shore (space 0).</li>
      <li><b>The Soul and the Lantern.</b> Choose a Soul (section 19) and a Lantern (section 21). Put the Soul card face up next to the board, with room for Fracture tokens. The Child of the Last Flame starts with <b>3 Light</b>; every other Soul starts with 0.</li>
      <li><b>The Memory deck.</b> Shuffle the 32 core Memory cards with the Soul's 8-card pack (the 8 Echo cards for the Open Crossing) and put the deck face down. Leave room next to it for the <b>discard pile</b> (face down) and the <b>forgotten pile</b> (face up).</li>
      <li><b>The Mist decks.</b> Build one deck for each Reach: its ${MIST[0].length} basic Mist cards, plus one <i>Rising Water</i> and one <i>Grievance Drawn Near</i>, plus the Lantern's number of harsh Mist cards chosen at random (none at Gentle). Shuffle each deck and put it face down next to its Reach.</li>
      <li><b>The Loom of the Fates.</b> Put the Loom board out with its three threads, ${ico(TAG_ICONS[0], TAGCOL[0])}Obsession, ${ico(TAG_ICONS[1], TAGCOL[1])}Acceptance and ${ico(TAG_ICONS[2], TAGCOL[2])}Oblivion, and put the knot discs next to it. A thread is full at 4 knots with 2–3 players, and at 5 in solo play or with 4 players. Keep the Echo token next to the Loom: it goes onto a thread when the first card is played face up or Burned.</li>
      <li><b>The Mantles.</b> Put the four Mantle cards face up where everyone can reach them.</li>
      <li><b>The Book of Remembrance.</b> Open the chosen Soul's Book at page I, with the photo corners ready.</li>
      <li><b>The supply.</b> Put the Root/Bloom discs, Grievances, Light, Fractures, knots and the Hold Fast, Shield and Resignation tokens within reach. Take only the Lantern's number of Black Water tokens (${Object.values(LANTERN).map(l => l[0]).join(", ")} for ${Object.values(LANTERN_NAMES).join(", ")}) and put the rest back in the box.</li>
      <li><b>The Ferrymen.</b> Deal each player a hand: 4 cards in solo play, 3 with 2–4 players. Each player takes a Push Through token, face up. The first player takes the <b>Oar</b>. In solo play, shuffle the ${GHOST.length} Ghost cards into a face-down Ghost deck next to you.</li>
    </ol>
    <p>Then the Rule of Silence begins (section 3), and the first player takes the first turn.</p>` },

  { id: "overview", title: "6. How a game unfolds", keys: "arc chapters reaches pacing overview flow game length", body: `
    <p>A game lasts about 15 turns. Each Reach of the river matches one page of the Book of Remembrance:</p>
    <ul>
      <li><b>Reach I, the Asphodel Road: page I, Who I Was.</b> Where the soul was born, who it loved, what it carried.</li>
      <li><b>Reach II, the Fields of Mourning: page II, What I Did.</b> The deed that defined it, and its price.</li>
      <li><b>Reach III, the Banks of Lethe: page III, What I Carry.</b> What it forgives, what it cannot undo, what it keeps.</li>
    </ul>
    <p>Later Reaches are harder: their Mist cards are stronger, and by then more cards have usually been forgotten. When the soul reaches the Far Shore, the Key Memory decides the ending (section 24).</p>` },

  { id: "board", title: "7. The river", keys: "spaces reach bank slot near shore far shore left right", body: `
    <p>The river has 13 spaces: the near shore (0), spaces 1 to 11, and the Far Shore (12). Each space from 1 to 11 has a <b>left</b> and a <b>right bank</b>, and each bank holds at most one disc or token. Banks are named as you face downstream toward the Far Shore.</p>
    <ul><li><b>Reach I, the Asphodel Road</b>: spaces 1–4.</li><li><b>Reach II, the Fields of Mourning</b>: spaces 5–8.</li><li><b>Reach III, the Banks of Lethe</b>: spaces 9–11.</li></ul>
    <p>Each Reach has its own Mist deck and its own page in the Book of Remembrance. When the soul moves onto the first space of a new Reach, remove all knots from the Loom (section 14).</p>
    <p>At setup both banks of space 1 have a Bloom, so the soul's first move is always possible. The banks of spaces 2–11 start covered by bank cards, fog side up.</p>
    <p>"Ahead of the soul" means the spaces with a higher number than the soul's space. "The next space" is the space directly ahead.</p>` },

  { id: "tokens", title: "8. Roots, Blooms and the network", keys: "root bloom lit network touch place", body: `
    <p>${ico("nb-root", "#E6D3A3")} A <b>Root</b> is a disc Root side up. ${ico("nb-bloom", "#D7263D")} A <b>Bloom</b> is the same disc Bloom side up.</p>
    <p>A space is <b>Lit</b> when at least one of its banks has a Bloom. The soul only moves onto Lit spaces.</p>
    <p><b>Placing a Root.</b> Put a disc Root side up on an empty bank (no disc, no Grievance) on the soul's space or ahead of it. The bank must <b>touch the network</b>, meaning at least one of these is true:</p>
    <ul><li>it is on the soul's space or the next space, or</li><li>the other bank of the same space has a disc, or</li><li>the same bank (left or right) of the space directly before or after it has a disc.</li></ul>
    <p>If the bank is covered by a bank card, flip the card first; it decides whether the Root is placed (section 9).</p>
    <p><b>Blooming a Root.</b> Flip a Root disc on the soul's space or ahead of it to its Bloom side.</p>
    <p><b>Withering a Bloom.</b> Flip a Bloom disc back to its Root side. The space may stop being Lit.</p>
    ${fig("network")}` },

  { id: "fog", title: "9. Fog and bank cards", keys: "fertile stony memory site grave reveal keepsake fog bank card", body: `
    <p>${ico("nb-fog", "#9A948C")} When you place a Root on a bank that is still covered, flip its bank card face up. The card stays face up on the bank, and its type decides what happens:</p>
    <ul>
      <li>${ico("nb-fertile", "#6d665e")} <b>Fertile</b>: place the Root.</li>
      <li>${ico("nb-stony", "#9A948C")} <b>Stony</b>: place the Root only if the card's effect says "even on Stony ground" or you hold the Root-Weaver. Otherwise no Root is placed, and that Root is lost.</li>
      <li>${ico("nb-memorysite", "#E6D3A3")} <b>Memory Site</b>: place the Root and take a keepsake. In the Open Crossing, also gain 2 Light.</li>
      <li>${ico("nb-grave", "#8FD6E1")} <b>Grave</b>: no Root is placed. Put a Grievance on this bank.</li>
    </ul>
    <p>A bank with no bank card (both banks of space 1, or a bank whose Grave card was removed) counts as Fertile. A bank whose card is already face up follows the same rules: Roots can be placed on Fertile and Memory Site banks, on Stony banks only as described above, and never on a Grave.</p>
    <p>Reach I has 3 Fertile, 1 Stony and 2 Memory Site cards. Reach II has 3 Fertile, 2 Stony, 2 Memory Site and 1 Grave. Reach III has 2 Fertile, 1 Stony, 2 Memory Site and 1 Grave.</p>
    <p>Some cards change bank cards. The Mist card <i>Fog Returns</i> flips face-up bank cards on empty banks back to their fog side. Cards that "lift the fog" flip bank cards face up without placing Roots (section 25).</p>
    ${fig("tiles")}` },

  { id: "turn", title: "10. Your turn", keys: "turn order sequence summon play draw", body: `
    <p>Players take turns clockwise, starting with the first player. On your turn, do these steps in order:</p>
    <ol class="steps">
      <li><b>Summon a Mantle</b> (optional, before your first action; section 17).</li>
      <li><b>The Answer</b> (your first action): play a card face up, face down or Burned, <b>Seek</b>, <b>Recall</b> a forgotten card for 3 Light, or <b>Push Through</b>.</li>
      <li><b>The Steer</b> (your second action): the same choices except Recall. You may Seek only once per turn, and each player may Push Through only once per game.</li>
      <li><b>End of turn</b>: carry out the end-of-turn steps in section 11.</li>
    </ol>
    <p>Hand size is 4 in solo play and 3 with 2–4 players.</p>` },

  { id: "endturn", title: "11. The end of the turn", keys: "end of turn end of round round resolution cleanup upkeep order sequence after actions soul step mist settle draw oar light collect bloom-bringer", body: `
    <p>The end-of-turn steps happen after <b>every player's turn</b>, not once per round: with three players they happen three times before the first player's next turn. Do them in this order.</p>
    <ol class="steps">
      <li><b>Bloom-Bringer.</b> If the active player holds the Bloom-Bringer, they may flip one Root on the soul's space or ahead of it to its Bloom side, for free.</li>
      <li><b>Soul Step</b> (section 15). Check these in order and do the first that applies:
        <ol type="a">
          <li><b>Is the Resignation token next to the soul?</b> The soul does not move. Forget the top card of the deck (nothing can prevent this), then remove the token. Go to <i>e</i>.</li>
          <li><b>Is the next space Lit and free of Black Water?</b> Move the soul onto it. ${ico("nb-light", "#E6D3A3")} Gain 1 Light for each Bloom on the space the soul moved off. Then return all discs and Grievances on that space to the supply. If the soul has moved onto the first space of a new Reach, remove all knots from the Loom (the Echo stays on its thread) and straighten the Child's Soul card.</li>
          <li><b>Extra moves.</b> If 9 or more cards are forgotten (<b>Adrift</b>), the soul moves one more space. If that space is Lit and free of Black Water, it simply moves there. If not, it moves there anyway and takes 1 Fracture, unless the Spirit Warden is unused: then turn the Warden sideways, and the soul does not take the extra move. Otherwise, if 6 or more cards are forgotten (<b>Light as Ash</b>), the soul moves one more space, but only if that space is Lit and free of Black Water. Each extra move also gives the Light for the space it moves off.</li>
          <li><b>The soul cannot move: it Lingers</b> (it stays where it is). Check these in order and apply the first that fits: the Hold Fast token is next to the soul, so nothing is forgotten; the Spirit Warden is unused, so turn it sideways and nothing is forgotten; the soul's own space is Lit, so nothing is forgotten; the Bride, once per game, moves back one space instead (turn her Soul card sideways). Otherwise, <b>forget the top card of the deck</b>.</li>
          <li><b>Grievance damage.</b> If there is a Grievance on either bank of the soul's space (one or two), the soul takes <b>1 Fracture</b>.</li>
        </ol></li>
      <li><b>Mist</b> (section 20). Flip the top card of the Mist deck of the Reach the soul is in now and carry out its instructions in order. Distances are counted from the soul's space. Then put the card face up on that Reach's Mist discard pile. If the deck is empty, first shuffle that Reach's ${MIST[0].length} basic Mist cards into a new deck.</li>
      <li><b>Cleanup</b> (section 16).
        <ul><li>For each space with Black Water and a disc (Root or Bloom) on <b>both</b> banks: remove the Black Water token from the game (put it in the box).</li>
          <li>For each Grievance with a Bloom on the same bank of the space directly before it <b>and</b> the space directly after it: return the Grievance to the supply.</li></ul></li>
      <li><b>Draw</b> back up to your hand size. If the deck is empty, shuffle the discard pile to form a new deck and continue drawing.</li>
      <li><b>Solo: the Ghost.</b> Flip the top Ghost card and do its action (section 22). Add a knot to its thread (a full thread causes a Backlash) and move the Echo to that thread. Then do Cleanup again (step 4). When the Ghost deck is empty, shuffle all Ghost cards into a new deck.</li>
      <li><b>Pass the Oar</b> to the player on your left. In solo play it comes back to you after the Ghost.</li>
    </ol>
    <h4>At the start of the next turn</h4>
    <ul>
      <li>Remove the <b>Hold Fast</b> token if it is out.</li>
      <li>If you hold the <b>Spirit Warden</b>, straighten it at the start of your own turn.</li>
      <li>A <b>Shield</b> token that has not cancelled a Fracture is removed at the end of its owner's next turn.</li>
    </ul>
    <h4>Effects that happen immediately</h4>
    <p>Some effects do not wait for a step. A thread that becomes full causes its <b>Backlash</b> at once. A Book page that reaches its count gives its <b>Chapter Blessing</b> at once. A Memory Site gives its keepsake (and, in the Open Crossing, its Light) when its card is flipped. The game ends the moment the soul reaches the Far Shore (you win), the forgotten pile reaches the Lantern's limit (<b>Faded</b>), the soul takes its third Fracture (<b>Shattered</b>), or a Black Water token must be placed with none left in the supply (<b>Deluge</b>). A Fracture cancelled by a Shield or by the Child's rule is not taken.</p>` },

  { id: "modes", title: "12. Your two actions: play a card, Seek, Recall or Push Through", keys: "face up face down burn mode seek discard draw action stuck push through recall light remember", body: `
    <p>Each turn you take <b>two actions</b>, one at a time. The first is the <b>Answer</b>; only the Answer can Resonate (section 13). The second is the <b>Steer</b>. For each action, choose one of the following.</p>
    <p><b>Play a card</b> from your hand in one of three ways:</p>
    <ul>
      <li><b>Face up</b>: do the card's effect, add one knot to its thread on the Loom, and move the Echo to that thread. Then put an Obsession or Acceptance card on the discard pile and an <b>Oblivion</b> card on the forgotten pile.</li>
      <li><b>Face down</b>: place 1 Root (following the rules in section 8). Ignore the card's printed effect. No knot is added and the Echo does not move. Put the card on the discard pile without showing it.</li>
      <li><b>Burn</b>: do the card's effect <b>twice</b>, add one knot to its thread, and move the Echo to that thread. If the Burned card is your Answer and matches the Echo, it Resonates as well. Then put the card on the forgotten pile, and also forget the top card of the deck.</li>
    </ul>
    <p><b>Seek</b> (once per turn): discard a card from your hand and draw one. No card is played, no knot is added and the Echo does not move. If your Answer is a Seek, you cannot Resonate this turn. If your Steer is a Seek, the Echo stays where your Answer put it.</p>
    <p><b>Recall</b> (Answer only): spend <b>3 Light</b> and choose any card in the forgotten pile; put it on the discard pile, so it can be drawn again later. No knot is added and the Echo does not move. Because it uses your Answer, you cannot Resonate this turn. A forgotten Key Memory can be Recalled.</p>
    <p><b>Push Through</b> (Answer or Steer; each player only <b>once per game</b>): only when Grievances are on <b>both</b> banks of the next space and that space has no Black Water. Return both Grievances to the supply, move the soul onto that space at once (gain its Light as usual), and flip your Push Through token face down. The soul then takes Fractures and you forget the top card of the deck (section 15). No card is used. Your turn continues: you still take your other action, and the end-of-turn steps still follow. If your Answer is a Push Through, you cannot Resonate this turn.</p>
    <p><b>Forget</b> means: put the card face up on the forgotten pile. "Forget the top card of the deck" means: put the top card of the Memory deck on the forgotten pile without playing it. If the deck is empty, shuffle the discard pile into a new deck first.</p>
    <p>The <b>discard pile</b> is face down; every card goes onto it face down, and nobody looks through it. The <b>forgotten pile</b> is face up, and anyone may look through it.</p>
    ${fig("card")}` },

  { id: "echo", title: "13. The Echo and Resonance", keys: "echo resonance resonate thread silent signal", body: `
    <p>${ico("nb-echo", "#8FD6E1")} The <b>Echo</b> token sits on the thread of the last card played face up or Burned, by any player (or the Ghost). It does not move when a card is played face down, or for a Seek, Recall or Push Through.</p>
    <p>If your <b>Answer</b> is a card played face up or Burned whose thread matches the Echo, the card <b>Resonates</b>: also do its Resonance effect. On some Oblivion cards the Resonance replaces the normal effect ("Instead"). A Resonating card may be inscribed in the Book of Remembrance (section 18).</p>
    <p>Your Steer can never Resonate. If your Answer is a Seek, a Recall or a Push Through, you cannot Resonate this turn.</p>
    <p>Because players cannot talk, the Echo you leave is how you tell the next player which thread to play.</p>
    ${fig("echo")}` },

  { id: "loom", title: "14. The Loom of the Fates and Backlash", keys: "loom knot thread backlash grasping resignation tide karma", body: `
    <p>The Loom has three threads: ${ico(TAG_ICONS[0], TAGCOL[0])}<b>Obsession</b>, ${ico(TAG_ICONS[1], TAGCOL[1])}<b>Acceptance</b> and ${ico(TAG_ICONS[2], TAGCOL[2])}<b>Oblivion</b>. Each card played face up or Burned adds one knot to its thread. A thread is full at 4 knots with 2–3 players, and at 5 in solo play or with 4 players.</p>
    <p>When a thread becomes full, remove all its knots and resolve its <b>Backlash</b>:</p>
    <ul>
      <li><b>Obsession, Grasping</b>: place a Grievance on the soul's space: on the left bank if it is free, otherwise on the right bank. If both banks already have a Grievance (or the soul is on the near shore), place it on the left bank of the next space instead (or the right bank if the left is taken).</li>
      <li><b>Acceptance, Resignation</b>: put the Resignation token next to the soul. In the next Soul Step the soul does not move and you forget the top card of the deck; then remove the token.</li>
      <li><b>Oblivion, the Tide Rises</b>: place a Black Water token on the next space (section 16).</li>
    </ul>
    <p>When the soul moves onto the first space of a new Reach, remove all knots from all three threads. The Echo stays where it is.</p>
    ${fig("loom")}` },

  { id: "soulstep", title: "15. The Soul Step", keys: "move linger light as ash adrift forget hold", body: `
    <p>In the Soul Step (end-of-turn step 2), the soul tries to move one space. If the next space is <b>Lit and has no Black Water</b>, the soul moves onto it. Gain 1 Light for each Bloom on the space it moved off, then return everything on that space to the supply. Each Bloom therefore gives Light only once (section 17).</p>
    <p>If the soul cannot move, it <b>Lingers</b>: it stays on its space. If its own space is Lit, nothing else happens. Otherwise, forget the top card of the deck, unless the Hold Fast token is next to the soul or the Spirit Warden is used.</p>
    <p><b>Push Through.</b> Grievances on <b>both</b> banks of the next space make it impossible for the soul to move there, even if the space is Lit. Any player may use an action to <b>Push Through</b> (each player once per game, and only if that space has no Black Water): return both Grievances to the supply and move the soul onto the space at once. The soul takes <b>1 Fracture</b>, plus 1 more for each Push Through token already face down, and you forget the top card of the deck. So the first Push Through costs 1 Fracture, the second 2 and the third 3 (which means Shattered). The Soul Step still happens at the end of the turn as usual.</p>
    <p><b>Light as Ash.</b> With 6 or more cards in the forgotten pile, each time the soul moves in the Soul Step it moves one extra space, if that space is Lit and has no Black Water.</p>
    <p><b>Adrift.</b> With 9 or more cards in the forgotten pile, each time the soul moves in the Soul Step it moves one extra space. If that space is not Lit or has Black Water, the soul moves onto it anyway and takes 1 Fracture, unless an unused Spirit Warden is turned sideways to cancel the extra move.</p>
    <p><b>Grievance damage.</b> At the end of the Soul Step, if there is a Grievance on either bank of the soul's space, the soul takes <b>1 Fracture</b>. Two Grievances still cause only 1 Fracture. This happens in every Soul Step, whether the soul moved or Lingered.</p>
    ${fig("soulstep")}` },

  { id: "threats", title: "16. Black Water, Grievances and Fractures", keys: "black water flood drain deluge grievance fracture shield trapped banish", body: `
    <p>${ico("nb-blackwater", "#9A948C")} <b>Placing Black Water.</b> Put a Black Water token on the space named (for example "the next space" or "2 spaces ahead of the soul"). If that space already has Black Water, use the first space after it without Black Water; if there is none ahead, use the nearest space between it and the soul. Black Water is never placed on the soul's own space. Flip every Bloom on that space to its Root side. The soul cannot move onto a space with Black Water. If you must place Black Water and the supply is empty, you lose (<b>Deluge</b>).</p>
    <p><b>Removing Black Water.</b> In Cleanup, if both banks of a space with Black Water have a disc (Root or Bloom), remove the Black Water token from the game. Cards that say "drain" remove a Black Water token the same way. Removed Black Water never returns to the supply.</p>
    <p>${ico("nb-grievance", "#8FD6E1")} <b>Placing a Grievance.</b> Put the Grievance on the bank named. If that bank already has a Grievance, use the other bank of the same space; if both are taken, continue with the next space ahead. A disc on that bank is returned to the supply. No Root can be placed on a bank with a Grievance.</p>
    <p><b>Removing Grievances.</b> In Cleanup, return a Grievance to the supply if the same bank (left or right) of the space directly before it and the space directly after it both have a Bloom. Cards that say "banish" or "wash away" also return Grievances to the supply. The bank card under a removed Grievance stays as it was.</p>
    <p>${ico("nb-fracture", "#D7263D")} <b>Fractures</b> come from Grievance damage, Push Through, Adrift and the Mist card <i>Dark Wind</i>. Put each one on the Soul card. At 3 Fractures you lose (<b>Shattered</b>). <i>Hold the Line</i> gives the Shield token: it cancels the next Fracture, then is removed; if unused, it is removed at the end of its owner's next turn.</p>
    ${fig("threats")}` },

  { id: "mantles", title: "17. Mantles and Light", keys: "mantle summon light weaver warden bringer breaker recall resummon lay down solo", body: `
    <p>Light is a shared pool. There are two ways to spend it:</p>
    <ul>
      <li><b>Summon a Mantle</b> before your Answer: pay 3 Light (2 with the King on the Barge) and discard one card from your hand with the same thread as the Mantle. Take the Mantle card. With 2–4 players, each player holds at most one Mantle and keeps it for the rest of the game.</li>
      <li><b>Recall</b> as your Answer: pay 3 Light to move one forgotten card of your choice to the discard pile (section 12).</li>
    </ul>
    <p><b>Gaining Light.</b> Each time the soul moves off a space, gain 1 Light for each Bloom on that space (2 Light if both banks have a Bloom). The space is then cleared, so each Bloom gives Light only once. This happens whenever the soul moves: in the Soul Step, in extra moves, by a card that moves the soul, or by a Push Through. Blooms ahead of the soul give nothing until the soul moves off their space. Light stays in the pool until it is spent or lost to the Mist card <i>Dark Wind</i>. The Open Crossing also gains 2 Light for each Memory Site flipped, and the Child of the Last Flame starts with 3.</p>
    <p><b>Solo: replacing a Mantle.</b> In solo play you may summon a new Mantle while you hold one. Flip the old Mantle face down: it can never be summoned again. Each Mantle can be summoned only once, and you may summon at most <b>3</b> times per game.</p>
    <ul>${Object.values(MANTLES).map(m => `<li>${ico(TAG_ICONS[m.tag], TAGCOL[m.tag])}<b>${esc(m.name)}</b>: ${esc(m.text)}</li>`).join("")}</ul>
    <p><b>Spirit Warden.</b> "Once per round" means once between the start of the holder's turn and the start of their next turn. It also works on other players' turns. When it is used, turn the card sideways; straighten it at the start of the holder's turn. When it stops a Linger, the soul stays where it is but no card is forgotten. When it stops Adrift (only when the extra space is not Lit or has Black Water), the soul does not take the extra move and takes no Fracture.</p>
    <p><b>Bloom-Bringer.</b> Its power is used only in end-of-turn step 1 of the holder's own turn.</p>
    ${fig("mantles")}` },

  { id: "book", title: "18. The Book of Remembrance", keys: "inscribe page chapter blessing key memory keepsake slot place person deed feeling", body: `
    <p>The Book has one page per Reach. Each page has four slots, <b>Place</b>, <b>Person</b>, <b>Deed</b> and <b>Feeling</b>, which complete a sentence about the soul's life.</p>
    <p><b>Inscribing.</b> When a card Resonates, you may inscribe it if the slot shown on the card is still empty on the page of the Reach the soul is in. A <b>Key Memory</b> may be inscribed whenever it is played face up, Resonating or not. To inscribe, put the card in its slot with photo corners instead of discarding it. It stays there for the rest of the game, so it is no longer in the deck. Oblivion cards and Burned cards cannot be inscribed.</p>
    <p><b>Chapter Blessing.</b> When a page has 3 inscribed cards (2 for the Garland Girl), it gives one Chapter Blessing, immediately (only once per page). The Blessing is not chosen. Check these in order and do the first one that is possible:</p>
    <ol class="steps">
      <li>If the soul has at least one Fracture: remove 1 Fracture.</li>
      <li>Otherwise, if any space has Black Water: remove the Black Water token closest ahead of the soul from the game.</li>
      <li>Otherwise, if the forgotten pile has any cards: move its top card (the most recently forgotten) to the discard pile.</li>
      <li>Otherwise nothing happens.</li>
    </ol>
    <p>At the end of the game, the Book is read aloud. An empty slot is read as "…but this, the river has taken".</p>
    ${fig("book")}` },

  { id: "souls", title: "19. The Souls", keys: "child king garland bride open crossing twist first game new players suggested story", body: `
    ${lore("Four souls the old ferryman would not carry, and one with no name at all.")}
    <p>Each named Soul adds its own 8-card pack of memories, including one <b>Key Memory</b>, and one special rule. The Open Crossing adds the 8 Echo cards instead.</p>
    <h4>${esc(SOULS.child.name)}</h4>
    <p>A small child alone in a doorway on the coldest night of the year, with a handful of little lights to sell and none sold. To keep warm she lights them one by one, and in each flame she sees something: a warm stove, a feast, and at last the one person who ever held her, coming to take her home.</p>
    <p><b>Special rule:</b> ${esc(SOULS.child.twist)} Turn her Soul card sideways when a Fracture is ignored, and straighten it when the soul moves onto the first space of a new Reach. <b>Key Memory:</b> <i>${esc(CARDS.find(c => c.id === "L04").band)}</i>.</p>
    <h4>${esc(SOULS.garland.name)}</h4>
    <p>A young woman who wove a flower for everyone she loved. Her father died, the man who promised to marry her turned cruel, and she gave her flowers away one by one and slipped into a brook still singing. She kept one flower for herself, and no one ever learned which.</p>
    <p><b>Special rule:</b> ${esc(SOULS.garland.twist)} <b>Key Memory:</b> <i>${esc(CARDS.find(c => c.id === "G-04").band)}</i>.</p>
    <h4>${esc(SOULS.king.name)}</h4>
    <p>An old king who won every battle but the last. His closest friend loved his queen, his fellowship broke apart, and he fell on a field of his own making. Dying, he was laid on a black barge. The sword he was lent was never returned to the water it came from, and so he cannot rest.</p>
    <p><b>Special rule:</b> ${esc(SOULS.king.twist)} The Mantle is lost by the active player when the soul takes a Fracture during their turn (including its end-of-turn steps); put the Mantle back with the others, and it can be summoned again. <b>Key Memory:</b> <i>${esc(CARDS.find(c => c.id === "K04").band)}</i>.</p>
    <h4>${esc(SOULS.bride.name)}</h4>
    <p>She died on her wedding day. Her husband came down into the dark to bring her back, on one condition: he must not look back until they reached the light. One step from the surface, he turned. She has stood in the shadows ever since, deciding whether to remember his face or let it go.</p>
    <p><b>Special rule:</b> ${esc(SOULS.bride.twist)} This happens only when her own space is not Lit and nothing else stops the Linger. Turn her Soul card sideways once it has been used. <b>Key Memory:</b> <i>${esc(CARDS.find(c => c.id === "B04").band)}</i>.</p>
    <h4>${esc(SOULS.open.name)}</h4>
    <p>A nameless soul. You do not learn its story; you write it. <b>Special rule:</b> ${esc(SOULS.open.twist)} There is no Key Memory; the Book is the soul's whole story.</p>
    <p class="rsuggest">${ico("nb-light", "#E6D3A3")}<b>Your first game:</b> we suggest <b>${esc(SOULS[FIRST_SOUL].name)}</b> at the Gentle Lantern. Its rules forgive more mistakes while you learn the river, the Loom and the Book.</p>
    ${fig("souls")}` },

  { id: "mist", title: "20. The Mist", keys: "mist harsh card deck rising water withering cold wind fog returns severed", body: `
    <p>At the end of every turn (end-of-turn step 3), flip the top card of the Mist deck of the Reach the soul is in and carry out its instructions in order. "Ahead of the soul" counts from the soul's space: 1 space ahead is the next space. Each deck holds its Reach's basic Mist cards, 2 extra cards (<i>Rising Water</i> and <i>Grievance Drawn Near</i>) and, at every Lantern except Gentle, some <b>harsh</b> cards. When a deck is empty, shuffle that Reach's basic cards (only) into a new deck.</p>
    <p>"Forget" on a Mist card means forget the top card of the Memory deck. "Remove the Echo from the Loom" means take the Echo token off its thread: no card can Resonate until a card is played face up or Burned again.</p>${mistTable()}
    ${fig("mist")}` },

  { id: "lantern", title: "21. Lantern levels", keys: "difficulty lantern level gentle standard hard heroic", body: `
    <p>The Lantern sets the difficulty. <b>Standard</b> is the normal game: an experienced group should win about half its games. Use <b>Gentle</b> for learning, and <b>Hard</b> or <b>Heroic</b> for more challenge.</p>${lanternTable()}` },

  { id: "solo", title: "22. Solo play and the Ghost", keys: "solo ghost automaton", body: `
    <p>In solo play you hold 4 cards and each Loom thread is full at 5 knots. After each of your turns (end-of-turn step 6), the <b>Ghost</b> plays: flip the top card of the Ghost deck and do its action, using the same placement rules as a player (section 8). Then add a knot to its thread and move the Echo there, so your next Answer can Resonate with it.</p>
    <p>You may replace your Mantle with a new one (section 17): the old one is flipped face down for good, and you have 3 summons in total. You may also spend Light on a Recall, like any player.</p>${ghostTable()}
    ${fig("solo")}` },

  { id: "end", title: "23. Winning and losing", keys: "win lose faded shattered deluge end", body: `
    <p><b>Win</b>: the soul reaches the Far Shore (space 12).</p>
    <p><b>Lose</b> at once if:</p>
    <ul>
      <li><b>Faded</b>: the forgotten pile reaches the Lantern's limit.</li>
      <li><b>Shattered</b>: the soul has 3 Fractures.</li>
      <li><b>Deluge</b>: a Black Water token must be placed and the supply is empty.</li>
    </ul>` },

  { id: "endings", title: "24. The Far Shore and the cup", keys: "ending key memory inscribed forgotten unspoken read aloud epilogue cup keeper", body: `
    <p>When the game ends, the Rule of Silence ends. Check where the soul's <b>Key Memory</b> card is:</p>
    <ul>
      <li><b>Inscribed in the Book</b>: the soul crosses remembering what mattered most.</li>
      <li><b>In the forgotten pile</b>: the soul crosses without it, lighter and emptier.</li>
      <li><b>Anywhere else</b> (deck, a hand or the discard pile): it was never spoken, and the soul crosses with it unsaid.</li>
    </ul>
    <p>Then read the Book aloud, page by page. Even after a loss, read it: empty slots are read as "…but this, the river has taken".</p>` },

  { id: "terms", title: "25. Card terms", keys: "glossary terms keywords bloom banish drain mend wash wither untie lift fog forget linger lit guide", body: `
    <p>The words printed on the cards mean exactly this:</p>
    <ul>
      <li><b>Place a Root</b>: put a disc Root side up on a bank that touches the network (section 8). "Even on Stony ground" allows Stony banks.</li>
      <li><b>Bloom a Root</b>: flip a Root disc on the soul's space or ahead of it to its Bloom side.</li>
      <li><b>Wither</b>: flip a Bloom disc to its Root side.</li>
      <li><b>Lit</b>: a space with a Bloom on at least one bank.</li>
      <li><b>Mend a Fracture</b>: remove 1 Fracture token from the Soul card.</li>
      <li><b>Banish the nearest Grievance</b>: return the Grievance closest to the soul (on its space or ahead) to the supply.</li>
      <li><b>Wash away the Grievances beside the soul</b>: return all Grievances on the soul's space to the supply.</li>
      <li><b>Drain the nearest Black Water</b>: remove the Black Water token closest ahead of the soul from the game. "Drain all Black Water in this Reach" removes every Black Water token in the soul's Reach.</li>
      <li><b>Untie knots on the fullest thread</b>: remove that many knots from the thread with the most knots (no Backlash). "Empty the fullest thread" removes all of its knots.</li>
      <li><b>Tie a knot</b>: add a knot to that thread. If this fills it, resolve its Backlash.</li>
      <li><b>Lift the fog across this Reach; Graves turn Fertile</b>: flip every fog-side-up bank card in the soul's Reach face up without placing Roots. Remove every Grave card flipped this way from the board: those banks count as Fertile. Cards flipped this way cause no Grievance, keepsake or Light.</li>
      <li><b>The soul steps forward now</b>: move the soul to the next space immediately, if it is Lit and has no Black Water. Gain its Light as usual.</li>
      <li><b>The soul waits without forgetting this turn</b>: put the Hold Fast token next to the soul.</li>
      <li><b>Prevent the next Fracture</b>: take the Shield token (section 16).</li>
      <li><b>Read the top 3 Mist cards</b>: look at the top 3 cards of the current Reach's Mist deck and put them back on top in any order.</li>
      <li><b>Forget</b>: put the card face up on the forgotten pile. <b>Linger</b>: the soul does not move in the Soul Step.</li>
    </ul>` },

  { id: "cards", title: "26. Card reference", keys: "cards reference effects", body: cardTable() },
];

// The one-page Player Aid. With a game running, it shows that game's numbers.
export const rulebook = () => (zh() ? RULEBOOK_ZH : RULEBOOK);
export function playerAid(cfg) {
  if (zh()) return playerAidZh(cfg);
  const lim = cfg ? cfg.forgottenLimit : limitRange(), cap = cfg ? cfg.karmaCap : "4–5", ash = cfg ? cfg.ashAt : 6, adrift = cfg ? (cfg.adriftAt < 99 ? cfg.adriftAt : "never") : 9;
  return `
  <section class="aid">
    <h3>On your turn</h3>
    <ol class="steps">
      <li><b>Summon</b> <span>optional · pay Light, discard a matching card${!cfg || cfg.resummon ? ". Solo: you may trade your Mantle for a new one (the old is laid down for good), 3 summons a game" : ""}</span></li>
      <li><b>Answer</b> <span>your first action: a card played face up or Burned on the Echo's thread Resonates</span></li>
      <li><b>Steer</b> <span>your second action. Either may be a Seek (once a turn) or a Push Through (once a game for each Ferryman)</span></li>
      <li><b>End of turn</b> <span>1 Bloom-Bringer · 2 Soul Step: next space Lit and no Black Water, move; otherwise Linger · 3 Mist: flip the top card of this Reach's deck · 4 Cleanup · 5 Draw up · 6 Solo: Ghost · 7 Pass the Oar</span></li>
      <li><b>Cleanup</b> <span>remove Black Water where both banks have a disc; remove a Grievance with a Bloom on the same bank before and after it</span></li>
    </ol>
    <h3>Play a card</h3>
    <div class="aidgrid">
      <div><b>Face up</b><span>effect + knot + new Echo</span></div>
      <div><b>Face down</b><span>place 1 Root; no knot, Echo stays</span></div>
      <div><b>Burn</b><span>effect ×2 + knot + new Echo; forget it and the top card of the deck</span></div>
      <div><b>Seek</b><span>once a turn: discard 1, draw 1; no Resonance this turn if it is your Answer</span></div>
      <div><b>Recall</b><span>your Answer only; 3 Light: a forgotten card of your choice returns to the discard pile</span></div>
      <div><b>Push Through</b><span>Grievances on both banks of the next space (no Black Water): remove both and move the soul there; 1 Fracture (+1 per face-down Push Through token), forget 1; once a game for each player</span></div>
    </div>
    <h3>Threads (${cap} knots)</h3>
    <div class="aidgrid">
      <div class="c-obs">${ico(TAG_ICONS[0], TAGCOL[0])}<b>Obsession</b><span>Full: Grievance on the soul's space</span></div>
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
    <h3>Lose if</h3>
    <p><b>Faded</b> (${lim} forgotten) · <b>Shattered</b> (3 Fractures) · <b>Deluge</b> (Black Water must be placed, none left)</p>
    <h3>Icons</h3>
    <div class="aidicons">
      <span>${ico("nb-bloom", "#D7263D")}Bloom</span><span>${ico("nb-root", "#E6D3A3")}Root</span><span>${ico("nb-grievance", "#8FD6E1")}Grievance</span>
      <span>${ico("nb-blackwater", "#9A948C")}Black Water</span><span>${ico("nb-fog", "#9A948C")}Fog</span><span>${ico("nb-stony", "#9A948C")}Stony</span>
      <span>${ico("nb-memorysite", "#E6D3A3")}Memory Site</span><span>${ico("nb-grave", "#8FD6E1")}Grave</span><span>${ico("nb-fracture", "#D7263D")}Fracture</span>
      <span>${ico("nb-light", "#E6D3A3")}Light</span><span>${ico("nb-echo", "#8FD6E1")}Echo</span><span>${ico("nb-seal", "#E6D3A3")}Blessing</span>
    </div>
    <h3>Tokens</h3>
    <div class="aidicons">
      <span>${ico("nb-tok-oar", "#E6D3A3")}Oar: whose turn</span><span>${ico("nb-tok-push", "#D7263D")}Push Through: 1 each</span><span>${ico("nb-tok-hold", "#8FD6E1")}Hold Fast</span>
      <span>${ico("nb-tok-shield", "#E6D3A3")}Shield</span><span>${ico("nb-tok-resign", "#E6D3A3")}Resignation</span>
    </div>
    <p>Discard pile face down; forgotten pile face up.</p>
  </section>`;
}
