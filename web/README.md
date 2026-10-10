# Netherbloom web table

A playable browser version of Netherbloom for publisher previews, hosted on Vercel.

- **Solo**: one player with the Ghost.
- **Same Screen**: 2–4 players in one window. A cover screen keeps hands hidden while the device is passed.
- **Online**: 2–4 players, each on their own computer. The host's browser holds the game and other players join with a five-letter code. Browsers connect directly to each other over WebRTC (PeerJS), so no game data is stored on a server.
- **Login**: every page and asset sits behind `/login`. The account, password and cookie-signing secret are Vercel environment variables (`NB_USER`, `NB_PASS`, `NB_SECRET`), never source code.
- **Music**: an original soundtrack generated live with the Web Audio API: a drone, the river, Aeolian bells and the occasional minor-second swell. Nothing is sampled, so there is no licence to clear.

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
| `public/assets/app.js` | Menus, board, hand, animations and the three play modes |
| `public/assets/audio.js` | Generative music and sound effects |
| `public/assets/net.js` | Online play over WebRTC |
