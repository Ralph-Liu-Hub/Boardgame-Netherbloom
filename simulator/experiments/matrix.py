"""Win-rate matrix for every player count × Soul × Lantern under the current rules.
    python -m experiments.matrix [games per cell]        (from simulator/)
Writes reports/win_matrix.json, win_matrix.md and win_matrix.zh-TW.md.
    python -m experiments.matrix --md      rewrites only the Markdown from the saved JSON"""
import sys, json
from multiprocessing import Pool
from netherbloom.stats import run_batch
from netherbloom.cards import LANTERN, LANTERN_NAMES

SOULS = ["child", "garland", "open", "king", "bride"]
NAMES = {"child": "Child of the Last Flame", "garland": "Garland Girl", "open": "Open Crossing",
         "king": "King on the Barge", "bride": "Bride Who Stayed Below"}
LANS = tuple(LANTERN)


def job(a):
    p, soul, lan, n = a
    s = run_batch(n, seed0=10_000, players=p, soul=soul, lantern=lan)
    return p, soul, lan, s["win_rate"], s["turns_mean"]


ZH_NAMES = {"child": "最後火光的孩子", "garland": "花環少女", "open": "無名渡河", "king": "渡船上的國王", "bride": "留在冥府的新娘"}
ZH_LANS = {1: "溫和", 2: "標準", 3: "困難", 4: "英雄"}
TEXT = {
    "en": dict(title="# Win-rate matrix (current rules: Seek and Push Through as actions)",
               intro="{n} AI games per cell, Echo-following AI. Rows: Soul × player count; columns: Lantern.",
               players="Players", soul="Soul", avg_all="Average over all player counts",
               avg_nc="Average over the four Souls other than the Child", turns="Average turns per game (all Souls)"),
    "zh": dict(title="# 勝率矩陣（現行規則：尋覓與強行穿過皆為行動）",
               intro="每格 {n} 場 AI 對局，由跟隨迴響的 AI 進行。列：亡魂 × 玩家人數；欄：燈籠。",
               players="玩家人數", soul="亡魂", avg_all="所有玩家人數的平均",
               avg_nc="孩子以外四個亡魂的平均", turns="每局平均回合數（所有亡魂）"),
}


def markdown(rows, n, lang="en"):
    t = TEXT[lang]
    names = NAMES if lang == "en" else ZH_NAMES
    lan = (lambda l: LANTERN_NAMES[l]) if lang == "en" else (lambda l: ZH_LANS[l])
    head = lambda first: f"| {first} | " + " | ".join(lan(l) for l in LANS) + " |\n|---|" + "---|" * len(LANS)
    W = {(p, so, la): w for p, so, la, w, t_ in rows}
    T = {(p, so, la): t_ for p, so, la, w, t_ in rows}
    out = [t["title"], "", t["intro"].format(n=n), ""]
    for so in SOULS:
        out += ["", f"**{names[so]}**", "", head(t["players"])]
        out += [f"| {p} | " + " | ".join(f"{W[p, so, la]:.0%}" for la in LANS) + " |" for p in (1, 2, 3, 4)]
    out += ["", f"**{t['avg_all']}**", "", head(t["soul"])]
    out += [f"| {names[so]} | " + " | ".join(f"{sum(W[p, so, la] for p in (1, 2, 3, 4)) / 4:.0%}" for la in LANS) + " |"
            for so in SOULS]
    out += ["", f"**{t['avg_nc']}**", "", head(t["players"])]
    out += [f"| {p} | " + " | ".join(f"{sum(W[p, so, la] for so in SOULS[1:]) / 4:.0%}" for la in LANS) + " |"
            for p in (1, 2, 3, 4)]
    out += ["", f"**{t['turns']}**", "", head(t["players"])]
    out += [f"| {p} | " + " | ".join(f"{sum(T[p, so, la] for so in SOULS) / 5:.1f}" for la in LANS) + " |"
            for p in (1, 2, 3, 4)]
    return "\n".join(out) + "\n"


def write(rows, n):
    open("reports/win_matrix.md", "w").write(markdown(rows, n))
    open("reports/win_matrix.zh-TW.md", "w").write("[English](win_matrix.md) | 正體中文\n\n" + markdown(rows, n, "zh"))


if __name__ == "__main__":
    if sys.argv[1:] == ["--md"]:  # rewrite the Markdown from the saved JSON without re-running
        write(json.load(open("reports/win_matrix.json")), 400)
        sys.exit()
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 400
    with Pool() as pool:
        rows = pool.map(job, [(p, so, la, n) for p in (1, 2, 3, 4) for so in SOULS for la in LANS])
    json.dump(rows, open("reports/win_matrix.json", "w"))
    write(rows, n)
    for p, so, la, w, t in rows:
        print(p, so, la, f"{w:.3f}", f"{t:.1f}")
