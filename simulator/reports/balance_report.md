# Netherbloom Simulator — Balance Report

1000 games per main configuration (half that for variants). Echo-following AI players. Run time 74 s.

## 1. Player counts (Lantern 3, Open Crossing)

| Players | Win rate | Loss split Faded / Shattered / Deluge | Turns (mean) | Turns per Reach I/II/III | Tracks half-full (of 3) | Near-miss wins | Backlash per Reach |
|---|---|---|---|---|---|---|---|
| 1 | **54%** | 30% / 32% / 38% | 14.5 | 6.7 / 5.9 / 1.9 | 1.92 | 25% | 1.28 / 1.25 / 0.23 |
| 2 | **54%** | 22% / 46% / 32% | 14.9 | 7.4 / 5.5 / 2.1 | 2.01 | 34% | 0.57 / 0.32 / 0.09 |
| 3 | **49%** | 23% / 39% / 37% | 15.6 | 7.6 / 6.0 / 2.0 | 2.12 | 39% | 0.63 / 0.41 / 0.07 |
| 4 | **48%** | 21% / 39% / 41% | 16.3 | 7.7 / 6.5 / 2.1 | 2.13 | 41% | 0.33 / 0.23 / 0.06 |

## 2. Before and after tuning (GDD v0.4 as written)

| Players | As written: win | As written: loss split F/S/D | As written: turns | Tuned: win | Tuned: loss split | Tuned: turns |
|---|---|---|---|---|---|---|
| 1 | 45% | 88% / 12% / 0% | 10.3 | 54% | 30% / 32% / 38% | 14.5 |
| 2 | 76% | 87% / 13% / 0% | 10.6 | 54% | 22% / 46% / 32% | 14.9 |
| 3 | 66% | 82% / 18% / 0% | 11.8 | 49% | 23% / 39% / 37% | 15.6 |
| 4 | 47% | 76% / 24% / 0% | 13.0 | 48% | 21% / 39% / 41% | 16.3 |

## 3. Souls (3 players, Lantern 3)

| Soul | Win rate | Loss split F/S/D | Turns | Endings reached (among wins) |
|---|---|---|---|---|
| king | 41% | 25% / 37% / 39% | 15.8 | inscribed/high 34%, inscribed/low 18%, forgotten/high 17%, unspoken/high 14%, unspoken/low 11%, forgotten/low 5% |
| garland | 44% | 24% / 43% / 33% | 15.8 | inscribed/high 32%, inscribed/low 18%, unspoken/low 15%, unspoken/high 15%, forgotten/high 12%, forgotten/low 7% |
| bride | 33% | 18% / 36% / 46% | 17.5 | unspoken/high 33%, inscribed/high 32%, unspoken/low 11%, inscribed/low 10%, forgotten/high 10%, forgotten/low 3% |
| child | 60% | 36% / 30% / 34% | 15.5 | inscribed/high 26%, unspoken/low 24%, unspoken/high 22%, inscribed/low 19%, forgotten/high 7%, forgotten/low 2% |

Same Souls at **Lantern 2**: king 46%, garland 58%, bride 41%


## 4. Lantern difficulty (3 players)

| Lantern | Win rate | Loss split F/S/D | Turns |
|---|---|---|---|
| 1 | 61% | 15% / 68% / 17% | 16.1 |
| 2 | 54% | 19% / 49% / 32% | 15.8 |
| 3 | 51% | 23% / 38% / 39% | 15.4 |
| 4 | 37% | 16% / 31% / 53% | 14.4 |
| 5 | 31% | 21% / 20% / 59% | 13.9 |

## 5. The Book of Remembrance (3 players)

| | Win rate | Inscriptions | Full pages | Turns |
|---|---|---|---|---|
| Book used | 49% | 4.2 | 0.12 | 15.6 |
| Book ignored | 43% | 0 | 0 | 15.5 |

Book impact: **+6 points** (target +5 to +10).

## 6. Other signals (3 players)

- **resonance rate**: 0.36
- **burns**: 1.91
- **lingers**: 6.23
- **summons**: 2.99
- **oblivion played**: 3.17
- **keepsakes**: 5.48
- **final forgotten**: 8.25
