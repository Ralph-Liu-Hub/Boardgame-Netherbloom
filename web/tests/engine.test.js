// Plays many games with a simple greedy chooser to check the engine never crashes and games end.
import assert from "node:assert/strict";
import { makeConfig, newGame, beginTurn, playCard, endTurn, GameOver, copy, lit, NONE, ROOT, canSummon, summon, bringerPending, bringerBloom, bloomTargets } from "../public/assets/engine.js";
import { CARDS, MANTLES } from "../public/assets/cards.js";

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
      for (let i = 0; i < 2 && s.hands[s.cur].length; i++) {
        const hand = s.hands[s.cur];
        const pick = hand.find(c => CARDS[c].tag === s.echo && i === 0) ?? hand[0];
        await playCard(s, pick, "up", greedy);
      }
      if (bringerPending(s)) bringerBloom(s, await greedy.bloomTarget(s, bloomTargets(s)));
    } catch (e) { if (!(e instanceof GameOver)) throw e; s.phase = "over"; break; }
    endTurn(s);
    JSON.stringify(s);
  }
  return s;
}

let wins = 0, games = 0, turns = 0;
const causes = {};
for (const players of [1, 2, 3, 4]) for (const soul of ["open", "child", "garland", "king", "bride"]) for (let seed = 1; seed <= 20; seed++) {
  const s = await play(players, soul, 1 + seed % 5, seed);
  assert.ok(["win", "loss"].includes(s.result));
  games++; turns += s.turn;
  if (s.result === "win") wins++; else causes[s.cause] = (causes[s.cause] || 0) + 1;
}
const a = await play(3, "open", 3, 42), b = await play(3, "open", 3, 42);
assert.equal(JSON.stringify(a), JSON.stringify(b), "same seed gives the same game");
assert.deepEqual(copy(a), a);
console.log(`ok: ${games} games, greedy win rate ${(wins / games * 100).toFixed(0)}%, avg ${(turns / games).toFixed(1)} turns, losses`, causes);
