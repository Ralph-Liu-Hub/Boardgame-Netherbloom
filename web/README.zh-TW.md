[English](README.md) | 正體中文

# 《彼岸花渡》Netherbloom 網頁牌桌

Netherbloom V5 的**手動虛擬桌面**，供出版商試玩預覽，託管於 Vercel。它就像一張實體桌（或 Screentop.gg）：所有的牌、板塊與指示物都由玩家親手移動，**網頁不會替你們執行任何規則**。

- **桌面**：河流（15 格，每格兩岸）、迷霧區、命運織機、憶念之書的三章書頁（每位亡魂的路線圖：記憶格、迷霧格、岔路與轉折）、渡帳、命運之霧、託付卡、結局牌、稱號列、供應區，以及每位玩家的區域。
- **移動**：任何牌、板塊、指示物都可以拖曳，放開時會吸附到最近的格子、河岸、軌道或書頁格。雙擊（或 `F`）翻面；`R` 把牌橫放或轉正（未點亮／點亮）。從牌堆拖曳會拿走頂牌；拖到牌堆上會放在最上面（按住 `Alt` 放到最底）；`Shift`＋拖曳移動整疊。右鍵有更多動作：抽牌、每人發 1 張、洗牌、查看與搜尋、偷看面朝下的牌、把牌交給其他玩家、放回盒中。
- **手牌**：畫面下方的手牌列只顯示你的手牌；其他玩家只看得到你有幾張。
- **下一步提示**（上方的開關）：可選的側欄，依序帶你們走過準備、你的回合、回合結束、翻頁與彼岸，並標亮每一步會用到的區域。它只描述規則，不會移動任何東西；全桌共用同一個步驟。
- **開桌**：元件會依規則書的準備步驟分好（牌庫洗好、每副章節迷霧加 2 張凶霧、河岸板塊面朝下隨機擺好、指示物放在供應區）。發牌、放最初的花、翻開前方的霧、抽命運之霧，都由玩家依提示自己動手。
- **復原／重做**（`Ctrl+Z`／`Ctrl+Y`），以及每個手動動作的**紀錄**。桌面存在瀏覽器裡，可以繼續上一局。
- **規則書**：可搜尋的 V5 規則書（`docs/rules/zh-TW/V5/Rulebook.md`）。
- **同一螢幕或線上**：一台裝置輪流傳遞（換人時有遮蔽畫面保護手牌），或 2–4 人各用自己的電腦。主持人的瀏覽器保存桌面，其他人用五個字母的代碼透過 WebRTC（PeerJS）加入。
- **登入**：每個頁面與資源都位於 `/login` 之後。帳號、密碼與 cookie 簽章密鑰皆為 Vercel 環境變數（`NB_USER`、`NB_PASS`、`NB_SECRET`），絕不寫在程式碼中。

```bash
cd web
npm test                                           # 元件資料與故事書路線、登入與遊玩紀錄的檢查
npm run test:e2e                                   # 瀏覽器測試（Playwright＋Chromium）：每位亡魂／難度／人數、拖放、牌堆、推軌、提示、大廳、手機、觸控、雙指縮放、線上遊戲
python3 -m http.server 8765 --directory public     # 本機遊玩（不需登入）
python3 tools/build_table_data.py                  # 修改 simulator/netherbloom/storybook_data.py 之後
python3 tools/build_rules.py                       # 修改 V5 規則書之後
```

## 部署

正式網址為 **https://netherbloom.vercel.app**（Vercel 專案 `netherbloom`，團隊 ralph-liu-hub）。此專案提供 `public/` 的內容，沒有安裝步驟，並需要在其環境中設定 `NB_USER`、`NB_PASS` 與 `NB_SECRET`。

牌桌直接載入 ES 模組（`public/assets/table.js`），不需要打包步驟。

Vercel 會為此儲存庫的每個 pull request 建立預覽（根目錄為 `web`）。

| 路徑 | 用途 |
|---|---|
| `middleware.js` | 沒有有效 session cookie 的人一律導向 `/login` |
| `api/login.js`、`api/logout.js`、`api/_session.js` | 登入與簽章的 HttpOnly cookie |
| `public/assets/table.js` | 手動桌面：版圖、元件、牌堆、手牌、右鍵選單、復原、提示側欄、線上同步、大廳 |
| `public/assets/table-data.js` | V5 元件：迷霧與凶霧、板塊、稱號、幽靈牌、難度 |
| `public/assets/table-story.js` | 由模擬器產生：故事書路線、命運之霧、結局、託付卡 |
| `public/assets/table-hints.js` | 下一步提示 |
| `public/assets/rules-v5.js` | 自動產生：V5 規則書 |
| `public/assets/cards.js`、`zh.js` | 記憶牌資料與中文名稱 |
| `public/assets/net.js` | 以 WebRTC 進行的線上遊戲 |

## 語言

牌桌可以用正體中文或英文顯示（右上角的按鈕）。介面、卡牌、迷霧、板塊與提示會跟著切換；故事書、命運之霧、結局、託付卡與 V5 規則書目前只有中文。
