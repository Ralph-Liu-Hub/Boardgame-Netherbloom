# Netherbloom Simulator — Balance Report

1000 games per main configuration (half that for variants). Echo-following AI players. Run time 95 s.

## 1. Player counts (Lantern 3, Open Crossing)

| Players | Win rate | Loss split Faded / Shattered / Deluge | Turns (mean) | Turns per Reach I/II/III | Tracks half-full (of 3) | Near-miss wins | Backlash per Reach |
|---|---|---|---|---|---|---|---|
| 1 | **63%** | 33% / 29% / 39% | 14.2 | 6.4 / 5.7 / 2.1 | 1.86 | 27% | 1.15 / 1.13 / 0.23 |
| 2 | **66%** | 24% / 43% / 33% | 14.4 | 6.9 / 5.3 / 2.2 | 1.96 | 38% | 0.52 / 0.33 / 0.07 |
| 3 | **64%** | 29% / 36% / 36% | 14.8 | 7.1 / 5.6 / 2.1 | 2.02 | 42% | 0.55 / 0.35 / 0.05 |
| 4 | **64%** | 28% / 34% / 38% | 15.4 | 7.0 / 6.0 / 2.4 | 2.01 | 38% | 0.24 / 0.21 / 0.04 |

## 2. Before and after tuning (GDD v0.4 as written)

| Players | As written: win | As written: loss split F/S/D | As written: turns | Tuned: win | Tuned: loss split | Tuned: turns |
|---|---|---|---|---|---|---|
| 1 | 52% | 90% / 10% / 0% | 10.3 | 63% | 33% / 29% / 39% | 14.2 |
| 2 | 81% | 76% / 24% / 0% | 10.4 | 66% | 24% / 43% / 33% | 14.4 |
| 3 | 71% | 84% / 16% / 0% | 11.7 | 64% | 29% / 36% / 36% | 14.8 |
| 4 | 58% | 71% / 29% / 0% | 12.8 | 64% | 28% / 34% / 38% | 15.4 |

## 3. Souls (3 players, Lantern 3)

| Soul | Win rate | Loss split F/S/D | Turns | Endings reached (among wins) |
|---|---|---|---|---|
| king | 50% | 30% / 36% / 34% | 15.2 | inscribed/high 28%, inscribed/low 24%, forgotten/high 18%, unspoken/high 18%, unspoken/low 8%, forgotten/low 5% |
| garland | 58% | 24% / 36% / 41% | 15.0 | inscribed/high 35%, inscribed/low 21%, forgotten/high 14%, unspoken/low 13%, unspoken/high 12%, forgotten/low 6% |
| bride | 44% | 22% / 40% / 38% | 16.5 | inscribed/high 32%, unspoken/high 27%, forgotten/high 14%, inscribed/low 12%, unspoken/low 11%, forgotten/low 4% |
| child | 74% | 50% / 20% / 30% | 14.8 | unspoken/low 23%, unspoken/high 23%, inscribed/low 22%, inscribed/high 22%, forgotten/high 6%, forgotten/low 4% |

Same Souls at **Lantern 2**: king 57%, garland 69%, bride 51%


## 4. Lantern difficulty (3 players)

| Lantern | Win rate | Loss split F/S/D | Turns |
|---|---|---|---|
| 1 | 71% | 16% / 67% / 16% | 15.3 |
| 2 | 65% | 14% / 56% / 30% | 15.0 |
| 3 | 64% | 29% / 36% / 34% | 14.8 |
| 4 | 48% | 24% / 25% / 51% | 13.8 |
| 5 | 39% | 23% / 18% / 58% | 13.5 |

## 5. The Book of Remembrance (3 players)

| | Win rate | Inscriptions | Full pages | Turns |
|---|---|---|---|---|
| Book used | 64% | 4.2 | 0.08 | 14.8 |
| Book ignored | 57% | 0 | 0 | 14.9 |

Book impact: **+7 points** (target +5 to +10).

## 6. Other signals (3 players)

- **resonance rate**: 0.37
- **burns**: 1.80
- **lingers**: 5.02
- **summons**: 2.99
- **oblivion played**: 2.83
- **keepsakes**: 5.51
- **final forgotten**: 8.18
