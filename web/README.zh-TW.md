[English](README.md) | 正體中文

# 《彼岸花渡》Netherbloom 網頁牌桌

可在瀏覽器中遊玩的 Netherbloom 版本，供出版商試玩預覽，託管於 Vercel。

- **單人模式**：一名玩家與幽靈同行。
- **同一螢幕**：2–4 名玩家共用一個視窗。傳遞裝置時，遮蔽畫面會讓手牌保持隱藏。
- **線上模式**：2–4 名玩家，各自使用自己的電腦。主持人的瀏覽器負責保存遊戲，其他玩家以五個字母的桌號加入。瀏覽器之間透過 WebRTC（PeerJS）直接連線，因此伺服器上不會儲存任何遊戲資料。
- **登入**：每個頁面與資源都位於 `/login` 之後。帳號、密碼與 cookie 簽章密鑰皆為 Vercel 環境變數（`NB_USER`、`NB_PASS`、`NB_SECRET`），絕不寫在程式碼中。
- **一起焚燒**：焚燒需要一位握有同一絲線牌的夥伴。主動玩家提出請求，夥伴選一張牌，兩張一起翻開，由主動玩家選擇哪一張執行兩次。在隱憶之約下玩家可以自由交談：說出自己握有哪些絲線，但絕不說出牌名或牌上的文字。
- **遊戲中的說明**：*玩家輔助卡*與可搜尋的*規則書*會從側邊滑出。版圖旁的回合指引會標亮目前的步驟，並在亡魂步驟與迷霧結算時同步跟進。
- **憶念之書**：點擊桌上的憶念之書，即可開啟附插圖的雙頁版本，內含各章頁面、蠟封祝福，以及遊戲結束時的尾聲。
- **逐步執行每個效果**：就像在真實的桌面上，遊戲會依序執行每個效果：每個根、花、凋零、淹水、怨念、霧、結、被遺忘的牌、補牌與幽靈的行動，都會在版圖上以光圈、音效與說明文字呈現，演示完畢才會繼續。頂端的「效果：快速」可以加快速度。
- **桌上的牌**：牌庫、棄牌堆與遺忘牌堆擺在河流下方。牌會像用手移動一樣在它們之間飛行：抽牌並翻開放入手牌、打到河上、棄掉、遺忘、喚回、銘刻進書中，以及棄牌堆洗回牌庫。兩個牌堆都和桌上一樣正面朝上；點擊任一堆可以翻閱。記憶牌的牌背與印刷版相同：大小、角度各異的彼岸花。
- **手牌**：視窗底部可以展開與收起的面板，手牌呈扇形排開。點擊一張牌可以把它拿近細看：完整文字、每個效果的說明，以及打出的方式。
- **行動標記**：每個行動都會在回合托盤上放一個標記（正面打出、背面打出、焚燒、喚回、召喚、奮力駛過）；花費的光會從光的計數飄向使用的地方，桌面版的標記也擺在真實桌上的位置：船槳在回合托盤上，堅守與認命放在亡魂旁，每位擺渡人的破浪標記與護盾則在亡魂版圖上。玩家輔助卡說明了每個標記。
- **音樂**：以 Web Audio API 即時生成：持續低音、河流聲與蘆葦間的風聲，再以柔和的鋼琴輕輕彈奏一首公有領域的搖籃曲。每位亡魂都有來自其故事原鄉的搖籃曲：遊戲本身與無名亡魂是布拉姆斯〈搖籃曲〉，最後火光的孩子是〈睡吧，小寶貝〉（Schlaf, Kindlein, schlaf），花環少女是蘇格蘭的〈你會縫靠墊嗎〉（Can Ye Sew Cushions），渡船上的國王是威爾斯的〈整夜〉（All Through the Night），留在冥府的新娘是希臘民謠〈死亡的新娘〉。完全沒有使用取樣音源，因此不需要處理授權。

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
| `public/assets/app.js` | 選單、版圖、牌堆、手牌面板與行動標記、回合指引、規則側欄、動畫，以及三種遊玩模式 |
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
