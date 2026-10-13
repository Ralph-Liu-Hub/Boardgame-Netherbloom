# Netherbloom Simulator — Balance Report

1000 games per main configuration (half that for variants). Echo-following AI players. Run time 96 s.

## 1. Player counts (Lantern 3, Open Crossing)

| Players | Win rate | Loss split Faded / Shattered / Deluge | Turns (mean) | Turns per Reach I/II/III | Tracks half-full (of 3) | Near-miss wins | Backlash per Reach |
|---|---|---|---|---|---|---|---|
| 1 | **56%** | 41% / 22% / 38% | 14.0 | 6.4 / 5.5 / 2.0 | 1.84 | 31% | 1.22 / 1.07 / 0.23 |
| 2 | **55%** | 32% / 40% / 28% | 14.2 | 7.0 / 5.1 / 2.1 | 1.95 | 39% | 0.54 / 0.3 / 0.07 |
| 3 | **54%** | 31% / 36% / 33% | 14.6 | 7.1 / 5.5 / 2.0 | 2.0 | 47% | 0.59 / 0.37 / 0.05 |
| 4 | **55%** | 33% / 33% / 33% | 15.1 | 7.1 / 5.8 / 2.3 | 1.99 | 43% | 0.26 / 0.19 / 0.03 |

## 2. Before and after tuning (GDD v0.4 as written)

| Players | As written: win | As written: loss split F/S/D | As written: turns | Tuned: win | Tuned: loss split | Tuned: turns |
|---|---|---|---|---|---|---|
| 1 | 40% | 91% / 9% / 0% | 10.0 | 56% | 41% / 22% / 38% | 14.0 |
| 2 | 78% | 88% / 12% / 0% | 10.3 | 55% | 32% / 40% / 28% | 14.2 |
| 3 | 64% | 83% / 17% / 0% | 11.4 | 54% | 31% / 36% / 33% | 14.6 |
| 4 | 47% | 82% / 18% / 0% | 12.4 | 55% | 33% / 33% / 33% | 15.1 |

## 3. Souls (3 players, Lantern 3)

| Soul | Win rate | Loss split F/S/D | Turns | Endings reached (among wins) |
|---|---|---|---|---|
| king | 45% | 36% / 36% / 28% | 14.8 | inscribed/high 30%, inscribed/low 23%, unspoken/high 14%, forgotten/high 13%, unspoken/low 11%, forgotten/low 9% |
| garland | 49% | 27% / 43% / 30% | 15.1 | inscribed/high 31%, inscribed/low 24%, unspoken/low 14%, forgotten/high 13%, unspoken/high 11%, forgotten/low 7% |
| bride | 36% | 28% / 35% / 37% | 16.1 | unspoken/high 28%, inscribed/high 25%, inscribed/low 18%, unspoken/low 16%, forgotten/high 9%, forgotten/low 3% |
| child | 73% | 51% / 20% / 29% | 14.8 | unspoken/low 24%, unspoken/high 23%, inscribed/low 23%, inscribed/high 21%, forgotten/high 6%, forgotten/low 4% |

Same Souls at **Lantern 2**: king 56%, garland 68%, bride 49%


## 4. Lantern difficulty (3 players)

| Lantern | Win rate | Loss split F/S/D | Turns |
|---|---|---|---|
| 1 | 71% | 16% / 67% / 16% | 15.3 |
| 2 | 65% | 14% / 56% / 30% | 15.0 |
| 3 | 55% | 32% / 34% / 34% | 14.7 |
| 4 | 47% | 23% / 27% / 50% | 13.8 |
| 5 | 37% | 22% / 21% / 57% | 13.4 |

## 5. The Book of Remembrance (3 players)

| | Win rate | Inscriptions | Full pages | Turns |
|---|---|---|---|---|
| Book used | 54% | 4.1 | 0.07 | 14.6 |
| Book ignored | 49% | 0 | 0 | 14.6 |

Book impact: **+5 points** (target +5 to +10).

## 6. Other signals (3 players)

- **resonance rate**: 0.37
- **burns**: 1.60
- **lingers**: 5.10
- **summons**: 2.99
- **oblivion played**: 2.63
- **keepsakes**: 5.48
- **final forgotten**: 7.88
