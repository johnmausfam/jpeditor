# 日文講義 Markdown 編輯器 — 需求變更文件

**版本：** 1.2.0
**日期：** 2026-05-03
**基準版本：** change-requirements.md v1.1.0（CR-1 ～ CR-4 已完成）
**對象：** 前端開發人員

---

## 變更摘要

| 編號 | 類別       | 變更項目                           | 優先度 |
| ---- | ---------- | ---------------------------------- | ------ |
| CR-5 | 資料安全   | 離開確認 + 本地草稿備份            | 高     |
| CR-6 | UI/UX      | Header 功能收合至左側抽屜選單      | 中     |

---

## CR-5　離開確認與本地草稿備份

### 5.1 背景

應用程式目前無自動儲存至 Google Drive 的功能，且短期內不計劃實作。為避免使用者意外關閉頁面或重新整理造成資料遺失，採用以下兩道折衷防護：

1. **離開確認**：關閉或重新整理頁面時，彈出瀏覽器原生確認框。
2. **本地草稿備份**：定期將目前內容快照至 `localStorage`，供緊急恢復使用。

### 5.2 功能需求

#### 5.2.1 離開確認

| 項目 | 描述 |
| ---- | ---- |
| 觸發條件 | 頁面關閉、重新整理（F5/Ctrl+R）、瀏覽器前進/後退導致離頁 |
| 實作方式 | 監聽 `beforeunload` 事件；設定 `event.returnValue = ''` 觸發瀏覽器原生確認對話框 |
| 啟用條件 | 編輯器內容不為空（`markdown !== ''`）時才啟用，避免空白文件也觸發 |
| 取消離開 | 使用者點擊「取消」即可繼續留在頁面 |
| 注意 | 現代瀏覽器不允許自訂 `beforeunload` 對話框文字，只能使用瀏覽器預設措辭 |

#### 5.2.2 本地草稿備份

##### 儲存行為

| 項目 | 描述 |
| ---- | ---- |
| 儲存時機 | 定時器（`setInterval`）觸發 |
| 預設間隔 | **1 分鐘** |
| 可選間隔 | 30 秒 / 1 分鐘 / 3 分鐘 / 5 分鐘 |
| 觸發條件 | 自上次備份以來 `markdown` 內容有變更時才寫入，避免無謂寫入 |
| 儲存位置 | `localStorage` 鍵 `jpeditor.localDrafts` |
| 最大條目數 | 最多保留 **20 筆**；同一 `fileId`（或 `"__new__"`）的備份直接覆蓋，不增加條目；超過 20 筆時移除最舊的一筆 |
| 備份對象 | 目前開啟的任何文件，包括尚未儲存至 Drive 的新文件（`fileId = "__new__"`） |

##### 資料結構（`jpeditor.localDrafts`）

```jsonc
[
  {
    "fileId": "1Abc...",           // Drive 檔案 ID；新文件（未儲存）固定為 "__new__"
    "fileName": "第1課講義.md",    // Drive 檔名；新文件為 null
    "content": "# 第１課\n...",    // 備份的 Markdown 全文
    "savedAt": 1746518400000       // 備份時間（Unix ms）
  }
]
```

##### 設定整合

在現有 **SettingsDialog** 中新增「草稿備份間隔」設定項：

| UI 項目 | 描述 |
| ------- | ---- |
| 設定項名稱 | 草稿備份間隔 |
| 輸入類型 | `<select>` 下拉選單 |
| 選項 | 30 秒 / 1 分鐘（預設）/ 3 分鐘 / 5 分鐘 |
| 儲存鍵 | `localStorage` 鍵 `jpeditor.draftInterval`，值為毫秒數字字串（`"30000"` / `"60000"` / `"180000"` / `"300000"`） |
| 預設值 | `"60000"`（1 分鐘） |

SettingsDialog 儲存設定時，一併更新正在執行中的備份 interval（清除舊 interval、重新建立新 interval）。

#### 5.2.3 草稿備份調閱對話框（DraftDialog）

| 項目 | 描述 |
| ---- | ---- |
| 開啟方式 | SettingsDialog 內「查看草稿備份 →」連結按鈕；或 CR-6 側欄抽屜中的「🗒 草稿備份」入口 |
| 版面結構 | 左欄：備份清單（檔名 + 備份時間）；右欄：選取條目的 Markdown 原文預覽（唯讀 `<pre>`） |
| 套用 | 預覽區下方提供「套用至編輯器」按鈕；點擊後將備份內容載入編輯器的 `markdown` state |
| 套用限制 | **不會**自動儲存至 Drive；**不會**更新 `currentFileId` / `currentFileName`；使用者需另行手動存檔 |
| 刪除 | 每筆清單項目旁提供「🗑」刪除按鈕；刪除後清單即時更新 |
| 清除全部 | 對話框底部提供「清除全部備份」按鈕，點擊需二次確認 |
| 空白狀態 | 無任何備份時顯示「目前沒有草稿備份」提示 |

**注意事項：**
- 套用備份後，Header 與 StatusBar 顯示的檔名不會自動變更，使用者需自行另存或覆蓋儲存。
- 備份內容為 Markdown 純文字；圖片以 URL 形式保留，不含二進位資料。

### 5.3 受影響的元件

| 元件 | 異動 |
| ---- | ---- |
| `web/src/app/lib/localDrafts.ts`（新檔） | `saveDraft` / `getDrafts` / `removeDraft` / `clearDrafts` 工具函式 |
| `EditorLayout.tsx` | 新增 `beforeunload` 事件監聽；新增備份 interval（從 `jpeditor.draftInterval` 讀取間隔）；新增 `draftDialogOpen` state |
| `SettingsDialog.tsx` | 新增「草稿備份間隔」`<select>`；新增「查看草稿備份」連結按鈕 |
| `DraftDialog`（新元件） | 備份清單 + Markdown 預覽 + 套用 + 刪除 |
| `DraftDialog.module.css`（新檔） | 對話框樣式 |

---

## CR-6　Header 功能收合至左側抽屜選單

### 6.1 背景

CR-1 完成後，Header 已累積「＋ 新文件」、「☐ 範本」、「最近檔案 ▾」、「💾 儲存」、「另存新檔」、「📁 Drive 文件」、「⚙️」、使用者名稱、「登出」等多個元素，排列擁擠。本次將大部分功能收合至**左側抽屜選單（Drawer Menu）**，Header 回歸簡潔。

### 6.2 功能需求

#### 6.2.1 精簡後的 Header

| 位置 | 元素 | 說明 |
| ---- | ---- | ---- |
| 最左 | ☰ 抽屜開關按鈕 | 點擊展開 / 收起側欄抽屜 |
| 中間（左對齊） | 目前檔名 / 應用名稱 | 維持現有邏輯：`currentFileName ?? '日文講義エディター'` |
| 右側 | 💾 儲存（登入後才顯示） | 高頻操作保留在 Header，一鍵可及 |
| 最右 | ⚙️ 設定 | 維持在 Header，快速存取設定 |

#### 6.2.2 左側抽屜（AppDrawer）

抽屜從畫面左側滑入，以 overlay 模式覆蓋內容（**不**推移編輯器版面）。

| 項目 | 描述 |
| ---- | ---- |
| 開啟 | 點擊 Header 左側 ☰ 按鈕 |
| 關閉 | 點擊抽屜右側的半透明 backdrop、或點擊抽屜內的 ✕ 按鈕 |
| 寬度 | 固定 280px |
| 動畫 | `transform: translateX(-100%)` → `translateX(0)`，`transition: transform 200ms ease` |
| 層級 | `z-index: 600`（高於現有 Dialog 的 500） |

**抽屜內容結構（由上至下）：**

```
╔══════════════════════════════╗
║ ✕           日文講義エディター ║  ← 抽屜 Header
╠══════════════════════════════╣
║ 📄 文件                       ║  ← 分節標題
║ ─────────────────────────    ║
║  ＋ 新文件  [ ☐ 使用範本 ]    ║
║  📋 最近開啟的檔案  ▾         ║  ← 點擊展開 accordion
║      ├ 第1課講義.md  2026/5/3 ║
║      ├ 第2課單字表.md ...     ║
║      └ 清除記錄               ║
╠══════════════════════════════╣
║ ☁️ Google Drive               ║  ← 分節標題
║ ─────────────────────────    ║
║ （未登入）🔑 Google 登入      ║
║ （已登入） 👤 使用者名稱       ║
║            📁 Drive 文件      ║
║            另存新檔           ║
║            登出               ║
╠══════════════════════════════╣
║ 🗒 草稿備份                   ║  ← 開啟 DraftDialog（CR-5）
╚══════════════════════════════╝
```

**最近開啟的檔案 Accordion 行為：**
- 預設**收起**
- 點擊標題列展開 / 收起
- 清單邏輯與現有 `RecentFilesMenu` 相同
- 點擊某筆記錄後：呼叫 `handleOpenDriveFile`，並自動**關閉抽屜**
- 最後一列為「清除記錄」按鈕，呼叫 `clearRecentFiles()`

#### 6.2.3 現有元件的處置

| 元件 / 元素 | 處置方式 |
| ----------- | -------- |
| Header `newDocGroup`（＋ 新文件 + 範本 checkbox） | 移入抽屜；從 Header 移除 |
| `RecentFilesMenu` 元件 | 邏輯整合進 `AppDrawer`；`RecentFilesMenu` 元件**移除** |
| Header「另存新檔」按鈕 | 移入抽屜 Drive 區塊 |
| Header「📁 Drive 文件」按鈕 | 移入抽屜 Drive 區塊 |
| Header 使用者名稱 + 登出 | 移入抽屜 Drive 區塊 |
| Header「🔑 Google 登入」 | 移入抽屜 Drive 區塊 |
| Header「⚙️ 設定」 | 保留在 Header |
| Header「💾 儲存」 | 保留在 Header（登入後顯示） |

### 6.3 受影響的元件

| 元件 | 異動 |
| ---- | ---- |
| `AppDrawer`（新元件） | 抽屜主體，包含文件、Drive、草稿備份三個區塊 |
| `AppDrawer.module.css`（新檔） | 抽屜動畫、overlay、accordion 樣式 |
| `EditorLayout.tsx` | 新增 `drawerOpen` state；Header 精簡重構；移除原有 Header 按鈕；渲染 `AppDrawer` |
| `EditorLayout.module.css` | 移除 `.newDocGroup`、`.templateLabel`、`.templateCheckbox` 等已移入抽屜的樣式 |
| `RecentFilesMenu`（現有元件） | 移除（邏輯移入 `AppDrawer`） |

---

## 實作順序建議

```
CR-5a  localDrafts.ts 工具函式
  ↓
CR-5b  EditorLayout：beforeunload 監聽 + 備份 interval
  ↓
CR-5c  SettingsDialog：備份間隔 select + 草稿備份入口
  ↓
CR-5d  DraftDialog 元件
  ↓
CR-6a  AppDrawer 元件（含最近檔案 accordion）
  ↓
CR-6b  EditorLayout Header 精簡重構
```

---

## 不在本次變更範圍內

- 自動儲存至 Google Drive
- 多裝置草稿同步
- 備份版本比較（diff 檢視）
- 抽屜固定展開（persistent sidebar）模式

---

_本文件為需求變更草案 v1.2.0，請確認後開始分階段實作。_
