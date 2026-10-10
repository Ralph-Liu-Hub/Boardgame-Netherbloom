import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from netherbloom import cards as C  # noqa: E402
from netherbloom.engine import Config, State, BLOOM  # noqa: E402
from netherbloom.game import play_game  # noqa: E402
from netherbloom.stats import run_batch  # noqa: E402


class CardData(unittest.TestCase):
    def test_core_deck_counts(self):
        tags = [c.tag for c in C.CORE]
        self.assertEqual(len(C.CORE), 32)
        self.assertEqual((tags.count(C.OBS), tags.count(C.ACC), tags.count(C.OBL)), (13, 11, 8))

    def test_story_bands_balanced(self):
        slots = [c.slot for c in C.CORE if c.slot]
        for slot in C.SLOTS:
            self.assertEqual(slots.count(slot), 6, slot)

    def test_each_soul_has_one_key(self):
        for soul, pack in C.SOULS.items():
            self.assertEqual(len(pack), 8, soul)
            self.assertEqual(sum(c.key for c in pack), 1, soul)


class Setup(unittest.TestCase):
    def test_start_state(self):
        s = State.new(Config(players=3, seed=1))
        self.assertEqual(s.soul, 0)
        self.assertEqual(s.tok[2], BLOOM)
        self.assertEqual(s.tok[3], BLOOM)
        self.assertEqual(len(s.deck) + sum(len(h) for h in s.hands), 40)
        self.assertEqual([len(h) for h in s.hands], [3, 3, 3])


class Games(unittest.TestCase):
    def test_deterministic(self):
        a = play_game(Config(players=3, seed=5))
        b = play_game(Config(players=3, seed=5))
        self.assertEqual((a.result, a.cause, a.turn), (b.result, b.cause, b.turn))

    def test_every_mode_finishes_cleanly(self):
        for players in (1, 2, 3, 4):
            for soul in ("open", "king", "garland", "bride", "child"):
                for seed in range(15):
                    s = play_game(Config(players=players, soul=soul, seed=seed, lantern=1 + seed % 5))
                    self.assertIn(s.result, ("win", "loss"))
                    if s.result == "loss":
                        self.assertIn(s.cause, ("Faded", "Shattered", "Deluge"))

    def test_win_rate_in_target_band(self):
        s = run_batch(300, players=3)
        self.assertGreater(s["win_rate"], 0.38)
        self.assertLess(s["win_rate"], 0.62)

    def test_replay_records_each_turn(self):
        s = play_game(Config(players=2, seed=3), record=True)
        self.assertEqual(len(s.snaps), s.turn + 1)


if __name__ == "__main__":
    unittest.main()
