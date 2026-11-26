# Mobile Preview — 在電腦上模擬 iPhone 實機體驗

把網址放進最新 iPhone 外框裡預覽：有手指線框與點擊特效、iOS 主畫面、Safari「加入主畫面」、App 展開動畫、深色模式、截圖與錄影。

## 開始使用

**線上版（任何電腦直接開）：https://jimmywu-commits.github.io/iphone/**

1. 用 Chrome 或 Edge 開啟上面的網址，或直接雙擊本機的 `index.html`。
2. 在上方網址列輸入網址，按 Enter 或「前往」，手機會用 Safari 開啟。
3. Safari 右下角 **···** →「加入主畫面」→「加入」，主畫面就會出現網站圖示（會自動抓網站的 `apple-touch-icon` 與名稱）。
4. 點主畫面圖示，會像 App 一樣展開；點手機底部 Home 條或按 `H` 回主畫面。

按右上角 **?** 可以看完整玩法與快捷鍵。

## 輔助擴充功能（建議安裝）

瀏覽器的安全限制讓工具看不到「別的網站」裡的滑鼠位置，安裝 `mobile-preview-helper` 之後才有：

- 手指與點擊特效在網頁內也會顯示
- 網站內容跟著 iOS 深色模式變黑
- 解除「拒絕連線」的嵌入限制、網站判斷成 iPhone Safari
- 拖曳捲動、隱藏桌機捲軸
- 用 Chrome 帳號同步主畫面與設定（換電腦也一樣）

安裝步驟：

1. 網址列輸入 `chrome://extensions`（Edge 為 `edge://extensions`），開啟右上角「開發人員模式」。
2. 點「載入未封裝項目」，選擇 `mobile-preview-helper` 資料夾。
3. 在該擴充功能的「詳細資料」開啟「允許存取檔案網址」。
4. 重新整理 `index.html`，右上角出現綠色「擴充已連線」即完成。

> 更新過擴充功能的檔案後，到擴充功能頁按一下它的「重新載入」。

安全設計：擴充只在「本機檔案 / localhost / https://jimmywu-commits.github.io/iphone/」開啟的本工具分頁內作用，離開或關閉分頁即自動還原，不影響平常瀏覽。

> 線上版小知識：線上版和 `jimmywu-commits.github.io` 底下的其他網站（例如 evday）是同一個網域，所以預覽自己的網站時，就算沒裝擴充，網頁內也有手指特效與深色模式。

## 換電腦時保留資料

| 要保留的東西 | 做法 |
|---|---|
| 工具本身（這個資料夾） | 放在 Google 雲端硬碟「我的雲端硬碟\iphone」，登入同帳號的電腦會自動同步；也是 Git 專案，推上 GitHub 後線上版就會更新 |
| 主畫面上的網站、機型、顏色、手指設定 | 兩台電腦的 Chrome 都登入同一個 Google 帳號（並開啟同步）、都安裝輔助擴充，就會自動一致（本機版和線上版也會互通） |
| 備份／不想用同步 | 底部「裝置」選單 →「匯出備份」存成檔案，到另一台按「匯入備份」 |

擴充功能的 ID 已固定為 `kjnkioeobbdmnmoojennnamhgichpgkl`，所以不同電腦、不同資料夾位置載入，Chrome 都會視為同一個擴充，同步資料才會互通。

## 檔案

- `index.html` — 工具本體（單一檔案）
- `mobile-preview-helper/` — 輔助擴充功能
- `demo-page.html` — 測試用的範例頁
