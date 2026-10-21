// Rules engine for Netherbloom. A port of simulator/netherbloom/engine.py with the tuned defaults.
// The state is plain JSON (including the RNG), so it can be copied, saved and sent to other players.
// Player choices go through an async chooser: { rootTarget(s, stonyOk, targets), bloomTarget(s, targets), wantInscribe(s, cid),
// vigilOrder(s, top), pickThread(s, tied) (optional: which of the tied fullest threads) }.

import {
  CARDS, CORE_IDS, ECHO_IDS, SOUL_PACKS, MIST, HARSH, TILES, LANTERN, STANDARD_LANTERN, MIST_EXTRA, GHOST, MANTLES,
  OBS, ACC, OBL, FERTILE, STONY, MEMORY, GRAVE, TILE_NAMES, TAG_NAMES, REACH_NAMES, PAIR_SLOTS, PAIR_REWARDS, CHAPTER_AT,
} from "./cards.js";

export const FAR = 12, NSLOT = 24, NONE = 0, ROOT = 1, BLOOM = 2;
export const TURN_LIMIT = 120;
export const reachOf = sp => (sp <= 4 ? 0 : sp <= 8 ? 1 : 2);
export const slotName = k => `${k >> 1}${k % 2 ? " right" : " left"}`;

export class GameOver extends Error {}

export function makeConfig({ players = 3, soul = "open", lantern = STANDARD_LANTERN } = {}) {
  if (!LANTERN[lantern]) lantern = STANDARD_LANTERN;
  const [bw, limit, harsh] = LANTERN[lantern];
  const cfg = {
    players, soul, lantern, useBook: true,
    bwSupply: bw, forgottenLimit: limit, harshPerReach: harsh, fractureLimit: 3,
    karmaCap: { 1: 5, 2: 4, 3: 4, 4: 5 }[players], ashAt: 6, adriftAt: 9, mantleCost: 3,
    hand: { 1: 4, 2: 3, 3: 3, 4: 3 }[players], cardsPerTurn: 2, chapterAt: CHAPTER_AT, startLight: 0,
    burnForget: 2, extraMist: 2,
    recallCost: 3,                       // Light spent, as the Answer, to bring one forgotten card back
    resummon: players === 1, maxSummons: 3,   // solo: a new Mantle may replace the one held; each Mantle once, 3 summons a game
  };
  if (soul === "king") cfg.mantleCost = 2;
  if (soul === "garland") cfg.chapterAt = CHAPTER_AT - 1;
  if (soul === "child") { cfg.startLight = 3; cfg.adriftAt = 99; cfg.harshPerReach = 0; cfg.forgottenLimit += 1; }
  if (soul === "bride") cfg.startLight = 1;
  return cfg;
}

// ---------------------------------------------------------------- random numbers (mulberry32, state kept in s.rng)
function rand(s) {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function shuffle(s, a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------- setup
export function newGame(cfg, seed = (Math.random() * 2 ** 31) | 0, names = []) {
  const s = { cfg, rng: seed | 0, seed, ver: 0, evn: 0, ev: [], log: [] };
  s.n = cfg.players;
  s.names = Array.from({ length: s.n }, (_, i) => names[i] || `Player ${i + 1}`);
  s.cur = 0;
  s.turn = 0;
  s.phase = "start";       // start -> play -> (bringer) -> done
  s.played = 0;
  const extra = cfg.soul === "open" ? ECHO_IDS : SOUL_PACKS[cfg.soul];
  s.deck = shuffle(s, [...CORE_IDS, ...extra]);
  s.discard = [];
  s.forgotten = [];
  s.soul = 0;
  s.tok = Array(NSLOT).fill(NONE);
  s.griev = Array(NSLOT).fill(false);
  s.tile = Array(NSLOT).fill(FERTILE);
  s.revealed = Array(NSLOT).fill(true);
  TILES.forEach(([spaces, mix]) => {
    mix = shuffle(s, [...mix]);
    spaces.forEach((sp, i) => {
      for (const b of [0, 1]) {
        const k = sp * 2 + b;
        s.tile[k] = mix[i * 2 + b];
        s.revealed[k] = false;
      }
    });
  });
  s.tok[2] = s.tok[3] = BLOOM;
  s.flooded = Array(FAR + 1).fill(false);
  s.bw = cfg.bwSupply;
  s.fract = 0;
  s.light = cfg.startLight;
  s.karma = [0, 0, 0];
  s.echo = -1;
  const harsh = shuffle(s, HARSH.map((_, i) => i));
  s.mist = [0, 1, 2].map(r => {
    const d = MIST[r].map(m => m);
    for (let i = 0; i < cfg.harshPerReach && harsh.length; i++) d.push(HARSH[harsh.pop()]);
    for (let i = 0; i < cfg.extraMist; i++) d.push(MIST_EXTRA[i % 2]);
    return shuffle(s, d);
  });
  s.reach = 0;
  s.book = [{}, {}, {}];
  s.blessed = [false, false, false];
  s.keepsakes = [0, 0, 0];
  s.mantles = { weaver: -1, warden: -1, bringer: -1, breaker: -1 };
  s.wardenReady = true;
  s.hold = false;
  s.shieldUntil = -1;
  s.weaverUsed = s.bringerUsed = s.breakerUsed = false;
  s.bridePulled = false;
  s.childShield = cfg.soul === "child" ? [true, true, true] : [false, false, false];
  s.resign = false;
  s.ghost = cfg.players === 1 ? shuffle(s, GHOST.map(g => [...g])) : null;
  s.hands = Array.from({ length: s.n }, () => []);
  for (let p = 0; p < s.n; p++) for (let i = 0; i < cfg.hand; i++) s.hands[p].push(s.deck.pop());
  s.result = null;
  s.cause = null;
  s.lastMist = null;
  s.stats = { resonances: 0, inscribed: 0, blessings: 0, backlashes: 0, lingers: 0, burns: 0, summons: 0 };
  s.trail = [];  // the soul's journey, replayed in the Book of Remembrance
  s.acts = [];   // the action tokens laid this turn, for the table's turn tray
  note(s, "start", `The soul wakes at the near shore. ${REACH_NAMES[0]} lies ahead.`, { m: ["start"] });
  return s;
}

export const copy = s => JSON.parse(JSON.stringify(s));

// One entry per thing the soul did: m(ove), w(ait), l(inger and forget), p(ulled back), x (Fracture),
// i(nscribed memory), win, end. Games saved before the trail existed simply have none.
function trail(s, entry) {
  if (!s.trail) s.trail = [];
  s.trail.push({ t: s.turn, ...entry });
}

// ---------------------------------------------------------------- events (for animation, sound and the log)
// Every event carries a snapshot of the table as it stood just after that effect, so the game can be played
// back step by step, the way players would carry each effect out by hand.
const snap = s => (s.tok ? { tok: [...s.tok], griev: [...s.griev], flooded: [...s.flooded], revealed: [...s.revealed], soul: s.soul,
  fract: s.fract, light: s.light, f: s.forgotten.length, bw: s.bw, karma: [...s.karma], echo: s.echo, deck: s.deck.length,
  disc: s.discard?.length ?? 0, top: s.discard?.at(-1) ?? -1, ft: s.forgotten.at(-1) ?? -1, hold: !!s.hold, acts: [...(s.acts || [])], turn: s.turn, cur: s.cur,
  shield: s.shieldUntil >= s.turn, resign: !!s.resign, pushed: [...(s.pushedBy || [])] } : null);
export function note(s, kind, msg, data = {}) {
  s.evn += 1;
  s.ev.push({ id: s.evn, kind, msg, ...data, b: snap(s) });
  if (s.ev.length > 120) s.ev.splice(0, s.ev.length - 120);
  if (s.ev.length > 60) delete s.ev[s.ev.length - 61].b;   // older snapshots are no longer needed
  if (msg) {
    s.log.push({ id: s.evn, turn: s.turn, kind, msg, m: data.m });
    if (s.log.length > 80) s.log.splice(0, s.log.length - 80);
  }
}

// ---------------------------------------------------------------- helpers
export const lit = (s, sp) => sp >= FAR || s.tok[sp * 2] === BLOOM || s.tok[sp * 2 + 1] === BLOOM;
export const passable = (s, sp) => sp >= FAR || (lit(s, sp) && !s.flooded[sp]);

function lose(s, cause) {
  if (s.result === null) {
    trail(s, { k: "end", cause });
    s.result = "loss";
    s.cause = cause;
    note(s, "loss", { Faded: "Too much was forgotten. The soul fades into the mist.",
      Shattered: "The third Fracture. The soul shatters.",
      Deluge: "The Black Water rises with nothing left to hold it. Deluge.",
      Stalled: "The river grows still. The crossing is abandoned." }[cause], { cause, m: [`loss_${cause}`] });
  }
  throw new GameOver(cause);
}
function win(s) {
  if (s.result === null) {
    trail(s, { k: "win" });
    s.result = "win";
    note(s, "win", "The soul reaches the Far Shore.", { m: ["win"] });
  }
  throw new GameOver("win");
}

export function rootTargets(s, stonyOk) {
  const out = [];
  for (let sp = Math.max(1, s.soul); sp < FAR; sp++) {
    for (const b of [0, 1]) {
      const k = sp * 2 + b;
      if (s.tok[k] !== NONE || s.griev[k]) continue;
      if (s.revealed[k] && (s.tile[k] === GRAVE || (s.tile[k] === STONY && !stonyOk))) continue;
      const touches = sp <= s.soul + 1 || s.tok[k ^ 1] !== NONE
        || (sp > 1 && s.tok[(sp - 1) * 2 + b] !== NONE)
        || (sp < 11 && s.tok[(sp + 1) * 2 + b] !== NONE);
      if (touches) out.push(k);
    }
  }
  return out;
}
export const bloomTargets = s => {
  const out = [];
  for (let k = 2 * Math.max(1, s.soul); k < NSLOT; k++) if (s.tok[k] === ROOT) out.push(k);
  return out;
};

// ---------------------------------------------------------------- primitive actions
function placeRoot(s, k, stonyOk) {
  if (!s.revealed[k]) {
    s.revealed[k] = true;
    const t = s.tile[k];
    note(s, "reveal", `The fog lifts at ${slotName(k)}: ${TILE_NAMES[t]}.`, { k, tile: t, m: ["reveal", k, t] });
    if (t === GRAVE) {
      s.griev[k] = true;
      note(s, "grievance", "A Shade rises from the Grave.", { k, m: ["grave"] });
      return false;
    }
    if (t === STONY && !stonyOk) {
      note(s, "info", "Stony ground. The Root will not take.", { m: ["stony"] });
      return false;
    }
    if (t === MEMORY) {
      s.keepsakes[reachOf(k >> 1)] += 1;
      if (s.cfg.soul === "open") {
        s.light += 2;
        note(s, "light", "A Memory Site glows: +2 Light.", { k, m: ["memLight"] });
      } else note(s, "keepsake", "A Memory Site: a keepsake is found.", { k, m: ["memKeep"] });
    }
  } else if (s.tile[k] === GRAVE || (s.tile[k] === STONY && !stonyOk)) return false;
  s.tok[k] = ROOT;
  note(s, "root", `A Root takes hold at ${slotName(k)}.`, { k, m: ["root", k] });
  return true;
}

function addFracture(s) {
  if (s.shieldUntil >= s.turn) {
    s.shieldUntil = -1;
    note(s, "shield", "The Shield holds. No Fracture.", { m: ["shieldHold"] });
    return;
  }
  const r = reachOf(Math.max(1, Math.min(11, s.soul)));
  if (s.childShield[r]) {
    s.childShield[r] = false;
    note(s, "shield", "The little flame shields the Child. The first Fracture this Reach is ignored.", { m: ["childShield"] });
    return;
  }
  s.fract += 1;
  trail(s, { k: "x", at: s.soul });
  note(s, "fracture", `Fracture ${s.fract} of ${s.cfg.fractureLimit}.`, { m: ["fracture", s.fract, s.cfg.fractureLimit] });
  if (s.cfg.soul === "king") {
    for (const m in s.mantles) if (s.mantles[m] === s.cur) {
      s.mantles[m] = -1;
      note(s, "info", `The King's grief strips ${MANTLES[m].name} from ${s.names[s.cur]}.`, { m: ["kingStrip", m, s.names[s.cur]] });
    }
  }
  if (s.fract >= s.cfg.fractureLimit) lose(s, "Shattered");
}

function reshuffle(s) {
  if (s.discard.length) {
    const n = s.discard.length;
    s.deck = shuffle(s, s.discard);
    s.discard = [];
    note(s, "info", "The discard pile is shuffled into a new deck.", { n, m: ["reshuffle"] });
  }
}
function forgetTop(s, n = 1) {
  for (let i = 0; i < n; i++) {
    if (!s.deck.length) reshuffle(s);
    if (!s.deck.length) return;
    const cid = s.deck.pop();
    s.forgotten.push(cid);
    note(s, "forget", `Forgotten: ${CARDS[cid].name}.`, { cid, from: "deck", m: ["forgot", cid] });
    checkFaded(s);
  }
}
function forgetCard(s, cid) {
  s.forgotten.push(cid);
  note(s, "forget", `Forgotten: ${CARDS[cid].name}.`, { cid, from: "play", m: ["forgot", cid] });
  checkFaded(s);
}
// A card set down on the discard pile. The event has no text of its own: the table shows the card travelling there.
function toDiscard(s, cid, from = "play") {
  s.discard.push(cid);
  note(s, "discard", "", { cid, from });
}
function checkFaded(s) {
  if (s.forgotten.length >= s.cfg.forgottenLimit) lose(s, "Faded");
}

function placeBW(s, sp) {
  sp = Math.min(sp, 11);
  let x = -1;
  for (let i = sp; i < FAR; i++) if (!s.flooded[i] && i !== s.soul && i >= 1) { x = i; break; }
  if (x < 0) for (let i = sp - 1; i > s.soul; i--) if (!s.flooded[i] && i >= 1) { x = i; break; }
  if (x < 0) return;
  if (s.bw <= 0) lose(s, "Deluge");
  s.flooded[x] = true;
  s.bw -= 1;
  note(s, "flood", `Black Water floods space ${x}. ${s.bw} left in the supply.`, { sp: x, m: ["flood", x, s.bw] });
  for (const b of [0, 1]) if (s.tok[x * 2 + b] === BLOOM) {
    s.tok[x * 2 + b] = ROOT;
    note(s, "wither", `Under the Black Water the Bloom at ${slotName(x * 2 + b)} withers to a Root.`, { k: x * 2 + b, m: ["drown", x * 2 + b] });
  }
}
function drain(s, sp) {
  if (s.flooded[sp]) {
    s.flooded[sp] = false;
    note(s, "drain", `The Black Water at ${sp} drains away.`, { sp, m: ["drain", sp] });
  }
}
function placeGriev(s, sp, bank) {
  sp = Math.max(1, Math.min(sp, 11));
  let order = [];
  for (let x = sp; x < FAR; x++) order.push([x, bank], [x, 1 - bank]);
  if (order.every(([x, b]) => s.griev[x * 2 + b])) {
    order = [];
    for (let x = sp; x >= Math.max(0, s.soul) && x >= 1; x--) order.push([x, 0], [x, 1]);
  }
  for (const [x, b] of order) {
    const k = x * 2 + b;
    if (!s.griev[k]) {
      const had = s.tok[k];
      s.griev[k] = true;
      s.tok[k] = NONE;
      note(s, "grievance", `A Shade takes ${slotName(k)}${had === BLOOM ? " and smothers the Bloom there" : had === ROOT ? " and smothers the Root there" : ""}.`,
        { k, m: had === NONE ? ["griev", k] : ["grievOver", k, had === BLOOM] });
      return;
    }
  }
}

function tieKnot(s, tag) {
  s.karma[tag] += 1;
  note(s, "knot", `A knot is tied on the ${TAG_NAMES[tag]} thread (${s.karma[tag]} of ${s.cfg.karmaCap}).`, { tag, m: ["knot", tag, s.karma[tag], s.cfg.karmaCap] });
  if (s.karma[tag] >= s.cfg.karmaCap) {
    s.karma[tag] = 0;
    backlash(s, tag);
  }
}
function backlash(s, tag) {
  s.stats.backlashes += 1;
  note(s, "backlash", `Backlash of ${TAG_NAMES[tag]}! ${["Grasping: a Shade claws at the soul.", "Resignation: the soul will sit down and Linger.", "The Tide Rises: Black Water floods ahead."][tag]}`, { tag, m: ["backlash", tag] });
  if (tag === OBS) {
    const k0 = s.soul * 2, k1 = k0 + 1;
    if (s.soul >= 1 && !s.griev[k0]) placeGriev(s, s.soul, 0);
    else if (s.soul >= 1 && !s.griev[k1]) placeGriev(s, s.soul, 1);
    else placeGriev(s, s.soul + 1, 0);
  } else if (tag === ACC) s.resign = true;
  else placeBW(s, s.soul + 1);
}

// ---------------------------------------------------------------- card effects
async function doOps(s, ops, ch) { for (const op of ops) await doOp(s, op, ch); }

async function doOp(s, op, ch) {
  const kind = op[0];
  if (kind === "root") {
    let n = op[1], stony = op[2];
    if (s.mantles.weaver === s.cur) {
      stony = true;
      if (!s.weaverUsed) { s.weaverUsed = true; n += 1; }
    }
    for (let i = 0; i < n; i++) {
      const ts = rootTargets(s, stony);
      if (!ts.length) { note(s, "info", "No ground left to root.", { m: ["noRoot"] }); break; }
      const t = await ch.rootTarget(s, stony, ts, i + 1, n);
      if (t === null || t === undefined) break;
      placeRoot(s, t, stony);
    }
  } else if (kind === "bloom") {
    for (let i = 0; i < op[1]; i++) {
      const ts = bloomTargets(s);
      if (!ts.length) { note(s, "info", "No Root left to bloom.", { m: ["noBloom"] }); break; }
      const t = await ch.bloomTarget(s, ts, i + 1, op[1]);
      if (t === null || t === undefined) break;
      s.tok[t] = BLOOM;
      note(s, "bloom", `The Root at ${slotName(t)} Blooms.`, { k: t, m: ["bloomAt", t] });
    }
  } else if (kind === "hold") {
    s.hold = true;
    note(s, "info", "Hold Fast: the soul will wait without forgetting.", { m: ["hold"] });
  } else if (kind === "shield") {
    s.shieldUntil = s.turn + s.n;
    note(s, "shield", "A Shield is raised until your next turn.", { m: ["shield"] });
  } else if (kind === "mend") {
    if (s.fract > 0) note(s, "mend", "A Fracture is mended.", { m: ["mend"] });
    s.fract = Math.max(0, s.fract - op[1]);
  } else if (kind === "release") {
    const col = await fullest(s, ch);
    s.karma[col] = Math.max(0, s.karma[col] - op[1]);
    note(s, "release", `Knots untied on ${TAG_NAMES[col]}.`, { tag: col, m: ["release", col] });
  } else if (kind === "guide") {
    if (passable(s, s.soul + 1)) {
      note(s, "guide", "Guided, the soul steps forward.", { m: ["guided"] });
      moveSoul(s, 1);
    } else note(s, "info", "The way ahead is dark. The soul cannot be guided.", { m: ["noGuide"] });
  } else if (kind === "vigil") {
    // the player reads the top 3 Mist cards (in the order they would come) and puts them back on top in any order:
    // the chooser returns the new order as indices into top, the first to come first
    const d = s.mist[s.reach], top = d.slice(-3).reverse();
    if (top.length) {
      let order = await ch.vigilOrder(s, top);
      const ok = Array.isArray(order) && order.length === top.length && [...order].sort().every((v, j) => v === j);
      if (!ok) order = top.map((_, j) => j).sort((a, b) => mistSeverity(top[a]) - mistSeverity(top[b]));   // mildest first
      d.splice(d.length - top.length, top.length, ...order.map(j => top[j]).reverse());
      const next = top[order[0]][0];
      note(s, "info", `Vigil: the coming Mist is read and put back in order. Next: ${next}.`, { m: ["vigil", next] });
    }
  } else if (kind === "banish_or_drain") {
    const g = urgentGrievance(s), w = urgentWater(s);
    if (g !== null && (w === null || grievUrgency(s, g) >= waterUrgency(s, w))) banish(s, g);
    else if (w !== null) drain(s, w);
  } else if (kind === "banish") {
    const g = urgentGrievance(s);
    if (g !== null) banish(s, g);
  } else if (kind === "drain") {
    const w = urgentWater(s);
    if (w !== null) drain(s, w);
  } else if (kind === "light") {
    s.light += op[1];
    note(s, "light", `+${op[1]} Light.`, { m: ["light", op[1]] });
  } else if (kind === "reveal_reach") {
    for (const sp of TILES[s.reach][0]) for (const b of [0, 1]) {
      const k = sp * 2 + b;
      if (!s.revealed[k]) {
        s.revealed[k] = true;
        if (s.tile[k] === GRAVE) s.tile[k] = FERTILE;
      }
    }
    note(s, "reveal", "The fog lifts across the whole Reach.", { m: ["revealAll"] });
  } else if (kind === "unmake") {
    const col = await fullest(s, ch);
    s.karma[col] = 0;
    note(s, "release", `The ${TAG_NAMES[col]} thread is unmade.`, { tag: col, m: ["unmade", col] });
  } else if (kind === "wash") {
    for (const b of [0, 1]) if (s.soul >= 1 && s.griev[s.soul * 2 + b]) banish(s, s.soul * 2 + b);
  } else if (kind === "lowtide") {
    const [lo, hi] = [[1, 4], [5, 8], [9, 11]][s.reach];
    for (let sp = lo; sp <= hi; sp++) drain(s, sp);
  } else if (kind === "extra_karma") tieKnot(s, op[1]);
  else if (kind === "recall_free") {
    if (s.forgotten.length) {
      const cid = s.forgotten.pop();
      s.discard.push(cid);
      note(s, "recall", `“${CARDS[cid].name}” returns from the forgotten pile to the discard pile.`, { cid, m: ["returnMem", cid] });
    }
  }
}

function banish(s, k) {
  s.griev[k] = false;
  note(s, "banish", `The Shade at ${slotName(k)} is banished.`, { k, m: ["banish", k] });
}
// The fullest thread; if threads are tied, the player chooses (the chooser's pickThread), else the first.
async function fullest(s, ch) {
  const top = Math.max(...s.karma), tied = [0, 1, 2].filter(i => s.karma[i] === top);
  if (tied.length > 1 && ch?.pickThread) {
    const t = await ch.pickThread(s, tied);
    if (tied.includes(t)) return t;
  }
  return tied[0];
}
function urgentGrievance(s) {
  let best = null, bu = -1;
  for (let k = 2 * Math.max(1, s.soul); k < NSLOT; k++) {
    if (s.griev[k]) {
      const u = grievUrgency(s, k);
      if (u > bu) { best = k; bu = u; }
    }
  }
  return best;
}
const grievUrgency = (s, k) => 10 - Math.min((k >> 1) - s.soul, 9) * 2;
function urgentWater(s) {
  for (let sp = s.soul + 1; sp < FAR; sp++) if (s.flooded[sp]) return sp;
  return null;
}
const waterUrgency = (s, sp) => 11 - Math.min(sp - s.soul, 9) * 2;

export function mistSeverity(m) {
  const w = { bw: 3, grv: 3, grv_near: 4, wither: 2, wither_far: 3, wither_at: 2, fog: 1, forget: 2, sever: 1, karma_all: 3, dark_wind: 2 };
  return m[1].reduce((a, op) => a + (w[op[0]] || 0), 0);
}

// ---------------------------------------------------------------- a turn
export function beginTurn(s) {
  const p = s.cur;
  s.turn += 1;
  s.hold = false;
  s.weaverUsed = s.bringerUsed = s.breakerUsed = false;
  if (s.mantles.warden === p) s.wardenReady = true;
  s.phase = "play";
  s.played = 0;
  s.burned = false;
  s.burn = null;
  s.pushed = false;
  s.acts = [];
  s.lastMist = null;
  note(s, "turn", `Turn ${s.turn}: ${s.names[p]}.`, { p, m: ["turn", s.turn, s.names[p]] });
}

// A Mantle's holder: -1 while it is free, the player's seat while held, -2 once laid down for good (solo re-summon).
export const heldMantle = (s, p = s.cur) => Object.keys(s.mantles).find(m => s.mantles[m] === p) ?? null;
export function canSummon(s) {
  const p = s.cur;
  if (s.phase !== "play" || s.played > 0 || s.light < s.cfg.mantleCost) return false;
  if (heldMantle(s, p) && !(s.cfg.resummon && s.stats.summons < s.cfg.maxSummons)) return false;
  return Object.entries(s.mantles).some(([m, h]) => h === -1 && s.hands[p].some(cid => CARDS[cid].tag === MANTLES[m].tag));
}

export function summon(s, mantle, cid) {
  const p = s.cur, old = heldMantle(s, p);
  s.light -= s.cfg.mantleCost;
  s.hands[p].splice(s.hands[p].indexOf(cid), 1);
  (s.acts ||= []).push({ a: "summon", m: mantle });
  if (old) {
    s.mantles[old] = -2;
    if (old === "warden") s.wardenReady = false;
    note(s, "summon", `${s.names[p]} lays down ${MANTLES[old].name} for good and takes up ${MANTLES[mantle].name}.`, { mantle, old, p, m: ["resummon", s.names[p], old, mantle] });
  } else note(s, "summon", `${s.names[p]} takes up ${MANTLES[mantle].name}.`, { mantle, p, m: ["summon", s.names[p], mantle] });
  s.mantles[mantle] = p;
  s.stats.summons += 1;
  toDiscard(s, cid, "hand");
}

// Recall: as the Answer (the turn's first action), spend Light to bring one forgotten card of your choice back to
// the discard pile. The Answer is the only action that can Resonate, so a Recall gives that up.
export const canRecall = s => s.phase === "play" && s.played === 0 && s.light >= s.cfg.recallCost && s.forgotten.length > 0;
export function recall(s, cid) {
  const i = s.forgotten.indexOf(cid);
  if (i < 0 || !canRecall(s)) return false;
  s.light -= s.cfg.recallCost;
  s.forgotten.splice(i, 1);
  s.discard.push(cid);
  s.played += 1;
  s.stats.recalls = (s.stats.recalls || 0) + 1;
  (s.acts ||= []).push({ a: "recall", cid });
  note(s, "recall", `${s.names[s.cur]} spends ${s.cfg.recallCost} Light: “${CARDS[cid].name}” is remembered and returns to the discard pile.`,
    { cid, p: s.cur, m: ["recall", s.names[s.cur], cid, s.cfg.recallCost] });
  return true;
}

// mode: "up", "down" or "burn". Returns true if the card Resonated.
export async function playCard(s, cid, mode, ch) {
  const card = CARDS[cid];
  const first = s.played === 0;
  const hand = s.hands[s.cur];
  hand.splice(hand.indexOf(cid), 1);
  s.played += 1;
  if (mode === "down") {
    (s.acts ||= []).push({ a: "down" });
    note(s, "play", `${s.names[s.cur]} plays a card face down: 1 Root.`, { cid: -1, mode, p: s.cur, m: ["playDown", s.names[s.cur]] });
    await doOp(s, ["root", 1, false], ch);
    s.discard.push(cid);
    note(s, "discard", "", { cid, from: "play" });   // the discard pile is face up
    return false;
  }
  const resonated = first && s.echo === card.tag;
  if (mode === "burn") s.burned = true;
  (s.acts ||= []).push({ a: mode === "burn" ? "burn" : "card", tag: card.tag, res: resonated });
  note(s, "play", `${s.names[s.cur]} plays ${card.name}${mode === "burn" ? " and Burns it" : ""}${resonated ? ". It Resonates with the Echo!" : "."}`,
    { cid, mode, p: s.cur, res: resonated, m: ["play", s.names[s.cur], cid, mode === "burn", resonated] });
  const reps = mode === "burn" ? 2 : 1;
  for (let i = 0; i < reps; i++) await doOps(s, resonated && card.rr ? card.res : card.eff, ch);
  if (resonated) {
    s.stats.resonances += 1;
    if (!card.rr) await doOps(s, card.res, ch);
  }
  tieKnot(s, card.tag);
  s.echo = card.tag;
  note(s, "echo", `The Echo shuttle moves to the ${TAG_NAMES[card.tag]} thread.`, { tag: card.tag, m: ["echoOn", card.tag] });
  if (mode === "burn") {
    s.stats.burns += 1;
    forgetCard(s, cid);
    if (s.cfg.burnForget > 1) forgetTop(s, s.cfg.burnForget - 1);
    return resonated;
  }
  if (card.tag === OBL) {
    if (s.mantles.breaker === s.cur && !s.breakerUsed) {
      s.breakerUsed = true;
      note(s, "info", "The Fog-Breaker keeps the memory from the river.", { m: ["breaker"] });
      toDiscard(s, cid);
    } else forgetCard(s, cid);
    return resonated;
  }
  if ((resonated || card.key) && s.cfg.useBook && card.slot && s.reach < 3 && !(card.slot in s.book[s.reach])
      && await ch.wantInscribe(s, cid)) {
    s.book[s.reach][card.slot] = cid;
    trail(s, { k: "i", at: s.soul, r: s.reach, cid });
    s.stats.inscribed += 1;
    note(s, "inscribe", `Inscribed in the Book (${card.slot}): “${card.band}”`, { cid, reach: s.reach, slot: card.slot, m: ["inscribe", cid] });
    await pageRewards(s, s.reach, card.slot, ch);
    return resonated;
  }
  toDiscard(s, cid);
  return resonated;
}

// ---------------------------------------------------------------- Burn (at most once per turn)
// Solo: one card, its effect twice, then it and the top card of the deck are forgotten (playCard with mode "burn").
// With 2-4 players a Burn is joint: another player who holds a card of the same thread adds one; both are revealed and
// the active player chooses which one's effect happens twice. Both cards are forgotten and the helper draws 1.
export const burnPartners = (s, cid) => (s.n === 1 ? [] : Array.from({ length: s.n }, (_, p) => p)
  .filter(p => p !== s.cur && s.hands[p].some(c => CARDS[c].tag === CARDS[cid].tag)));
export const canBurn = (s, cid) => s.phase === "play" && !s.burned && s.played < s.cfg.cardsPerTurn
  && (s.n === 1 || burnPartners(s, cid).length > 0);
// The seat that must act now: the helper while a joint Burn waits for their card, otherwise the active player.
export const actor = s => (s.burn && s.burn.pcid === null ? s.burn.partner : s.cur);
export function askBurn(s, cid, partner) {
  s.burn = { by: s.cur, cid, tag: CARDS[cid].tag, partner, pcid: null };
  s.phase = "burn";
  note(s, "burnAsk", `${s.names[s.cur]} asks ${s.names[partner]} to Burn with them (${TAG_NAMES[CARDS[cid].tag]}).`,
    { p: s.cur, partner, tag: CARDS[cid].tag, m: ["burnAsk", s.names[s.cur], s.names[partner], CARDS[cid].tag] });
}
export function joinBurn(s, pcid) {
  if (!s.burn || s.burn.pcid !== null || CARDS[pcid].tag !== s.burn.tag || !s.hands[s.burn.partner].includes(pcid)) return false;
  s.burn.pcid = pcid;
  note(s, "burnJoin", `${s.names[s.burn.partner]} adds a card. Both are revealed.`, { p: s.burn.partner, m: ["burnJoin", s.names[s.burn.partner]] });
  return true;
}
// which: "own" or "partner", the card whose effect happens twice. Returns true if it Resonated.
export async function resolveBurn(s, which, ch) {
  const { cid, pcid, partner } = s.burn;
  const first = s.played === 0, chosen = which === "partner" ? pcid : cid, card = CARDS[chosen];
  s.burn = null;
  s.phase = "play";
  s.hands[s.cur].splice(s.hands[s.cur].indexOf(cid), 1);
  s.hands[partner].splice(s.hands[partner].indexOf(pcid), 1);
  s.played += 1;
  s.burned = true;
  const resonated = first && s.echo === card.tag;
  (s.acts ||= []).push({ a: "burn", tag: card.tag, res: resonated });
  note(s, "play", `${s.names[s.cur]} and ${s.names[partner]} Burn together: ${card.name} twice${resonated ? ". It Resonates with the Echo!" : "."}`,
    { cid: chosen, other: chosen === cid ? pcid : cid, mode: "burn", p: s.cur, res: resonated, m: ["burnJoint", s.names[s.cur], s.names[partner], chosen, resonated] });
  for (let i = 0; i < 2; i++) await doOps(s, resonated && card.rr ? card.res : card.eff, ch);
  if (resonated) {
    s.stats.resonances += 1;
    if (!card.rr) await doOps(s, card.res, ch);
  }
  tieKnot(s, card.tag);
  s.echo = card.tag;
  note(s, "echo", `The Echo shuttle moves to the ${TAG_NAMES[card.tag]} thread.`, { tag: card.tag, m: ["echoOn", card.tag] });
  s.stats.burns += 1;
  forgetCard(s, cid);
  forgetCard(s, pcid);
  drawUp(s, partner);
  return resonated;
}

export const canInscribe = (s, cid, resonated) => {
  const c = CARDS[cid];
  return (resonated || c.key) && c.slot && !(c.slot in s.book[s.reach]);
};

// Page rewards: each pair of neighbouring slots pays its reward when an inscription fills its second slot; a full page
// (the Garland Girl: one short of full) also gives the Chapter Blessing, once per page.
async function pageRewards(s, r, slot, ch) {
  const page = s.book[r];
  for (const [i, [a, b]] of PAIR_SLOTS.entries()) {
    if ((slot === a || slot === b) && a in page && b in page) {
      s.stats.pairRewards = (s.stats.pairRewards || 0) + 1;
      note(s, "blessing", `Page reward (${a} + ${b}).`, { m: ["pairReward", a, b] });
      await doOps(s, PAIR_REWARDS[r][i], ch);
    }
  }
  if (!s.blessed[r] && Object.keys(page).length >= s.cfg.chapterAt) {
    s.blessed[r] = true;
    s.stats.blessings += 1;
    blessing(s);
  }
}

function blessing(s) {
  if (s.fract > 0) {
    s.fract -= 1;
    note(s, "blessing", "Chapter Blessing: a Fracture is mended.", { m: ["bless_mend"] });
  } else if (s.flooded.some((f, i) => f && i >= 1)) {
    const w = urgentWater(s) ?? s.flooded.findIndex((f, i) => f && i >= 1);
    note(s, "blessing", "Chapter Blessing: the Black Water recedes.", { m: ["bless_drain"] });
    drain(s, w);
  } else if (s.forgotten.length) {
    const cid = s.forgotten.pop();
    s.discard.push(cid);
    note(s, "blessing", "Chapter Blessing: a forgotten memory returns.", { cid, m: ["bless_return"] });
  } else note(s, "blessing", "Chapter Blessing: the page glows.", { m: ["bless_glow"] });
}

export const bringerPending = s => s.mantles.bringer === s.cur && !s.bringerUsed && bloomTargets(s).length > 0;

export function bringerBloom(s, k) {
  s.bringerUsed = true;
  if (k !== null && k !== undefined) {
    s.tok[k] = BLOOM;
    note(s, "bloom", "The Bloom-Bringer opens a flower.", { k, m: ["bringer"] });
  }
}

// ---------------------------------------------------------------- soul movement
function moveSoul(s, steps) {
  for (let i = 0; i < steps; i++) {
    const old = s.soul;
    let blooms = 0;
    if (old >= 1 && old <= 11) {
      for (const b of [0, 1]) {
        const k = old * 2 + b;
        if (s.tok[k] === BLOOM) { s.light += 1; blooms += 1; }
        s.tok[k] = NONE;
        s.griev[k] = false;
      }
    }
    s.soul += 1;
    trail(s, { k: "m", f: old, to: s.soul, b: blooms });
    note(s, "move", s.soul >= FAR ? "The soul steps onto the Far Shore." : `The soul steps to space ${s.soul}.`, { from: old, to: s.soul, m: ["move", s.soul] });
    if (blooms) note(s, "light", `The soul takes the light of the ${blooms === 1 ? "Bloom" : "Blooms"} it leaves behind: +${blooms} Light.`, { m: ["passLight", blooms] });
    if (s.soul >= FAR) win(s);
    const nr = reachOf(s.soul);
    if (nr !== s.reach) {
      s.reach = nr;
      s.karma = [0, 0, 0];
      note(s, "reach", `The soul enters Reach ${["I", "II", "III"][nr]}: ${REACH_NAMES[nr]}. The Loom is cleared.`, { reach: nr, m: ["reach", nr] });
    }
  }
}

function soulStep(s) {
  if (s.result !== null) return;
  const f = s.forgotten.length, cfg = s.cfg;
  if (s.resign) {
    s.resign = false;
    note(s, "linger", "Resignation: the soul sits down in the reeds.", { m: ["resign"] });
    linger(s, true);
    feed(s);
    return;
  }
  if (passable(s, s.soul + 1)) {
    moveSoul(s, 1);
    if (f >= cfg.adriftAt) {
      if (passable(s, s.soul + 1)) moveSoul(s, 1);
      else if (s.mantles.warden >= 0 && s.wardenReady) {
        s.wardenReady = false;
        note(s, "shield", "The Spirit Warden holds the drifting soul back.", { m: ["wardenDrift"] });
      } else {
        note(s, "adrift", "Adrift: with so much forgotten, the soul drifts into the dark.", { m: ["adrift"] });
        moveSoul(s, 1);
        addFracture(s);
      }
    } else if (f >= cfg.ashAt && passable(s, s.soul + 1)) {
      note(s, "info", "Light as Ash: the soul, lighter now, glides one more space.", { m: ["ash"] });
      moveSoul(s, 1);
    }
  } else linger(s, false);
  feed(s);
}

// The next space is dark only because Shades hold both of its banks.
export function blockedByGrievances(s) {
  const sp = s.soul + 1;
  return sp >= 1 && sp <= 11 && !s.flooded[sp] && s.griev[sp * 2] && s.griev[sp * 2 + 1];
}
// Push Through is an action a player chooses; it uses no card. Without it, a soul facing two Shades Lingers.
// Each Ferryman may Push Through only once in the whole game.
export const hasPushed = (s, p = s.cur) => !!(s.pushedBy && s.pushedBy[p]);
export const canPush = s => s.phase === "play" && !s.pushed && !hasPushed(s) && s.played < s.cfg.cardsPerTurn && blockedByGrievances(s);
export const pushCost = s => 1 + (s.stats.pushes || 0);
export function pushAction(s) {
  s.played += 1;
  s.pushed = true;
  (s.acts ||= []).push({ a: "push" });
  s.pushedBy = s.pushedBy || Array(s.n).fill(false);
  s.pushedBy[s.cur] = true;
  pushThrough(s);
}
// Push through the shades: both Shades scatter, the soul steps forward, and it pays with a memory and a
// Fracture. Each push already made this game adds another Fracture, so a second push is close to fatal.
function pushThrough(s) {
  const sp = s.soul + 1, wounds = 1 + (s.stats.pushes || 0);
  s.griev[sp * 2] = s.griev[sp * 2 + 1] = false;
  s.stats.pushes = wounds;
  note(s, "push", `${s.names[s.cur]} drives the soul through the Shades. They scatter, but they wound it: ${wounds} Fracture${wounds > 1 ? "s" : ""}.`, { sp, p: s.cur, m: ["push", wounds, s.names[s.cur]] });
  moveSoul(s, 1);
  for (let i = 0; i < wounds; i++) addFracture(s);
  forgetTop(s, 1);
}

function linger(s, force) {
  if (!force && s.hold) { trail(s, { k: "w", at: s.soul }); note(s, "info", "Holding fast, the soul waits without forgetting.", { m: ["holding"] }); return; }
  if (!force && s.mantles.warden >= 0 && s.wardenReady) {
    s.wardenReady = false;
    trail(s, { k: "w", at: s.soul });
    note(s, "shield", "The Spirit Warden steadies the soul.", { m: ["wardenSteady"] });
    return;
  }
  s.stats.lingers += 1;
  if (!force && s.soul >= 1 && lit(s, s.soul)) {
    trail(s, { k: "w", at: s.soul });
    note(s, "linger", "The way ahead is dark. The soul waits beside its own light.", { m: ["waitLit"] });
    return;
  }
  if (s.cfg.soul === "bride" && !force && s.soul >= 1 && !s.bridePulled) {
    s.bridePulled = true;
    s.soul -= 1;
    trail(s, { k: "p", f: s.soul + 1, to: s.soul });
    note(s, "move", `The soul is pulled back to space ${s.soul}.`, { from: s.soul + 1, to: s.soul, m: ["pulled", s.soul] });
    note(s, "linger", "In the dark she looks back, and is pulled one space toward the living.", { m: ["bridePull"] });
    return;
  }
  trail(s, { k: "l", at: s.soul });
  note(s, "linger", "The soul Lingers in the dark, and forgets.", { m: ["linger"] });
  forgetTop(s, 1);
}

function feed(s) {
  if (s.soul >= 1 && s.soul <= 11 && (s.griev[s.soul * 2] || s.griev[s.soul * 2 + 1])) {
    note(s, "info", "A Shade feeds on the soul.", { m: ["feed"] });
    addFracture(s);
  }
}

// ---------------------------------------------------------------- Mist
function mistStep(s) {
  const d = s.mist[s.reach];
  if (!d.length) d.push(...shuffle(s, MIST[s.reach].map(m => m)));
  const [name, ops] = d.pop();
  s.lastMist = name;
  note(s, "mist", name, { name, ops, m: ["mist", name] });
  const S = s.soul;
  for (const op of ops) {
    const k = op[0];
    if (k === "bw") placeBW(s, S + op[1]);
    else if (k === "grv") placeGriev(s, S + op[1] <= 11 ? S + op[1] : Math.min(11, Math.max(1, S)), op[2]);
    else if (k === "grv_near") {
      if (S >= 1 && !s.griev[S * 2]) placeGriev(s, S, 0);
      else if (S >= 1 && !s.griev[S * 2 + 1]) placeGriev(s, S, 1);
      else placeGriev(s, Math.min(11, S + 1), 0);
    } else if (k === "wither") {
      let n = op[1];
      for (let x = NSLOT - 1; x >= 2 * (S + 1) && n > 0; x--) if (s.tok[x] === BLOOM) { s.tok[x] = ROOT; n--; note(s, "wither", `The Bloom at ${slotName(x)} withers to a Root.`, { k: x, m: ["wither", x] }); }
    } else if (k === "wither_far") {
      for (let x = 2 * (S + op[1] + 1); x < NSLOT; x++) if (s.tok[x] === BLOOM) { s.tok[x] = ROOT; note(s, "wither", `The Bloom at ${slotName(x)} withers to a Root.`, { k: x, m: ["wither", x] }); }
    } else if (k === "wither_at") {
      const sp = S + op[1];
      if (sp <= 11) for (const b of [0, 1]) if (s.tok[sp * 2 + b] === BLOOM) { s.tok[sp * 2 + b] = ROOT; note(s, "wither", `The Bloom at ${slotName(sp * 2 + b)} withers to a Root.`, { k: sp * 2 + b, m: ["wither", sp * 2 + b] }); }
    } else if (k === "fog") {
      let n = op[1];
      for (let x = NSLOT - 1; x >= 2 * (S + 1); x--) {
        if (n && s.revealed[x] && s.tok[x] === NONE && !s.griev[x] && x >= 4) {
          s.revealed[x] = false; n--;
          note(s, "fog", `The fog closes over ${slotName(x)} again.`, { k: x, m: ["fogBack", x] });
        }
      }
    } else if (k === "forget") forgetTop(s, op[1]);
    else if (k === "sever") { s.echo = -1; note(s, "echo", "The Echo is torn from the Loom.", { tag: -1, m: ["sever"] }); }
    else if (k === "karma_all") for (const t of [0, 1, 2]) tieKnot(s, t);
    else if (k === "dark_wind") {
      if (s.light >= 2) { s.light -= 2; note(s, "light", "The Dark Wind blows out 2 Light.", { m: ["darkWind"] }); }
      else { note(s, "info", "The Dark Wind finds no Light to take, and wounds the soul.", { m: ["darkWindHurt"] }); addFracture(s); }
    }
  }
}

function endOfTurnChecks(s) {
  for (let sp = 1; sp < FAR; sp++) {
    if (s.flooded[sp] && s.tok[sp * 2] >= ROOT && s.tok[sp * 2 + 1] >= ROOT) {
      note(s, "info", `Roots on both banks drink the flood at ${sp}.`, { m: ["drink", sp] });
      drain(s, sp);
    }
  }
  for (let k = 2; k < NSLOT; k++) {
    if (s.griev[k]) {
      const sp = k >> 1, b = k % 2;
      if (sp >= 2 && sp <= 10 && s.tok[(sp - 1) * 2 + b] === BLOOM && s.tok[(sp + 1) * 2 + b] === BLOOM) {
        s.griev[k] = false;
        note(s, "banish", `Trapped between Blooms, the Shade at ${slotName(k)} dissolves in the light.`, { k, m: ["trapped", k] });
      }
    }
  }
}

function drawUp(s, p) {
  let cids = [];
  const told = () => {
    if (cids.length) note(s, "draw", `${s.names[p]} draws ${cids.length} card${cids.length === 1 ? "" : "s"} back up to ${s.cfg.hand}.`, { p, n: cids.length, cids, m: ["draw", s.names[p], cids.length] });
    cids = [];
  };
  while (s.hands[p].length < s.cfg.hand) {
    if (!s.deck.length) { told(); reshuffle(s); }   // the cards drawn so far come off the old deck, before the shuffle
    if (!s.deck.length) break;
    const cid = s.deck.pop();
    s.hands[p].push(cid);
    cids.push(cid);
  }
  told();
}

function ghostTurn(s) {
  if (!s.ghost || !s.ghost.length) s.ghost = shuffle(s, GHOST.map(g => [...g]));
  const [tag, act] = s.ghost.pop();
  const what = { root_far: "roots far ahead", root_near: "roots close by", bloom_near: "blooms the nearest Root",
    bloom_far: "blooms the furthest Root", banish_forget: "clears the way", none: "drifts silently" }[act];
  note(s, "ghost", `The Ghost plays ${TAG_NAMES[tag]}: it ${what}.`, { tag, m: ["ghost", tag, act] });
  if (act === "root_far" || act === "root_near") {
    const ts = rootTargets(s, false);
    if (ts.length) placeRoot(s, act === "root_far" ? Math.max(...ts) : Math.min(...ts), false);
  } else if (act === "bloom_near" || act === "bloom_far") {
    const ts = bloomTargets(s);
    if (ts.length) {
      const k = act === "bloom_near" ? Math.min(...ts) : Math.max(...ts);
      s.tok[k] = BLOOM;
      note(s, "bloom", `The Root at ${slotName(k)} Blooms.`, { k, m: ["bloomAt", k] });
    }
  } else if (act === "banish_forget") {
    const g = urgentGrievance(s);
    if (g !== null) banish(s, g);
    else {
      const w = urgentWater(s);
      if (w !== null) drain(s, w);
    }
  }
  tieKnot(s, tag);
  s.echo = tag;
  note(s, "echo", `The Echo shuttle moves to the ${TAG_NAMES[tag]} thread.`, { tag, m: ["echoOn", tag] });
}

// Everything after the cards: Soul Step, Mist, threats, draw, the Ghost, then pass the turn.
export function endTurn(s) {
  const p = s.cur;
  try {
    soulStep(s);
    mistStep(s);
    endOfTurnChecks(s);
    drawUp(s, p);
    if (s.n === 1) {
      ghostTurn(s);
      endOfTurnChecks(s);
    }
    s.cur = (p + 1) % s.n;
    if (s.turn >= TURN_LIMIT) lose(s, "Stalled");
    s.phase = "start";
  } catch (e) {
    if (!(e instanceof GameOver)) throw e;
  }
  if (s.result) s.phase = "over";
}

export function keyMemoryFate(s) {
  if (s.cfg.soul === "open") return null;
  const key = SOUL_PACKS[s.cfg.soul].find(cid => CARDS[cid].key);
  if (s.book.some(page => Object.values(page).includes(key))) return "inscribed";
  if (s.forgotten.includes(key)) return "forgotten";
  return "unspoken";
}
