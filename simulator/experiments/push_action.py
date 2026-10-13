"""Experiment: push-through as a player action versus the soul pushing on its own at the Soul Step.
    python -m experiments.push_action        (from simulator/)"""
from multiprocessing import Pool
from statistics import mean
from netherbloom.engine import Config
from netherbloom.game import play_game

RULES = {"push any turn": dict(push_once_each=False), "once per player": dict(push_once_each=True)}
SOULS = ["open", "child", "garland", "king", "bride"]


def job(a):
    name, soul, n, seed = a
    g = play_game(Config(players=n, soul=soul, lantern=2, seed=seed, **RULES[name]))
    return name, soul, n, g.result == "win", g.stats.get("pushes", 0), g.turn


if __name__ == "__main__":
    with Pool() as p:
        R = p.map(job, [(r, so, n, sd) for r in RULES for so in SOULS for n in (1, 2, 3, 4) for sd in range(150)], chunksize=25)
    for r in RULES:
        rs = [x for x in R if x[0] == r]
        print(f"\n{r}: all {mean(x[3] for x in rs):.0%}, non-Child {mean(x[3] for x in rs if x[1] != 'child'):.0%}, "
              f"pushes/game {mean(x[4] for x in rs):.2f}, turns {mean(x[5] for x in rs):.1f}")
        for so in SOULS:
            print(f"  {so:8} " + "  ".join(f"{n}p {mean(x[3] for x in rs if x[1] == so and x[2] == n):4.0%}" for n in (1, 2, 3, 4)))
