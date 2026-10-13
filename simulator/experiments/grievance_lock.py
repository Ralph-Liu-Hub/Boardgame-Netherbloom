"""Experiment: the "Grievance lock" — both banks of the space ahead of the soul hold a Grievance.

That space can never be Lit (no free bank) and the slow answer, "trapped in light", needs a Bloom on the
far side, which the root network cannot reach. Only an Oblivion banish card opens it, so a table without
one Lingers turn after turn. This compares five ways to deal with it, at 3 players.

    python -m experiments.grievance_lock            (from simulator/)
"""
from multiprocessing import Pool
from statistics import mean

from netherbloom import engine as E
from netherbloom.engine import CARD, State, NONE
from netherbloom.game import play_game
from netherbloom.engine import Config

BANISH_OPS = {"banish", "banish_or_drain"}


def locked(s):
    sp = s.soul + 1
    return 1 <= sp <= 11 and s.griev[sp * 2] and s.griev[sp * 2 + 1]


def can_banish(cid):
    c = CARD[cid]
    return any(op[0] in BANISH_OPS for op in c.effect)


# ---------------------------------------------------------------- variants
orig_place_griev = State.place_griev
orig_root_targets = State.root_targets
orig_soul_step = State.soul_step


def place_griev_no_double(self, sp, bank):
    """B: a Grievance never takes the second bank of a space; it moves on to the next space."""
    sp = max(1, min(sp, 11))
    for x in range(sp, E.FAR):
        for b in (bank, 1 - bank):
            k = x * 2 + b
            if not self.griev[k] and not self.griev[x * 2 + (1 - b)]:
                self.griev[k] = True
                self.tok[k] = NONE
                return
    orig_place_griev(self, sp, bank)


def root_targets_past(self, stony_ok):
    """E: light can grow past a Grievance: a Grievance counts as part of the network for touching."""
    out = []
    t = lambda k: self.tok[k] != NONE or self.griev[k]
    for sp in range(max(1, self.soul), E.FAR):
        for b in (0, 1):
            k = sp * 2 + b
            if self.tok[k] != NONE or self.griev[k]:
                continue
            if self.revealed[k] and (self.tile[k] == E.GRAVE or (self.tile[k] == E.STONY and not stony_ok)):
                continue
            if (sp <= self.soul + 1 or t(k ^ 1) or (sp > 1 and t((sp - 1) * 2 + b))
                    or (sp < 11 and t((sp + 1) * 2 + b))):
                out.append(k)
    return out


def soul_step_counting(self):
    if not self.sim and locked(self):
        self.stats["locked_turns"] = self.stats.get("locked_turns", 0) + 1
    return orig_soul_step(self)


PUSH_FORGETS = False


def soul_step_push(self):
    """F: if the next space is dark only because Grievances hold both its banks, the soul pushes
    through: both Grievances scatter, the soul steps onto the space, and it takes 1 Fracture."""
    if not self.sim and locked(self):
        self.stats["locked_turns"] = self.stats.get("locked_turns", 0) + 1
    if self.result is None and locked(self) and not self.stats.get("resignation_pending") and not self.flooded[self.soul + 1]:
        sp = self.soul + 1
        self.griev[sp * 2] = self.griev[sp * 2 + 1] = False
        self.move_soul(1)
        self.add_fracture()
        if PUSH_FORGETS:
            self.forget_top(1)
        self.feed()
        return
    return orig_soul_step(self)


def play_variant(args):
    variant, cfg_kw, seed = args
    State.place_griev = place_griev_no_double if variant == "B_no_double" else orig_place_griev
    State.root_targets = root_targets_past if variant == "E_grow_past" else orig_root_targets
    global PUSH_FORGETS
    PUSH_FORGETS = variant == "F2_push_forget"
    State.soul_step = soul_step_push if variant.startswith("F") else soul_step_counting
    if variant == "EC":
        State.root_targets = root_targets_past
    cfg = Config(seed=seed, **cfg_kw)

    if variant in ("C_seek", "D_assist", "EC", "FC"):
        from netherbloom.agent import EchoAgent
        agent = EchoAgent(use_book=cfg.use_book)
        orig_choose = agent.choose

        def choose(s):
            if locked(s) and not any(can_banish(c) for c in s.hands[s.cur]):
                if variant in ("C_seek", "EC", "FC"):
                    # Stuck: discard up to 2 cards and draw as many.
                    hand = s.hands[s.cur]
                    junk = [c for c in hand if not CARD[c].key][:2]
                    for c in junk:
                        hand.remove(c)
                        s.discard.append(c)
                    s.draw_up(s.cur)
                    s.stats["seeks"] = s.stats.get("seeks", 0) + 1
                else:
                    # Another player with a banish card plays it out of turn, once per round.
                    rnd = (s.turn - 1) // s.n
                    if s.stats.get("assist_round", -1) != rnd:
                        for q in range(s.n):
                            card = next((c for c in s.hands[q] if q != s.cur and can_banish(c)), None)
                            if card is not None:
                                s.stats["assist_round"] = rnd
                                me = s.cur
                                s.cur = q
                                s.play(card, "up", agent, first=False)
                                s.draw_up(q)
                                s.cur = me
                                s.stats["assists"] = s.stats.get("assists", 0) + 1
                                break
            return orig_choose(s)
        agent.choose = choose
        g = play_game(cfg, agent)
    else:
        g = play_game(cfg)
    return variant, cfg_kw["lantern"], cfg_kw["soul"], g.result, g.cause, g.turn, g.stats.get("locked_turns", 0), \
        g.stats.get("seeks", 0), g.stats.get("assists", 0)


VARIANTS = ["A_baseline", "B_no_double", "C_seek", "D_assist", "E_grow_past", "F_push", "F2_push_forget"]

if __name__ == "__main__":
    N = 600
    jobs = [(v, dict(players=3, soul=soul, lantern=lan), seed)
            for v in VARIANTS for soul in ("child", "open") for lan in (2, 3) for seed in range(N)]
    with Pool() as pool:
        rows = pool.map(play_variant, jobs, chunksize=50)
    print(f"{N} games per cell, 3 players. win% | games with a lock | win% of locked games | mean turns | losses F/S/D")
    for soul in ("child", "open"):
        for lan in (2, 3):
            print(f"\n{soul}, Lantern {lan}")
            for v in VARIANTS:
                R = [r for r in rows if r[0] == v and r[1] == lan and r[2] == soul]
                wins = [r for r in R if r[3] == "win"]
                lk = [r for r in R if r[6] > 0]
                lkw = [r for r in lk if r[3] == "win"]
                losses = [r for r in R if r[3] == "loss"]
                f = {c: sum(r[4] == c for r in losses) / max(1, len(losses)) for c in ("Faded", "Shattered", "Deluge")}
                extra = f" seeks/g {mean(r[7] for r in R):.2f}" if v == "C_seek" else (f" assists/g {mean(r[8] for r in R):.2f}" if v == "D_assist" else "")
                print(f"  {v:12} win {len(wins) / len(R):5.0%} | lock {len(lk) / len(R):4.0%} | "
                      f"win-if-locked {len(lkw) / max(1, len(lk)):4.0%} | turns {mean(r[5] for r in R):4.1f} | "
                      f"{f['Faded']:.0%}/{f['Shattered']:.0%}/{f['Deluge']:.0%}{extra}")
