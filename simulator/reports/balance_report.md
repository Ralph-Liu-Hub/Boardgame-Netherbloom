# Netherbloom Simulator — Balance Report

1000 games per main configuration (half that for variants). Echo-following AI players. Run time 112 s.

## 1. Player counts (Standard Lantern, Open Crossing)

| Players | Win rate | Loss split Faded / Shattered / Deluge | Turns (mean) | Turns per Reach I/II/III | Tracks half-full (of 3) | Near-miss wins | Backlash per Reach |
|---|---|---|---|---|---|---|---|
| 1 | **59%** | 13% / 30% / 57% | 15.1 | 6.6 / 6.1 / 2.5 | 1.75 | 34% | 1.22 / 1.22 / 0.33 |
| 2 | **57%** | 19% / 43% / 38% | 15.1 | 6.9 / 5.7 / 2.5 | 1.94 | 40% | 0.57 / 0.3 / 0.11 |
| 3 | **60%** | 32% / 27% / 40% | 15.0 | 6.5 / 6.0 / 2.5 | 1.92 | 37% | 0.57 / 0.31 / 0.12 |
| 4 | **61%** | 44% / 16% / 40% | 14.6 | 6.0 / 6.2 / 2.5 | 1.86 | 44% | 0.28 / 0.17 / 0.05 |

## 2. Before and after tuning (GDD v0.4 as written)

| Players | As written: win | As written: loss split F/S/D | As written: turns | Tuned: win | Tuned: loss split | Tuned: turns |
|---|---|---|---|---|---|---|
| 1 | 43% | 87% / 13% / 0% | 11.9 | 59% | 13% / 30% / 57% | 15.1 |
| 2 | 78% | 87% / 13% / 0% | 11.6 | 57% | 19% / 43% / 38% | 15.1 |
| 3 | 66% | 87% / 13% / 0% | 13.0 | 60% | 32% / 27% / 40% | 15.0 |
| 4 | 48% | 77% / 23% / 0% | 14.0 | 61% | 44% / 16% / 40% | 14.6 |

## 3. Souls (3 players, Standard Lantern)

| Soul | Win rate | Loss split F/S/D | Turns | Endings reached (among wins) |
|---|---|---|---|---|
| king | 40% | 49% / 22% / 29% | 15.0 | inscribed/high 24%, inscribed/low 23%, forgotten/high 17%, unspoken/low 13%, unspoken/high 13%, forgotten/low 11% |
| garland | 46% | 49% / 26% / 24% | 14.4 | inscribed/high 28%, unspoken/high 23%, inscribed/low 20%, unspoken/low 13%, forgotten/high 11%, forgotten/low 6% |
| bride | 37% | 46% / 17% / 37% | 15.8 | inscribed/high 23%, unspoken/high 22%, inscribed/low 20%, forgotten/high 14%, unspoken/low 13%, forgotten/low 7% |
| child | 73% | 41% / 20% / 38% | 14.1 | unspoken/high 23%, inscribed/high 20%, unspoken/low 20%, inscribed/low 17%, forgotten/high 14%, forgotten/low 7% |

Same Souls at the **Gentle Lantern**: king 55%, garland 57%, bride 48%


## 4. Lantern difficulty (3 players)

| Lantern | Win rate | Loss split F/S/D | Turns |
|---|---|---|---|
| Gentle | 77% | 36% / 36% / 28% | 15.1 |
| Standard | 58% | 31% / 27% / 41% | 15.0 |
| Hard | 47% | 25% / 18% / 58% | 13.8 |
| Heroic | 30% | 14% / 10% / 76% | 12.7 |

## 5. The Book of Remembrance (3 players)

| | Win rate | Inscriptions | Full pages | Turns |
|---|---|---|---|---|
| Book used | 60% | 3.5 | 0.08 | 15.0 |
| Book ignored | 51% | 0 | 0 | 15.3 |

Book impact: **+8 points** (target +5 to +10).

## 6. Other signals (3 players)

- **resonance rate**: 0.32
- **burns**: 2.84
- **lingers**: 5.57
- **summons**: 2.99
- **oblivion played**: 2.73
- **keepsakes**: 5.50
- **final forgotten**: 7.46
