"""Experiment: does Light go stale late in the game, and what do the proposed Light sinks do to the win rate?
    python -m experiments.light_sinks [games]        (from simulator/)"""
import sys
from multiprocessing import Pool
from statistics import mean
from netherbloom.engine import Config
from netherbloom import game as G

RULES = {
    "current rules":                      dict(),
    "solo re-summon (max 3)":             dict(solo_resummon=True),
    "recall 3 Light":                     dict(light_action="recall", light_action_cost=3),
    "recall 4 Light":                     dict(light_action="recall", light_action_cost=4),
    "re-summon + recall 3":               dict(solo_resummon=True, light_action="recall", light_action_cost=3),
    "re-summon + recall 4":               dict(solo_resummon=True, light_action="recall", light_action_cost=4),
    "kindle 4 (recall/mend/drain)":       dict(light_action="kindle", light_action_cost=4),
    "re-summon + kindle 4":               dict(solo_resummon=True, light_action="kindle", light_action_cost=4),
}
SOULS = ["open", "garland", "king", "bride"]   # the four Souls other than the Child (the tutorial)
PLAYERS = [1, 2, 3, 4]


# Instrument the turn loop: sample Light at the start of every turn and note whether anything could spend it.
_orig_new = G.State.new.__func__


def job(a):
    name, players, soul, seed = a
    cfg = Config(players=players, soul=soul, lantern=2, seed=seed, **RULES[name])
    idle = []
    def maybe_summon_hook(agent_summon):
        def f(s):
            held = any(h == s.cur for h in s.mantles.values())
            free = any(h == -1 for h in s.mantles.values())
            can_buy = (not held or (s.cfg.solo_resummon and s.n == 1 and s.stats["summons"] < s.cfg.max_summons)) and free
            sink = bool(s.cfg.light_action and s.forgotten)
            idle.append((s.light, s.light >= 3 and not can_buy and not sink))
            agent_summon(s)
        return f
    agent = G.EchoAgent(use_book=cfg.use_book)
    agent.maybe_summon = maybe_summon_hook(agent.maybe_summon)
    g = G.play_game(cfg, agent)
    stale = sum(1 for _, x in idle if x) / max(1, len(idle))
    return (name, players, soul, g.result == "win", g.light, stale, mean(l for l, _ in idle) if idle else 0,
            g.stats.get("light_actions", 0), g.stats.get("la_recall", 0), g.stats.get("la_mend", 0), g.stats.get("la_drainl", 0),
            g.stats["summons"], len(g.forgotten), g.turn)


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 300
    with Pool() as p:
        R = p.map(job, [(nm, pl, so, sd) for nm in RULES for pl in PLAYERS for so in SOULS for sd in range(n)], chunksize=40)
    print(f"Standard Lantern, {n} games per Soul and player count; win rate averaged over the four non-Child Souls\n")
    print(f"{'rule':32} " + " ".join(f"{p}p win" for p in PLAYERS) + " | all  | Light left | turns ≥3 Light idle | Light actions/game | summons/game")
    for nm in RULES:
        rs = [r for r in R if r[0] == nm]
        wins = [mean(r[3] for r in rs if r[1] == p) for p in PLAYERS]
        print(f"{nm:32} " + " ".join(f"{w:6.0%}" for w in wins) + f" | {mean(r[3] for r in rs):4.0%} | "
              f"{mean(r[4] for r in rs):10.1f} | {mean(r[5] for r in rs):18.0%} | {mean(r[7] for r in rs):18.2f} | {mean(r[11] for r in rs):.2f}")
    print("\nBy player count (current rules): Light left at the end, share of turns with ≥3 Light and nothing to spend it on")
    for p in PLAYERS:
        rs = [r for r in R if r[0] == "current rules" and r[1] == p]
        print(f"  {p}p: Light left {mean(r[4] for r in rs):.1f}, idle turns {mean(r[5] for r in rs):.0%}, average Light held {mean(r[6] for r in rs):.1f}")
    print("\nKindle 4: what the Light bought (per game)")
    for nm in ("kindle 4 (recall/mend/drain)", "re-summon + kindle 4"):
        rs = [r for r in R if r[0] == nm]
        print(f"  {nm}: recall {mean(r[8] for r in rs):.2f}, mend {mean(r[9] for r in rs):.2f}, drain {mean(r[10] for r in rs):.2f}")
