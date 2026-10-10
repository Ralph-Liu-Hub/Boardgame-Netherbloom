# NETHERBLOOM — Game Design Document v0.1

Status: first rules-complete draft, **untested**. Every number below is a starting value for playtesting, not a balanced value.

Changes from v0.0 are driven by the four design principles: engagement/clarity/balance, one core experience, simple rules with deep choices, and meaningful agency with no luck-decided outcomes and no player elimination.

---

## 1. Core Hook

> **In silence, grow a path of light ahead of a soul who is forgetting who they are. Every flower you plant pulls them forward; every memory they lose makes them faster, lighter, and harder to save.**

Experience pillars (every rule must serve at least one):

1. **Escort under pressure** — the soul moves only when you light the way; standing still costs them memories.
2. **Silent momentum** — you cannot talk; the only language is the karma you leave on the Three-Lives Stone for the next player.
3. **Forgetting is the weapon and the wound** — the soul's memories are your hand, your health, your score and your story, all at once.

Positioning: **medium-weight silent co-op**, 2–5 players, 45–60 minutes, ages 12+, one-shot sessions, retail target.

---

## 2. World and Theme (rationalized)

**One afterlife, one spine.** The base game is set in the East Asian (Chinese folk-Buddhist) underworld. Greek names are removed from components.

| v0.0 | v0.1 | Why |
|---|---|---|
| Styx Board | **The Wangchuan** (River of Forgetting) board | Wangchuan (忘川) is the Eastern river of forgetting — it already does Lethe's job. |
| River Lethe current | The Wangchuan | Same reason. |
| Causal Fate Track | **The Three-Lives Stone** (三生石) | In popular lore this stone on the Wangchuan bank records a soul's past, present and future lives — a natural karma ledger. |
| Bridge of Naihe | Naihe Bridge (奈何桥), where Meng Po (孟婆) serves the soup of forgetting | Gives the game its ending scene. |
| Void demons | **Grievances** | The wronged dead (冤魂) are held back by resentment; the monsters are the soul's own grievances. This ties enemies to the Obsession tag. |

**How the West is invited in (a single line of lore, not a mechanic):** *"Every people has named the river of forgetting — the Greeks called it Lethe. This is the same water, seen from the eastern shore."* This keeps the door open for the Greek/Western expansion without diluting the base game.

**Why a soul needs flowers (Q16):** the red spider lily is 彼岸花, *the flower of the other shore*. Its light is the only thing in the fog that shows a soul where the far shore is. A soul follows the light; without it, the soul sits down by the road and begins to forget.

**The players — the Ferrymen (Weavers of the Road):** rogue guides, belonging neither to Heaven nor to the Ten Courts. They cannot speak in the underworld; they can only plant light and leave karma.

---

## 3. Components (retail-lean)

- **River board**: 12 river spaces from the Shore of Waking (space 0) to Naihe Bridge (space 12), split into three Reaches (I: 1–4, II: 5–8, III: 9–11). Each space 1–11 has an **upper bank slot** and a **lower bank slot** (22 bank slots).
- **Three-Lives Stone** board: three karma columns (Obsession, Acceptance, Oblivion), 5 slots each, plus the **Echo** slot.
- **Forgotten track**: 0–18, with thresholds at 6 (*Light as Ash*) and 12 (*Adrift*). 18 = the game is lost.
- **Soul pawn** (one wooden or cardboard standee; deluxe upgrades are a publisher decision).
- **24 Netherbloom tokens**, double-sided: **Root** side (dark, rooted bulb) / **Bloom** side (lit lily).
- **22 Mist tiles** (fog backs), split by Reach.
- **Memory deck**: 40 cards (16 Obsession, 14 Acceptance, 10 Oblivion).
- **Mist decks**: three decks of 10 cards (Reach I, II, III).
- **4 Mantle cards**, 1 Echo marker, 15 karma tokens, 12 Light tokens, 6 Grievance standees, 6 Black Water tokens.
- **Keepsake cards** (story beats) and **Ending cards** for the scenario.

Decay dice are removed (see section 8).

---

## 4. Setup

1. Place the Soul on space 0. Place a Bloom on both bank slots of space 1.
2. Shuffle each Reach's Mist tiles and cover the remaining bank slots of that Reach, face down.
3. Shuffle the Memory deck. Hand size: **2p: 5 · 3p: 4 · 4–5p: 3**. Deal hands.
4. Shuffle the Reach I Mist deck; set Reach II and III aside.
5. Forgotten track at 0. Stone empty. Light pool empty. Mantles to the side.

---

## 5. The Rules of Silence

From setup until the soul reaches the bridge or the game is lost, players may not talk about the game, show cards, point, or gesture. Hands are hidden. The board and the Stone are the only shared language.

*Tuning dial (optional, for families):* each player gets one **Whisper** token per game — spend it to say one sentence.

---

## 6. Turn Structure

Play goes clockwise. There are **no rounds** — the game is measured in turns, so pressure per action is the same at every player count.

On your turn:

1. **Read the Stone** — look at the Echo and the three columns.
2. **Play 2 cards** (one at a time). For each card choose:
   - **Face up**: resolve its effect, place 1 karma token in its tag's column, and move the Echo marker to its tag.
   - **Face down**: resolve the basic action **Root 1**. No karma, the Echo does not move.
   - **Burn it** (Memory Burn): resolve its effect **twice**, place karma, move the Echo, then put the card on the Forgotten track instead of the discard pile.
3. **Soul Step** (section 7).
4. **The Mist** — reveal 1 card from the current Reach's Mist deck and resolve it.
5. **Draw** back up to hand size. When the draw pile runs out, shuffle the discard pile.

Free action, once per turn: **Summon a Mantle** (section 11).

---

## 7. The Soul Step — progression without a timer (Q2)

At step 3 of every turn, the soul tries to move **1 space** forward.

- It moves if the next space is **Lit** (a Bloom on at least one of its bank slots) and not **Flooded**.
- When the soul leaves a space, every token beside the space it left is removed. Each Bloom removed adds **1 Light** to the shared pool. *(The road behind you is gone; its light goes with the soul.)*
- If the soul cannot move, it **Lingers**: put the top card of the draw pile on the Forgotten track. *(A memory the soul never got to tell.)*
- If a Grievance is on a bank slot beside the soul after the step: forget 1 more.

Why this drives the game forward without a round counter:
- **Standing still always costs memories**, so players feel constant pull to light the next space.
- **Progress pays**: passing Blooms gives Light (Mantles); new Reaches reveal Keepsakes and clear the Stone.
- **Break-even math**: one Root plus one Bloom lights one space — exactly the soul's speed. With no hazards, a turn holds pace. Every hazard puts you behind, so combos, Resonance, and Mantles are how you get ahead. Game length is set by how well you play, not by a counter. Target: 18–26 turns.

**Reach transition**: when the soul enters a new Reach, clear the Stone's columns, switch to that Reach's Mist deck, and read that Reach's chapter card.

---

## 8. Netherblooms and Roots (replaces Decay Dice — Q8, Q9)

- **Network**: a new Root must go on a bank slot adjacent to an existing Root or Bloom — along the same bank, or straight across the river at the same space. The banks beside the soul always count as part of the network, so the team can never be soft-locked.
- **Root**: place a token Root-side up. If the slot is fogged, reveal the Mist tile first:
  - **Fertile** — the Root is placed.
  - **Stony** — only an Obsession card's Root effect can enter. Other Root effects stop here.
  - **Memory Site** — the Root is placed; draw a Keepsake card.
  - **Grave** — no Root; a Grievance rises on this slot instead.
- **Bloom**: flip a Root in the network to its Bloom side.

**Why no decay dice:** turning every die on the board each round is upkeep with no decision in it. Decay now happens only where something happens: the soul passing a flower (it spends its light), Black Water, Grievances, and *Withering* Mist cards. One double-sided token replaces a sculpt plus a die.

---

## 9. Threats (Q3)

All Mist placements are relative to the soul and fixed by the card, so players can always plan their response.

| Threat | Effect | Fast, costly answer | Slow, clever answer |
|---|---|---|---|
| **Black Water** (on a river space) | Flooded: the soul cannot enter. When placed, flip Blooms on both banks to Roots. | An Oblivion card drains it. | **Roots drink the flood**: if both bank slots of that space hold Roots or Blooms, it drains at the end of any turn. |
| **Grievance** (on a bank slot) | Blocks that slot. Feeds on the soul when beside it (forget 1 per Soul Step). | An Oblivion card banishes it. | **Trapped in light**: if the slots before and after it on the same bank are both Blooms, it dissolves at the end of any turn. |
| **Withering** | Flip the 2 Blooms furthest ahead to Roots. | — | Re-bloom them. |
| **Fog Returns** | Flip a revealed empty tile back to fog. | — | Re-root it. |

Each Reach's Mist deck grows harsher (Reach III has more Black Water and double Grievances). Escalation is driven by **progress**, not by time.

---

## 10. The Three-Lives Stone — Causal Resonance redesigned (Q4–Q6)

**Replaces** the hidden face-down track and the "exactly N cards in hand" shackle. Those made Player B's punishment depend on cards that Player A could not see — luck, not decision.

**The new idea:** every card you play leaves karma that is **public**. Your choice of *which emotion to act on* shapes the next player's turn. That is the silent language.

1. **Echo**: playing a face-up card moves the Echo marker to that card's tag.
2. **Resonance**: if the **first** card you play on your turn matches the Echo left by the previous player, you also gain that card's printed **Resonance** bonus. (Only the first card — you must answer your teammate, not yourself.)
3. **Karma**: each face-up card puts 1 token in its tag's column. When a column's **5th** token is placed, resolve that emotion's **Backlash**, then empty the column.

| Column | Backlash | Thematic logic |
|---|---|---|
| **Obsession** — *Grasping* | A Grievance rises on the nearest empty bank slot beside or ahead of the soul. | Clinging breeds ghosts. |
| **Acceptance** — *Resignation* | The soul does not move on the next Soul Step (no Linger penalty). | Too much letting go and the soul sits down. |
| **Oblivion** — *The Forgetting* | Forget 2. | Using forgetting as a weapon has a price. |

**What Player A is deciding (Q4):** A's main question is always "what wins?" (where to root, what to bloom, what to banish). The Stone adds a second layer that A can fully see: *"If I act on Obsession, B gets an Obsession Echo but the Obsession column is one step from Grasping."* Every action has a visible, predictable consequence. Nothing depends on hidden hands.

**Why it is engaging for Player B (Q6):** B opens the turn with a puzzle that a teammate built: follow the Echo for power and push the column toward Backlash, or break the pattern safely. Chains of Resonance across three or four players, done without a word, are the game's signature moment. Face-down play is also a signal: it means *"I am leaving the Echo for you."*

---

## 11. Mantles — earned roles (Q7, Q13)

Drafted role tokens are removed. Roles are **summoned with resources the whole team earned**.

**Summon** (free, once per turn): spend **3 Light** from the shared pool and discard 1 card of the Mantle's tag. Take the Mantle from the supply or from another player. You keep it until someone else summons it.

| Mantle | Tag | Power |
|---|---|---|
| **Root Weaver** | Obsession | Your Root effects may enter Stony ground. Your first Root effect each turn gets +1 Root. |
| **Spirit Warden** | Obsession | Once between each of your turns, on any Soul Step: hold the soul in place without Lingering, or cancel a forced second step (see section 12). |
| **Bloom Bringer** | Acceptance | Once per turn: Bloom 1 for free. |
| **Tide Breaker** | Oblivion | Once per turn, an Oblivion card you play goes to the discard pile instead of being forgotten. |

Taking a Mantle from a teammate is itself a silent message.

---

## 12. Memory Burn and the Quickening (Q10)

Every card on the Forgotten track is a memory the soul has lost. Cards reach it in four ways:

1. **By choice** — Burn a card on your turn for a double effect.
2. **By weapon** — every Oblivion card is forgotten when played (Q14: *the strongest effects in the game; the soul must forget a grief to destroy it*).
3. **By consequence** — Lingering, Grievances feeding, the Oblivion Backlash.
4. **By event** — Mist cards.

**The Quickening** — a soul that forgets grows lighter and drifts faster:

- **6+ forgotten — *Light as Ash*:** on the Soul Step, the soul moves **up to 2** Lit spaces. *(A reward that feels tempting.)*
- **12+ forgotten — *Adrift*:** the soul **must** try to move 2. If the second space is not Lit or is Flooded, it drifts there anyway and is **Exposed**: forget 2.
- **18 forgotten:** the soul forgets who they are. **The team loses.**

This is the devil's bargain at the heart of the game: forgetting speeds you to the bridge but empties the soul you are saving. The Spirit Warden is the brake.

---

## 13. Card Anatomy (Q20)

Each Memory card has:
- **Tag icon** (shape plus colour; see section 16), top left and mirrored bottom right.
- **Effect** (one line, icon-first).
- **Resonance bonus** (one line).
- **Memory fragment**: one sentence of the soul's life (flavour; story delivery).

Example cards:

| Tag | Effect | Resonance | Fragment |
|---|---|---|---|
| Obsession | Root 2 | +1 Root | *"I held the north gate for nine days."* |
| Obsession | Hold: the soul does not Linger this turn | Also Root 1 | *"I swore I would not die before they knew the truth."* |
| Acceptance | Bloom 1, then Root 1 | Bloom 1 more | *"My mother's hands smelled of millet."* |
| Acceptance | Release: remove 2 karma from any one column | Remove 3 | *"The plum tree I planted will outlive the court."* |
| Oblivion (forgotten) | Banish a Grievance or drain a Black Water | Do both | *"…I no longer remember the traitor's face."* |
| Oblivion (forgotten) | Clear all fog in one Reach | +2 Light | *"Whose banner was it?"* |

Rule length target: 8 pages including examples.

---

## 14. Endgame (Q11)

**One way to lose:** 18 cards on the Forgotten track. *Black Deluge* and *Soul Shattered* are removed as separate conditions; flooding and exposure now cost memories, which feed the same track. *Essence Evaporated* is covered by the same track.

**Win:** the soul steps onto Naihe Bridge (space 12). Then read the ending by the number of forgotten memories, with an epilogue line for each Keepsake held:

| Forgotten | Ending |
|---|---|
| 0–5 | **Remembered** — the General lays down their grievance and drinks Meng Po's soup in peace. |
| 6–11 | **Unburdened** — they cross, but some names are lost forever. |
| 12–17 | **Hollow Crossing** — they cross as a stranger to themself; their Grievance stays on the road. |

Winning has degrees, which gives a reason to replay a scenario you have already won.

---

## 15. Scenario 1 Story Arc — *The Wronged General* (Q17)

**General Yan Shuo** (original character), executed for treason they did not commit, wakes on the Yellow Springs Road clutching a broken spear and refusing to move on.

- **Reach I — The Yellow Springs Road (黄泉路): *Grievance.*** The General's Memory fragments are all rage and proof of innocence. The Grievances are the faces of the court officials who signed the warrant. Mist deck: heavy on Grievances. Theme: Obsession.
- **Reach II — The Three-Lives Stone: *Truth.*** Memory Sites reveal the turn. The charge was false, but the guilt is real: to save the army, the General ordered the city gate shut, leaving refugees outside. The Grievances begin wearing *those* faces. Mist deck: Withering and Fog. Theme: what the General has been holding on to is not the betrayal.
- **Reach III — The Banks of the Wangchuan: *Letting Go.*** The river of forgetting rises (heavy Black Water). Every Oblivion card here forgets something the players have read. Theme: Acceptance — which memories are worth carrying across?
- **Finale — Naihe Bridge.** Meng Po waits. The ending card depends on what the soul still remembers.

**Story delivery:** card fragments as played (ambient), Keepsakes at Memory Sites (beats), a chapter card per Reach (structure), and an ending card (payoff). This adds no extra rules.

**Sequel hook:** on a *Hollow Crossing*, the General's unresolved Grievance can become the boss threat of Scenario 2. This is optional and not a campaign.

---

## 16. Visual Language (Q19, Q20)

Art direction is unchanged in spirit: gothic ink-wash noir, about 70% desaturated, with luminous spider-lily red as the hero colour. The second accent changes from **jade green to spectral cyan**, because red and green are the classic colour-blind failure pair.

Proposed palette (simulated contrast, CIELAB ΔE, higher is better; Machado 2009 at full severity):

| Pair | Normal | Protan | Deutan | Tritan |
|---|---|---|---|---|
| v0.0 crimson #B3122E / jade #3FAE7A | 108 | 38 | **29** | 118 |
| v0.1 crimson #D7263D / spectral cyan #8FD6E1 | 103 | 53 | **61** | 124 |
| crimson / bone-gold #E6D3A3 | 77 | 47 | 36 | 82 |
| crimson / ink #17161B | 84 | 36 | 62 | 98 |

Rules for artists:
- **Never colour alone.** Each tag has a distinct silhouette:
  - **Obsession** — the *Knot*: a tight, angular, thorned triple loop (sharp).
  - **Acceptance** — the *Open Lily*: six rounded petals open around an empty centre (round).
  - **Oblivion** — the *Hollow Moon*: a broken ring fading out at one end (hollow).
- Red Blooms always sit on **ink**, never mid-grey, and carry a thin **bone-gold rim**. Crimson on grey drops to ΔE 16 for protanopes.
- Grievances are drawn as **cyan-white masks** (light on dark); Black Water is **ink with a bone-gold edge**. Threats read by value and shape, not hue.
- Icons must pass a silhouette test at 8 mm, in greyscale, at arm's length.
- No emoji, clip art, or stock glyphs: all iconography is original.

---

## 17. Cultural Notes (proofread)

- **彼岸花 / higanbana / Lycoris radiata** — strongly associated with death and the autumn equinox (higan). The idea that it blooms along the road to the underworld and guides souls is a widespread *modern popular* belief, not canonical scripture. Present it in-world ("it is said…").
- **曼珠沙華 (manjusaka)** — from Buddhist sutra imagery of celestial flowers. Avoid stating it is the same flower as in the sutra.
- **Naihe Bridge, Meng Po's soup, Wangchuan, Sansheng Stone, Huangquan Road, the Ten Courts** — all from Chinese folk religion. They are combined freely in popular fiction, which is acceptable here.
- **冤魂 (wronged ghosts)** — souls held back by injustice. This is a well-grounded basis for the General.
- **Expansions (later):**
  - Korean *sangsahwa* (상사화) is usually *Lycoris squamigera*, whose leaves and flowers never appear together. That is the real symbol of lovers who never meet — use it.
  - Japanese use of higanbana around paddies and graves to deter animals (toxic lycorine) is accurate.
  - "Hurricane lily" is a real US Southern folk name.
  - The genus *Lycoris* is commonly said to be named after a Nereid, but "calming violent tides" is an invention. Label it as fiction.
- Recommendation: before publisher submission, have a native-speaking reader review the Chinese terms and the General's story.

---

## 18. Differentiation (Q22)

| Game | What it shares | What Netherbloom does differently |
|---|---|---|
| Hanabi / The Mind / The Crew | Limited communication | The channel is a **public object you shape** (the Stone), not hints about hidden information. |
| Sky Team | Silent co-op, retail hit | Spatial network building plus an escort, not dice placement. |
| Mysterium | Silent co-op about the dead | No asymmetric clue-giver; everyone acts on the same board. |
| Forbidden Island / Pandemic | Shared threat deck, shoring up | **The path behind you disappears.** You build ahead of a moving charge. |
| Spiritfarer (video game) | Guiding souls to the afterlife | A board-game equivalent of that emotional payoff, with degrees of ending. |

**One-line pitch for publishers:** *"A silent co-op where the soul's memories are your cards, your health and your score — and forgetting them is the only way to go faster."*

I don't know of a mainstream co-op whose damage track is also its story and its scoring. Verify with a BGG search before pitching.

---

## 19. Out of Scope Until Playtested

- Expansions (Chapter 7 of v0.0): parked.
- Components and price: revisit after rules are stable. Retail implies a target of about USD 40–50 MSRP: no resin, no glow-in-the-dark, cardboard and wood.
- Solo mode: publishers will ask for one. The idea is to play two hands with the silence rule waived.

## 20. Playtest Questions for v0.1

1. Does break-even (1 Root + 1 Bloom = 1 space) feel tense or grindy? Adjust with hand size or Mist frequency.
2. Do columns of 5 trigger Backlash about once per Reach? (Target: 1–2 per Reach.)
3. Is *Light as Ash* at 6 tempting enough that players burn on purpose?
4. Does the Echo get used as a language by the second game?
5. At 5 players, do turns feel too far apart? (Possible fix: 1 card per turn at 4–5p.)
