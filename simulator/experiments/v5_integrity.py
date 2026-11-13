"""Integrity check of the V5 rulebook as written (11/13): every Soul x 1-4 players x 3 difficulties, with the final
11/7 settings (Loom 7 / solo 10 / 4 players 6, Faded at 14 / 12 / 12, Shattered at 5 / 4 / 3, Black Water 7 / 6 / 6,
the Pull of Lethe at 3 / 5 / 7 taking 2 cards). Writes one row per game to $OUT (default v5_integrity_rows.json).

    cd simulator && SEEDS=150 python3 experiments/v5_integrity.py
"""
import json
import os
import sys
from multiprocessing import Pool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from experiments.v5_chapters import cfg, one, BASE_EXTRA, SOULS, DECIDED, PLAYER_DECIDED, TUNED_LEVELS, RETUNED  # noqa: E402
from netherbloom.storybook_data import SOULS as SD  # noqa: E402

THREAD_OF = {s["key"]: {v[0]: k for k, v in s["endings"].items()} for s in SD}
DISSOLVE = {"Gentle": -2, "Standard": -4, "Hard": -4}   # 14 / 12 / 12


def extra_for(level, p):
    extra = dict(BASE_EXTRA, **DECIDED)
    extra.update(TUNED_LEVELS[level])
    extra.update(PLAYER_DECIDED.get(p, {}))
    rt = dict(RETUNED[level])
    loom = rt.pop("loom")
    extra["v5_cap_bonus"] = extra.get("v5_cap_bonus", 3) + loom
    extra.update(rt)
    extra["dissolve"] = DISSOLVE[level]
    return extra


def run(a):
    soul, p, sd, level = a
    row = one((soul, p, level if level != "Hard" else "Hard", sd, extra_for(level, p)))
    row.update(soul=soul, p=p, level=level, seed=sd)
    if row["win"]:
        row["ending_thread"] = THREAD_OF[soul].get(row.get("ending"))
    row.pop("fate_names", None)
    return row


if __name__ == "__main__":
    seeds = int(os.environ.get("SEEDS", 150))
    args = [(s, p, sd, lv) for lv in ("Gentle", "Standard", "Hard") for s in SOULS for p in (1, 2, 3, 4) for sd in range(seeds)]
    with Pool(int(os.environ.get("PROCS", os.cpu_count() or 4))) as pool:
        rows = pool.map(run, args, chunksize=8)
    # one row per game is about 11 MB, so it stays out of the repository; reports/v5_integrity_summary.json is the summary
    out = os.environ.get("OUT", "v5_integrity_rows.json")
    json.dump(rows, open(out, "w"), ensure_ascii=False, default=str)
    print(len(rows), "games ->", out)
