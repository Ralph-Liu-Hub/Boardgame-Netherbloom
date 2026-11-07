// Checks the manual table's component data against the V5 rulebook (appendices A and C) and the storybook routes.
import assert from "node:assert/strict";
import * as D from "../public/assets/table-data.js";
import { STORY, PULL } from "../public/assets/table-story.js";
import { CARDS } from "../public/assets/cards.js";

const deckSize = r => D.MIST_DECKS[r].reduce((a, [k, n]) => { assert.ok(D.MIST_CARDS[k], `unknown mist ${k}`); return a + n; }, 0);
assert.deepEqual([0, 1, 2].map(deckSize), [13, 17, 15], "mist decks: 淺 13 / 濃 17 / 深 15 with the set-up extras");
assert.equal(D.HARSH_CARDS.length, 11, "11 harsh mists");
assert.equal(D.MANTLES.length, 5);
assert.equal(D.GHOST.length, 12);
assert.deepEqual(PULL, [3, 5, 7]);

// 32 core memories in V5: C27 (third Unremember) leaves, Lightless Crossing joins (added in table.js)
const core = CARDS.filter(c => c.id[0] === "C" && c.id !== "C27");
assert.equal(core.length + 1, 32, "32 core memory cards");
for (const [soul, pre] of Object.entries({ open: "E", child: "L", garland: "G-", king: "K", bride: "B" }))
  assert.equal(CARDS.filter(c => c.id.startsWith(pre)).length, 8, `${soul}: 8 own cards`);

// tile pools fill every bank
for (const [r, p] of D.TILE_POOLS.entries()) {
  const pool = Object.values(p.pool).reduce((a, n) => a + n, 0);
  for (const graves of p.graves === null ? [1, 2] : [p.graves])
    assert.ok(pool >= p.spaces.length * 2 - graves, `reach ${r + 1}: pool covers the banks`);
}

// storybook routes: every arrow lands on a node, every chapter has a turning point and an exit, 4 fates
for (const [soul, s] of Object.entries(STORY)) {
  assert.equal(s.chapters.length, 3, soul);
  s.chapters.forEach((ch, i) => {
    const ids = new Set(ch.nodes.map(n => n.id));
    for (const n of ch.nodes) {
      const nx = Array.isArray(n.next) ? n.next : n.next ? Object.values(n.next) : [];
      for (const id of nx) assert.ok(ids.has(id), `${soul} ch${i + 1}: ${n.id} -> ${id}`);
    }
    assert.ok(ch.nodes.some(n => n.k === "f"), `${soul} ch${i + 1}: turning point`);
    assert.ok(ch.nodes.some(n => n.k === "o"), `${soul} ch${i + 1}: exit`);
    assert.equal(ch.fates.length, 4, `${soul} ch${i + 1}: 4 fates`);
    assert.equal(ch.fates.filter(f => f.river).length, 2, `${soul} ch${i + 1}: 2 river fates`);
  });
  assert.equal(s.commissions.length, 8, `${soul}: 8 commissions`);
}
console.log("table data ok");
