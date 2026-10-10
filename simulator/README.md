# Netherbloom simulator

Plays thousands of games of Netherbloom with Echo-following AI players and reports how balanced and how well-paced the game is. It models the rules in **GDD v0.4** and the cards in **Card Compendium v0.2** and **Soul Roster v3**.

## Quick start

Python 3.10+ is enough; there are no dependencies.

```bash
cd simulator
python3 -m netherbloom.report --games 1000 --out reports      # full balance suite (about 75 s on 4 cores)
python3 viewer/build_viewer.py --players 3 --seed 13            # replay one game as an HTML page
python3 -m unittest discover -s tests                           # tests
```

To try a single setting:

```python
from netherbloom.stats import run_batch, fmt
print(fmt(run_batch(500, players=4, lantern=3, soul="open", hand=4)))
```

Every number in the game is a `Config` option (`netherbloom/engine.py`), so a rule change can be tested with one argument.

## Layout

| File | What it does |
|---|---|
| `netherbloom/cards.py` | All card, Mist, tile, Lantern and Ghost data |
| `netherbloom/engine.py` | The rules: state, card effects, Soul Step, Mist, threats, Loom, Book, Mantles, solo Ghost |
| `netherbloom/agent.py` | The Echo-following AI player |
| `netherbloom/game.py` | Runs one game; can record a replay |
| `netherbloom/stats.py` | Batch runs and summary statistics |
| `netherbloom/report.py` | The full balance suite, written to `reports/` |
| `viewer/` | Replay page generator. It uses the icon set in `viewer/visual-kit.html` (the same kit as the art direction). |
| `tests/` | Unit tests |

## The AI players

The players are silent, as in the real game:
- Each player sees only its own hand and the public board.
- Each turn it tries every card in each way it can be played (face up, face down, Burn).
- It plays out the result up to the Soul Step and keeps the best pair of plays (a beam search over the first card).
- It favours answering the Echo, and leaves an Echo the next player can safely follow.
- It cannot see under the fog while planning.

## Tuning changes proposed to GDD v0.4

GDD v0.4 as written was **unbalanced**:
- Win rates ranged from 45% to 76% across player counts.
- Faded caused 76–88% of all losses, and Deluge never happened.
- Games lasted only 10–13 turns.

These changes bring every player count to **48–54% wins**, with all three loss conditions sharing the losses:

| Rule | GDD v0.4 | Tuned |
|---|---|---|
| Lingering | Always forget 1 | Forget 1 only if the soul's own space is **not Lit** (a soul waiting beside its own light does not fade) |
| Drained Black Water | Returns to the supply | **Leaves the game.** The supply of 5 becomes a slow flood clock, so Deluge is a real threat. |
| Burn | Forget the card | Forget the card **and 1 more** |
| Light as Ash / Adrift | 4 / 8 forgotten | **6 / 9** |
| Mist decks | 10 cards per Reach | **12**: +1 Rising Water, +1 Grievance Drawn Near |
| Hand size | 5 / 5 / 4 / 3 (solo / 2 / 3 / 4 players) | **4 / 3 / 3 / 3** |
| Knots per thread | 5 | **4 at 2–3 players, 5 in solo and at 4 players** |
| Chapter Blessing | Page full (4 slots) | **3 of 4 slots** (Garland twist: 2) |
| Key Memory | Inscribed only on Resonance | May be inscribed **whenever played face up** |
| Solo Ghost | Its Oblivion card forgets 1 | **Does not forget** |
| Bride twist | Pulled back once per Reach, still forgets | Pulled back **once per game**, forgets nothing |
| Bride pack | B02 Shield, B06 Mend | **B02 Stubborn Root, B06 Full Bloom** |

## Not modelled yet

- Nameless Souls (Life, Wound and Last Wish).
- Hidden endings.
- The Eastern expansion.
- Player mistakes. The AI never forgets a rule, so real first games will be harder than these numbers suggest.
