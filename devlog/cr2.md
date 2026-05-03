# CR-2 開發日誌 — 設定對話框（工作目錄 ID）

**日期**: 2026-05-03
**對應需求**: change-requirements.md CR-2

---

## 目標

新增集中管理應用設定的 **Settings Dialog**，取代原本散落在 DrivePanel 中的工作目錄 ID 輸入欄位，讓使用者可以透過 Header 的 ⚙️ 按鈕統一設定。

---

## 實作細節

### 1. 新元件 `SettingsDialog`

新增 `web/src/app/components/SettingsDialog/` 目錄，包含：

- `SettingsDialog.tsx` — 設定對話框主體
- `SettingsDialog.module.css` — 樣式

**行為規格：**

- 開啟時自動從 `useDriveStore` 讀入目前的 `folderId` 預填至輸入欄
- 點擊「儲存設定」→ 呼叫 `setFolderId(value.trim())`，同步寫入 `localStorage`（key: `jpeditor_drive_folder`，與 DrivePanel 原本共用同一 key）
- 點擊「取消」/ 點擊背景 / 按 Escape → 關閉但不寫入
- 按 Enter → 等同點擊「儲存設定」
- 開啟時自動 focus 到輸入欄，便於快速貼上 Folder ID

**UI 結構：**

```
[⚙️ 設定] (標題)

 Google Drive (section)
  └─ 預設工作目錄 ID
       [輸入欄：貼上 Google Drive 資料夾 ID]
       說明文字：如何從網址列取得 ID

[取消]  [儲存設定]
```

### 2. `DrivePanel.tsx` — 移除內嵌目錄 ID 輸入

原本 DrivePanel 的「工作目錄 ID」設定區（包含 form、input、套用按鈕、說明文字）全部移除，改為：

- **已設定 `folderId`**：顯示目前目錄 ID（唯讀，`monospace` 字型）
- **未設定 `folderId`**：顯示提示文字「尚未設定工作目錄。請點選右上角 ⚙️ 設定工作目錄 ID 後重新整理。」

同步移除已無使用的 `useEffect`（同步 folderInput）、`folderInput` state、`folderChanged` 變數、`handleFolderSubmit` handler，以及 `useEffect` import。

### 3. `EditorLayout.tsx` — Header ⚙️ 按鈕

新增 `settingsOpen` state 與對應的開/關 handler。

⚙️ 按鈕在兩種狀態下皆顯示：

| 登入狀態 | 按鈕位置 |
|---|---|
| 已登入 | 排在使用者名稱左側（💾 儲存 → 另存新檔 → 📁 Drive 文件 → ⚙️ → 使用者名稱 → 登出） |
| 未登入 | 排在「🔑 Google 登入」按鈕右側 |

未登入時仍可開啟設定，讓使用者預先設定工作目錄 ID，登入後 DrivePanel 立即生效。

---

## 資料流

```
使用者開啟 SettingsDialog
  → 從 driveStore.folderId 預填輸入欄

使用者輸入 Folder ID 並點擊「儲存設定」
  → setFolderId(id)
      → localStorage.setItem('jpeditor_drive_folder', id)
      → Zustand store 更新 folderId

DrivePanel 開啟時
  → 從 useDriveStore() 讀取 folderId（已是最新值）
  → 若有值：顯示目前 ID；若無：顯示提示
  → onRefresh() 使用最新 folderId 呼叫 listMarkdownFiles
```

---

## 不在本次範圍

- 其他設定項（預設字型、自動儲存間隔）留待未來擴充
- DrivePanel 保留「↺ 重新整理」按鈕，使用者設定完 Folder ID 後需手動點擊重新整理（或重新開啟面板）
