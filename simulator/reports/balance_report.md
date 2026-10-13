# Netherbloom Simulator — Balance Report

1000 games per main configuration (half that for variants). Echo-following AI players. Run time 91 s.

## 1. Player counts (Standard Lantern, Open Crossing)

| Players | Win rate | Loss split Faded / Shattered / Deluge | Turns (mean) | Turns per Reach I/II/III | Tracks half-full (of 3) | Near-miss wins | Backlash per Reach |
|---|---|---|---|---|---|---|---|
| 1 | **54%** | 39% / 20% / 41% | 14.1 | 6.5 / 5.6 / 2.0 | 1.86 | 32% | 1.23 / 1.08 / 0.22 |
| 2 | **53%** | 31% / 37% / 32% | 14.6 | 7.2 / 5.5 / 1.9 | 1.99 | 40% | 0.53 / 0.31 / 0.06 |
| 3 | **50%** | 27% / 33% / 39% | 15.2 | 7.4 / 6.0 / 1.8 | 2.06 | 47% | 0.59 / 0.37 / 0.05 |
| 4 | **52%** | 30% / 31% / 39% | 15.7 | 7.3 / 6.3 / 2.0 | 2.03 | 41% | 0.27 / 0.21 / 0.02 |

## 2. Before and after tuning (GDD v0.4 as written)

| Players | As written: win | As written: loss split F/S/D | As written: turns | Tuned: win | Tuned: loss split | Tuned: turns |
|---|---|---|---|---|---|---|
| 1 | 39% | 90% / 10% / 0% | 10.0 | 54% | 39% / 20% / 41% | 14.1 |
| 2 | 74% | 94% / 6% / 0% | 10.3 | 53% | 31% / 37% / 32% | 14.6 |
| 3 | 59% | 86% / 14% / 0% | 11.5 | 50% | 27% / 33% / 39% | 15.2 |
| 4 | 44% | 81% / 19% / 0% | 12.5 | 52% | 30% / 31% / 39% | 15.7 |

## 3. Souls (3 players, Standard Lantern)

| Soul | Win rate | Loss split F/S/D | Turns | Endings reached (among wins) |
|---|---|---|---|---|
| king | 42% | 35% / 29% / 35% | 15.4 | inscribed/high 30%, inscribed/low 24%, unspoken/high 17%, forgotten/high 14%, unspoken/low 9%, forgotten/low 6% |
| garland | 47% | 23% / 37% / 39% | 15.8 | inscribed/high 31%, inscribed/low 23%, unspoken/high 14%, forgotten/high 14%, unspoken/low 12%, forgotten/low 6% |
| bride | 31% | 24% / 26% / 50% | 16.9 | unspoken/high 26%, inscribed/high 24%, inscribed/low 22%, unspoken/low 18%, forgotten/high 8%, forgotten/low 3% |
| child | 74% | 45% / 25% / 30% | 14.7 | unspoken/low 23%, unspoken/high 23%, inscribed/low 22%, inscribed/high 22%, forgotten/high 7%, forgotten/low 3% |

Same Souls at the **Gentle Lantern**: king 60%, garland 69%, bride 52%


## 4. Lantern difficulty (3 players)

| Lantern | Win rate | Loss split F/S/D | Turns |
|---|---|---|---|
| Gentle | 67% | 17% / 65% / 18% | 15.7 |
| Standard | 51% | 30% / 30% / 40% | 15.3 |
| Hard | 35% | 24% / 16% / 60% | 14.0 |
| Heroic | 19% | 15% / 11% / 75% | 12.1 |

## 5. The Book of Remembrance (3 players)

| | Win rate | Inscriptions | Full pages | Turns |
|---|---|---|---|---|
| Book used | 50% | 4.1 | 0.08 | 15.2 |
| Book ignored | 44% | 0 | 0 | 15.4 |

Book impact: **+6 points** (target +5 to +10).

## 6. Other signals (3 players)

- **resonance rate**: 0.35
- **burns**: 1.68
- **lingers**: 6.05
- **summons**: 2.99
- **oblivion played**: 2.72
- **keepsakes**: 5.47
- **final forgotten**: 7.99
