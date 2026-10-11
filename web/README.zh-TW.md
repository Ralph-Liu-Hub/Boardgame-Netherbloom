[English](README.md) | 正體中文

# Netherbloom（暫定中文名：彼岸花渡）網頁牌桌

可在瀏覽器中遊玩的 Netherbloom 版本，供出版商試玩預覽，託管於 Vercel。

- **單人模式**：一名玩家與幽靈同行。
- **同一螢幕**：2–4 名玩家共用一個視窗。傳遞裝置時，遮蔽畫面會讓手牌保持隱藏。
- **線上模式**：2–4 名玩家，各自使用自己的電腦。主持人的瀏覽器負責保存遊戲，其他玩家以五個字母的代碼加入。瀏覽器之間透過 WebRTC（PeerJS）直接連線，因此伺服器上不會儲存任何遊戲資料。
- **登入**：每個頁面與資源都位於 `/login` 之後。帳號、密碼與 cookie 簽章密鑰皆為 Vercel 環境變數（`NB_USER`、`NB_PASS`、`NB_SECRET`），絕不寫在程式碼中。
- **遊戲中的說明**：*玩家輔助卡*與可搜尋的*規則書*會從側邊滑出。版圖旁的回合指引會標亮目前的步驟，並在亡魂步驟與迷霧結算時同步跟進。
- **憶念之書**：點擊桌上的憶念之書，即可開啟附插圖的雙頁版本，內含各章頁面、蠟封祝福，以及遊戲結束時的尾聲。
- **音樂**：以 Web Audio API 即時生成的原創配樂：持續低音、河流聲、風鈴聲，以及偶爾出現的小二度漸強。完全沒有使用取樣音源，因此不需要處理授權。

規則引擎 `public/assets/engine.js` 移植自 `simulator/netherbloom/engine.py`，並採用平衡報告中調整後的預設值。請讓兩者保持同步。

```bash
cd web
npm test                                           # engine fuzz (400 games) + login/middleware checks
python3 -m http.server 8765 --directory public     # local play without login
```

## 部署

正式網址為 **https://netherbloom.vercel.app**（Vercel 專案 `netherbloom`，團隊 ralph-liu-hub）。此專案提供 `public/` 的內容，沒有安裝步驟，並需要在其環境中設定 `NB_USER`、`NB_PASS` 與 `NB_SECRET`。

正式環境上傳的是經過壓縮的打包檔：

```bash
npx esbuild@0.23.1 public/assets/app.js --bundle --minify --format=esm --target=es2020 --outfile=dist/app.js
npx esbuild@0.23.1 public/assets/style.css --minify --outfile=dist/style.css
```

Vercel 的 GitHub 應用程式目前尚未取得此儲存庫的存取權限。取得權限後，將專案連結到此儲存庫（根目錄為 `web`），每次推送就會自動部署。

| 路徑 | 用途 |
|---|---|
| `middleware.js` | 將沒有有效 session cookie 的使用者導向 `/login` |
| `api/login.js`、`api/logout.js`、`api/_session.js` | 登入功能與已簽章的 HttpOnly cookie |
| `public/assets/cards.js`、`engine.js` | 卡牌資料與規則 |
| `public/assets/app.js` | 選單、版圖、手牌、回合指引、規則側欄、動畫，以及三種遊玩模式 |
| `public/assets/rules.js` | 可搜尋的規則書與玩家輔助卡（卡牌與迷霧表格由 `cards.js` 產生） |
| `public/assets/book.js` | 完整的插圖版憶念之書，附翻頁效果 |
| `public/assets/puppet.js` | 憶念之書中每位亡魂的皮影戲剪影：以關節連接、手繪風格的人偶，用動作重現亡魂的旅程 |
| `public/assets/replay.js` | 憶念之書下方、夜晚河面上的小型旅程重播 |
| `public/assets/i18n.js` | 語言切換（English／正體中文），以及卡牌、亡魂、迷霧與紀事文字的翻譯存取 |
| `public/assets/zh.js` | 正體中文（台灣）遊戲資料與 zh-TW 用語表 |
| `public/assets/rules_zh.js` | 正體中文規則書與玩家輔助卡 |
| `public/assets/audio.js` | 生成式音樂與音效 |
| `public/assets/net.js` | 透過 WebRTC 進行的線上遊玩 |

## 語言

遊戲可使用英文或正體中文（台灣桌遊用語）進行。玩家可在登入頁面或首次啟動時選擇語言，並可隨時透過視窗右上角的按鈕（或在憶念之書內）切換。
語言選擇會依瀏覽器分別儲存，因此同一張線上牌桌的玩家可以各自閱讀自己的語言：引擎會將每一行紀事記錄為訊息鍵（`m`），並附上其英文文字，再由各瀏覽器在本機呈現。
新增卡牌或紀錄文字時，需要在 `zh.js` 或 `i18n.js` 中加入對應的中文項目；若有缺漏，`npm test` 就會失敗。
