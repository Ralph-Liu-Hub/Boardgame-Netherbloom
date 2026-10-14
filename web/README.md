English | [正體中文](README.zh-TW.md)

# Netherbloom web table

A playable browser version of Netherbloom for publisher previews, hosted on Vercel.

- **Solo**: one player with the Ghost.
- **Same Screen**: 2–4 players in one window. A cover screen keeps hands hidden while the device is passed.
- **Online**: 2–4 players, each on their own computer. The host's browser holds the game and other players join with a five-letter code. Browsers connect directly to each other over WebRTC (PeerJS), so no game data is stored on a server.
- **Login**: every page and asset sits behind `/login`. The account, password and cookie-signing secret are Vercel environment variables (`NB_USER`, `NB_PASS`, `NB_SECRET`), never source code.
- **Help while playing**: a *Player Aid* and a searchable *Rulebook* slide in from the side. A turn guide beside the board lights up the current step and follows the Soul Step and the Mist as they play out.
- **Book of Remembrance**: click the Book on the table to open the illustrated two-page edition, with chapter pages, wax-seal blessings and an epilogue at the end of the game.
- **Music**: synthesised live with the Web Audio API: a drone, the river and wind in the reeds, with one public-domain lullaby at a time played softly on a felt piano. Each Soul has the lullaby of the land its story comes from: Brahms' Lullaby for the game and the Nameless Soul, *Schlaf, Kindlein, schlaf* for the Child, *Can Ye Sew Cushions* for the Garland Girl, *All Through the Night* for the King and the Greek ballad *The Death-Bride* for the Bride. Nothing is sampled, so there is no licence to clear.

The rules engine `public/assets/engine.js` is a port of `simulator/netherbloom/engine.py`, using the tuned defaults from the balance report. Keep the two in step.

```bash
cd web
npm test                                           # engine fuzz (400 games) + login/middleware checks
python3 -m http.server 8765 --directory public     # local play without login
```

## Deploying

Live at **https://netherbloom.vercel.app** (Vercel project `netherbloom`, team ralph-liu-hub). The project serves `public/`, has no install step, and needs `NB_USER`, `NB_PASS` and `NB_SECRET` set in its environment.

The production upload is a minified bundle:

```bash
npx esbuild@0.23.1 public/assets/app.js --bundle --minify --format=esm --target=es2020 --outfile=dist/app.js
npx esbuild@0.23.1 public/assets/style.css --minify --outfile=dist/style.css
```

The Vercel GitHub app does not yet have access to this repository. Once it does, linking the project to the repo (root directory `web`) will deploy every push automatically.

| Path | What it does |
|---|---|
| `middleware.js` | Sends anyone without a valid session cookie to `/login` |
| `api/login.js`, `api/logout.js`, `api/_session.js` | Sign-in and the signed HttpOnly cookie |
| `public/assets/cards.js`, `engine.js` | Card data and rules |
| `public/assets/app.js` | Menus, board, hand, the turn guide, the rules drawer, animations and the three play modes |
| `public/assets/rules.js` | The searchable Rulebook and the Player Aid sheet (card and Mist tables are built from `cards.js`) |
| `public/assets/book.js` | The full illustrated Book of Remembrance, with page turns |
| `public/assets/puppet.js` | Shadow-theatre silhouettes of each Soul for the Book: jointed, sketched puppets whose gestures replay the soul's journey |
| `public/assets/replay.js` | The small journey replay on the night river under the Book |
| `public/assets/i18n.js` | Language switching (English / 正體中文) and translated access to card, Soul, Mist and Chronicle text |
| `public/assets/zh.js` | Traditional Chinese (Taiwan) game data and the zh-TW terminology glossary |
| `public/assets/rules_zh.js` | The Traditional Chinese Rulebook and Player Aid |
| `public/assets/audio.js` | Generative music and sound effects |
| `public/assets/net.js` | Online play over WebRTC |

## Languages

The game runs in English or Traditional Chinese (Taiwan board-game terminology). Players pick a language on the
sign-in page or on first launch, and can switch at any time with the button at the top right of the window (or inside
the Book). The choice is stored per browser, so players at the same online table can each read their own language: the
engine records every Chronicle line as a message key (`m`) alongside its English text, and each browser renders it
locally. New card or log text needs a Chinese entry in `zh.js` or `i18n.js`; `npm test` fails if one is missing.
