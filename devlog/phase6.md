# Phase 6 開發日誌 — Google Drive 開啟 / 儲存 / 另存

**日期**: 2025-07

---

## 目標

本 Phase 補完 Google Drive 檔案管理的完整工作流程：

| 功能 | 描述 |
|---|---|
| 開啟文件 | 點擊 Drive 面板中的 `.md` 檔案，載入至編輯器，並記錄目前開啟的檔案 ID 與名稱 |
| 儲存文件 | `💾 儲存` 按鈕 / `Ctrl+S`，覆寫目前開啟的 Drive 檔案；若尚未關聯檔案，自動跳至另存新檔 |
| 另存新檔 | 輸入檔名，在指定目錄建立新 `.md` 檔案，並切換「目前開啟」為新檔 |

---

## 實作細節

### 1. `driveStore.ts` — 追蹤目前開啟的檔案

新增兩個欄位與一個 setter：

```ts
currentFileId: string | null;   // null = 新文件 / 尚未儲存
currentFileName: string | null;
setCurrentFile(id, name): void;
```

登出時同步清空 `currentFileId` / `currentFileName`，確保下次登入不殘留舊狀態。

### 2. `SaveAsDialog` 元件

仿照 `ImageDialog` 模式建立的輸入 Modal：

- 預填當前檔名（若有），並自動選取名稱部分（去除 `.md`），方便直接改名
- 即時預覽最終存檔名稱（自動補 `.md`）
- Enter 確認、Escape 取消、點擊背景取消
- 儲存按鈕在輸入為空時 disabled

### 3. `EditorLayout.tsx` — 儲存邏輯

#### `handleSave`
```
若尚無 currentFileId → 開啟 SaveAsDialog
否則 → 呼叫 updateDriveFile(token, fileId, markdown)
完成後 → 重新整理 Drive 檔案列表（更新 modifiedTime）
```

#### `handleSaveAs`
```
呼叫 createDriveFile(token, folderId, fileName, markdown)
→ 取得新 fileId
→ setCurrentFile(newId, fileName)
→ 重新整理 Drive 檔案列表
```

`folderId` 未設定時，顯示提示錯誤訊息並阻止儲存。

#### `handleOpenDriveFile` 補充
原本只載入內容，現在同步呼叫 `setCurrentFile(fileId, fileName)`，讓狀態與編輯器保持一致。

### 4. Ctrl+S 快捷鍵

透過 `useEffect` 掛載全域 `keydown` 事件：

```ts
if ((e.ctrlKey || e.metaKey) && e.key === 's') {
  e.preventDefault();
  if (isLoggedIn) handleSave();
}
```

依賴陣列為 `[handleSave]`，確保 handler 包含最新的 `markdown` closure。

### 5. Header 儲存按鈕

登入後新增：
- `💾 儲存`（primary 樣式）：`isSaving` 時顯示「儲存中…」並停用
- `另存新檔`：直接開啟 `SaveAsDialog`

Button 的 `title` tooltip 顯示目前關聯的檔名，或提示「另存新檔至 Drive」。

### 6. `StatusBar` 當前檔名顯示

登入狀態下，狀態列末端顯示：
- 若有 `currentFileName` → 顯示檔名
- 若無 → 顯示「新文件」
- 附加灰色提示 `（Ctrl+S 儲存）`

---

## 資料流總覽

```
開啟文件:
  DrivePanel 點擊 → handleOpenDriveFile(fileId, fileName)
    → downloadFileContent → setMarkdown
    → setCurrentFile(fileId, fileName)
    → 面板關閉

儲存:
  Ctrl+S / 💾 按鈕 → handleSave
    有 currentFileId → updateDriveFile → listMarkdownFiles → setFiles
    無 currentFileId → 開啟 SaveAsDialog

另存新檔:
  SaveAsDialog 確認 → handleSaveAs(fileName)
    → createDriveFile → setCurrentFile(newId, name)
    → listMarkdownFiles → setFiles
    → 對話框關閉
```

---

## 安全性

- 所有 Drive API 請求均透過 `Authorization: Bearer <token>` Header 傳遞 token，不放入 URL query string
- `fileId` 以 `encodeURIComponent` 編碼，防止路徑注入
- `folderId` 未設定時阻止寫入，避免意外上傳到 Drive 根目錄

---

## 遺留事項（Phase 7）

- 「未儲存變更」髒狀態指示（`●` 符號）— 目前計劃中，但 onUpdate dirty tracking 與 CodeMirror 雙向同步的去抖需更細緻的處理，留至 Phase 7 UI 打磨
- 大型 `.md` 檔案的上傳進度顯示
- Drive API 配額錯誤的友善提示
