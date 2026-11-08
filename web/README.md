English | [正體中文](README.zh-TW.md)

# Netherbloom web table

A **manual virtual table** for Netherbloom V5, for publisher previews, hosted on Vercel. It works like a physical table
(or Screentop.gg): players move every card, tile and token by hand. **The page never carries out a rule.**

- **The table**: the River (15 spaces, two banks each), the Mist area, the Loom of the Fates, the three chapter pages of
  the Book of Remembrance (each soul's route graph, with memory slots, mist slots, forks and turning points), the Ledger,
  the fate mist, commissions, endings, the Mantle row and the supply. "Fit" fills the window with the boards.
- **Your own column**: the right-hand side of your screen holds your area (commission, Mantle, Push Through token,
  lasting cards) above your hand. Nobody else's hand or area is drawn; the seat buttons show only what is public (hand
  size, Mantle, Push Through spent). The board fills the rest of the window under a single top bar.
- **Play area and Box**: put a card you play in the Play area while it is read and carried out; drag anything removed
  from the game into the Box (right-click it to look through and take things back).
- **Next-step hints**: when switched on, a strip along the bottom of the board; the board makes room for it.
- **Seeing the others play**: online, you watch other players drag pieces as they do it, and every change glides from
  where it was to where it went (cards to or from a hand travel face down).
- **Moving things**: drag any card, tile or token; it snaps to the nearest space, bank, track cell or book slot. Double-click
  (or `F`) flips; `R` turns a card sideways or upright (unlit / lit). Drag from a pile to take its top card; drop on a pile to
  put a card on top (`Alt` for the bottom); `Shift`+drag moves a whole pile. Right-click for more: draw, deal one each,
  shuffle, look through, peek at a face-down card, give a card to another player, return to the box.
- **Hands**: the bar along the bottom holds your hand. Other players see only how many cards you hold.
- **Next-step hints** (a switch in the top bar): an optional panel that walks through set-up, the turn, the end of the turn,
  the page turn and the Far Shore, and lights up the boards each step touches. It only describes; it never moves anything.
  Everyone at the table shares the same step.
- **Set-up**: opening a table sorts the components as the rulebook's set-up says (decks shuffled, two harsh mists in each chapter
  deck, bank tiles face down at random, tokens in the supply). Dealing, the first flowers, the first Mist and the fates are
  the players' to do, step by step with the hints.
- **Undo / redo** (`Ctrl+Z` / `Ctrl+Y`) and a **log** of every manual action. The table is saved in the browser and can be resumed.
- **Rulebook**: the V5 rulebook (`docs/rules/zh-TW/V5/Rulebook.md`) in a searchable drawer.
- **Same screen or online**: one device passed around the table (a cover screen hides the hands between seats), or 2–4
  players on their own computers. The host's browser holds the table; others join with a five-letter code over WebRTC (PeerJS).
- **Login**: every page and asset sits behind `/login`. The account, password and cookie-signing secret are Vercel environment
  variables (`NB_USER`, `NB_PASS`, `NB_SECRET`), never source code.

```bash
cd web
npm test                                           # component data and storybook routes, login and play-log checks
npm run test:e2e                                   # browser tests (Playwright + Chromium): every soul / level / player count,
                                                   # drag and drop, piles, tracks, hints, lobby, phone, touch, pinch, online play
python3 -m http.server 8765 --directory public     # local play without login
python3 tools/build_table_data.py                  # after changing simulator/netherbloom/storybook_data.py
python3 tools/build_rules.py                       # after changing the V5 rulebook
```

## Deploying

Live at **https://netherbloom.vercel.app** (Vercel project `netherbloom`, team ralph-liu-hub). The project serves `public/`, has no install step, and needs `NB_USER`, `NB_PASS` and `NB_SECRET` set in its environment.

The table loads its ES modules directly (`public/assets/table.js`), so no bundling step is needed.

Vercel builds a preview for every pull request on this repository (root directory `web`).

| Path | What it does |
|---|---|
| `middleware.js` | Sends anyone without a valid session cookie to `/login` |
| `api/login.js`, `api/logout.js`, `api/_session.js` | Sign-in and the signed HttpOnly cookie |
| `public/assets/table.js` | The manual table: boards, pieces, piles, hands, context menu, undo, hints panel, online sync, lobby |
| `public/assets/table-data.js` | V5 components: Mist and harsh Mist, tiles, Mantles, Ghost cards, difficulty |
| `public/assets/table-story.js` | Generated from the simulator: storybook routes, fate mist, endings, commissions |
| `public/assets/table-hints.js` | The next-step hints |
| `public/assets/rules-v5.js` | Generated: the V5 rulebook |
| `public/assets/cards.js`, `zh.js` | Memory card data and Chinese names |
| `public/assets/net.js` | Online play over WebRTC |

## Languages

The table runs in Traditional Chinese or English (the button at the top right). The interface, cards, Mist, tiles and hints
follow the language; the storybooks, fate mist, endings, commissions and the V5 rulebook are in Chinese only for now.
