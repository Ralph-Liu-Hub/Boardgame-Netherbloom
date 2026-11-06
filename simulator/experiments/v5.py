"""V5 proposal (docs/design/V5-proposal.zh-TW.md): full simulation on the V4.0 rules plus every V5 switch.

    python3 -m experiments.v5 --part matrix --games 200
    python3 -m experiments.v5 --part lanterns --games 100
    python3 -m experiments.v5 --part ablation --games 100
    python3 -m experiments.v5 --part baseline --games 200

Each part writes reports/v5_<part>.json. Rules the simulator simplifies are listed in the report
(simulator/reports/v5_simulation.zh-TW.md).
"""
import argparse
import json
import os
import sys
from collections import Counter
from multiprocessing import Pool
from statistics import mean

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from experiments.v2 import STEPS, cfg_for  # noqa: E402
from experiments.v2_matrix import BASE, LANTERNS  # noqa: E402
from experiments.v2_blessing import FINAL, CHILD, STANDARD  # noqa: E402
from netherbloom.game import play_game, ending  # noqa: E402
from netherbloom.cards import OBS, ACC, OBL  # noqa: E402

LAST = len(STEPS) - 1
SOULS = ["child", "garland", "king", "bride", "open"]
V40 = dict(FINAL, cross_fracture=True)
V5 = {"v5_facedown_knot": True, "v5_keep": True, "v5_griev_loom": True, "v5_fog": True, "v5_scars": True,
      "v5_depth": True, "v5_reveal": True, "v5_fate": True, "v5_reach": True, "v5_traits": True,
      "v5_recall": True, "v5_push_free": True, "v5_swap": True, "v5_light_after": True,
      "transitions": False, "garland_gift": False}
V5_LANTERNS = {"Gentle": {"v5_start_knots": 0}, "Standard": {"v5_start_knots": 0}, "Hard": {"v5_start_knots": 1}}
# Calibrated values (see the report, §3): the rules as written lose almost every game.
V5_TUNED = {"v5_cap_bonus": 4, "v5_scar_max": 2, "v5_feed_range": 0, "v5_feed_per_round": False, "v5_griev_offset": 1,
            "v5_mist_knot": False, "v5_carry": False, "v5_fog_on_stall": True, "v5_fog_scale": 1.0, "v5_shroud_crack": True,
            "v5_l3_crack": True, "v5_fate_power": "light", "v5_keep_need": 0}
V5_TUNED_LANTERNS = {"Gentle": {"bw_supply": 7, "forgotten_limit": 18},
                     "Standard": {"bw_supply": 6, "forgotten_limit": 16},
                     "Hard": {"bw_supply": 5, "forgotten_limit": 14, "v5_start_knots": 1}}
ABLATION = [
    ("V5 全部", {}),
    ("拿掉 背面打出加結", {"v5_facedown_knot": False}),
    ("拿掉 收光／留光", {"v5_keep": False}),
    ("拿掉 怨念推進織機", {"v5_griev_loom": False}),
    ("拿掉 霧區與籠罩", {"v5_fog": False}),
    ("拿掉 傷疤與三級反噬", {"v5_scars": False}),
    ("拿掉 迷霧深度", {"v5_depth": False}),
    ("拿掉 託付提前翻開", {"v5_reveal": False}),
    ("拿掉 命運之霧", {"v5_fate": False}),
    ("拿掉 根網所及", {"v5_reach": False}),
    ("拿掉 根網特性", {"v5_traits": False}),
    ("拿掉 喚回銘刻", {"v5_recall": False}),
    ("換牌改回焚燒", {"v5_swap": False}),
]
THREAD = {OBS: "執念", ACC: "釋懷", OBL: "忘卻"}


def make_cfg(soul, players, lantern, seed, extra=None, v5=True, tuned=False):
    graves, need = STANDARD[players]
    lim, bw, harsh, r3 = LANTERNS[lantern]
    ex = dict(BASE, graves_r3=graves, commission_need=need, forgotten_limit=lim, bw_supply=bw,
              harsh_per_reach=harsh, r3_mist_draws=r3)
    ex.update(V40)
    if soul == "child":
        ex.update({k: v for k, v in CHILD.items() if k != "child_limit_bonus"})
    if v5:
        ex.update(V5)
        ex.update(V5_LANTERNS[lantern])
        ex["r3_mist_draws"] = 1
        if tuned:
            ex.update(V5_TUNED)
            ex.update(V5_TUNED_LANTERNS[lantern])
    if extra:
        ex.update(extra)
    return cfg_for(LAST, soul, 2, players, seed, ex)


def ending_class(scars):
    if not scars:
        return "清明（沒有霧痕）"
    c = Counter(scars)
    top = c.most_common()
    if len(top) > 1 and top[0][1] == top[1][1]:
        return "交織（霧痕各半）"
    return f"{THREAD[top[0][0]]}結局"


def one(args):
    soul, players, lantern, seed, extra, v5 = args[:6]
    tuned = args[6] if len(args) > 6 else False
    s = play_game(make_cfg(soul, players, lantern, seed, extra, v5, tuned))
    st = s.stats
    scars = [t for page in s.bscars for t in page]
    end = ending(s) if soul != "open" else None
    g = lambda k: st.get(k, 0)  # noqa: E731
    return {
        "win": s.result == "win", "cause": s.cause, "turns": s.turn,
        "reach_turns": list(st["turns_in_reach"]),
        "face_up": st["plays_up"], "face_down": st["face_down"], "swaps": g("swaps"), "burns": st["burns"],
        "recalls": g("recall_inscribes"), "pushes": g("push_actions"), "summons": st["summons"],
        "lit": g("lit"), "inscribed": st["inscribed"], "reveals": g("reveals"), "reveal_reach": st.get("reveal_reach", []),
        "comm_done": st.get("comm_done"), "lingers": st["lingers"],
        "knots_play": g("knots_play"), "knots_down": g("knots_down"), "knots_mist": g("knots_mist"),
        "knots_griev": g("knots_griev"), "knots_fate": g("knots_fate"),
        "backlash": sum(st["backlash"]), "backlash_by": list(st["backlash"]),
        "lv1": g("backlash_lv1"), "lv2": g("backlash_lv2"), "lv3": g("backlash_lv3"),
        "scars": sum(s.scars), "unties": g("unties_transition"),
        "fog_flips": g("fog_flips"), "fog_reclaimed": g("fog_reclaimed"), "walls_kept": g("walls_kept"),
        "wall_absorbed": g("wall_absorbed"), "shrouds": g("shrouds"),
        "shrouds_r": [g(f"shrouds_r{r}") for r in range(3)],
        "book_scars": len(scars), "scar_covers": g("scar_covers"), "scar_fracture": g("scar_fracture"),
        "scar_mist": g("scar_src_mist"), "scar_fate": g("scar_src_fate"),
        "fate_nat": [g(f"fate_r{r}_natural") for r in range(3)], "fate_forced": [g(f"fate_r{r}_forced") for r in range(3)],
        "fate_conds": {k[10:]: v for k, v in st.items() if k.startswith("fate_cond_")},
        "traits": {k[6:]: v for k, v in st.items() if k.startswith("trait_")},
        "depth": [g(f"mist_depth{i}") for i in range(3)],
        "max_fract": st["max_fract"], "max_forgotten": st["max_forgotten"], "light_end": s.light,
        "ending": ending_class(scars), "key_place": end[0] if end else None,
        "cracks": {k[6:]: v for k, v in st.items() if k.startswith("crack_")},
    }


def summarize(rows):
    n = len(rows)
    wins = [r for r in rows if r["win"]]
    avg = lambda k, rs=rows: round(mean(r[k] for r in rs), 2) if rs else None  # noqa: E731
    out = {"games": n, "win": round(len(wins) / n, 3),
           "causes": {k: round(v / n, 3) for k, v in Counter(r["cause"] for r in rows if not r["win"]).most_common()},
           "turns": avg("turns"), "turns_win": avg("turns", wins),
           "reach_turns": [round(mean(r["reach_turns"][i] for r in rows), 2) for i in range(3)]}
    for k in ("face_up", "face_down", "swaps", "burns", "recalls", "pushes", "summons", "lit", "inscribed", "reveals",
              "lingers", "knots_play", "knots_down", "knots_mist", "knots_griev", "knots_fate", "backlash", "lv1", "lv2",
              "lv3", "scars", "unties", "fog_flips", "fog_reclaimed", "walls_kept", "wall_absorbed", "shrouds",
              "book_scars", "scar_covers", "scar_fracture", "scar_mist", "scar_fate", "max_fract", "max_forgotten",
              "light_end"):
        out[k] = avg(k)
    out["shroud_any"] = round(sum(r["shrouds"] > 0 for r in rows) / n, 3)
    out["shrouds_r"] = [round(mean(r["shrouds_r"][i] for r in rows), 2) for i in range(3)]
    out["backlash_by"] = [round(mean(r["backlash_by"][i] for r in rows), 2) for i in range(3)]
    out["fate_nat"] = [round(mean(r["fate_nat"][i] for r in rows), 2) for i in range(3)]
    out["fate_forced"] = [round(mean(r["fate_forced"][i] for r in rows), 2) for i in range(3)]
    out["depth_share"] = [round(sum(r["depth"][i] for r in rows) / max(1, sum(sum(r["depth"]) for r in rows)), 3)
                          for i in range(3)]
    out["reached_deep"] = round(sum(r["depth"][2] > 0 for r in rows) / n, 3)
    rr = [x for r in rows for x in r["reveal_reach"]]
    out["reveal_reach"] = {f"r{i + 1}": round(rr.count(i) / n, 2) for i in range(3)}
    fc = Counter()
    for r in rows:
        fc.update(r["fate_conds"])
    out["fate_conds"] = {k: round(v / n, 2) for k, v in fc.most_common()}
    tc = Counter()
    for r in rows:
        tc.update(r["traits"])
    out["traits"] = {k: round(v / n, 2) for k, v in tc.most_common()}
    done = [r["comm_done"] for r in rows if r["comm_done"] is not None]
    out["comm_done"] = round(mean(done), 2) if done else None
    cc = Counter()
    for r in rows:
        cc.update(r["cracks"])
    out["cracks"] = {k: round(v / n, 2) for k, v in cc.most_common()}
    out["endings_all"] = {k: round(v / n, 3) for k, v in Counter(r["ending"] for r in rows).most_common()}
    out["endings_win"] = {k: round(v / max(1, len(wins)), 3) for k, v in Counter(r["ending"] for r in wins).most_common()}
    kp = [r["key_place"] for r in wins if r["key_place"]]
    out["key_place_win"] = {k: round(v / max(1, len(kp)), 3) for k, v in Counter(kp).most_common()}
    return out


def run(pool, cells, games, tuned=False):
    res = {}
    for label, soul, players, lantern, extra, v5 in cells:
        rows = pool.map(one, [(soul, players, lantern, seed, extra, v5, tuned) for seed in range(games)], chunksize=5)
        res[label] = summarize(rows)
        sm = res[label]
        print(label, "win", sm["win"], "turns", sm["turns"], "shroud", sm["shrouds"], "scars", sm["book_scars"],
              "causes", sm["causes"], flush=True)
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--games", type=int, default=200)
    ap.add_argument("--part", default="matrix", choices=["matrix", "tuned", "lanterns", "ablation", "baseline", "smoke"])
    ap.add_argument("--procs", type=int, default=4)
    a = ap.parse_args()
    cells = []
    if a.part == "smoke":
        cells = [(f"{s}|{p}p", s, p, "Standard", None, True) for s in ("king", "child") for p in (2, 4)]
    elif a.part in ("matrix", "baseline", "tuned"):
        v5 = a.part != "baseline"
        cells = [(f"{s}|{p}p", s, p, "Standard", None, v5) for s in SOULS for p in (1, 2, 3, 4)]
    elif a.part == "lanterns":
        cells = [(f"{lan}|{s}|{p}p", s, p, lan, None, True) for lan in ("Gentle", "Hard") for s in SOULS for p in (1, 2, 3, 4)]
    elif a.part == "ablation":
        cells = [(f"{name}|{s}", s, 3, "Standard", extra, True) for name, extra in ABLATION for s in SOULS]
    tuned = a.part in ("tuned", "lanterns", "ablation")
    with Pool(a.procs) as pool:
        res = run(pool, cells, a.games, tuned)
    os.makedirs("reports", exist_ok=True)
    with open(f"reports/v5_{a.part}.json", "w") as f:
        json.dump(res, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
