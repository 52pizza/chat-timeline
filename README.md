# Chat Timeline - 聊天紀錄視覺化工具

[![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-Live_Demo-brightgreen?style=for-the-badge&logo=github)](https://52pizza.github.io/chat-timeline/)

這是一個互動式的網頁工具，可以將您從 Facebook Messenger 或 Instagram 下載的聊天紀錄 `message_1.json` 檔案，轉換成一個可縮放、可平移的視覺化時間軸圖表。

本專案的 HTML, CSS, 和 JavaScript 程式碼主要由 **Google 的 Gemini 模型** 協助生成。

---

## ✨ 功能亮點

*   **本地端處理**：所有檔案都在您的瀏覽器本地進行處理，您的聊天紀錄**不會**被上傳到任何伺服器，確保隱私安全。
*   **拖曳或點擊上傳**：提供直覺的檔案上傳介面。
*   **互動式時間軸**：
    *   **平移**：使用滑鼠拖曳即可左右、上下移動時間軸。
    *   **縮放**：使用滑鼠滾輪可對整個圖表進行等比例縮放。
    *   **獨立間距調整**：可透過按鈕，單獨針對「日期間距」或「時間間距」進行置中縮放，方便觀察。
*   **詳細對話視窗**：點擊圖表上的任何一個訊息圓圈，即可開啟一個小視窗，顯示該訊息前後 20 分鐘內的詳細對話內容。
*   **清晰的圖例**：在圖表上方會自動生成參與者的顏色圖例。

## 🚀 如何使用

### 1. 取得您的聊天紀錄

首先，您需要從 Meta 官方下載您的資料。

*   **Facebook**: 前往 [下載資訊](https://www.facebook.com/dyi/)。
*   **Instagram**: 前往 [下載資訊](https://www.instagram.com/download/request/)。

在請求下載時，請務必選擇 `JSON` 作為格式選項。您不需要下載所有資料，只需要選擇「訊息」類別即可。

### 2. 找到 `message_1.json`

下載並解壓縮檔案後，在 `messages/inbox` 資料夾中，找到您想視覺化的那個聊天室資料夾，裡面就會有 `message_1.json` 這個檔案。

### 3. 上傳並視覺化

1.  前往本專案的展示網頁：[https://52pizza.github.io/chat-timeline](https://52pizza.github.io/chat-timeline)
2.  將 `message_1.json` 檔案拖曳至上傳區塊，或點擊按鈕選擇檔案。
3.  上傳成功後，圖表將會自動呈現在下方。

## 🛠️ 技術堆疊

*   **HTML5**
*   **CSS3**
*   **JavaScript (ES6+)**
*   **D3.js (v7)**：用於數據驅動的視覺化圖表繪製。
*   **Bootstrap 5**：用於基本的頁面排版與 UI 元件。
