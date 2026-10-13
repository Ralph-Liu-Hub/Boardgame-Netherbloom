"""Experiment: the harsh push-through rule and the Seek action, alone and together.
    python -m experiments.seek_push        (from simulator/)"""
from multiprocessing import Pool
from netherbloom.stats import run_batch

RULES = {
    "old rules": dict(push_through="off", seek=False),
    "push (harsh)": dict(push_through="harsh", seek=False),
    "push + Seek": dict(push_through="harsh", seek=True),
}
CELLS = [(p, soul, lan) for p in (1, 2, 3, 4) for soul in ("open",) for lan in (3,)] + \
        [(3, soul, lan) for soul in ("child", "king", "garland", "bride") for lan in (2, 3)] + [(3, "open", 2)]


def job(a):
    name, (p, soul, lan) = a
    return name, (p, soul, lan), run_batch(500, players=p, soul=soul, lantern=lan, **RULES[name])


if __name__ == "__main__":
    with Pool() as pool:
        res = pool.map(job, [(n, c) for c in CELLS for n in RULES])
    print("500 games per cell · win rate (turns, losses Faded/Shattered/Deluge)")
    for c in CELLS:
        row = []
        for n in RULES:
            s = next(r for name, cc, r in res if name == n and cc == c)
            lc = s["loss_causes"]
            row.append(f"{n}: {s['win_rate']:.0%} ({s['turns_mean']:.1f}t, {lc.get('Faded',0):.0%}/{lc.get('Shattered',0):.0%}/{lc.get('Deluge',0):.0%})")
        print(f"{c[0]}p {c[1]:8} L{c[2]} | " + " | ".join(row))
