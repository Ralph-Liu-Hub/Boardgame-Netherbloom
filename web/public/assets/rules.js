// The searchable Rulebook and the Player Aid sheet. Card and Mist tables are built from cards.js,
// so the reference always matches the cards the engine plays.
import {
  CARDS, TAG_NAMES, TAG_ICONS, MANTLES, SOULS, FIRST_SOUL, LANTERN, LANTERN_NAMES, lanternIcon, limitRange, MIST, HARSH, MIST_TEXT, opsText, GHOST,
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
    <p>You are the <b>Ferrymen</b>: servants of the underworld, neither living nor dead. The coinless the old ferryman will not carry are given to you. You have no boat. You have something stranger. Along the banks of Lethe grows the <b>Netherbloom</b>, a crimson flower shaped like a spider lily, blooming on a bare stalk with no leaves, because <i>flower and leaf never meet</i>. Its glow is the only light in the fog that a lost soul can follow. Where you plant Netherblooms, a soul can walk.</p>
    <p>One more thing: the servants of the river are bound to silence. No Ferryman may speak on the water, not to the dead and not to one another. Whatever you mean to say to each other, you must say with the flowers you plant and the choices you make.</p>` },

  { id: "mission", title: "2. Your mission", keys: "goal mission objective win lose escort remember purpose", body: `
    ${lore("Carry one soul to the Far Shore, and help it remember who it was.")}
    <p>Every game, one soul wakes on the near shore. You share two tasks, and you succeed or fail together:</p>
    <ol class="steps">
      <li><b>The crossing.</b> Light a path of Netherblooms across the three Reaches of the river and bring the soul to the Far Shore at space 12. That is how you <b>win</b>.</li>
      <li><b>The remembering.</b> The soul's memories are the cards in your hands. As you play them, the best of them can be <b>inscribed</b> in the <b>Book of Remembrance</b>, a sentence at a time. What you write decides <i>how</i> the soul meets the Keeper, and the Book is read aloud when the crossing ends.</li>
    </ol>
    <p>The river fights back in three ways, and each is a way to lose:</p>
    <ul>
      <li>${ico("nb-fog", "#9A948C")} <b>Faded</b>: the soul forgets too much and dissolves into the mist.</li>
      <li>${ico("nb-fracture", "#D7263D")} <b>Shattered</b>: grief breaks the soul three times.</li>
      <li>${ico("nb-blackwater", "#9A948C")} <b>Deluge</b>: the black water rises with nothing left to hold it back.</li>
    </ul>
    <p>The tension at the heart of the game: forgetting is both a weapon and a wound. Letting memories go makes the soul lighter and faster, and some of your strongest cards are acts of forgetting. But every memory you let go is gone from the soul's story, and brings it closer to fading.</p>` },

  { id: "silence", title: "3. The Rule of Silence", keys: "talk communicate table talk etiquette silent quiet speak oath servants", body: `
    ${lore("The servants of the river serve in silence. Your only language is the last card played.")}
    <p>From setup until the soul reaches the Far Shore or is lost, nobody speaks about the game. Do not name or show the cards in your hand, hint at them, point, or ask others what to play.</p>
    <p>You may talk about what everyone can already see: the river, the Loom, the Book. Your real voice is the <b>Echo</b>, the thread of the last card played face up or Burned (section 11). Following someone's Echo says "I understood you". Leaving a clear Echo says "this is what I need next".</p>
    <p>When the game ends, the silence lifts. One of you reads the Book aloud, page by page, and the table finally hears the life it saved together.</p>` },

  { id: "pieces", title: "4. The world on your table", keys: "components pieces symbols icons meaning legend board tokens what is", body: `
    ${lore("Every piece on the table is part of the story.")}
    <p>What each piece is in the story, and what it does in play. The icons are the same ones you see on the board and the cards.</p>
    <table class="rtable rpieces"><thead><tr><th>Piece</th><th>In the story</th><th>In play</th></tr></thead><tbody>
      ${piece("nb-soul", "#EFE7D6", "The soul", "A coinless dead person, waking on the near shore with a whole life still inside them.", "The pawn you escort from space 0 to the Far Shore at space 12. It only steps onto Lit spaces.")}
      ${piece("", "", "The river", "The River Lethe, winding from the near shore to the Far Shore.", "Spaces 0 to 12. Spaces 1–11 each have a left and a right bank, and each bank holds one tile or token.")}
      ${piece("", "", "The three Reaches", "Three stretches of the underworld: the grey <b>Asphodel Road</b>, the <b>Fields of Mourning</b> where grief lingers, and the <b>Banks of Lethe</b> where the water is deepest.", "Spaces 1–4, 5–8 and 9–11. Each Reach has its own Mist deck and its own chapter in the Book. The Loom is cleared as the soul enters each one.")}
      ${piece("nb-light", "#E6D3A3", "The Far Shore", "Where the veiled Keeper waits with the cup of forgetting.", "Space 12. When the soul reaches it, you win.")}
      ${piece("nb-fog", "#9A948C", "Fog", "The mist that hides the bank. Nobody knows what lies under it.", "Covers each bank until a Root is placed there and reveals the tile below.")}
      ${piece("nb-fertile", "#6d665e", "Fertile ground", "Soft riverbank earth.", "A Root takes here.")}
      ${piece("nb-stony", "#9A948C", "Stony ground", "Hard, grey stone where little can grow.", "An ordinary Root is lost. Only stubborn Roots and the Root-Weaver grow here.")}
      ${piece("nb-memorysite", "#E6D3A3", "Memory Site", "A place the soul once knew, surfacing through the fog.", "The Root takes and you find a <b>keepsake</b>, a small object from the soul's life. In the Open Crossing it also gives 2 Light.")}
      ${piece("nb-grave", "#8FD6E1", "Grave", "A grave on the bank. Something unfinished is buried here.", "No Root grows. A Grievance rises instead.")}
      ${piece("nb-root", "#E6D3A3", "Root", "A Netherbloom seed, planted in the dark.", "Extends your network. It does not light a space by itself.")}
      ${piece("nb-bloom", "#D7263D", "Bloom", "An open Netherbloom, glowing crimson. The only light a lost soul can follow.", "A space with a Bloom on either bank is <b>Lit</b>, and the soul can step onto it.")}
      ${piece("nb-light", "#E6D3A3", "Light", "The glow of the flowers the soul has passed, gathered and carried.", "Each Bloom the soul leaves behind gives 1 Light. Spend Light to summon Mantles.")}
      ${piece("", "", "Memory cards", "The soul's memories. Your hands together are what the soul still remembers.", "Two actions a turn: play a card, or Seek. Each card carries an effect, a thread, and often a line of the soul's life.")}
      ${piece(TAG_ICONS[0], TAGCOL[0], "Obsession thread", "The thread that is spun and held: clinging, grudges, things the soul cannot let go.", "Strong Root cards. A full thread snaps into <b>Grasping</b>: a Grievance appears beside the soul.")}
      ${piece(TAG_ICONS[1], TAGCOL[1], "Acceptance thread", "The thread that is measured: tenderness, forgiveness, peace.", "Bloom and Mend cards. A full thread snaps into <b>Resignation</b>: the soul sits down and Lingers.")}
      ${piece(TAG_ICONS[2], TAGCOL[2], "Oblivion thread", "The thread that is cut: deliberate forgetting.", "Powerful cards that clear the way, but are forgotten after use. A full thread snaps into <b>the Tide Rises</b>: Black Water floods ahead.")}
      ${piece("nb-knot", "#E6D3A3", "The Loom of the Fates", "The great loom where the three Fates weave every soul's last journey.", "Each card played face up ties a knot on its thread. Too many knots on one thread cause a Backlash.")}
      ${piece("nb-echo", "#8FD6E1", "The Echo", "The shuttle of the Loom, resting on the last thread you pulled. In a silent world it is your voice.", "The thread of the last card played face up or Burned. If your first card matches it, the card <b>Resonates</b>.")}
      ${piece("nb-grievance", "#8FD6E1", "Grievance", "A restless shade of the soul's own unfinished resentment.", "Blocks a bank. Beside the soul, it feeds: 1 Fracture each Soul Step. If two block the space ahead, the soul can push through them at a cost.")}
      ${piece("nb-blackwater", "#9A948C", "Black Water", "The river rising to swallow the path.", "Floods a space so the soul cannot enter, and withers its Blooms. The supply is limited; when water must rise and none is left, it is a Deluge.")}
      ${piece("nb-fracture", "#D7263D", "Fracture", "A crack in the soul's sense of self.", "The third Fracture shatters the soul.")}
      ${piece("", "", "Forgotten pile", "Everything the river has taken.", "Forgotten cards are gone for good. Enough of them make the soul lighter (Light as Ash), then reckless (Adrift), then Faded.")}
      ${piece("nb-fog", "#9A948C", "Mist cards", "The underworld itself: rising water, cold wind, returning fog.", "One is turned at the end of every turn, from the deck of the current Reach.")}
      ${piece("", "", "Mantles", "Roles a Ferryman can take up on the river: the Root-Weaver, the Spirit Warden, the Bloom-Bringer, the Fog-Breaker.", "Summon one with Light for a permanent power (section 15).")}
      ${piece("", "", "The Lantern", "How dark the river is tonight.", "The difficulty: Gentle, Standard, Hard or Heroic.")}
      ${piece("nb-seal", "#E6D3A3", "Book of Remembrance", "The spring of Memory the old grave-texts told the dead to seek instead of Lethe. What is written here, the soul keeps.", "Three pages, one per Reach, each a sentence with four blanks. Resonating cards fill them.")}
      ${piece("nb-slot-place", "#E6D3A3", "Place · Person · Deed · Feeling", "The four parts of a remembered moment: where, who, what was done, and what it left behind.", "The four slots on each page of the Book. Each memory card fits one of them.")}
      ${piece("nb-seal", "#D7263D", "Key Memory", "The one memory that matters most to this soul.", "Can be inscribed whenever it is played face up. Whether it is written, forgotten or never spoken decides the ending.")}
      ${piece("nb-soul", "#8FD6E1", "The Ghost (solo)", "A silent Ferryman who travels beside you.", "In solo play it plays a card after each of your turns and leaves the Echo for you to follow.")}
    </tbody></table>` },

  { id: "overview", title: "5. How a crossing unfolds", keys: "arc chapters reaches pacing overview flow game length", body: `
    ${lore("Three Reaches, three chapters of a life, and one cup at the end.")}
    <p>A game is a single crossing of about 15 turns. As the soul walks each Reach, the Book of Remembrance fills one chapter of its life:</p>
    <ul>
      <li><b>Reach I, the Asphodel Road: Chapter I, Who I Was.</b> Where the soul was born, who it loved, what it carried.</li>
      <li><b>Reach II, the Fields of Mourning: Chapter II, What I Did.</b> The deed that defined it, and its price.</li>
      <li><b>Reach III, the Banks of Lethe: Chapter III, What I Carry.</b> What it forgives, what it cannot undo, what it keeps.</li>
    </ul>
    <p>Each Reach is harder than the last: the Mist grows crueler and the soul has forgotten more. At the Far Shore, the Keeper offers the cup, and the soul's Key Memory decides how it is received (section 22).</p>` },

  { id: "board", title: "6. The river", keys: "spaces reach bank slot near shore far shore", body: `
    ${lore("The river winds from the near shore to the Far Shore, and every bank is a place a flower might grow.")}
    <p>The river has 13 spaces: the near shore (0), spaces 1 to 11, and the Far Shore (12). Each space from 1 to 11 has a <b>left</b> and a <b>right bank</b>, and each bank holds one token. Banks are named as you face downstream toward the Far Shore: the left bank is the row above the river, the right bank the row below.</p>
    <ul><li><b>Reach I, the Asphodel Road</b>: spaces 1–4.</li><li><b>Reach II, the Fields of Mourning</b>: spaces 5–8.</li><li><b>Reach III, the Banks of Lethe</b>: spaces 9–11.</li></ul>
    <p>Each Reach has its own Mist deck and its own page in the Book of Remembrance. When the soul enters a new Reach, the Loom of the Fates is cleared.</p>
    <p>At setup both banks of space 1 hold a Bloom, so the first step is always lit. The banks of spaces 2–11 are hidden under <b>fog</b> tiles.</p>` },

  { id: "tokens", title: "7. Roots, Blooms and the network", keys: "root bloom lit network touch place", body: `
    ${lore("A Netherbloom grows only from another. Your path must be one unbroken thread of light.")}
    <p>${ico("nb-root", "#E6D3A3")} A <b>Root</b> is a seed in the dark. ${ico("nb-bloom", "#D7263D")} A <b>Bloom</b> is a Root that has opened into a spider lily.</p>
    <p>A space is <b>Lit</b> when at least one of its banks holds a Bloom. The soul only steps onto a Lit space.</p>
    <p><b>Placing a Root.</b> A Root goes on an empty bank at or ahead of the soul that <b>touches the network</b>:</p>
    <ul><li>it is on the soul's own space or the next one, or</li><li>the opposite bank of the same space holds a token, or</li><li>the same bank of the space before or after holds a token.</li></ul>
    <p><b>Blooming</b> turns one of your Roots, at or ahead of the soul, into a Bloom.</p>` },

  { id: "fog", title: "8. Fog and tiles", keys: "fertile stony memory site grave reveal keepsake", body: `
    ${lore("Under the fog lie soft earth, hard stone, half-remembered places and old graves.")}
    <p>${ico("nb-fog", "#9A948C")} Fog hides each bank. Placing a Root on fog reveals the tile beneath, and the tile decides what happens:</p>
    <ul>
      <li>${ico("nb-fertile", "#6d665e")} <b>Fertile</b>: the Root takes.</li>
      <li>${ico("nb-stony", "#9A948C")} <b>Stony</b>: an ordinary Root will not take, and the Root is lost. Stubborn Roots and the Root-Weaver can grow here.</li>
      <li>${ico("nb-memorysite", "#E6D3A3")} <b>Memory Site</b>: the Root takes and you find a keepsake. In the Open Crossing it also gives +2 Light.</li>
      <li>${ico("nb-grave", "#8FD6E1")} <b>Grave</b>: no Root grows, and a Grievance rises on that bank.</li>
    </ul>
    <p>Reach I has 3 Fertile, 1 Stony and 2 Memory Site tiles. Reach II has 3 Fertile, 2 Stony, 2 Memory Site and 1 Grave. Reach III has 2 Fertile, 1 Stony, 2 Memory Site and 1 Grave. The Mist can roll fog back over empty revealed ground.</p>` },

  { id: "turn", title: "9. Your turn", keys: "turn order sequence summon play draw", body: `
    ${lore("You plant, the soul walks, the river answers.")}
    <ol class="steps">
      <li><b>Summon a Mantle</b> (optional, before your first action).</li>
      <li><b>First action</b>: play a card face up, face down or Burned, or <b>Seek</b>.</li>
      <li><b>Second action</b>: the same choices (but only one Seek a turn).</li>
      <li><b>Bloom-Bringer</b>: if you hold this Mantle, Bloom one Root for free.</li>
      <li><b>Soul Step</b>: the soul moves or Lingers.</li>
      <li><b>The Mist</b>: turn the top card of the current Reach's Mist deck.</li>
      <li><b>The river settles</b>: roots drink the flood, and trapped Grievances dissolve.</li>
      <li><b>Draw</b> back up to your hand size. In solo play, the Ghost now takes its turn.</li>
    </ol>
    <p>Hand size is 4 in solo play and 3 with 2–4 players.</p>` },

  { id: "modes", title: "10. Your two actions: three ways to play a card, or Seek", keys: "face up face down burn mode seek discard draw action stuck", body: `
    ${lore("A memory can be spoken, kept quiet, or burned away for strength. Or you can let one go and reach for another.")}
    <p>Each turn you take <b>two actions</b>, one at a time. Each action is to play a card from your hand in one of three ways, or to Seek.</p>
    <ul>
      <li><b>Face up</b> (spoken): do the card's effect, tie one knot on its thread in the Loom, and the card's thread becomes the new <b>Echo</b>. Obsession and Acceptance cards go to the discard pile. <b>Oblivion</b> cards are <b>forgotten</b> after use.</li>
      <li><b>Face down</b> (kept quiet): place 1 Root. No knot is tied and the Echo does not change. The card is discarded.</li>
      <li><b>Burn</b> (burned away): do the effect <b>twice</b>, tie a knot, and its thread becomes the new <b>Echo</b> (a Burned first card can Resonate). Then the card is forgotten, along with the top card of the deck. The soul grows lighter, and its story grows shorter.</li>
    </ul>
    <p><b>Seek</b> (once per turn): discard a card from your hand and draw one. Nothing is played, no knot is tied and the Echo does not change. Only your <b>first action</b> can Resonate, so if you Seek first you let the Echo pass this turn; Seek second and your first card has already had its chance. Seek when your hand holds nothing the river needs.</p>` },

  { id: "echo", title: "11. The Echo and Resonance", keys: "echo resonance resonate thread silent signal", body: `
    ${lore("When two silent Ferrymen pull the same thread, the Loom sings.")}
    <p>${ico("nb-echo", "#8FD6E1")} The <b>Echo</b> is the thread of the last card played face up or Burned, by anyone. It is how silent players talk.</p>
    <p>If the <b>first</b> card you play on your turn is on the Echo's thread, it <b>Resonates</b>. Do its Resonance effect as well; some Oblivion cards do their Resonance <i>instead</i>. A Resonating card that carries a memory may be <b>inscribed</b> in the Book of Remembrance.</p>
    <p>Only your first action can Resonate. If it is a Seek, the Echo passes unanswered this turn.</p>
    <p>Leaving an Echo the next player can safely follow is the heart of the game.</p>` },

  { id: "loom", title: "12. The Loom of the Fates and Backlash", keys: "loom knot thread backlash grasping resignation tide karma", body: `
    ${lore("Pull one thread too hard and the Fates pull back.")}
    <p>The Loom has three threads: ${ico(TAG_ICONS[0], TAGCOL[0])}<b>Obsession</b>, ${ico(TAG_ICONS[1], TAGCOL[1])}<b>Acceptance</b> and ${ico(TAG_ICONS[2], TAGCOL[2])}<b>Oblivion</b>. Every card played face up or Burned ties a knot on its thread. A thread holds 4 knots with 2–3 players and 5 in solo play or with 4 players.</p>
    <p>When a thread fills, it snaps in a <b>Backlash</b> and empties:</p>
    <ul>
      <li><b>Obsession, Grasping</b>: the soul clutches its grudges, and a Grievance appears beside it.</li>
      <li><b>Acceptance, Resignation</b>: the soul gives up for a moment; at the next Soul Step it sits down and Lingers, forgetting a card.</li>
      <li><b>Oblivion, the Tide Rises</b>: too much has been let go, and Black Water floods the space ahead.</li>
    </ul>
    <p>The Loom clears whenever the soul enters a new Reach.</p>` },

  { id: "soulstep", title: "13. The Soul Step", keys: "move linger light as ash adrift forget hold", body: `
    ${lore("The soul walks only toward light. In the dark, it waits, and waiting, it forgets.")}
    <p>After your cards the soul tries to step forward. If the next space is <b>Lit and not flooded</b>, it moves there. It gains 1 Light for each Bloom it leaves behind, and the space it left is cleared.</p>
    <p>Otherwise it <b>Lingers</b>. Beside its own light (its own space is Lit) it simply waits. In the dark it forgets the top card of the deck. <i>Hold Fast</i> and the Spirit Warden stop a Linger.</p>
    <p><b>Through the shades.</b> If the next space is dark only because Grievances hold <b>both</b> of its banks (and it is not flooded), the soul does not Linger. It pushes through: both Grievances scatter, the soul steps onto the space, and it pays dearly, taking <b>1 Fracture</b> and forgetting the top card of the deck. Each push already made this game costs <b>one more Fracture</b>: the second push costs 2, the third 3, which shatters the soul. Push once; after that, clear the way with your cards.</p>
    <p><b>Light as Ash.</b> Once 6 cards are forgotten, the soul glides one extra space whenever it can. It has less to carry.</p>
    <p><b>Adrift.</b> Once 9 cards are forgotten, each time the soul moves it moves one more space. If that space is dark it drifts in anyway and suffers a Fracture (the Spirit Warden can hold it back). It has almost nothing left to hold it in place.</p>
    <p>If a Grievance sits beside the soul after the step, it feeds: <b>1 Fracture</b>.</p>` },

  { id: "threats", title: "14. Black Water, Grievances and Fractures", keys: "black water flood drink deluge grievance feed fracture shield trapped", body: `
    ${lore("The river rises, old resentments crawl out of the graves, and the soul begins to crack.")}
    <p>${ico("nb-blackwater", "#9A948C")} <b>Black Water</b> floods a whole space. The soul cannot step onto it, and Blooms on it wither to Roots. When both banks of a flooded space hold a Root or Bloom at the end of a turn, the roots <b>drink the flood</b> and it drains. Drained water leaves the game, so the supply only shrinks. If water must rise and the supply is empty: <b>Deluge</b>.</p>
    <p>${ico("nb-grievance", "#8FD6E1")} A <b>Grievance</b> takes a bank and blocks it. One beside the soul feeds on it each Soul Step. A Grievance with a Bloom on the same bank both before and after it is <b>trapped in light</b> and dissolves at the end of the turn. If Grievances hold both banks of the space ahead, the soul can push through them (section 13).</p>
    <p>${ico("nb-fracture", "#D7263D")} <b>Fractures</b> come from feeding Grievances, pushing through the shades, Adrift, and the Dark Wind. At 3 the soul is <b>Shattered</b>. <i>Hold the Line</i> raises a Shield that stops the next Fracture.</p>` },

  { id: "mantles", title: "15. Mantles and Light", keys: "mantle summon light weaver warden bringer breaker", body: `
    ${lore("The light of passed flowers can be spent to take up an old role of the river.")}
    <p>Before your first action you may <b>summon</b> a free Mantle: pay Light (3, or 2 for the King) and discard a card of the Mantle's thread. Each player holds at most one Mantle.</p>
    <ul>${Object.values(MANTLES).map(m => `<li>${ico(TAG_ICONS[m.tag], TAGCOL[m.tag])}<b>${esc(m.name)}</b>: ${esc(m.text)}</li>`).join("")}</ul>` },

  { id: "book", title: "16. The Book of Remembrance", keys: "inscribe page chapter blessing key memory keepsake slot place person deed feeling", body: `
    ${lore("The old grave-texts told the dead: do not drink from Lethe; find the spring of Memory. This Book is that spring.")}
    <p>The Book has one page per Reach. Each page has four slots, <b>Place</b>, <b>Person</b>, <b>Deed</b> and <b>Feeling</b>, which fill a sentence about the soul's life.</p>
    <p>You may <b>inscribe</b> a card when it Resonates, if its memory's slot is still empty on the current page. A <b>Key Memory</b> card may be inscribed whenever it is played face up. An inscribed card leaves the deck for good: you trade a useful card for a memory the soul will keep.</p>
    <p><b>Chapter Blessing.</b> When a page holds 3 memories (2 for the Garland Girl), the river grants the first of these that applies: mend a Fracture, drain Black Water, or return a forgotten card.</p>
    <p>At the end, the Book is read aloud. Slots never filled read "…but this, the river has taken".</p>` },

  { id: "souls", title: "17. The Souls", keys: "child king garland bride open crossing twist first game new players suggested story", body: `
    ${lore("Four souls the old ferryman would not carry, and one with no name at all.")}
    <p>Each named Soul adds its own 8-card pack of memories, including one <b>Key Memory</b>, and a twist to the rules that comes from its story. The Open Crossing adds the 8 Echo cards instead.</p>
    <h4>${esc(SOULS.child.name)}</h4>
    <p>A small child alone in a doorway on the coldest night of the year, with a handful of little lights to sell and none sold. To keep warm she lights them one by one, and in each flame she sees something: a warm stove, a feast, and at last the one person who ever held her, coming to take her home.</p>
    <p><b>Twist:</b> ${esc(SOULS.child.twist)} Her small flames protect her. <b>Key Memory:</b> <i>${esc(CARDS.find(c => c.id === "L04").band)}</i>.</p>
    <h4>${esc(SOULS.garland.name)}</h4>
    <p>A young woman who wove a flower for everyone she loved. Her father died, the man who promised to marry her turned cruel, and she gave her flowers away one by one and slipped into a brook still singing. She kept one flower for herself, and no one ever learned which.</p>
    <p><b>Twist:</b> ${esc(SOULS.garland.twist)} She is the Soul of the Book. <b>Key Memory:</b> <i>${esc(CARDS.find(c => c.id === "G-04").band)}</i>.</p>
    <h4>${esc(SOULS.king.name)}</h4>
    <p>An old king who won every battle but the last. His closest friend loved his queen, his fellowship broke apart, and he fell on a field of his own making. Dying, he was laid on a black barge. The sword he was lent was never returned to the water it came from, and so he cannot rest.</p>
    <p><b>Twist:</b> ${esc(SOULS.king.twist)} His companions rally cheaply, and fall away when things break. <b>Key Memory:</b> <i>${esc(CARDS.find(c => c.id === "K04").band)}</i>.</p>
    <h4>${esc(SOULS.bride.name)}</h4>
    <p>She died on her wedding day. Her husband came down into the dark to bring her back, on one condition: he must not look back until they reached the light. One step from the surface, he turned. She has stood in the shadows ever since, deciding whether to remember his face or let it go.</p>
    <p><b>Twist:</b> ${esc(SOULS.bride.twist)} <b>Key Memory:</b> <i>${esc(CARDS.find(c => c.id === "B04").band)}</i>.</p>
    <h4>${esc(SOULS.open.name)}</h4>
    <p>A nameless soul. You do not learn its story; you write it. ${esc(SOULS.open.twist)} There is no Key Memory, so the Book is all the soul will have.</p>
    <p class="rsuggest">${ico("nb-light", "#E6D3A3")}<b>Your first crossing:</b> we suggest <b>${esc(SOULS[FIRST_SOUL].name)}</b> at the Gentle Lantern. Its twists let a new table learn the river, the Loom and the Book before meeting the other Souls.</p>` },

  { id: "mist", title: "18. The Mist", keys: "mist harsh card deck rising water withering cold wind fog returns severed", body: `
    ${lore("The underworld is not empty. After every turn, it moves.")}
    <p>At the end of every turn the top card of the current Reach's Mist deck is turned. Each deck also holds 2 extra cards (Rising Water and Grievance Drawn Near) and, at every Lantern except Gentle, some <b>harsh</b> cards.</p>${mistTable()}` },

  { id: "lantern", title: "19. Lantern levels", keys: "difficulty lantern level gentle standard hard heroic", body: `
    ${lore("The darker the night, the less a lantern shows.")}
    <p>The Lantern sets the difficulty. <b>Standard</b> is the game as designed: a good table wins about half its crossings. <b>Gentle</b> is for learning, <b>Hard</b> for tables that have crossed often, and <b>Heroic</b> for those who want the river at its darkest.</p>${lanternTable()}` },

  { id: "solo", title: "20. Solo play and the Ghost", keys: "solo ghost automaton", body: `
    ${lore("Even a lone Ferryman is never quite alone on the river.")}
    <p>In solo play you hold 4 cards, each Loom thread holds 5 knots, and after each of your turns the <b>Ghost</b> plays the top card of its own deck. The Ghost ties a knot and sets the Echo, so plan around it.</p>${ghostTable()}` },

  { id: "end", title: "21. Winning and losing", keys: "win lose faded shattered deluge end", body: `
    <p><b>Win</b>: the soul reaches the Far Shore.</p>
    <ul>
      <li><b>Faded</b>: the forgotten pile reaches the Lantern's limit. So much was forgotten that nothing was left to cross.</li>
      <li><b>Shattered</b>: the third Fracture. Broken three times, the soul could carry itself no further.</li>
      <li><b>Deluge</b>: Black Water must rise but the supply is empty. The black river rose, and nothing was left to hold it back.</li>
    </ul>` },

  { id: "endings", title: "22. The Far Shore and the cup", keys: "ending key memory inscribed forgotten unspoken read aloud epilogue cup keeper", body: `
    ${lore("At the Far Shore the Keeper lifts the veil and offers the cup. What the soul remembers decides how it drinks.")}
    <p>When the crossing ends, the silence lifts. Look at where the soul's <b>Key Memory</b> is:</p>
    <ul>
      <li><b>Inscribed in the Book</b>: kept and spoken. The soul crosses remembering what mattered most.</li>
      <li><b>Forgotten</b>: lost to the river. The soul goes on, lighter and emptier, without it.</li>
      <li><b>Never written</b> (still in the deck, a hand or the discard pile): never faced. Some things go across unsaid.</li>
    </ul>
    <p>Then read the Book aloud, page by page. Even a lost crossing leaves a story: blanks read "…but this, the river has taken", and the epilogue tells how the soul was lost. Every game writes a different life.</p>` },

  { id: "cards", title: "23. Card reference", keys: "cards reference effects", body: cardTable() },
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
      <li><b>Summon</b> <span>optional · pay Light, discard a matching card</span></li>
      <li><b>Action 1</b> <span>a card that matches the Echo Resonates</span></li>
      <li><b>Action 2</b> <span>either action may be a Seek: discard 1, draw 1 (once a turn)</span></li>
      <li><b>Soul Step</b> <span>Lit and dry ahead: move. Grievances on both banks ahead: push through. Otherwise: Linger</span></li>
      <li><b>Mist</b> <span>turn one card of this Reach</span></li>
      <li><b>Settle and draw</b> <span>roots drink the flood, trapped Grievances dissolve</span></li>
    </ol>
    <h3>Play a card</h3>
    <div class="aidgrid">
      <div><b>Face up</b><span>effect + knot + new Echo</span></div>
      <div><b>Face down</b><span>1 Root only</span></div>
      <div><b>Burn</b><span>effect ×2 + knot + new Echo; forget it + 1</span></div>
      <div><b>Seek</b><span>discard 1, draw 1; no Resonance if first</span></div>
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
