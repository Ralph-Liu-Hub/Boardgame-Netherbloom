# Netherbloom Simulator — Balance Report

1000 games per main configuration (half that for variants). Echo-following AI players. Run time 103 s.

## 1. Player counts (Standard Lantern, Open Crossing)

| Players | Win rate | Loss split Faded / Shattered / Deluge | Turns (mean) | Turns per Reach I/II/III | Tracks half-full (of 3) | Near-miss wins | Backlash per Reach |
|---|---|---|---|---|---|---|---|
| 1 | **58%** | 20% / 46% / 35% | 15.8 | 6.6 / 6.6 / 2.6 | 1.82 | 24% | 1.24 / 1.39 / 0.37 |
| 2 | **61%** | 17% / 58% / 24% | 15.9 | 7.3 / 6.2 / 2.4 | 1.96 | 37% | 0.53 / 0.36 / 0.08 |
| 3 | **58%** | 16% / 49% / 35% | 16.7 | 7.5 / 6.7 / 2.5 | 2.08 | 38% | 0.6 / 0.41 / 0.09 |
| 4 | **61%** | 21% / 49% / 31% | 17.2 | 7.4 / 7.0 / 2.8 | 2.08 | 35% | 0.27 / 0.26 / 0.05 |

## 2. Before and after tuning (GDD v0.4 as written)

| Players | As written: win | As written: loss split F/S/D | As written: turns | Tuned: win | Tuned: loss split | Tuned: turns |
|---|---|---|---|---|---|---|
| 1 | 48% | 82% / 18% / 0% | 11.9 | 58% | 20% / 46% / 35% | 15.8 |
| 2 | 81% | 85% / 15% / 0% | 11.3 | 61% | 17% / 58% / 24% | 15.9 |
| 3 | 69% | 85% / 15% / 0% | 12.7 | 58% | 16% / 49% / 35% | 16.7 |
| 4 | 53% | 75% / 25% / 0% | 14.1 | 61% | 21% / 49% / 31% | 17.2 |

## 3. Souls (3 players, Standard Lantern)

| Soul | Win rate | Loss split F/S/D | Turns | Endings reached (among wins) |
|---|---|---|---|---|
| king | 45% | 37% / 36% / 27% | 16.5 | inscribed/low 28%, inscribed/high 27%, unspoken/high 14%, unspoken/low 13%, forgotten/high 11%, forgotten/low 8% |
| garland | 51% | 31% / 46% / 23% | 16.6 | inscribed/high 28%, inscribed/low 26%, forgotten/high 14%, unspoken/low 13%, unspoken/high 12%, forgotten/low 6% |
| bride | 37% | 31% / 32% / 36% | 18.7 | inscribed/high 29%, unspoken/high 22%, inscribed/low 20%, unspoken/low 18%, forgotten/high 8%, forgotten/low 3% |
| child | 81% | 34% / 44% / 22% | 15.2 | unspoken/low 24%, inscribed/low 23%, unspoken/high 22%, inscribed/high 21%, forgotten/high 7%, forgotten/low 3% |

Same Souls at the **Gentle Lantern**: king 60%, garland 69%, bride 52%


## 4. Lantern difficulty (3 players)

| Lantern | Win rate | Loss split F/S/D | Turns |
|---|---|---|---|
| Gentle | 68% | 9% / 66% / 26% | 16.4 |
| Standard | 59% | 16% / 46% / 38% | 16.7 |
| Hard | 38% | 10% / 21% / 70% | 14.4 |
| Heroic | 23% | 5% / 13% / 82% | 12.5 |

## 5. The Book of Remembrance (3 players)

| | Win rate | Inscriptions | Full pages | Turns |
|---|---|---|---|---|
| Book used | 58% | 4.1 | 0.09 | 16.7 |
| Book ignored | 54% | 0 | 0 | 17.1 |

Book impact: **+4 points** (target +5 to +10).

## 6. Other signals (3 players)

- **resonance rate**: 0.33
- **burns**: 1.92
- **lingers**: 6.99
- **summons**: 2.99
- **oblivion played**: 3.17
- **keepsakes**: 5.52
- **final forgotten**: 7.01
