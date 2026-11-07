"""Confirm the retuned difficulties at 2,000 games each (see v5_retune.py for the sweep).

    cd simulator && python3 experiments/v5_retune2.py
"""
import json
import os
import sys
from collections import Counter
from multiprocessing import Pool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from experiments import v5_final_levels as F  # noqa: E402
from experiments.v5_chapters import SOULS  # noqa: E402

D0 = dict(F.DISSOLVE)
CANDIDATES = [   # (label, level, loom +, dissolve +, fractures to shatter)
    ("溫和：裂痕 4 道＋織機 +1＋黑水 6", "Gentle", 1, 0, 4, 6),
    ("溫和：裂痕 4 道＋織機 +2＋黑水 6", "Gentle", 2, 0, 4, 6),
    ("溫和：裂痕 4 道才破碎", "Gentle", 0, 0, 4),
    ("溫和：裂痕 4 道＋織機 +1", "Gentle", 1, 0, 4),
    ("標準：織機 +1、消散 14", "Standard", 1, 2, 3),
    ("標準：織機 +2、消散 14", "Standard", 2, 2, 3),
    ("困難：消散 14", "Hard", 0, 2, 3),
    ("困難：織機 +1、消散 14", "Hard", 1, 2, 3),
]


def run(a):
    soul, p, sd, level, cap, dis, frac, bw = a
    old, old4 = dict(F.TUNED_LEVELS[level]), dict(F.PLAYER_DECIDED[4])
    F.TUNED_LEVELS[level] = dict(old, v5_cap_bonus=3 + cap, fracture_limit=frac, **({"bw_supply": bw} if bw else {}))
    F.PLAYER_DECIDED[4] = dict(old4, v5_cap_bonus=2 + cap)
    F.DISSOLVE[level] = D0[level] + dis
    try:
        return {**F.run((soul, p, sd, level)), "p": p}
    finally:
        F.TUNED_LEVELS[level], F.PLAYER_DECIDED[4], F.DISSOLVE[level] = old, old4, D0[level]


if __name__ == "__main__":
    seeds = int(os.environ.get("SEEDS", 100))
    only = os.environ.get("ONLY")
    out = []
    for label, level, cap, dis, frac, *bw in CANDIDATES:
        bw = bw[0] if bw else 0
        if only and only not in label:
            continue
        args = [(s, p, sd, level, cap, dis, frac, bw) for s in SOULS for p in (1, 2, 3, 4) for sd in range(seeds)]
        with Pool(4) as pool:
            rows = pool.map(run, args, chunksize=10)
        n = len(rows)
        wins = [r for r in rows if r["win"]]
        r = {"label": label, "level": level, "cap": cap, "dissolve": dis, "fracture_limit": frac, "bw": bw, "win": round(len(wins) / n, 3),
             "by_players": {p: round(sum(x["win"] for x in rows if x["p"] == p) / sum(x["p"] == p for x in rows), 3) for p in (1, 2, 3, 4)},
             "ending_thread": {k: round(v / len(wins), 3) for k, v in Counter(x["thread"] for x in wins).most_common()},
             "loss_causes": {k: round(v / n, 3) for k, v in Counter(x["cause"] for x in rows if not x["win"]).most_common()}}
        print(json.dumps(r, ensure_ascii=False), flush=True)
        out.append(r)
    json.dump(out, open(os.path.join(os.path.dirname(__file__), "..", "reports", os.environ.get("OUT", "v5ch_retune2.json")), "w"), ensure_ascii=False, indent=1)
