"""11/7 retune, round 3: dissolve 14 / 12 / 12, fractures 5 / 4 / 3 (and tighter), loom tighter.

    cd simulator && SEEDS=60 python3 experiments/v5_retune3.py
Labels: G/S/H, loom +N over the base (2-3 players 7, solo 10), F = fractures to shatter, BW = black water.
"""
import json
import os
import sys
from collections import Counter
from multiprocessing import Pool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from experiments import v5_retune2 as R  # noqa: E402
from experiments.v5_chapters import SOULS  # noqa: E402

DIS = {"Gentle": 0, "Standard": 0, "Hard": 0}   # R.run already uses F.DISSOLVE: 14 / 12 / 12
CANDIDATES = []
for loom in (-1, 0, 1):
    for frac, bw in ((5, 7), (5, 6), (4, 7), (4, 8)):
        CANDIDATES.append((f"G loom{loom:+d} F{frac} BW{bw}", "Gentle", loom, frac, bw))
for loom in (-1, 0, 1, 2):
    for frac in (4, 3):
        CANDIDATES.append((f"S loom{loom:+d} F{frac} BW6", "Standard", loom, frac, 0))
for loom in (-2, -1, 0, 1):
    for frac in (3, 2):
        CANDIDATES.append((f"H loom{loom:+d} F{frac} BW6", "Hard", loom, frac, 0))


def run(a):
    soul, p, sd, level, loom, frac, bw = a
    return R.run((soul, p, sd, level, loom, DIS[level], frac, bw))


if __name__ == "__main__":
    seeds = int(os.environ.get("SEEDS", 60))
    only = os.environ.get("ONLY")
    out = []
    for label, level, loom, frac, bw in CANDIDATES:
        if only and not any(o in label for o in only.split(",")):
            continue
        args = [(s, p, sd, level, loom, frac, bw) for s in SOULS for p in (1, 2, 3, 4) for sd in range(seeds)]
        with Pool(os.cpu_count()) as pool:
            rows = pool.map(run, args, chunksize=10)
        n = len(rows)
        wins = [r for r in rows if r["win"]]
        r = {"label": label, "level": level, "loom": loom, "fracture_limit": frac, "bw": bw, "win": round(len(wins) / n, 3),
             "by_players": {p: round(sum(x["win"] for x in rows if x["p"] == p) / sum(x["p"] == p for x in rows), 3) for p in (1, 2, 3, 4)},
             "backlash": round(sum(x.get("backlash", 0) for x in rows) / n, 2),
             "ending_thread": {k: round(v / len(wins), 3) for k, v in Counter(x["thread"] for x in wins).most_common()},
             "loss_causes": {k: round(v / n, 3) for k, v in Counter(x["cause"] for x in rows if not x["win"]).most_common()}}
        print(json.dumps(r, ensure_ascii=False), flush=True)
        out.append(r)
    json.dump(out, open(os.path.join(os.path.dirname(__file__), "..", "reports", os.environ.get("OUT", "v5ch_retune3.json")), "w"),
              ensure_ascii=False, indent=1)
