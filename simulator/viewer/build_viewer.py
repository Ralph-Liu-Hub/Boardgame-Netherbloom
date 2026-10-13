"""Builds a self-contained replay page for one simulated game.

    python viewer/build_viewer.py --players 3 --seed 13 --out viewer/replay.html

The page reuses the icon symbols from viewer/visual-kit.html, so a replay looks like the prototype.
"""
import argparse
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

from netherbloom.cards import LANTERN_NAMES  # noqa: E402
from netherbloom.engine import Config  # noqa: E402
from netherbloom.game import play_game  # noqa: E402


def symbols():
    kit = open(os.path.join(HERE, "visual-kit.html"), encoding="utf-8").read()
    m = re.search(r'<svg width="0" height="0".*?</svg>', kit, re.S)
    return m.group(0)


def build(players, seed, soul="open", lantern=2):
    cfg = Config(players=players, seed=seed, soul=soul, lantern=lantern)
    s = play_game(cfg, record=True)
    game = {"players": players, "seed": seed, "soul": soul, "lantern": lantern, "lantern_name": LANTERN_NAMES[lantern], "snaps": s.snaps,
            "karma_cap": cfg.karma_cap, "forgotten_limit": cfg.forgotten_limit, "ash_at": cfg.ash_at,
            "adrift_at": cfg.adrift_at, "bw_supply": cfg.bw_supply}
    page = open(os.path.join(HERE, "template.html"), encoding="utf-8").read()
    page = page.replace("<!--SYMBOLS-->", symbols())
    page = page.replace("/*GAME*/null", json.dumps(game, separators=(",", ":")))
    return page, s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--players", type=int, default=3)
    ap.add_argument("--seed", type=int, default=13)
    ap.add_argument("--soul", default="open")
    ap.add_argument("--lantern", type=int, default=2)
    ap.add_argument("--out", default=os.path.join(HERE, "replay.html"))
    a = ap.parse_args()
    page, s = build(a.players, a.seed, a.soul, a.lantern)
    with open(a.out, "w", encoding="utf-8") as f:
        f.write(page)
    print(f"{a.out}: {s.result} {s.cause or ''} in {s.turn} turns")


if __name__ == "__main__":
    main()
