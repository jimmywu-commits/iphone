# 專案說明（給 Claude）

- 一律用**繁體中文**溝通，包含工作清單、進度摘要與按鈕文字。
- 這是 Mobile Preview 工具：`index.html`（單一檔案的工具本體）與 `mobile-preview-helper/`（Chrome 輔助擴充）。
- 專案放在 Google 雲端硬碟 `G:\我的雲端硬碟\iphone`（`E:\GitHub\iphone` 是指向它的連結），不要另外複製一份。
- **改完就推**：每次修改完成並驗證後，直接 `git commit` 並 `git push origin main`，不用再問。推完約 1 分鐘後確認線上版 https://jimmywu-commits.github.io/iphone/ 已更新。
- 改到擴充功能時，提高 `manifest.json` 的 `version`，並提醒使用者到 `chrome://extensions` 按「重新載入」。
- `mobile-preview.html` 是舊版檔案，不要加入版本控管。
