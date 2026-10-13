# Netherbloom Simulator — Balance Report

1000 games per main configuration (half that for variants). Echo-following AI players. Run time 92 s.

## 1. Player counts (Lantern 3, Open Crossing)

| Players | Win rate | Loss split Faded / Shattered / Deluge | Turns (mean) | Turns per Reach I/II/III | Tracks half-full (of 3) | Near-miss wins | Backlash per Reach |
|---|---|---|---|---|---|---|---|
| 1 | **62%** | 31% / 31% / 38% | 14.2 | 6.4 / 5.7 / 2.1 | 1.86 | 27% | 1.15 / 1.13 / 0.23 |
| 2 | **65%** | 23% / 45% / 32% | 14.4 | 6.9 / 5.3 / 2.2 | 1.97 | 40% | 0.52 / 0.33 / 0.07 |
| 3 | **63%** | 26% / 39% / 35% | 14.8 | 7.1 / 5.6 / 2.1 | 2.03 | 42% | 0.55 / 0.35 / 0.05 |
| 4 | **64%** | 27% / 35% / 37% | 15.3 | 7.0 / 6.0 / 2.4 | 2.03 | 39% | 0.24 / 0.21 / 0.04 |

## 2. Before and after tuning (GDD v0.4 as written)

| Players | As written: win | As written: loss split F/S/D | As written: turns | Tuned: win | Tuned: loss split | Tuned: turns |
|---|---|---|---|---|---|---|
| 1 | 52% | 90% / 10% / 0% | 10.3 | 62% | 31% / 31% / 38% | 14.2 |
| 2 | 80% | 76% / 24% / 0% | 10.4 | 65% | 23% / 45% / 32% | 14.4 |
| 3 | 71% | 81% / 19% / 0% | 11.6 | 63% | 26% / 39% / 35% | 14.8 |
| 4 | 58% | 70% / 30% / 0% | 12.8 | 64% | 27% / 35% / 37% | 15.3 |

## 3. Souls (3 players, Lantern 3)

| Soul | Win rate | Loss split F/S/D | Turns | Endings reached (among wins) |
|---|---|---|---|---|
| king | 49% | 28% / 39% / 33% | 15.1 | inscribed/high 28%, inscribed/low 24%, forgotten/high 18%, unspoken/high 17%, unspoken/low 8%, forgotten/low 5% |
| garland | 57% | 23% / 36% / 41% | 15.0 | inscribed/high 35%, inscribed/low 21%, forgotten/high 14%, unspoken/low 13%, unspoken/high 13%, forgotten/low 6% |
| bride | 42% | 19% / 44% / 37% | 16.4 | inscribed/high 32%, unspoken/high 27%, forgotten/high 14%, inscribed/low 12%, unspoken/low 11%, forgotten/low 4% |
| child | 73% | 51% / 20% / 29% | 14.8 | unspoken/low 24%, unspoken/high 23%, inscribed/low 23%, inscribed/high 21%, forgotten/high 6%, forgotten/low 4% |

Same Souls at **Lantern 2**: king 56%, garland 68%, bride 49%


## 4. Lantern difficulty (3 players)

| Lantern | Win rate | Loss split F/S/D | Turns |
|---|---|---|---|
| 1 | 71% | 16% / 67% / 16% | 15.3 |
| 2 | 65% | 14% / 56% / 30% | 15.0 |
| 3 | 62% | 27% / 40% / 34% | 14.7 |
| 4 | 47% | 23% / 27% / 50% | 13.8 |
| 5 | 37% | 22% / 21% / 57% | 13.4 |

## 5. The Book of Remembrance (3 players)

| | Win rate | Inscriptions | Full pages | Turns |
|---|---|---|---|---|
| Book used | 63% | 4.2 | 0.08 | 14.8 |
| Book ignored | 56% | 0 | 0 | 14.9 |

Book impact: **+6 points** (target +5 to +10).

## 6. Other signals (3 players)

- **resonance rate**: 0.37
- **burns**: 1.80
- **lingers**: 5.06
- **summons**: 2.99
- **oblivion played**: 2.83
- **keepsakes**: 5.50
- **final forgotten**: 8.14
