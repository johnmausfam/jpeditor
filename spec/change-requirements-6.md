# 日文講義 Markdown 編輯器 — 需求變更文件

**版本：** 1.6.0
**日期：** 2026-05-05
**基準版本：** change-requirements-5.md v1.5.0（CR-1 ～ CR-10 已完成）
**對象：** 前端開發人員

---

## 變更摘要

| 編號  | 類別            | 變更項目                       | 優先度 |
| ----- | --------------- | ------------------------------ | ------ |
| CR-11 | 共用 / 分享     | 新增文件分享功能（Share URL）  | 中     |
| CR-12 | 錯誤處理        | 增強文件權限不足的提示訊息     | 中     |

---

## CR-11　文件分享功能（Share URL）

### 11.1 背景

目前使用者若想將文件分享給他人閱覽，只能自行在 Google Drive 介面操作共用設定，沒有直接從本編輯器產生連結的管道。本次變更新增「分享」按鈕，可一鍵產生帶有文件識別資訊的可分享網址；收到連結的人開啟後，編輯器會自動觸發登入並載入指定文件。

> **前提條件**：文件本身的 Google Drive 共用設定需由擁有者另行設定（「知道連結的人可以查看/編輯」等），本功能僅負責產生帶有 `fileId` 的應用程式網址。

---

### 11.2 功能需求

#### 11.2.1 分享按鈕

| 項目         | 描述                                                                       |
| ------------ | -------------------------------------------------------------------------- |
| 位置         | Header 右側，「💾 儲存」按鈕左邊                                           |
| 顯示文字     | `🔗 分享`                                                                  |
| 啟用條件     | `currentFileId !== null`（文件已存檔至 Drive）且使用者已登入               |
| 停用狀態     | `currentFileId` 為 `null` 時按鈕 `disabled`，搭配 `title="請先儲存文件"` |

#### 11.2.2 分享網址格式

基於目前瀏覽器的 `origin + pathname`，附加以下 queryString 參數：

| 參數       | 值                        | 說明                                       |
| ---------- | ------------------------- | ------------------------------------------ |
| `fileId`   | `currentFileId`           | Google Drive 文件 ID，用於自動載入         |
| `fileName` | `currentFileName`（可選） | 供收件人在登入前看到的文件名稱提示         |

**範例：**

```
https://editor.example.com/?fileId=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms&fileName=lesson-01.md
```

> `fileName` 以 `encodeURIComponent` 編碼後附加，若 `currentFileName` 為空則省略。

#### 11.2.3 點擊行為

1. 組合上述網址字串。
2. 呼叫 `navigator.clipboard.writeText(url)`，將網址複製至剪貼簿。
3. 按鈕文字短暫變為 `✓ 已複製！`（持續 2 秒後回復為 `🔗 分享`）。
4. 若 `navigator.clipboard` 不可用（非 HTTPS 或瀏覽器限制），改以 `window.prompt` 顯示網址讓使用者手動複製。

#### 11.2.4 開啟分享連結時的自動載入（啟動流程）

應用程式初始化時（`EditorLayout` mount），讀取 `window.location.search`：

```
若 URL 含 ?fileId=...
  ├─ 將 fileId / fileName 暫存至 ref（shareLinkRef）
  ├─ 若使用者已登入（sessionStorage token 有效）
  │   └─ 直接呼叫 handleOpenSharedFile(fileId, fileName)
  └─ 若使用者未登入
      └─ 自動觸發 handleLogin()
         └─ 登入成功後呼叫 handleOpenSharedFile(fileId, fileName)
```

**`handleOpenSharedFile(fileId, fileName)`** 的行為與 `handleOpenDriveFile` 完全相同（下載內容、載入編輯器、進入 preview 模式），但額外在載入完成後執行：

```ts
// 清除 URL 中的 queryString，避免使用者重新整理時重複載入
history.replaceState(null, '', window.location.pathname);
```

#### 11.2.5 邊界情境

| 情境                               | 處理方式                                                                   |
| ---------------------------------- | -------------------------------------------------------------------------- |
| `fileId` 不存在（已刪除）           | `handleOpenSharedFile` 的 catch 分支顯示錯誤訊息（現有機制）              |
| 使用者沒有該文件的 Drive 存取權限   | 同上，錯誤訊息由 CR-12 增強後提供「您沒有存取此文件的權限」               |
| 登入失敗 / 使用者取消               | 不觸發載入；queryString 保留（使用者可再次登入後手動刷新）                |
| 非 HTTPS 環境（localhost 除外）     | `navigator.clipboard` 降級至 `window.prompt`                              |

---

### 11.3 受影響的元件

| 元件 / 函式          | 異動說明                                                              |
| -------------------- | --------------------------------------------------------------------- |
| `EditorLayout.tsx`   | 新增「分享」按鈕、`handleShare()`、`handleOpenSharedFile()`、mount 時的 queryString 偵測邏輯 |

---

## CR-12　增強文件權限不足的提示訊息

### 12.1 背景

目前 `googleDriveApi.ts` 的 `assertOk` 函式遇到 HTTP 錯誤時，拋出：

```
Drive API 403: {"error":{"code":403,"message":"The caller does not have permission",...}}
```

此訊息直接顯示在 UI 的錯誤橫幅（`DrivePanel` error banner）中，包含大量技術細節，對使用者不友善。

### 12.2 功能需求

#### 12.2.1 `assertOk` 強化（`googleDriveApi.ts`）

依 HTTP 狀態碼對應中文使用者訊息，其餘情況保留原始訊息供開發除錯：

| HTTP 狀態碼 | 拋出的錯誤訊息                                                           |
| ----------- | ------------------------------------------------------------------------ |
| `401`       | `認證已過期，請重新登入。`                                                |
| `403`       | `您沒有存取此文件（或資料夾）的權限。請確認該項目已與您的 Google 帳號共用。` |
| `404`       | `找不到指定的文件，它可能已被刪除或移至其他位置。`                       |
| 其他        | `Drive API {status}：{原始回應前 300 字}`（現有行為不變）                |

**修改範圍：** 僅 `assertOk` 函式，不改動呼叫端。

#### 12.2.2 現況確認與補充說明

| 操作               | 目前錯誤訊息前綴              | CR-12 後的效果                                     |
| ------------------ | ----------------------------- | -------------------------------------------------- |
| 載入文件列表失敗   | `載入文件列表失敗：…`          | `載入文件列表失敗：您沒有存取此資料夾的權限。…`     |
| 開啟文件失敗       | `開啟「{fileName}」失敗：…`    | `開啟「{fileName}」失敗：您沒有存取此文件的權限。…` |
| 儲存失敗           | `儲存失敗：…`                  | `儲存失敗：您沒有存取此文件的權限。…`              |
| 另存失敗           | `另存失敗：…`                  | `另存失敗：您沒有存取此資料夾的權限。…`            |

錯誤訊息顯示位置維持現有機制（`DrivePanel` 的 error banner `⚠ {error}`），無需新增額外 UI 元件。

#### 12.2.3 `handleOpenSharedFile` 的特殊處理（與 CR-11 連動）

分享連結開啟時若遭遇 403，使用者最可能的問題是「文件尚未共用給自己的帳號」，建議在錯誤訊息後附加操作建議：

> 已由 `assertOk` 提供的 403 訊息涵蓋此情境，無需額外處理。

---

### 12.3 受影響的元件

| 元件 / 函式        | 異動說明                                                   |
| ------------------ | ---------------------------------------------------------- |
| `googleDriveApi.ts` | `assertOk` 函式依狀態碼分支，拋出對應的中文使用者訊息    |
