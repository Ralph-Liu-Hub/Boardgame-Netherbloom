"""Experiment: how often may the soul push through a double-Grievance lock, and what does a repeat cost?
    python -m experiments.push_limit        (from simulator/)"""
from multiprocessing import Pool
from statistics import mean
from netherbloom.engine import Config
from netherbloom.game import play_game

RULES = {
    "unlimited (base cost)":          dict(push_scope="none"),
    "1/Reach, then Linger":           dict(push_scope="reach", push_again="linger"),
    "1/Reach, then escalate":         dict(push_scope="reach", push_again="escalate"),
    "1/game, then Linger":            dict(push_scope="game", push_again="linger"),
    "1/game, then escalate":          dict(push_scope="game", push_again="escalate"),
    "no push (old rules)":            dict(push_through="off"),
}
CELLS = [("open", 3), ("child", 2), ("bride", 3)]


def job(a):
    name, soul, lan, seed = a
    g = play_game(Config(players=3, soul=soul, lantern=lan, seed=seed, **RULES[name]))
    return name, soul, lan, g.result == "win", g.stats.get("pushes", 0), g.stats.get("repushes", 0), g.turn


if __name__ == "__main__":
    with Pool() as p:
        R = p.map(job, [(n, so, la, sd) for n in RULES for so, la in CELLS for sd in range(600)], chunksize=50)
    for so, la in CELLS:
        print(f"\n3p {so} Lantern {la}")
        for n in RULES:
            rs = [r for r in R if r[0] == n and r[1] == so and r[2] == la]
            print(f"  {n:24} win {mean(r[3] for r in rs):4.0%} | pushes/game {mean(r[4] for r in rs):.2f} | "
                  f"repeat pushes/game {mean(r[5] for r in rs):.2f} | turns {mean(r[6] for r in rs):.1f}")
