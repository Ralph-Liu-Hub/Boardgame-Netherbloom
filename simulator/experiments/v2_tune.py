"""V2: search Lantern settings for the full V2 rules (every step of experiments/v2.py).

    python3 -m experiments.v2_tune --games 200 --out reports
"""
import argparse
import json
import os
import sys
from multiprocessing import Pool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from experiments.v2 import STEPS, one, summarize  # noqa: E402

LAST = len(STEPS) - 1
NAMED = [("garland", 2), ("king", 2), ("bride", 2), ("open", 2)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--games", type=int, default=200)
    ap.add_argument("--out", default="reports")
    a = ap.parse_args()
    grid = [(lim, bw, harsh) for lim in (10, 12, 14) for bw in (5, 7) for harsh in (0, 2)]
    res = {}
    with Pool(4) as pool:
        for lim, bw, harsh in grid:
            ex = {"forgotten_limit": lim, "bw_supply": bw, "harsh_per_reach": harsh}
            row = {}
            for soul, lan in NAMED:
                rows = pool.map(one, [(LAST, soul, lan, 4, s, ex) for s in range(a.games)], chunksize=8)
                row[soul] = summarize(rows)
            key = f"limit{lim}|bw{bw}|harsh{harsh}"
            res[key] = row
            print(key, {k: round(v["win"], 2) for k, v in row.items()},
                  {k: v["causes"] for k, v in row.items()}, flush=True)
        # the Child at Gentle-like settings
        for lim, bw in ((11, 6), (13, 6), (15, 7)):
            ex = {"forgotten_limit": lim, "bw_supply": bw, "harsh_per_reach": 0}
            rows = pool.map(one, [(LAST, "child", 1, 4, s, ex) for s in range(a.games)], chunksize=8)
            res[f"child|limit{lim}|bw{bw}"] = summarize(rows)
            print("child", lim, bw, round(res[f"child|limit{lim}|bw{bw}"]["win"], 2), flush=True)
    os.makedirs(a.out, exist_ok=True)
    with open(os.path.join(a.out, "v2_tune.json"), "w") as f:
        json.dump(res, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
