// Card, tile and Mist data for Netherbloom. A port of simulator/netherbloom/cards.py (keep the two in step).

export const OBS = 0, ACC = 1, OBL = 2;
export const TAG_NAMES = ["Obsession", "Acceptance", "Oblivion"];
export const TAG_ICONS = ["nb-obsession", "nb-acceptance", "nb-oblivion"];
export const SLOTS = ["Place", "Person", "Deed", "Feeling"];

const ROOT2 = [[["root", 2, false]], [["root", 1, false]]];
const STUBBORN = [[["root", 1, true]], [["root", 1, true]]];
const HOLD = [[["hold"]], [["root", 1, false]]];
const OVERREACH = [[["root", 3, false], ["extra_karma", OBS]], [["bloom", 1]]];
const VIGIL = [[["vigil"]], [["root", 1, false]]];
const SHIELD = [[["shield"]], [["root", 1, false]]];
const OPENHAND = [[["bloom", 1], ["root", 1, false]], [["bloom", 1]]];
const FULLBLOOM = [[["bloom", 2]], [["light", 1]]];
const MEND = [[["mend", 1]], [["bloom", 1]]];
const LETGO = [[["release", 2]], [["release", 1]]];
const GUIDE = [[["guide"]], [["bloom", 1]]];
const REKINDLE = [[["bloom", 1], ["light", 1]], [["bloom", 1]]];
const UNREMEMBER = [[["banish_or_drain"]], [["banish", 1], ["drain", 1]]];
const WASH = [[["wash"]], [["light", 1]]];
const LOWTIDE = [[["lowtide"]], [["banish", 1]]];
const LETHE = [[["light", 3]], [["bloom", 1]]];
const UNMAKE = [[["unmake"]], [["light", 1]]];
const OATH = [[["light", 2]], [["light", 1]]];
const FOG = [[["reveal_reach"]], [["light", 2]]];

export const CARDS = [];
function c(id, name, tag, shape, slot = null, band = "", key = false) {
  CARDS.push({ id, name, tag, eff: shape[0], res: shape[1], rr: shape === UNREMEMBER, slot, band, key });
}

// Core deck
c("C01", "Deep Roots", OBS, ROOT2, "Place", "the gate I swore never to leave");
c("C02", "Deep Roots", OBS, ROOT2, "Place", "the hill where I buried my anger");
c("C03", "Deep Roots", OBS, ROOT2, "Person", "the friend who sold my name");
c("C04", "Stubborn Root", OBS, STUBBORN, "Place", "a road I walked a thousand times");
c("C05", "Stubborn Root", OBS, STUBBORN, "Deed", "kept a promise long after it stopped mattering");
c("C06", "Hold Fast", OBS, HOLD, "Feeling", "a debt I swore to repay");
c("C07", "Hold Fast", OBS, HOLD, "Deed", "refused to bow when bowing would have saved me");
c("C08", "Overreach", OBS, OVERREACH, "Place", "the house that should have been mine");
c("C09", "Overreach", OBS, OVERREACH, "Feeling", "a fist I never unclenched");
c("C10", "Vigil", OBS, VIGIL, "Person", "a rival I could never forgive");
c("C11", "Hold the Line", OBS, SHIELD, "Person", "the teacher I needed to impress");
c("C12", "Hold the Line", OBS, SHIELD, "Deed", "counted every coin I was owed");
c("C13", "Old Oath", OBS, OATH, "Feeling", "a name I kept repeating in the dark");
c("C14", "Open Hand", ACC, OPENHAND, "Place", "a kitchen that smelled of bread and woodsmoke");
c("C15", "Open Hand", ACC, OPENHAND, "Person", "my mother, humming at the loom");
c("C16", "Open Hand", ACC, OPENHAND, "Feeling", "the warmth of an evening with nothing left to do");
c("C17", "Full Bloom", ACC, FULLBLOOM, "Place", "the river where we washed our feet in summer");
c("C18", "Full Bloom", ACC, FULLBLOOM, "Person", "a stranger who shared his rain hat");
c("C19", "Mend", ACC, MEND, "Deed", "forgave my brother at the ferry landing");
c("C20", "Mend", ACC, MEND, "Feeling", "a quiet I finally stopped fearing");
c("C21", "Let Go", ACC, LETGO, "Deed", "let the apple blossoms fall without counting them");
c("C22", "Guide", ACC, GUIDE, "Person", "the child who called me by the wrong name");
c("C23", "Guide", ACC, GUIDE, "Deed", "planted a tree I knew I would never sit beneath");
c("C24", "Rekindle", ACC, REKINDLE, "Feeling", "the first warm evening of spring");
c("C25", "Unremember", OBL, UNREMEMBER);
c("C26", "Unremember", OBL, UNREMEMBER);
c("C27", "Unremember", OBL, UNREMEMBER);
c("C28", "Blank Fog", OBL, FOG);
c("C29", "Unmake", OBL, UNMAKE);
c("C30", "Wash Away", OBL, WASH);
c("C31", "Low Tide", OBL, LOWTIDE);
c("C32", "Lethe's Gift", OBL, LETHE);
export const CORE_IDS = CARDS.map((_, i) => i);

// Echo deck (Open Crossing)
const e0 = CARDS.length;
c("E01", "Echo", OBS, ROOT2, "Place", "a lantern left burning in a window");
c("E02", "Echo", OBS, HOLD, "Feeling", "an anger I mistook for strength");
c("E03", "Echo", OBS, VIGIL, "Person", "the ferryman who would not take my coin");
c("E04", "Echo", ACC, OPENHAND, "Deed", "carried water for someone I never thanked");
c("E05", "Echo", ACC, FULLBLOOM, "Person", "an old woman selling chestnuts in the snow");
c("E06", "Echo", ACC, MEND, "Place", "a bridge I crossed every morning");
c("E07", "Echo", OBL, UNREMEMBER);
c("E08", "Echo", OBL, LETHE);
export const ECHO_IDS = CARDS.slice(e0).map((_, i) => e0 + i);

export const SOUL_PACKS = {};
function pack(soul, rows) {
  const start = CARDS.length;
  for (const r of rows) c(...r);
  SOUL_PACKS[soul] = CARDS.slice(start).map((_, i) => start + i);
}
pack("king", [
  ["K01", "Last Army", OBS, ROOT2, "Place", "the field where my last army fell"],
  ["K02", "The Line", OBS, HOLD, "Deed", "held the line long after the line was lost"],
  ["K03", "Heavy Crown", OBS, OVERREACH, "Feeling", "a crown that grew heavier every year"],
  ["K04", "The Lake's Gift", ACC, OPENHAND, "Person", "the hand that rose from the lake to give me a sword", true],
  ["K05", "Honest Love", ACC, FULLBLOOM, "Person", "the friend who loved my queen more honestly than I did"],
  ["K06", "Too Late", ACC, GUIDE, "Deed", "forgave them both, too late to tell them"],
  ["K07", "Unremember", OBL, UNREMEMBER],
  ["K08", "Wash Away", OBL, WASH],
]);
pack("garland", [
  ["G-01", "Pretended Stranger", OBS, ROOT2, "Person", "the man who promised and then pretended not to know me"],
  ["G-02", "The Song", OBS, VIGIL, "Feeling", "a song I could not stop singing"],
  ["G-03", "Every Flower", OBS, STUBBORN, "Deed", "wove a flower for every person I ever loved"],
  ["G-04", "One Flower Kept", ACC, REKINDLE, "Feeling", "the one flower I kept for myself", true],
  ["G-05", "The Willow", ACC, FULLBLOOM, "Place", "the willow that leaned over the brook"],
  ["G-06", "Names of Herbs", ACC, OPENHAND, "Person", "my father, who taught me the names of herbs"],
  ["G-07", "Low Tide", OBL, LOWTIDE],
  ["G-08", "Unremember", OBL, UNREMEMBER],
]);
pack("bride", [
  ["B01", "Without a Word", OBS, HOLD, "Deed", "followed his footsteps up through the dark without a word"],
  ["B02", "The Narrow Stair", OBS, STUBBORN, "Place", "the narrow stair between the dead and the living"],
  ["B03", "Almost Saved", OBS, ROOT2, "Feeling", "the anger of being almost saved"],
  ["B04", "His Face", ACC, GUIDE, "Person", "his face, the instant he turned to look at me", true],
  ["B05", "Noon Meadow", ACC, OPENHAND, "Place", "the meadow where we were married at noon"],
  ["B06", "His Hand", ACC, FULLBLOOM, "Feeling", "the warmth of his hand, just before it let go"],
  ["B07", "Unremember", OBL, UNREMEMBER],
  ["B08", "Unmake", OBL, UNMAKE],
]);
pack("child", [
  ["L01", "Coldest Doorway", OBS, ROOT2, "Place", "a doorway on the coldest night of the year"],
  ["L02", "Hunger", OBS, HOLD, "Feeling", "a hunger that would not let me sleep"],
  ["L03", "One More Light", OBS, STUBBORN, "Deed", "struck one more little light, then one more"],
  ["L04", "Held", ACC, MEND, "Person", "the one who used to hold me before she was gone", true],
  ["L05", "Frosted Window", ACC, FULLBLOOM, "Place", "a warm kitchen glimpsed through a frosted window"],
  ["L06", "Roast Apples", ACC, OPENHAND, "Feeling", "the smell of roast apples from a house that was not mine"],
  ["L07", "Unremember", OBL, UNREMEMBER],
  ["L08", "Lethe's Gift", OBL, LETHE],
]);

// The Soul suggested for a first game. Souls differ in challenge, but the game never labels them with a rating.
export const FIRST_SOUL = "child";

export const SOULS = {
  open: { name: "Open Crossing", blurb: "A nameless soul. The Echo deck joins the core. Memory Sites give 2 Light.", twist: "Memory Sites give +2 Light." },
  child: { name: "Child of the Last Flame", blurb: "One more little light, struck against the cold.", twist: "Starts with 3 Light. The first Fracture in each Reach is ignored. Never drifts Adrift. She can forget 1 more card before she Fades. No harsh Mist." },
  garland: { name: "The Garland Girl", blurb: "She wove a flower for everyone but herself.", twist: "Each page gives its Chapter Blessing at only 3 inscribed memories." },
  king: { name: "The King on the Barge", blurb: "A crown carried long after the kingdom fell.", twist: "Mantles cost 2 Light. A Fracture strips the Mantle of the player who caused it." },
  bride: { name: "The Bride Who Stayed Below", blurb: "Almost saved, once.", twist: "The first time she would Linger in the dark, she is pulled one space back instead of forgetting." },
};

// Mist. Placement ops are relative to the soul's space S.
export const MIST = [
  [["Rising Water", [["bw", 2]]], ["Rising Water", [["bw", 3]]],
   ["Shade", [["grv", 1, 0]]], ["Shade", [["grv", 2, 1]]],
   ["Shade Drawn Near", [["grv_near"]]], ["Withering", [["wither", 2]]],
   ["Fog Returns", [["fog", 1]]], ["Cold Wind", [["forget", 1]]],
   ["The Mist Parts", []], ["The Mist Parts", []]],
  [["Rising Water", [["bw", 1]]], ["Rising Water", [["bw", 2]]],
   ["Shade", [["grv", 1, 0]]], ["Shade", [["grv", 2, 1]]],
   ["Shade Drawn Near", [["grv_near"]]], ["Withering", [["wither", 2]]],
   ["Withering", [["wither", 2]]], ["Fog Returns", [["fog", 2]]],
   ["Cold Wind", [["forget", 1]]], ["Echo Severed", [["sever"]]]],
  [["Rising Water", [["bw", 1]]], ["Rising Water", [["bw", 2]]],
   ["Undertow", [["bw", 2], ["wither_at", 1]]], ["Shade Drawn Near", [["grv_near"]]],
   ["Twin Shades", [["grv", 2, 0], ["grv", 2, 1]]], ["Withering", [["wither", 2]]],
   ["Great Withering", [["wither", 3]]], ["Cold Wind", [["forget", 1]]],
   ["Bitter Wind", [["forget", 2]]], ["Echo Severed", [["sever"]]]],
];
export const HARSH = [
  ["Flood Surge", [["bw", 1], ["bw", 3]]], ["Shade Host", [["grv", 1, 0], ["grv", 1, 1]]],
  ["Wither Storm", [["wither_far", 2]]], ["Deep Cold", [["forget", 2]]],
  ["Karma Surge", [["karma_all"]]], ["Dark Wind", [["dark_wind"]]],
];

export const FERTILE = 0, STONY = 1, MEMORY = 2, GRAVE = 3;
export const TILE_NAMES = ["Fertile", "Stony", "Memory Site", "Grave"];
export const TILES = [
  [[2, 3, 4], [0, 0, 0, 1, 2, 2]],
  [[5, 6, 7, 8], [0, 0, 0, 1, 1, 2, 2, 3]],
  [[9, 10, 11], [0, 0, 1, 2, 2, 3]],
];
export const REACH_NAMES = ["The Asphodel Road", "The Fields of Mourning", "The Banks of Lethe"];

// Lantern: [black water supply, forgotten limit, harsh Mist per Reach]. Standard is the intended game.
export const LANTERN = { 1: [6, 11, 0], 2: [5, 10, 2], 3: [4, 9, 3], 4: [3, 8, 3] };
export const LANTERN_NAMES = { 1: "Gentle", 2: "Standard", 3: "Hard", 4: "Heroic" };
export const STANDARD_LANTERN = 2;
// The Faded limits across all Lanterns, as "9–14".
export const limitRange = () => { const l = Object.values(LANTERN).map(r => r[1]); return `${Math.min(...l)}–${Math.max(...l)}`; };
// Each Reach's Mist deck also holds these extra cards (the engine's extraMist: 2).
export const MIST_EXTRA = [["Rising Water", [["bw", 2]]], ["Shade Drawn Near", [["grv_near"]]]];
export const lanternIcon = l => "◆".repeat(+l) + "◇".repeat(Object.keys(LANTERN).length - l);

export const GHOST = [
  ...Array(3).fill([OBS, "root_far"]), ...Array(2).fill([OBS, "root_near"]),
  ...Array(2).fill([ACC, "bloom_near"]), ...Array(2).fill([ACC, "bloom_far"]),
  ...Array(2).fill([OBL, "banish_forget"]), [OBL, "none"],
];

export const MANTLES = {
  weaver: { tag: OBS, name: "The Root-Weaver", text: "Your Roots may grow on Stony ground. Your first Root effect each turn places 1 extra Root." },
  warden: { tag: OBS, name: "The Spirit Warden", text: "Once per round, stop the soul from Lingering or from drifting Adrift." },
  bringer: { tag: ACC, name: "The Bloom-Bringer", text: "At the end of each of your turns, Bloom 1 Root for free." },
  breaker: { tag: OBL, name: "The Fog-Breaker", text: "Your first Oblivion card each turn is discarded instead of forgotten." },
};

// Page rewards: each pair of neighbouring slots on a page gives its reward once, when an inscription fills both slots.
export const PAIR_SLOTS = [["Place", "Person"], ["Person", "Deed"], ["Deed", "Feeling"]];
export const PAIR_REWARDS = [
  [[["root", 1]], [["bloom", 1]], [["light", 2]]],
  [[["banish", 1]], [["drain", 1]], [["release", 1]]],
  [[["recall_free"]], [["mend", 1]], [["guide"]]],
];
// A full page (all 4 slots) also gives the Chapter Blessing; the Garland Girl's pages at 3.
export const CHAPTER_AT = 4;

export const BOOK_FRAMES = [
  ["I · Who I Was", "I was born near {Place}. I loved {Person}. I once {Deed}, and ever since I have carried {Feeling}."],
  ["II · What I Did", "At {Place}, before {Person}, I {Deed}. The price was {Feeling}."],
  ["III · What I Carry", "I go now, leaving {Place}, forgiving {Person}, unable to undo the day I {Deed}, holding only {Feeling}."],
];

const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
export function opText(op) {
  switch (op[0]) {
    case "root": return `Place ${plural(op[1], "Root")}${op[2] ? ", even on Stony ground" : ""}`;
    case "bloom": return `Bloom ${plural(op[1], "Root")}`;
    case "hold": return "The soul waits without forgetting this turn";
    case "shield": return "Prevent the next Fracture before your next turn";
    case "mend": return `Mend ${plural(op[1], "Fracture")}`;
    case "release": return `Untie ${plural(op[1], "knot")} on the fullest thread (if tied, you choose)`;
    case "guide": return "The soul steps forward now, if the next space is Lit";
    case "vigil": return "Read the top 3 Mist cards and put them back on top in any order";
    case "banish_or_drain": return "Remove 1 of your choice: the nearest Shade or the nearest Black Water";
    case "banish": return "Banish the nearest Shade";
    case "drain": return "Drain the nearest Black Water";
    case "light": return `Gain ${op[1]} Light`;
    case "reveal_reach": return "Lift the fog across this Reach; Graves turn Fertile";
    case "unmake": return "Empty the fullest thread with no Backlash (if tied, you choose)";
    case "wash": return "Wash away the Shades beside the soul";
    case "lowtide": return "Drain all Black Water in this Reach";
    case "extra_karma": return "Tie 1 extra Obsession knot";
    case "recall_free": return "Return the newest forgotten card to the discard pile";
  }
  return op[0];
}
// Unremember's Resonance reads as one removal of both, not as two separate verbs.
const both = ops => ops.length === 2 && ops[0][0] === "banish" && ops[1][0] === "drain";
export const opsText = ops => both(ops) ? "Remove the nearest Shade and the nearest Black Water." : ops.map(opText).join(". ") + ".";

export const MIST_TEXT = {
  "Rising Water": "Black Water floods the river ahead.",
  "Shade": "A Shade takes a bank ahead.",
  "Shade Drawn Near": "A Shade settles beside the soul.",
  "Withering": "The 2 furthest Blooms ahead wither to Roots.",
  "Great Withering": "Three Blooms ahead wither to Roots.",
  "Fog Returns": "Fog rolls back over empty ground.",
  "Cold Wind": "A memory is forgotten.",
  "Bitter Wind": "Two memories are forgotten.",
  "The Mist Parts": "Nothing stirs. Breathe.",
  "Echo Severed": "The Echo is torn from the Loom.",
  "Undertow": "Water rises and the Blooms beside it wither.",
  "Twin Shades": "Two Shades take the banks ahead.",
  "Flood Surge": "Black Water floods twice.",
  "Shade Host": "Shades crowd both banks ahead.",
  "Wither Storm": "Every Bloom beyond the next two spaces withers.",
  "Deep Cold": "Two memories are forgotten.",
  "Karma Surge": "A knot is tied on every thread.",
  "Dark Wind": "Lose 2 Light, or suffer a Fracture.",
};
