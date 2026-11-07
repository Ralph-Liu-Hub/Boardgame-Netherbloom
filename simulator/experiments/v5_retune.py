"""Retune the three difficulties towards 60 / 50 / 40 % with as few rule changes as possible.
Knobs tried per level: the Loom threshold (+0..+3 knots) and the dissolve limit (+0 / +2).

    cd simulator && python3 experiments/v5_retune.py
"""
import json
import os
import sys
from multiprocessing import Pool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from experiments.v5_final_levels import run as _run, DISSOLVE  # noqa: E402
from experiments import v5_final_levels as F  # noqa: E402
from experiments.v5_chapters import SOULS  # noqa: E402


def run(a):
    soul, p, sd, level, cap, dis = a
    old, old4 = dict(F.TUNED_LEVELS[level]), dict(F.PLAYER_DECIDED[4])
    F.TUNED_LEVELS[level] = dict(old, v5_cap_bonus=3 + cap)
    F.PLAYER_DECIDED[4] = dict(old4, v5_cap_bonus=2 + cap)
    F.DISSOLVE[level] = DISSOLVE0[level] + dis
    try:
        return _run((soul, p, sd, level))["win"]
    finally:
        F.TUNED_LEVELS[level] = old
        F.PLAYER_DECIDED[4] = old4
        F.DISSOLVE[level] = DISSOLVE0[level]


DISSOLVE0 = dict(DISSOLVE)
if __name__ == "__main__":
    seeds = int(os.environ.get("SEEDS", 25))
    out = []
    for level in ("Gentle", "Standard", "Hard"):
        for cap in (0, 1, 2, 3):
            for dis in (0, 2):
                args = [(s, p, sd, level, cap, dis) for s in SOULS for p in (1, 2, 3, 4) for sd in range(1000, 1000 + seeds)]
                with Pool(4) as pool:
                    w = pool.map(run, args, chunksize=10)
                r = {"level": level, "cap": cap, "dissolve": dis, "win": round(sum(w) / len(w), 3)}
                print(json.dumps(r), flush=True)
                out.append(r)
    json.dump(out, open(os.path.join(os.path.dirname(__file__), "..", "reports", "v5ch_retune.json"), "w"), indent=1)
