# 日文講義 Markdown 編輯器 — 需求變更文件

**版本：** 1.1.0
**日期：** 2026-05-03
**基準版本：** requirements.md v1.0.0（Phases 1–6 已完成）
**對象：** 前端開發人員

---

## 變更摘要

| 編號 | 類別             | 變更項目                        | 優先度 |
| ---- | ---------------- | ------------------------------- | ------ |
| CR-1 | UX 動線改版      | 編輯器入口頁與開啟文件動線重構  | 高     |
| CR-2 | 設定功能         | 工作目錄 ID 設定集中管理        | 高     |
| CR-3 | 範本             | 可設定的新文件起始範本          | 中     |
| CR-4 | WYSIWYG 工具列   | 超連結、YouTube 嵌入、特殊符號  | 中     |

---

## CR-1　編輯器入口與開啟文件動線修改

### 1.1 背景

目前應用程式啟動後直接進入編輯器，缺少「從何處開始編輯」的明確入口。應新增一個啟動頁（Start Screen）或重新設計 Header 動線，讓使用者可以快速建立新文件、重開最近使用的檔案，或從 Google Drive 挑選舊檔。

### 1.2 功能需求

#### 1.2.1 新文件

| 項目 | 描述 |
| ---- | ---- |
| 按鈕 | Header 提供「＋ 新文件」按鈕，點擊即建立空白文件（或套用範本，見 CR-3） |
| 範本選項 | 按鈕旁提供一個 **Checkbox**「使用範本」；使用者可勾選 / 取消勾選 |
| 設定持久化 | 「使用範本」勾選狀態以 `localStorage` 鍵 `jpeditor.useTemplate` 儲存（`"true"` / `"false"`），下次進入應用時自動還原 |
| 預設值 | 首次使用時預設為 **未勾選** |

**行為邏輯：**

```
點擊「新文件」
  ├─ useTemplate = true  → 載入 template.md 內容至編輯器，清空 currentFileId/currentFileName
  └─ useTemplate = false → 清空編輯器（空白文件），清空 currentFileId/currentFileName
```

#### 1.2.2 最近開啟的檔案

| 項目 | 描述 |
| ---- | ---- |
| 顯示數量 | 最多保留 **10 筆**最近開啟記錄 |
| 觸發時機 | 每次成功開啟一個 Drive 檔案時，將該檔案的 `fileId` 與 `fileName` 寫入記錄 |
| 儲存位置 | `localStorage` 鍵 `jpeditor.recentFiles`，格式為 JSON 陣列，依時間倒序排列 |
| UI 位置 | Header「＋ 新文件」按鈕旁提供「最近檔案 ▾」下拉選單；清單內列出最多 10 筆，每列顯示檔名 |
| 點擊行為 | 點擊即呼叫現有的 `handleOpenDriveFile(fileId, fileName)` |
| 容錯 | 若某筆記錄的檔案已在 Drive 刪除，開啟失敗時顯示錯誤訊息，並從清單中移除該筆記錄 |
| 清除 | 提供「清除記錄」選項於下拉選單底部 |

**資料結構（`jpeditor.recentFiles`）：**

```jsonc
[
  { "fileId": "1Abc...", "fileName": "第1課講義.md", "openedAt": 1746518400000 },
  { "fileId": "2Def...", "fileName": "第2課單字表.md", "openedAt": 1746432000000 }
  // ...最多 10 筆
]
```

#### 1.2.3 開啟舊檔（Google Drive 列表）

- 現有「📁 Drive 文件」按鈕保留，功能不變。
- 點擊後開啟 DrivePanel（右側滑入面板），顯示指定工作目錄下的 `.md` 檔案列表。
- 未設定工作目錄時，面板內提示「請先在設定中設定工作目錄 ID」。

### 1.3 受影響的元件

| 元件 | 異動 |
| ---- | ---- |
| `EditorLayout.tsx` | 新增「新文件」按鈕邏輯、範本載入、`useTemplate` localStorage 讀寫 |
| `RecentFilesMenu`（新元件） | 下拉選單，讀寫 `jpeditor.recentFiles` |
| `googleDriveApi.ts` | 無須修改 |
| `driveStore.ts` | 開啟檔案成功後同步寫入最近記錄（可在 `setCurrentFile` 內或 `handleOpenDriveFile` handler 內處理） |

---

## CR-2　設定功能

### 2.1 背景

目前「工作目錄 ID」只能在 DrivePanel 面板中臨時輸入，缺乏集中的設定管理介面。應新增一個**設定對話框（Settings Dialog）**，讓使用者可以統一管理應用設定。

### 2.2 功能需求

#### 2.2.1 設定對話框

| 項目 | 描述 |
| ---- | ---- |
| 開啟方式 | Header 右側新增 ⚙️ 設定按鈕 |
| 儲存方式 | 點擊「儲存」立即寫入 `localStorage`；點擊「取消」或關閉不套用變更 |

#### 2.2.2 工作目錄 ID 設定

| 項目 | 描述 |
| ---- | ---- |
| 設定項名稱 | 預設工作目錄 ID |
| 說明文字 | 「輸入 Google Drive 資料夾的 ID（可從 Drive 網址列取得）」 |
| 儲存鍵 | `localStorage` 鍵 `jpeditor.folderId`（與現有 `driveStore` 的 `folderId` 共用同一 key） |
| 登入後自動帶入 | 使用者登入 Google 帳號後，DrivePanel 自動套用此設定值；若 localStorage 無值則欄位空白 |
| 驗證 | 非必填；若填寫，需為非空白字串，不做格式驗證（Drive Folder ID 格式多樣） |

#### 2.2.3 未來可擴充項目（本次不實作）

- 預設字型（黑體 / 明朝體）
- 自動儲存間隔
- 介面語言

### 2.3 受影響的元件

| 元件 | 異動 |
| ---- | ---- |
| `SettingsDialog`（新元件） | 設定對話框 UI 與邏輯 |
| `EditorLayout.tsx` | 加入 ⚙️ 按鈕與 SettingsDialog 渲染 |
| `driveStore.ts` | `setFolderId` 已有實作，無須修改；Settings 直接操作同一 localStorage key |
| `DrivePanel.tsx` | 移除現有的「目錄 ID」輸入欄位（改由 SettingsDialog 統一管理），或保留作為即時覆寫 |

---

## CR-3　範本 Markdown 內容

### 3.1 背景

講師建立新講義時，通常有固定的章節結構。提供一個可自訂的範本，讓使用者開新檔案時不必從空白開始。

### 3.2 功能需求

#### 3.2.1 範本檔案

| 項目 | 描述 |
| ---- | ---- |
| 檔案路徑 | `web/src/assets/template.md` |
| 管理方式 | 由開發者 / 講師手動編輯此檔案；不提供 UI 編輯入口（避免被編輯器內容覆蓋） |
| 載入方式 | 透過 Vite 的靜態資源引入：`import templateContent from '../assets/template.md?raw'` |
| 套用時機 | 使用者點擊「新文件」且「使用範本」為勾選狀態時（見 CR-1.2.1） |

#### 3.2.2 預設範本內容建議

```markdown
# 第　課　タイトル

**日期：**　　　　**班級：**　　　　**教師：**

---

## 學習目標

-
-
-

---

## 單字表

| 単語 | 読み方 | 意味 |
| ---- | ------ | ---- |
|      |        |      |

---

## 文法說明

### 文型 1：

**例句：**

> 

---

## 練習題

1.
2.
3.

---

## 課後作業

```

#### 3.2.3 注意事項

- `template.md` 應加入 `.gitignore` 排除，或標注為「本地自訂範本，請勿提交機敏內容」。
- 若 `template.md` 不存在（首次 clone 專案），`import` 會失敗；需提供預設 fallback 字串（可為空字串或內建最小範本）。

### 3.3 受影響的元件

| 元件 | 異動 |
| ---- | ---- |
| `web/src/assets/template.md` | 新增範本檔 |
| `EditorLayout.tsx` | 引入 `templateContent`，新文件時依 `useTemplate` 狀態決定初始內容 |

---

## CR-4　WYSIWYG 工具列新增功能

### 4.1 背景

現有工具列缺少超連結、影片嵌入、特殊符號等常見功能，影響講義製作效率。

### 4.2 功能需求

#### 4.2.1 超連結

| 項目 | 描述 |
| ---- | ---- |
| 工具列圖示 | 🔗（或文字「連結」） |
| 操作流程 | 1. 選取文字（可選）→ 2. 點擊連結按鈕 → 3. 彈出 LinkDialog（輸入 URL） → 4. 確認後插入 |
| 無選取文字時 | 對話框另提供「顯示文字」輸入欄；確認後插入 `[顯示文字](url)` |
| 有選取文字時 | 對話框僅顯示 URL 輸入欄；確認後將選取文字包裝為 `[選取文字](url)` |
| 取消連結 | 游標在連結上時，工具列連結按鈕呈 active 狀態；再次點擊或點擊「移除連結」按鈕可解除連結 |
| TipTap 擴充 | 使用 `@tiptap/extension-link`（`autolink: false`, `openOnClick: false`） |
| Markdown 儲存 | 標準 `[文字](url)` 語法 |
| 安全性 | 插入前驗證 URL 格式；禁止 `javascript:` 協定 |

#### 4.2.2 嵌入 YouTube 影片

| 項目 | 描述 |
| ---- | ---- |
| 工具列圖示 | ▶（或文字「影片」） |
| 操作流程 | 1. 點擊工具列「影片」按鈕 → 2. 彈出 YoutubeDialog（輸入 YouTube 網址或影片 ID） → 3. 確認後插入 |
| 渲染方式 | 在 WYSIWYG 區以 `<iframe>` 嵌入；Markdown 原始碼儲存為 HTML 標籤（需 `html: true`） |
| 嵌入格式（Markdown 儲存） | `<iframe src="https://www.youtube.com/embed/{videoId}" width="560" height="315" allowfullscreen></iframe>` |
| URL 解析 | 支援以下格式自動萃取 videoId：`youtu.be/{id}`、`youtube.com/watch?v={id}`、`youtube.com/embed/{id}` |
| TipTap 擴充 | 自訂 Node Extension（`YoutubeExtension`），使用 React NodeView 渲染 iframe |
| 安全性 | 僅允許 `youtube.com` 與 `youtu.be` 來源；禁止其他 domain 的 iframe |
| 尺寸 | 預設 560×315；未來可擴充為可調整大小（本次不要求） |

#### 4.2.3 插入特殊符號

| 項目 | 描述 |
| ---- | ---- |
| 工具列圖示 | 「①」按鈕（或下拉選單） |
| 必須包含的符號 | `①②③④⑤⑥⑦⑧⑨⑩` |
| 操作方式 | 點擊工具列按鈕後，展開符號選擇面板（Popover）；點擊符號即插入游標位置 |
| 擴充性 | 符號列表以常數陣列定義，便於未來增加其他符號群組（例如箭頭、日文標點） |
| Markdown 儲存 | Unicode 字元直接嵌入文字，無需特殊語法 |

### 4.3 受影響的元件

| 元件 | 異動 |
| ---- | ---- |
| `Toolbar.tsx` | 新增連結、影片、特殊符號三個工具列按鈕 |
| `LinkDialog`（新元件） | URL 與顯示文字輸入 Modal |
| `YoutubeDialog`（新元件） | YouTube 網址輸入 Modal |
| `SymbolPicker`（新元件） | 特殊符號 Popover 面板 |
| `YoutubeExtension.ts`（新檔） | TipTap 自訂 Node Extension |
| `EditorLayout.tsx` | 新增 extensions 陣列中加入 `Link`、`YoutubeExtension`；新增 Dialog state 與 handler |

### 4.4 新增套件

| 套件 | 用途 |
| ---- | ---- |
| `@tiptap/extension-link` | 超連結擴充 |

> YouTube 嵌入採自訂 Extension，不依賴 `@tiptap/extension-youtube`（避免版本相依問題）。

---

## 實作順序建議

考量依賴關係，建議依下列順序開發：

```
CR-2 設定對話框（工作目錄 ID）
  ↓
CR-1 入口動線（新文件 + 最近檔案 + 依賴 CR-2 的目錄設定）
  ↓
CR-3 範本（依賴 CR-1 的新文件流程）
  ↓
CR-4 工具列新功能（獨立，可平行開發）
```

---

## 不在本次變更範圍內

- 離線編輯 / Service Worker 快取
- 多人協作
- PDF / HTML 匯出
- 文件版本歷史
- 自動儲存（Auto Save）

---

_本文件為需求變更草案 v1.1.0，請確認後開始分階段實作。_
