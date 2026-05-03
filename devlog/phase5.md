# Phase 5 開發記錄 — Google Drive OAuth 登入 + 文件列表

**日期：** 2026-05-03  
**目標：** 整合 Google Identity Services (GIS) OAuth 2.0 登入，並實作 Google Drive 文件列表瀏覽與開啟功能。

---

## 1. 技術選型：GIS Token Model

需求書建議使用 `@react-oauth/google` 或 GIS SDK。選擇直接使用 **GIS Token Model**（無額外套件），理由：

- 不安裝第三方 OAuth 套件，降低供應鏈風險
- Token Model 比 Code Model 更簡單——瀏覽器端 SPA 不需要後端換 code
- GIS 內建 CSRF 保護，無需自行實作 state 參數
- 以 `<script async defer>` 在 `index.html` 載入，完全不影響 Vite bundle 大小

GIS SDK 掛載於 `window.google.accounts.oauth2`，使用 `initTokenClient` + `requestAccessToken` 觸發 OAuth 彈窗。

---

## 2. 環境變數設定

`VITE_GOOGLE_CLIENT_ID` 透過 Vite 的 `import.meta.env` 機制注入，**建構期替換**，不出現在原始碼中。

```
web/.env.example   ← 範本，提交至版本庫
web/.env.local     ← 真實值，加入 .gitignore（Vite 預設排除）
```

同時在 `web/src/vite-env.d.ts` 擴充 `ImportMetaEnv`，使 TypeScript 能正確推導型別，避免 `import.meta.env.VITE_GOOGLE_CLIENT_ID` 顯示 `any`。

---

## 3. 架構分層

Phase 5 依關注點切為三層：

| 層次 | 檔案 | 職責 |
|---|---|---|
| OAuth 輔助 | `lib/googleAuth.ts` | GIS 初始化、token 請求、sessionStorage 管理、revoke |
| API 輔助 | `lib/googleDriveApi.ts` | Drive REST v3 呼叫（userinfo、列表、下載、建立、更新） |
| 全域狀態 | `store/driveStore.ts` | Zustand store，持久化策略 |
| UI | `components/DrivePanel/` | 側欄面板，資料夾設定 + 文件列表 |

---

## 4. googleAuth.ts — OAuth 流程

### 4-1. Token 存放策略

```ts
// sessionStorage：頁面關閉即清除，符合需求書「不使用 localStorage 以降低 XSS 風險」
sessionStorage.setItem(SS_TOKEN, token);
sessionStorage.setItem(SS_EXPIRY, String(expiry));
```

Token 有效期從 GIS 回傳的 `expires_in`（秒）換算，並**提前 60 秒**設為失效，作為安全邊際。

### 4-2. GIS SDK 尚未載入的處理

GIS 以 `async defer` 載入，React app 可能在 SDK ready 之前觸發登入按鈕。`requestGoogleLogin` 以遞迴 retry 處理：

```ts
if (!window.google?.accounts?.oauth2) {
  if (_attempt >= 10) { /* 5 秒後放棄 */ return; }
  setTimeout(() => requestGoogleLogin(callback, _attempt + 1), 500);
  return;
}
```

每 500 ms 重試一次，最多 10 次（5 秒），避免因 SDK 尚未就緒而靜默失敗。

### 4-3. OAuth Scope

```ts
'https://www.googleapis.com/auth/drive',          // 列表、下載、建立、更新
'https://www.googleapis.com/auth/userinfo.email',  // 顯示信箱
'https://www.googleapis.com/auth/userinfo.profile', // 顯示名稱
```

使用完整 `drive` scope（而非 `drive.file`），因為使用者需要讀取**不是由本 app 建立**的既有 `.md` 檔案。若未來只需存取本 app 建立的檔案，可降權至 `drive.file`。

### 4-4. 登出

```ts
window.google.accounts.oauth2.revoke(token, () => { /* fire-and-forget */ });
clearStoredToken(); // 立即清除 sessionStorage
```

Revoke 為非同步 fire-and-forget：即使 revoke 請求失敗，sessionStorage 已清除，下次請求時 token 無效會自然觸發重新登入。

---

## 5. googleDriveApi.ts — Drive REST API

### 5-1. 安全呼叫慣例

Token 統一透過 `Authorization: Bearer <token>` header 傳遞，**從不附加於 URL query string**（符合需求書安全性要求）：

```ts
function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}
```

`assertOk` 統一處理非 2xx 回應，擷取最多 300 字元的錯誤訊息，避免敏感內容大量印出。

### 5-2. 文件列表查詢（Bug Fix）

初版查詢條件：
```
mimeType = 'text/plain' AND '{folderId}' in parents AND trashed = false
```

**問題：** Google Drive 對 `.md` 檔案的 MIME type 因建立方式而異，使用 Google Docs 新建的純文字檔案常標記為 `text/plain`，但透過 Drive API 上傳、或在其他 OS 拖曳上傳的 `.md` 檔案可能是 `text/markdown` 或 `text/x-markdown`，導致查詢結果不完整。

**修正：** 移除 MIME type 過濾，改為只過濾「未刪除的所有檔案」，在 JavaScript 端以 `.endsWith('.md')` 過濾：

```ts
q: `'${folderId}' in parents and trashed = false`
// 加回 mimeType 欄位供除錯用
fields: 'files(id,name,modifiedTime,size,mimeType)'
```

這樣無論 `.md` 檔案以何種方式建立，都能正確列出。

### 5-3. 預先實作 Phase 6 API

`googleDriveApi.ts` 同時包含 Phase 6 需要的 `createDriveFile` 和 `updateDriveFile`，以 `multipart` 上傳格式一次搞定 metadata + 內容：

```ts
// 建立：POST /upload/drive/v3/files?uploadType=multipart
// 更新：PATCH /upload/drive/v3/files/{fileId}?uploadType=media
```

---

## 6. driveStore.ts — 狀態持久化設計

### 6-1. 雙層持久化

| 資料 | 儲存位置 | 原因 |
|---|---|---|
| access token | `sessionStorage` | 含敏感資訊，頁面關閉應清除 |
| token expiry | `sessionStorage` | 同上 |
| 使用者名稱/信箱 | `sessionStorage` | 個人識別資訊，頁面關閉清除 |
| 資料夾 ID | `localStorage` | 非敏感設定，重開瀏覽器保留 |

### 6-2. 頁面重整恢復登入狀態

```ts
function restoreAuth() {
  const token = sessionStorage.getItem(SS_TOKEN);
  const expiry = Number(sessionStorage.getItem(SS_EXPIRY) ?? 0);
  const valid = !!token && Date.now() < expiry;
  // ...
}
```

Zustand store 初始化時呼叫 `restoreAuth()`，若 sessionStorage 中有未過期的 token，自動恢復登入狀態（同 tab 重整後不需重新登入）。

---

## 7. DrivePanel — UI 設計

`DrivePanel` 是一個從右側滑入的 `aside` 面板（CSS `position: fixed` + `slideIn` animation），使用 backdrop 半透明遮罩、點擊遮罩關閉。

**資料夾 ID 設定：**

使用者需從 Drive 網址列複製資料夾 ID（`drive.google.com/drive/folders/<ID>`）。面板內提供輸入框 + 「套用」按鈕，`folderId` 立即存入 `localStorage` 並自動觸發重新整理。

**按鈕顯示邏輯：**
- 「套用」按鈕：`disabled` 條件為輸入框為空 **或** 內容與已儲存值相同（避免重複觸發）
- 「↺ 重新整理」：`disabled` 條件為載入中或尚未設定 folder ID
- 文件項目：點擊時顯示「開啟中…」並 `disabled` 全部項目，防止重複點擊

**開啟文件流程：**

```
點擊文件 → onOpenFile(fileId, fileName)
  → downloadFileContent(token, fileId)
  → lastSourceRef.current = 'source'（觸發 Source→TipTap 同步路徑）
  → setMarkdown(content)
  → 關閉側欄
```

刻意走「Source 欄更新」路徑（而非直接呼叫 `editor.setContent`），使雙向同步邏輯保持統一。

---

## 8. Header UI 整合

Header 依登入狀態切換兩種呈現：

**未登入：**
```
[🔑 Google 登入]
```

**已登入：**
```
[📁 Drive 文件]   使用者名稱   [登出]
```

使用者名稱欄位設有 `max-width: 180px + text-overflow: ellipsis`，防止長名稱撐開 header 版面。

---

## 9. 開發環境問題排解

### 問題：dev server port 不固定

**現象：** 若 4200 被佔用，Vite 自動改用其他 port，導致 GCP Console 設定的 Authorized JavaScript Origins（`http://localhost:4200`）失效，OAuth 彈窗報 `redirect_uri_mismatch` 錯誤。

**修正：** `vite.config.mts` 加入 `strictPort: true`，強制使用 4200，被佔用時直接報錯，明確提示使用者釋放 port。

```ts
server: {
  port: 4200,
  host: 'localhost',
  strictPort: true,
}
```

### 問題：`.md` 檔案無法列出

詳見第 5-2 節。

---

## 10. 安全性總結

| 項目 | 措施 |
|---|---|
| Client ID 不硬編碼 | 透過 `VITE_GOOGLE_CLIENT_ID` env var 注入，`.env.local` 不進版本庫 |
| Access Token 儲存 | `sessionStorage`（tab 關閉即清除） |
| Token 傳遞 | Authorization header，不附加於 URL |
| Token Revoke | 登出時呼叫 `google.accounts.oauth2.revoke` |
| GCP 設定 | Authorized JavaScript Origins 限制為 `http://localhost:4200`（正式部署需更新為正式網域） |
| XSS | Drive API 下載的 Markdown 文字透過 TipTap → `editor.setContent` 解析，不直接 `innerHTML` 插入 DOM |
