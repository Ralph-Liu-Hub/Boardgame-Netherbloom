"""Small eases for solo and 2-player games (retune round 3 levels: dissolve 14/12/12, shatter 5/4/3, Loom 7 / solo 10).

    cd simulator && SEEDS=250 python3 experiments/v5_smallp.py
Each candidate applies only to the player counts it names; other counts are not run.
"""
import json
import os
import sys
from collections import Counter
from multiprocessing import Pool

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from experiments.v5_chapters import cfg, BASE_EXTRA, SOULS, DECIDED, PLAYER_DECIDED, TUNED_LEVELS, RETUNED  # noqa: E402
from experiments.v5_final_levels import DISSOLVE  # noqa: E402
from netherbloom.game import play_game  # noqa: E402

# label -> {players: (config overrides, attribute deltas applied after cfg())}
CANDIDATES = {
    "現行": {1: ({}, {}), 2: ({}, {})},
    "起始光 +1": {1: ({}, {"start_light": 1}), 2: ({}, {"start_light": 1})},
    "起始光 +2": {1: ({}, {"start_light": 2}), 2: ({}, {"start_light": 2})},
    "織機 +1": {1: ({}, {"v5_solo_cap_bonus": 1}), 2: ({}, {"v5_cap_bonus": 1})},
    "破碎 +1": {1: ({}, {"fracture_limit": 1}), 2: ({}, {"fracture_limit": 1})},
    "黑水 +1": {1: ({}, {"bw_supply": 1}), 2: ({}, {"bw_supply": 1})},
    "消散 +1": {1: ({}, {"forgotten_limit": 1}), 2: ({}, {"forgotten_limit": 1})},
    "消散 +2": {1: ({}, {"forgotten_limit": 2}), 2: ({}, {"forgotten_limit": 2})},
    "2 人：託付只需 1": {2: ({"commission_need": 1}, {})},
    "2 人：手牌 4": {2: ({}, {"hand": 1})},
    "單人：手牌 6": {1: ({}, {"hand": 1})},
    "2 人：墳墓 2": {2: ({}, {"graves": 1})},
    # combinations (round 2)
    "單人：手牌 6＋織機 +1": {1: ({}, {"hand": 1, "v5_solo_cap_bonus": 1})},
    "單人：手牌 6＋破碎 +1": {1: ({}, {"hand": 1, "fracture_limit": 1})},
    "單人：手牌 6＋織機 +1＋破碎 +1": {1: ({}, {"hand": 1, "v5_solo_cap_bonus": 1, "fracture_limit": 1})},
    "單人：手牌 6＋織機 +2": {1: ({}, {"hand": 1, "v5_solo_cap_bonus": 2})},
    "單人：織機 +1＋破碎 +1": {1: ({}, {"v5_solo_cap_bonus": 1, "fracture_limit": 1})},
    "2 人：手牌 4＋起始光 +1": {2: ({}, {"hand": 1, "start_light": 1})},
}


def run(a):
    label, soul, p, sd, level = a
    over, delta = CANDIDATES[label][p]
    extra = dict(BASE_EXTRA, **DECIDED)
    extra.update(TUNED_LEVELS[level])
    extra.update(PLAYER_DECIDED.get(p, {}))
    rt = dict(RETUNED[level])
    extra["v5_cap_bonus"] = extra.get("v5_cap_bonus", 3) + rt.pop("loom")
    extra.update(rt)
    extra["dissolve"] = DISSOLVE[level]
    extra.update(over)
    c = cfg(soul, p, "Standard", sd, extra)
    for k, v in delta.items():
        if k == "graves":
            c.graves_r3 = (c.graves_r3 or 1) + v
        else:
            setattr(c, k, getattr(c, k) + v)
    s = play_game(c)
    return {"p": p, "win": s.result == "win", "cause": s.cause, "backlash": sum(s.stats["backlash"])}


if __name__ == "__main__":
    seeds = int(os.environ.get("SEEDS", 250))
    levels = os.environ.get("LEVELS", "Standard").split(",")
    only = os.environ.get("ONLY")
    out = []
    for level in levels:
        for label, per in CANDIDATES.items():
            if only and not any(o in label for o in only.split(",")):
                continue
            args = [(label, s, p, sd, level) for p in per for s in SOULS for sd in range(seeds)]
            with Pool(os.cpu_count()) as pool:
                rows = pool.map(run, args, chunksize=10)
            r = {"level": level, "label": label}
            for p in per:
                rp = [x for x in rows if x["p"] == p]
                n = len(rp)
                r[p] = {"win": round(sum(x["win"] for x in rp) / n, 3),
                        "backlash": round(sum(x["backlash"] for x in rp) / n, 2),
                        "loss": {k: round(v / n, 3) for k, v in Counter(x["cause"] for x in rp if not x["win"]).most_common()}}
            print(json.dumps(r, ensure_ascii=False), flush=True)
            out.append(r)
    json.dump(out, open(os.path.join(os.path.dirname(__file__), "..", "reports", os.environ.get("OUT", "v5ch_smallp.json")), "w"),
              ensure_ascii=False, indent=1)
