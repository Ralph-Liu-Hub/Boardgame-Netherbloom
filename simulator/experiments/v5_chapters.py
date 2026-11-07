"""V5 revision: story chapters and the storybook routes (docs/design/V5-proposal.zh-TW.md, V5-storybooks.zh-TW.md).

    python3 -m experiments.v5_chapters --part base --games 200
    python3 -m experiments.v5_chapters --part variants --games 100
    python3 -m experiments.v5_chapters --part difficulty --games 100

Each part writes reports/v5ch_<part>.json.
"""
import argparse
import json
import os
import sys
from collections import Counter
from multiprocessing import Pool
from statistics import mean

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from experiments.v5 import make_cfg, SOULS  # noqa: E402
from netherbloom.game import play_game  # noqa: E402
from netherbloom.cards import OBS, ACC, OBL  # noqa: E402

THREAD = {OBS: "執念", ACC: "釋懷", OBL: "忘卻", None: "—"}
# The revised proposal, as decided in the 11/6 comments (values not yet calibrated).
CH = {"v5_chapters": True, "v5_fate": False, "v5_depth": False, "v5_carry": False, "v5_cap_bonus": 2,
      "v5_solo_cap_bonus": 1, "v5_obs_l2_ahead": 1, "v5_turn_knots": "clear_heal", "v5_traits": True,
      "bw_supply": 6, "forgotten_limit": 16}
LEVELS = {"Gentle": {"v5_shroud_crack": False, "v5_start_knots": 0},
          "Standard": {"v5_start_knots": 0},
          "Hard": {"v5_fog_plus": 1, "v5_start_knots": 1}}
VARIANTS = [   # each on top of BASE_EXTRA (the calibrated Standard)
    ("基準（校準版）", {}),
    ("翻頁解結 A：依點亮數解結，清空的絲線治傷", {"v5_turn_knots": "lit_free"}),
    ("翻頁解結 B：先每條解 2，再依點亮數", {"v5_turn_knots": "lit_free_base2"}),
    ("光牆每個河岸各自算", {"v5_wall_mode": "bank"}),
    ("消散門檻 14", {"dissolve": -2}),
    ("織機門檻 +2（6／7／8）", {"v5_cap_bonus": 2}),
    ("織機門檻 +4（8／9／10）", {"v5_cap_bonus": 4}),
    ("籠罩加 1 道裂痕", {"v5_shroud_crack": True}),
    ("拿掉迴響銘刻", {"v5_insc_echo": False}),
    ("加上轉折洗掉空格", {"v5_fate_skip": True}),
    ("託付可改寫分岔（一半的翻開選它）", {"v5_reveal_rewrite": 0.5}),
    ("拿掉根網特性", {"v5_traits": False}),
]
# Calibration (see the report): pacing and fog knobs on top of the proposal as written.
CALIB = []
PACING = {"無": {}, "迴響銘刻": {"v5_insc_echo": True}, "轉折洗掉空格": {"v5_fate_skip": True},
          "兩者": {"v5_insc_echo": True, "v5_fate_skip": True}}
for pname in ("迴響銘刻", "兩者"):
    for cap in (3, 4):
        for crack in (True, False):
            CALIB.append((f"{pname} cap+{cap} fog+1 籠罩裂痕={int(crack)}",
                          dict(PACING[pname], v5_cap_bonus=cap, v5_fog_plus=1, v5_shroud_crack=crack)))
# The calibrated Standard (report §3): Echo inscription, threshold +3, fog +1, a shroud leaves a mist scar but no crack.
BASE_EXTRA = {"v5_insc_echo": True, "v5_cap_bonus": 3, "v5_fog_plus": 1, "v5_shroud_crack": False, "v5_light_reserve": 0}
# The page turn decided on 11/7: untie 3 / 6 / 9 knots for 1 / 2 / 3 lit memories, no scar healing.
DECIDED = {"v5_turn_knots": "table", "v5_turn_table": (0, 3, 6, 9),
           # 11/7: the pull of Lethe at 3 / 5 / 7 forgotten cards, which a lit gate cannot override
           "v5_obl_pull": (3, 5, 7), "v5_obl_pull_hard": True}
# 11/7 player counts: solo hand 5 and loom +1; 4 players loom -1 (apply per player count).
PLAYER_DECIDED = {1: {"hand": 5, "v5_solo_cap_bonus": 2}, 4: {"v5_cap_bonus": 2}}
TUNED_LEVELS = {"Gentle": {"v5_fog_plus": 0}, "Standard": {}, "Hard": {"v5_shroud_crack": True, "v5_start_knots": 1}}
LEVEL_SETS = {
    "同門檻": {"Gentle": {}, "Standard": {}, "Hard": {}},
    "難度也調門檻": {"Gentle": {"v5_cap_bonus": 4}, "Standard": {}, "Hard": {"v5_cap_bonus": 2}},
}


def cfg(soul, players, level, seed, extra=None):
    ex = dict(CH)
    ex.update(LEVELS[level])
    extra = dict(extra or {})
    delta = extra.pop("dissolve", 0)
    ex.update(extra)
    c = make_cfg(soul, players, "Standard", seed, ex, True, True)
    c.forgotten_limit += delta
    return c


def one(args):
    soul, players, level, seed, extra = args
    s = play_game(cfg(soul, players, level, seed, extra))
    st = s.stats
    g = lambda k: st.get(k, 0)  # noqa: E731
    row = {
        "win": s.result == "win", "cause": s.cause, "turns": s.turn, "chapter": s.ch,
        "ch_end": [st.get(f"ch_end_turn{i}") for i in range(3)],
        "fate_turn": [st.get(f"ch_fate_turn{i}") for i in range(3)],
        "fate_kind": [next((k for k in ("river", "book", "forced") if g(f"fate_ch{i}_{k}")), None) for i in range(3)],
        "gate_fate": sum(g(f"gate_fate_ch{i}") for i in range(3)), "gate_end": sum(g(f"gate_end_ch{i}") for i in range(3)),
        "fate_names": st.get("fate_names", []),
        "paths": [(THREAD[p[0]], THREAD[p[1]]) if p else None for p in s.paths],
        "face_up": st["plays_up"], "face_down": st["face_down"], "swaps": g("swaps"), "recalls": g("recall_inscribes"),
        "pushes": g("push_actions"), "summons": st["summons"], "lit": g("lit"), "inscribed": st["inscribed"],
        "reveals": g("reveals"), "unmist": g("reveal_unmist"), "rewrites": g("reveal_rewrite"),
        "comm_done": st.get("comm_done"), "lingers": st["lingers"],
        "backlash": sum(st["backlash"]), "lv": [g("backlash_lv1"), g("backlash_lv2"), g("backlash_lv3")],
        "scars_end": sum(s.scars), "heals": g("turn_heals"),
        "knots_play": g("knots_play"), "knots_down": g("knots_down"), "knots_griev": g("knots_griev"),
        "knots_fate": g("knots_fate"),
        "shrouds": g("shrouds"), "mist_scars": sum(len(p) for p in s.bscars), "scar_covers": g("scar_covers"),
        "scar_fracture": g("scar_fracture"), "fog_flips": g("fog_flips"), "walls_kept": g("walls_kept"),
        "wall_absorbed": g("wall_absorbed"), "retreats": g("fate_retreats"), "spreads": g("trait_spreads"),
        "traits": {k[6:]: v for k, v in st.items() if k.startswith("trait_") and k != "trait_spreads"},
        "cracks": {k[6:]: v for k, v in st.items() if k.startswith("crack_")},
        "max_forgotten": st["max_forgotten"], "blank_slots": g("blank_slots"),
    }
    if row["win"]:
        ending, defied, hidden, place = s.story_ending()
        row.update(ending=ending, defied=defied, hidden=hidden, key_place=place)
    return row


def pct(n, d):
    return round(n / d, 3) if d else None


def summarize(rows):
    n = len(rows)
    wins = [r for r in rows if r["win"]]
    avg = lambda k, rs=rows: round(mean(r[k] for r in rs), 2) if rs else None  # noqa: E731
    out = {"games": n, "win": pct(len(wins), n),
           "causes": {k: pct(v, n) for k, v in Counter(r["cause"] for r in rows if not r["win"]).most_common()},
           "turns": avg("turns"), "turns_win": avg("turns", wins)}
    for k in ("face_up", "face_down", "swaps", "recalls", "pushes", "summons", "lit", "inscribed", "reveals", "unmist",
              "rewrites", "lingers", "backlash", "scars_end", "heals", "knots_play", "knots_down", "knots_griev",
              "knots_fate", "shrouds", "mist_scars", "scar_covers", "scar_fracture", "fog_flips", "walls_kept",
              "wall_absorbed", "retreats", "spreads", "gate_fate", "gate_end", "max_forgotten", "blank_slots"):
        out[k] = avg(k)
    out["lv"] = [round(mean(r["lv"][i] for r in rows), 2) for i in range(3)]
    out["shroud_any"] = pct(sum(r["shrouds"] > 0 for r in rows), n)
    out["gate_any"] = pct(sum(r["gate_fate"] + r["gate_end"] > 0 for r in rows), n)
    # chapter lengths, from games that finished the chapter
    lens = []
    for i in range(3):
        ds = []
        for r in rows:
            end = r["ch_end"][i]
            start = 0 if i == 0 else r["ch_end"][i - 1]
            if end is not None and start is not None:
                ds.append(end - start)
        lens.append(round(mean(ds), 1) if ds else None)
    out["chapter_turns"] = lens
    out["reached_ch"] = [pct(sum(r["chapter"] >= i for r in rows), n) for i in range(3)]
    kinds = Counter(k for r in rows for k in r["fate_kind"] if k)
    tot = sum(kinds.values())
    out["fate_kind"] = {k: pct(v, tot) for k, v in kinds.most_common()}
    fn = Counter(x for r in rows for x in r["fate_names"])
    out["fate_names"] = {k: round(v / n, 3) for k, v in fn.most_common()}
    paths = Counter(p[1] for r in wins for p in r["paths"] if p)
    out["path_threads_win"] = {k: pct(v, sum(paths.values())) for k, v in paths.most_common()}
    out["endings_win"] = {k: pct(v, len(wins)) for k, v in Counter(r["ending"] for r in wins).most_common()}
    out["fate_line_win"] = {"逆命": pct(sum(r["defied"] >= 1 for r in wins), len(wins)),   # 11/7: defy once or more
                            "違抗 2 次以上": pct(sum(r["defied"] >= 2 for r in wins), len(wins))}
    out["hidden_win"] = pct(sum(r["hidden"] for r in wins), len(wins))
    out["hidden_all"] = pct(sum(r["hidden"] for r in wins), n)
    kp = [r["key_place"] for r in wins if r.get("key_place")]
    out["key_place_win"] = {k: pct(v, len(kp)) for k, v in Counter(kp).most_common()}
    done = [r["comm_done"] for r in rows if r["comm_done"] is not None]
    out["comm_done"] = round(mean(done), 2) if done else None
    cc = Counter()
    for r in rows:
        cc.update(r["cracks"])
    out["cracks"] = {k: round(v / n, 2) for k, v in cc.most_common()}
    tc = Counter()
    for r in rows:
        tc.update(r["traits"])
    out["traits"] = {k: round(v / n, 2) for k, v in tc.most_common()}
    return out


def run(pool, cells, games):
    res = {}
    for label, soul, players, level, extra in cells:
        rows = pool.map(one, [(soul, players, level, seed, extra) for seed in range(games)], chunksize=5)
        res[label] = summarize(rows)
        res[label]["_rows"] = rows if os.environ.get("KEEP_ROWS") else None
        sm = res[label]
        print(label, "win", sm["win"], "turns", sm["turns"], "ch", sm["chapter_turns"], "backlash", sm["backlash"],
              "shroud_any", sm["shroud_any"], "gate", sm["gate_any"], flush=True)
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--games", type=int, default=200)
    ap.add_argument("--part", default="base", choices=["base", "tuned", "calib", "variants", "difficulty", "smoke"])
    ap.add_argument("--procs", type=int, default=4)
    a = ap.parse_args()
    cells = []
    if a.part == "smoke":
        cells = [(f"{s}|{p}p", s, p, "Standard", None) for s in ("king", "child") for p in (1, 3)]
    elif a.part == "base":
        cells = [(f"{s}|{p}p", s, p, "Standard", None) for s in SOULS for p in (1, 2, 3, 4)]
    elif a.part == "tuned":
        cells = [(f"{s}|{p}p", s, p, "Standard", BASE_EXTRA) for s in SOULS for p in (1, 2, 3, 4)]
    elif a.part == "calib":
        cells = [(f"{name}|{s}|{p}p", s, p, "Standard", extra) for name, extra in CALIB for s in SOULS for p in (1, 2, 3, 4)]
    elif a.part == "variants":
        cells = [(f"{name}|{s}|{p}p", s, p, "Standard", dict(BASE_EXTRA, **extra)) for name, extra in VARIANTS
                 for p in (1, 2, 3, 4) for s in SOULS]
    elif a.part == "difficulty":
        cells = [(f"{setname}|{lv}|{s}|{p}p", s, p, "Standard", dict(BASE_EXTRA, **TUNED_LEVELS[lv], **sets[lv]))
                 for setname, sets in LEVEL_SETS.items()
                 for lv in ("Gentle", "Hard") for s in SOULS for p in (1, 2, 3, 4)]
    with Pool(a.procs) as pool:
        res = run(pool, cells, a.games)
    os.makedirs("reports", exist_ok=True)
    for v in res.values():
        v.pop("_rows", None)
    with open(f"reports/v5ch_{a.part}.json", "w") as f:
        json.dump(res, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
