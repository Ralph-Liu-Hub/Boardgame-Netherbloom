"""Two checks on the V5 rulebook settings (11/13).

  hard      Hard without "a Fracture when the soul is engulfed", with 0 / +1 / +2 harsh Mist cards per deck.
  ablation  Standard with one mechanism removed at a time: how much does the game change?

    cd simulator && SEEDS=200 python3 experiments/v5_hard_ablation.py hard
    cd simulator && SEEDS=150 python3 experiments/v5_hard_ablation.py ablation
Writes reports/v5_hard.json or reports/v5_ablation_1113.json (summaries only).
"""
import json
import math
import os
import sys
from collections import Counter
from multiprocessing import Pool
from statistics import mean

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import netherbloom.agent as A  # noqa: E402

_init = A.EchoAgent.__init__
def _no_burn(self, *a, **k):   # V5 has no Burn: turning Swap off must not bring it back
    k["allow_burn"] = False
    _init(self, *a, **k)
A.EchoAgent.__init__ = _no_burn

from experiments.v5_integrity import extra_for, THREAD_OF  # noqa: E402
from experiments.v5_chapters import cfg, one, SOULS  # noqa: E402

HARD = [("現行困難（籠罩加裂痕）", {}),
        ("拿掉籠罩裂痕", {"v5_shroud_crack": False}),
        ("拿掉籠罩裂痕＋每副凶霧 +1", {"v5_shroud_crack": False, "harsh_per_reach": 3}),
        ("拿掉籠罩裂痕＋每副凶霧 +2", {"v5_shroud_crack": False, "harsh_per_reach": 4}),
        ("拿掉籠罩裂痕＋黑水 5", {"v5_shroud_crack": False, "bw_supply": 5}),
        ("拿掉籠罩裂痕＋消散門檻 11", {"v5_shroud_crack": False, "dissolve": -5}),
        ("拿掉籠罩裂痕＋霧勢 +2", {"v5_shroud_crack": False, "v5_fog_plus": 2}),
        ("拿掉籠罩裂痕＋凶霧 +1＋黑水 5", {"v5_shroud_crack": False, "harsh_per_reach": 3, "bw_supply": 5})]
ABLATION = [("現行規則", {}),
            ("拿掉根網特性", {"v5_traits": False}),
            ("拿掉光牆（離開時不能留光）", {"v5_keep": False}),
            ("拿掉換牌", {"v5_swap": False}),
            ("拿掉喚回", {"v5_recall": False, "light_action": None}),
            ("拿掉奮力駛過", {"push_action": False, "push_through": "off"}),
            ("拿掉稱號", {"mantle_cost": 99}),
            ("拿掉怨念推進織機", {"v5_griev_loom": False}),
            ("背面打出不打結", {"v5_facedown_knot": False}),
            ("拿掉輕如灰燼與漂離", {"ash_at": 99, "adrift_at": 99}),
            ("拿掉霧痕（籠罩不影響書）", {"v5_scars": False}),
            ("拿掉忘川的拉力", {"v5_obl_pull": None}),
            ("翻頁不解結", {"v5_turn_table": (0, 0, 0, 0)}),
            ("拿掉迴響銘刻", {"v5_insc_echo": False}),
            ("拿掉託付（不會失落）", {"commission_need": -1})]   # -1, since 0 falls back to the default table


def run(a):
    soul, p, sd, level, extra = a
    ex = extra_for(level, p)
    ex.update(extra)
    row = one((soul, p, level, sd, ex))
    return {"soul": soul, "p": p, "win": row["win"], "cause": row["cause"], "turns": row["turns"], "shrouds": row["shrouds"],
            "backlash": row["backlash"], "lit": row["lit"], "inscribed": row["inscribed"], "lingers": row["lingers"],
            "summons": row["summons"], "max_forgotten": row["max_forgotten"], "defied": row.get("defied"),
            "ending": THREAD_OF[soul].get(row.get("ending")) if row["win"] else None,
            "ch3": row["paths"][2][1] if row["win"] and row["paths"][2] else None}


def summarize(rows):
    n = len(rows); w = [r for r in rows if r["win"]]
    pc = lambda a, b: round(100 * a / b, 1) if b else None  # noqa: E731
    ends = Counter(r["ending"] for r in w)
    ent = -sum(v / len(w) * math.log(v / len(w), 4) for v in ends.values()) if w else 0   # 1.0 = the 4 endings equally often
    ch3 = Counter(r["ch3"] for r in w if r["ch3"])
    return {"games": n, "win": pc(len(w), n),
            "by_p": {q: pc(sum(r["win"] for r in rows if r["p"] == q), sum(r["p"] == q for r in rows)) for q in (1, 2, 3, 4)},
            "by_soul": {s: pc(sum(r["win"] for r in rows if r["soul"] == s), sum(r["soul"] == s for r in rows)) for s in SOULS},
            "causes": {k: pc(v, n) for k, v in Counter(r["cause"] for r in rows if not r["win"]).most_common()},
            "turns": round(mean(r["turns"] for r in rows), 1), "shroud_any": pc(sum(r["shrouds"] > 0 for r in rows), n),
            "backlash": round(mean(r["backlash"] for r in rows), 2), "lit": round(mean(r["lit"] for r in rows), 2),
            "inscribed": round(mean(r["inscribed"] for r in rows), 2), "lingers": round(mean(r["lingers"] for r in rows), 2),
            "summons": round(mean(r["summons"] for r in rows), 2), "max_forgotten": round(mean(r["max_forgotten"] for r in rows), 2),
            "endings": {k: pc(v, len(w)) for k, v in ends.most_common()}, "ending_evenness": round(ent, 3),
            "ch3_oblivion": pc(ch3.get("忘卻", 0), sum(ch3.values())), "defied_1plus": pc(sum((r["defied"] or 0) >= 1 for r in w), len(w))}


if __name__ == "__main__":
    part = sys.argv[1] if len(sys.argv) > 1 else "hard"
    seeds = int(os.environ.get("SEEDS", 150))
    level = "Hard" if part == "hard" else "Standard"
    # each finished variant is appended to $PARTIAL (one JSON per line), so a stopped run picks up where it left off
    partial = os.environ.get("PARTIAL", f"v5_{part}_partial.jsonl")
    done = {}
    if os.path.exists(partial):
        for line in open(partial, encoding="utf-8"):
            if line.strip():
                r = json.loads(line); done[r["name"]] = r
    out = []
    with Pool(int(os.environ.get("PROCS", os.cpu_count() or 4))) as pool:
        for name, extra in (HARD if part == "hard" else ABLATION):
            if name in done:
                out.append(done[name]); continue
            rows = pool.map(run, [(s, p, sd, level, extra) for s in SOULS for p in (1, 2, 3, 4) for sd in range(seeds)], chunksize=8)
            res = dict(name=name, **summarize(rows)); out.append(res)
            with open(partial, "a", encoding="utf-8") as f:
                f.write(json.dumps(res, ensure_ascii=False) + "\n")
            print(json.dumps({k: res[k] for k in ("name", "win", "causes", "by_p", "shroud_any", "ch3_oblivion", "ending_evenness")}, ensure_ascii=False), flush=True)
    path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "reports", "v5_hard.json" if part == "hard" else "v5_ablation_1113.json")
    json.dump(out, open(path, "w"), ensure_ascii=False, indent=1)
