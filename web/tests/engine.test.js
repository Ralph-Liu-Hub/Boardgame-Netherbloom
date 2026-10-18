// Plays many games with a simple greedy chooser to check the engine never crashes and games end.
import assert from "node:assert/strict";
import { makeConfig, newGame, beginTurn, playCard, endTurn, GameOver, copy, lit, NONE, ROOT, canSummon, summon, bringerPending, bringerBloom, bloomTargets, canSeek, seek, canPush, pushCost, pushAction, hasPushed, canRecall, recall, heldMantle, mistSeverity } from "../public/assets/engine.js";
import { CARDS, MANTLES, MIST, HARSH, SOULS } from "../public/assets/cards.js";
import { setLang, say, cardName, cardBand, mistName, mistText, soulInfo, mantleInfo } from "../public/assets/i18n.js";

const greedy = {
  async rootTarget(s, stony, ts) {
    let best = null, bv = -1e9;
    for (const k of ts) {
      const sp = k >> 1;
      let v = 100 - (sp - s.soul) * 6;
      if (lit(s, sp)) v -= 20; else if (s.tok[k ^ 1] === ROOT) v -= 8;
      if (s.flooded[sp] && s.tok[k ^ 1] !== NONE) v += 10;
      if (v > bv) { best = k; bv = v; }
    }
    return best;
  },
  async bloomTarget(s, ts) {
    let best = null, bv = -1e9;
    for (const k of ts) {
      const sp = k >> 1;
      let v = 100 - (sp - s.soul) * 6;
      if (lit(s, sp)) v -= 25;
      if (s.flooded[sp]) v -= 15;
      if (v > bv) { best = k; bv = v; }
    }
    return best;
  },
  async wantInscribe() { return true; },
  async vigilLast(s, top) { return top.reduce((w, m, j) => (mistSeverity(m) > mistSeverity(top[w]) ? j : w), 0); },
};

async function play(players, soul, lantern, seed) {
  const s = newGame(makeConfig({ players, soul, lantern }), seed);
  while (!s.result) {
    beginTurn(s);
    if (canSummon(s)) {
      for (const m of Object.keys(MANTLES)) {
        const cid = s.hands[s.cur].find(c => CARDS[c].tag === MANTLES[m].tag);
        if (s.mantles[m] === -1 && cid !== undefined) { summon(s, m, cid); break; }
      }
    }
    try {
      // Now and then Seek as the first action, which uses it up and lets the Echo pass.
      if (s.turn % 5 === 0 && canSeek(s)) {
        seek(s, s.hands[s.cur][0]);
        assert.equal(s.played, 1);
        assert.ok(!canSeek(s), "only one Seek per turn");
      }
      if (hasPushed(s)) assert.ok(!canPush(s), "each Ferryman may Push Through only once per game");
      // Push Through whenever the way is shut and the soul can take the Fractures.
      if (canPush(s) && s.fract + pushCost(s) < 3) {
        const before = s.played;
        pushAction(s);
        assert.equal(s.played, before + 1);
        assert.ok(!canPush(s), "only one Push Through per turn");
        assert.ok(hasPushed(s), "the Ferryman has now used their Push Through");
      }
      for (let i = s.played; i < 2 && s.hands[s.cur].length; i++) {
        const hand = s.hands[s.cur];
        const pick = hand.find(c => CARDS[c].tag === s.echo && i === 0) ?? hand[0];
        await playCard(s, pick, "up", greedy);
      }
      if (bringerPending(s)) bringerBloom(s, await greedy.bloomTarget(s, bloomTargets(s)));
    } catch (e) { if (!(e instanceof GameOver)) throw e; s.phase = "over"; break; }
    endTurn(s);
    JSON.stringify(s);
    checkLog(s);
  }
  checkLog(s);
  return s;
}

// Every Chronicle line carries a message key with a Chinese rendering.
const seenKeys = new Set();
function checkLog(s) {
  setLang("zh");
  for (const l of s.log) {
    if (!l.msg) continue;
    assert.ok(Array.isArray(l.m), `no message key for: ${l.msg}`);
    const zh = say(l);
    assert.ok(zh && zh !== l.msg && !/undefined|NaN/.test(zh) && /[\u4e00-\u9fff]/.test(zh), `bad zh for ${l.m[0]}: ${zh}`);
    seenKeys.add(l.m[0]);
  }
  setLang("en");
}
setLang("zh");
for (let cid = 0; cid < CARDS.length; cid++) {
  assert.notEqual(cardName(cid), CARDS[cid].name, `zh name for ${CARDS[cid].id}`);
  if (CARDS[cid].slot) assert.notEqual(cardBand(cid), CARDS[cid].band, `zh band for ${CARDS[cid].id}`);
}
for (const [n] of [...MIST.flat(), ...HARSH]) assert.ok(mistName(n) !== n && mistText(n), `zh Mist ${n}`);
for (const k of Object.keys(SOULS)) assert.ok(soulInfo(k).name !== SOULS[k].name);
for (const m of Object.keys(MANTLES)) assert.ok(mantleInfo(m).name !== MANTLES[m].name);
setLang("en");

let wins = 0, games = 0, turns = 0;
const causes = {};
for (const players of [1, 2, 3, 4]) for (const soul of ["open", "child", "garland", "king", "bride"]) for (let seed = 1; seed <= 20; seed++) {
  const s = await play(players, soul, 1 + seed % 4, seed);
  assert.ok(["win", "loss"].includes(s.result));
  games++; turns += s.turn;
  if (s.result === "win") wins++; else causes[s.cause] = (causes[s.cause] || 0) + 1;
}
// The journey log replays to where the soul really is, and records how every game ended.
for (const soul of ["open", "bride", "child"]) for (let seed = 1; seed <= 25; seed++) {
  const s = await play(2, soul, 3, seed);
  let pos = 0;
  for (const e of s.trail) if (e.k === "m" || e.k === "p") { assert.equal(e.f, pos, "trail is continuous"); pos = e.to; }
  assert.equal(pos, s.soul, "trail ends where the soul is");
  assert.equal(s.trail.at(-1).k, s.result === "win" ? "win" : "end");
}
const a = await play(3, "open", 3, 42), b = await play(3, "open", 3, 42);
assert.equal(JSON.stringify(a), JSON.stringify(b), "same seed gives the same game");
assert.deepEqual(copy(a), a);
assert.ok(seenKeys.has("seek") && seenKeys.has("push"), "Seek and push-through both happened and read in Chinese");

// Recall: as the Answer, 3 Light brings back one forgotten card; it uses the turn's first action.
{
  const s = newGame(makeConfig({ players: 2, soul: "king" }), 5);
  beginTurn(s);
  s.forgotten.push(s.deck.pop());
  s.light = 2;
  assert.ok(!canRecall(s), "Recall needs 3 Light");
  s.light = 4;
  assert.ok(canRecall(s));
  const cid = s.forgotten[0];
  assert.ok(recall(s, cid));
  assert.equal(s.light, 1); assert.equal(s.forgotten.length, 0); assert.ok(s.discard.includes(cid)); assert.equal(s.played, 1);
  assert.ok(!canRecall(s), "only the Answer may Recall");
}
// Solo re-summon: a new Mantle lays the old one down for good; each Mantle once; 3 summons a game. Multiplayer: one each.
{
  const tagCard = (s, tag) => { const cid = CARDS.findIndex(c => c.tag === tag); s.hands[s.cur].push(cid); return cid; };
  const s = newGame(makeConfig({ players: 1, soul: "open" }), 9);
  beginTurn(s);
  s.light = 20;
  summon(s, "bringer", tagCard(s, MANTLES.bringer.tag));
  assert.equal(heldMantle(s), "bringer");
  tagCard(s, MANTLES.weaver.tag);
  assert.ok(canSummon(s), "solo may summon again while holding a Mantle");
  summon(s, "weaver", tagCard(s, MANTLES.weaver.tag));
  assert.equal(s.mantles.bringer, -2, "the old Mantle is laid down for good");
  summon(s, "warden", tagCard(s, MANTLES.warden.tag));
  tagCard(s, MANTLES.breaker.tag);
  assert.ok(!canSummon(s), "at most 3 summons in a solo game");
  const m = newGame(makeConfig({ players: 2, soul: "open" }), 9);
  beginTurn(m);
  m.light = 20;
  summon(m, "bringer", tagCard(m, MANTLES.bringer.tag));
  tagCard(m, MANTLES.weaver.tag);
  assert.ok(!canSummon(m), "with 2 or more players, one Mantle each");
}
console.log(`zh: ${seenKeys.size} message kinds checked`);
console.log(`ok: ${games} games, greedy win rate ${(wins / games * 100).toFixed(0)}%, avg ${(turns / games).toFixed(1)} turns, losses`, causes);
