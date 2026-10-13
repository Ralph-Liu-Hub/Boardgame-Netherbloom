# Netherbloom Simulator — Balance Report

1000 games per main configuration (half that for variants). Echo-following AI players. Run time 79 s.

## 1. Player counts (Standard Lantern, Open Crossing)

| Players | Win rate | Loss split Faded / Shattered / Deluge | Turns (mean) | Turns per Reach I/II/III | Tracks half-full (of 3) | Near-miss wins | Backlash per Reach |
|---|---|---|---|---|---|---|---|
| 1 | **56%** | 53% / 26% / 21% | 14.6 | 6.5 / 6.0 / 2.1 | 1.9 | 27% | 1.25 / 1.21 / 0.25 |
| 2 | **55%** | 42% / 42% / 16% | 15.2 | 7.2 / 5.9 / 2.0 | 2.03 | 36% | 0.54 / 0.35 / 0.06 |
| 3 | **54%** | 36% / 41% / 22% | 15.9 | 7.5 / 6.4 / 2.0 | 2.12 | 41% | 0.6 / 0.42 / 0.05 |
| 4 | **56%** | 43% / 36% / 21% | 16.3 | 7.4 / 6.7 / 2.3 | 2.08 | 34% | 0.27 / 0.24 / 0.03 |

## 2. Before and after tuning (GDD v0.4 as written)

| Players | As written: win | As written: loss split F/S/D | As written: turns | Tuned: win | Tuned: loss split | Tuned: turns |
|---|---|---|---|---|---|---|
| 1 | 39% | 90% / 10% / 0% | 10.0 | 56% | 53% / 26% / 21% | 14.6 |
| 2 | 74% | 94% / 6% / 0% | 10.3 | 55% | 42% / 42% / 16% | 15.2 |
| 3 | 59% | 86% / 14% / 0% | 11.5 | 54% | 36% / 41% / 22% | 15.9 |
| 4 | 44% | 81% / 19% / 0% | 12.5 | 56% | 43% / 36% / 21% | 16.3 |

## 3. Souls (3 players, Standard Lantern)

| Soul | Win rate | Loss split F/S/D | Turns | Endings reached (among wins) |
|---|---|---|---|---|
| king | 44% | 42% / 35% / 24% | 16.1 | inscribed/high 50%, unspoken/high 25%, forgotten/high 20%, inscribed/low 4%, unspoken/low 1% |
| garland | 52% | 32% / 46% / 22% | 16.4 | inscribed/high 51%, unspoken/high 26%, forgotten/high 20%, inscribed/low 3%, unspoken/low 0% |
| bride | 35% | 34% / 35% / 31% | 18.2 | inscribed/high 45%, unspoken/high 41%, forgotten/high 12%, unspoken/low 1%, inscribed/low 1% |
| child | 77% | 54% / 28% / 17% | 15.0 | inscribed/high 40%, unspoken/high 40%, forgotten/high 11%, unspoken/low 5%, inscribed/low 4% |

Same Souls at the **Gentle Lantern**: king 60%, garland 69%, bride 52%


## 4. Lantern difficulty (3 players)

| Lantern | Win rate | Loss split F/S/D | Turns |
|---|---|---|---|
| Gentle | 67% | 17% / 65% / 18% | 15.7 |
| Standard | 55% | 40% / 38% / 22% | 15.9 |
| Hard | 35% | 24% / 16% / 60% | 14.0 |
| Heroic | 19% | 15% / 11% / 75% | 12.1 |

## 5. The Book of Remembrance (3 players)

| | Win rate | Inscriptions | Full pages | Turns |
|---|---|---|---|---|
| Book used | 54% | 4.2 | 0.09 | 15.9 |
| Book ignored | 47% | 0 | 0 | 16.1 |

Book impact: **+7 points** (target +5 to +10).

## 6. Other signals (3 players)

- **resonance rate**: 0.35
- **burns**: 1.71
- **lingers**: 6.50
- **summons**: 2.99
- **oblivion played**: 2.85
- **keepsakes**: 5.50
- **final forgotten**: 8.26
