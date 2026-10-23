"""Runs the full balance suite and writes a Markdown + JSON report.

    python -m netherbloom.report --games 1000 --out reports/
"""
import argparse
import json
import os
import time
from multiprocessing import Pool

from .cards import LANTERN, LANTERN_NAMES
from .stats import run_batch

# GDD v0.4 exactly as written, for comparison with the tuned defaults.
RULES_AS_WRITTEN = dict(linger_rule="always", bw_returns=True, burn_forget=1, ash_at=4, adrift_at=8,
                        extra_mist=0, ghost_forgets=True, karma_cap=5, blessing_at=4, key_any=False,
                        bride_once=False, bride_forgets=True, burn_mode="solo", book_mode="blessing")
HAND_AS_WRITTEN = {1: 5, 2: 5, 3: 4, 4: 3}


def _job(args):
    label, n, kw = args
    return label, kw, run_batch(n, **kw)


def suite(n):
    jobs = []
    for p in (1, 2, 3, 4):
        jobs.append((f"players:{p}", n, dict(players=p)))
        jobs.append((f"as_written:{p}", n // 2, dict(players=p, hand=HAND_AS_WRITTEN[p], **RULES_AS_WRITTEN)))
    for soul in ("king", "garland", "bride", "child"):
        jobs.append((f"soul:{soul}", n // 2, dict(players=3, soul=soul)))
    for soul in ("king", "garland", "bride"):
        jobs.append((f"soul2:{soul}", n // 2, dict(players=3, soul=soul, lantern=1)))
    for lantern in LANTERN:
        jobs.append((f"lantern:{lantern}", n // 2, dict(players=3, lantern=lantern)))
    jobs.append(("book:off", n, dict(players=3, use_book=False)))
    jobs.append(("book:on", n, dict(players=3, use_book=True)))
    with Pool() as pool:
        return pool.map(_job, jobs)


def pct(x):
    return "—" if x is None else f"{x * 100:.0f}%"


def causes(s):
    lc = s["loss_causes"]
    return " / ".join(f"{pct(lc.get(k, 0))}" for k in ("Faded", "Shattered", "Deluge"))


def to_markdown(results, n, secs):
    R = {label: s for label, kw, s in results}
    L = []
    L.append("# Netherbloom Simulator — Balance Report\n")
    L.append(f"{n} games per main configuration (half that for variants). Echo-following AI players. "
             f"Run time {secs:.0f} s.\n")
    L.append("## 1. Player counts (Standard Lantern, Open Crossing)\n")
    L.append("| Players | Win rate | Loss split Faded / Shattered / Deluge | Turns (mean) | Turns per Reach I/II/III | "
             "Tracks half-full (of 3) | Near-miss wins | Backlash per Reach |")
    L.append("|---|---|---|---|---|---|---|---|")
    for p in (1, 2, 3, 4):
        s = R[f"players:{p}"]
        L.append(f"| {p} | **{pct(s['win_rate'])}** | {causes(s)} | {s['turns_mean']:.1f} | "
                 f"{' / '.join(str(x) for x in s['turns_by_reach'])} | {s['tracks_half_full']} | "
                 f"{pct(s['near_miss_wins'])} | {' / '.join(str(x) for x in s['backlash_per_reach'])} |")
    L.append("\n## 2. Before and after tuning (GDD v0.4 as written)\n")
    L.append("| Players | As written: win | As written: loss split F/S/D | As written: turns | Tuned: win | Tuned: loss split | Tuned: turns |")
    L.append("|---|---|---|---|---|---|---|")
    for p in (1, 2, 3, 4):
        a, b = R[f"as_written:{p}"], R[f"players:{p}"]
        L.append(f"| {p} | {pct(a['win_rate'])} | {causes(a)} | {a['turns_mean']:.1f} | {pct(b['win_rate'])} | {causes(b)} | {b['turns_mean']:.1f} |")
    L.append("\n## 3. Souls (3 players, Standard Lantern)\n")
    L.append("| Soul | Win rate | Loss split F/S/D | Turns | Endings reached (among wins) |")
    L.append("|---|---|---|---|---|")
    for soul in ("king", "garland", "bride", "child"):
        s = R[f"soul:{soul}"]
        ends = s.get("endings") or {}
        tot = sum(ends.values()) or 1
        e = ", ".join(f"{k} {v / tot * 100:.0f}%" for k, v in sorted(ends.items(), key=lambda kv: -kv[1]))
        L.append(f"| {soul} | {pct(s['win_rate'])} | {causes(s)} | {s['turns_mean']:.1f} | {e} |")
    L.append("\nSame Souls at the **Gentle Lantern**: " + ", ".join(
        f"{soul} {pct(R[f'soul2:{soul}']['win_rate'])}" for soul in ("king", "garland", "bride")) + "\n")
    L.append("\n## 4. Lantern difficulty (3 players)\n")
    L.append("| Lantern | Win rate | Loss split F/S/D | Turns |")
    L.append("|---|---|---|---|")
    for lv in LANTERN:
        s = R[f"lantern:{lv}"]
        L.append(f"| {LANTERN_NAMES[lv]} | {pct(s['win_rate'])} | {causes(s)} | {s['turns_mean']:.1f} |")
    L.append("\n## 5. The Book of Remembrance (3 players)\n")
    on, off = R["book:on"], R["book:off"]
    L.append("| | Win rate | Inscriptions | Full pages | Turns |")
    L.append("|---|---|---|---|---|")
    L.append(f"| Book used | {pct(on['win_rate'])} | {on['inscriptions']:.1f} | {on['full_pages']:.2f} | {on['turns_mean']:.1f} |")
    L.append(f"| Book ignored | {pct(off['win_rate'])} | 0 | 0 | {off['turns_mean']:.1f} |")
    L.append(f"\nBook impact: **{(on['win_rate'] - off['win_rate']) * 100:+.0f} points** (target +5 to +10).\n")
    L.append("## 6. Other signals (3 players)\n")
    s = R["players:3"]
    for k in ("resonance_rate", "burns", "lingers", "summons", "oblivion_played", "keepsakes", "final_forgotten"):
        v = s[k]
        L.append(f"- **{k.replace('_', ' ')}**: {v:.2f}" if isinstance(v, float) else f"- **{k}**: {v}")
    return "\n".join(L) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--games", type=int, default=1000)
    ap.add_argument("--out", default="reports")
    a = ap.parse_args()
    t = time.time()
    results = suite(a.games)
    secs = time.time() - t
    os.makedirs(a.out, exist_ok=True)
    with open(os.path.join(a.out, "balance_report.md"), "w") as f:
        f.write(to_markdown(results, a.games, secs))
    with open(os.path.join(a.out, "balance_report.json"), "w") as f:
        json.dump([{"label": l, "config": kw, "summary": s} for l, kw, s in results], f, indent=1)
    from .report_zh import translate
    with open(os.path.join(a.out, "balance_report.zh-TW.md"), "w") as f:
        f.write(translate(to_markdown(results, a.games, secs)))
    print(open(os.path.join(a.out, "balance_report.md")).read())


if __name__ == "__main__":
    main()
