# 日文講義 Markdown 編輯器 — 需求與建議書

**版本：** 1.0.0
**日期：** 2026-05-03
**對象：** 前端開發人員

---

## 1. 專案概述

本專案目標是開發一套 **WYSIWYG（所見即所得）富文字編輯應用程式**，以 Markdown 作為底層儲存格式，專門用於製作日文講義教材。

主畫面採**雙欄版面**：左欄為 WYSIWYG 編輯器（使用者直接在渲染後的畫面上操作，無需手寫 Markdown 語法），右欄即時同步顯示對應的 Markdown 原始碼，供進階使用者直接修改。除此之外，需整合振假名標注、日文排版樣式、Google 雲端硬碟儲存，以及圖片嵌入等進階功能。

---

## 2. 功能需求

### 2.1 Markdown 核心編輯器

| 項目              | 描述                                                                      |
| ----------------- | ------------------------------------------------------------------------- |
| WYSIWYG 編輯      | 左欄為所見即所得編輯器，使用者直接在格式化後的畫面上操作，無需手寫語法    |
| Markdown 原始碼欄 | 右欄即時同步顯示並可直接編輯對應的 Markdown 原始碼；兩欄雙向同步          |
| 雙向同步          | WYSIWYG 欄與原始碼欄互相即時更新（debounce 處理，避免頻繁 re-render）     |
| 版面切換          | 支援「雙欄」、「純 WYSIWYG」、「純原始碼」三種檢視模式                    |
| 標準語法          | 支援 CommonMark / GFM（標題、粗體、斜體、清單、表格、程式碼區塊、引言等） |
| 工具列            | 提供快捷按鈕對應常用格式操作，直接作用於 WYSIWYG 層                       |
| 快捷鍵            | 支援 Ctrl+B、Ctrl+I、Ctrl+Z/Y 等標準操作                                  |
| 字元計數          | 即時顯示字數與行數                                                        |

---

### 2.2 振假名（ルビ）標注

#### 功能描述

選取文字後，可透過工具列按鈕或右鍵選單，為選取段落添加振假名（読み仮名）。

#### 技術規格

- **儲存格式：** 採用擴充 Markdown 語法，相容於常見 Ruby HTML 標籤：
  ```
  {漢字|ふりがな}
  ```
  例：`{日本語|にほんご}` → 渲染為 `<ruby>日本語<rt>にほんご</rt></ruby>`
- **輸入方式：**
  1. 選取目標文字
  2. 點擊工具列「ふ」按鈕，或按 `Ctrl+R`
  3. 跳出對話框輸入假名讀音
  4. 確認後自動套用語法並更新預覽
- **預覽渲染：** 使用 `<ruby>` / `<rt>` HTML 標籤正確渲染振假名，並調整字型大小比例

#### 建議套件

- `markdown-it` + 自訂 plugin（`markdown-it-ruby` 或自行實作 token 規則）

---

### 2.3 文字樣式功能

#### 支援樣式

| 樣式               | 工具列圖示 | 儲存方式                 | 範例                                                  |
| ------------------ | ---------- | ------------------------ | ----------------------------------------------------- |
| 文字顏色           | 🎨 A       | HTML inline style        | `<span style="color:#FF0000">文字</span>`             |
| 文字底色（螢光筆） | 🖍         | HTML inline style        | `<span style="background-color:#FFFF00">文字</span>`  |
| 底線               | U          | HTML inline style        | `<span style="text-decoration:underline">文字</span>` |
| 刪除線             | ~~S~~      | 標準 Markdown `~~text~~` | `~~文字~~`                                            |
| 粗體               | **B**      | 標準 Markdown `**text**` | `**文字**`                                            |
| 斜體               | _I_        | 標準 Markdown `*text*`   | `*文字*`                                              |

#### 操作流程

1. 選取文字
2. 點擊工具列對應按鈕
3. 顏色類功能開啟顏色選擇器（Color Picker），使用者選色後套用
4. 原始碼以 HTML inline 嵌入 Markdown，渲染引擎需啟用 HTML 解析（`markdown-it` 的 `html: true` 選項）

---

### 2.4 日文字形支援

#### 需求

- 預設使用適合日文閱讀的 Web Font
- 振假名字體需清晰可讀
- 支援全形／半形字元正確對齊

#### 建議字形方案

| 用途           | 建議字形                          |
| -------------- | --------------------------------- |
| 內文（明朝體） | Noto Serif JP（Google Fonts）     |
| 內文（黑體）   | Noto Sans JP（Google Fonts）      |
| 編輯區等寬     | Source Han Code JP / BIZ UDGothic |

#### 實作建議

```html
<!-- index.html 引入 -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link
  href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&family=Noto+Serif+JP:wght@400;700&display=swap"
  rel="stylesheet"
/>
```

- CSS 預覽區套用 `font-family: 'Noto Sans JP', sans-serif`
- 提供字形切換選項（黑體 / 明朝體）
- `line-height` 建議設為 `1.8` 以上，確保振假名有足夠空間

---

### 2.5 Google 雲端硬碟整合

#### 功能清單

| 功能            | 描述                                                   |
| --------------- | ------------------------------------------------------ |
| Google 帳號登入 | 使用 OAuth 2.0 進行身份驗證                            |
| 瀏覽指定目錄    | 讀取使用者 Google Drive 中的特定資料夾，顯示為文件列表 |
| 開啟文件        | 點擊列表中的 `.md` 檔案，載入至編輯器                  |
| 儲存文件        | 將目前編輯內容存回 Google Drive（新建或覆寫）          |
| 另存新檔        | 指定目標目錄與檔名另存                                 |
| 登出            | 清除 Token，回到未登入狀態                             |

#### 技術規格

**認證流程：**

- 採用 **Google OAuth 2.0（PKCE flow）**，不在前端儲存 Client Secret
- 使用 `@react-oauth/google` 或 Google Identity Services（GIS）SDK
- Token 存放於 `sessionStorage`（頁面關閉即清除），不使用 `localStorage` 以降低 XSS 風險

**Drive API 操作：**

- 使用 **Google Drive API v3**（REST）
- 目錄讀取：`GET /drive/v3/files?q='<folderId>'+in+parents+and+mimeType='text/plain'`
- 讀取檔案：`GET /drive/v3/files/{fileId}?alt=media`
- 建立檔案：`POST /upload/drive/v3/files?uploadType=multipart`
- 更新檔案：`PATCH /upload/drive/v3/files/{fileId}?uploadType=multipart`

**所需 OAuth Scope：**

```
https://www.googleapis.com/auth/drive.file
```

> `drive.file` scope 僅允許存取由本應用建立或明確開啟的檔案，符合最小權限原則。

**目錄設定：**

- 使用者首次登入後，可設定一個「預設工作目錄」（Folder ID 或路徑）
- 設定值存於 `localStorage`（非敏感資料）
- 不同帳號登入時，自動切換至該帳號下的對應設定

#### 安全性注意事項

- GCP Console 須限制 Authorized JavaScript origins 為正式網域
- 不得在前端程式碼中硬編碼 API Key 或 Client Secret
- 存取 Token 的有效期間約 1 小時，需實作 silent refresh 或提示使用者重新登入

---

### 2.6 圖片插入

#### 支援方式

| 方式               | 操作                     | 儲存格式                    |
| ------------------ | ------------------------ | --------------------------- |
| 網址插入           | 輸入外部圖片 URL         | 標準 Markdown `![alt](url)` |
| 貼上圖片（剪貼簿） | 在編輯區 Ctrl+V 貼上圖片 | Base64 Data URI 嵌入        |
| 拖曳上傳           | 拖曳本機圖片至編輯區     | Base64 Data URI 嵌入        |

#### 技術規格

- 監聽 `paste` 事件，偵測 `ClipboardEvent.clipboardData.items` 中的 `image/*` 類型
- 使用 `FileReader.readAsDataURL()` 轉換為 Base64
- 自動插入 `![圖片](data:image/png;base64,...)` 語法至游標位置
- 建議限制單張圖片大小上限（例如 5 MB），並在超過時顯示警告
- 圖片預覽渲染須允許 `<img>` 標籤（markdown-it `html: true`）

---

## 3. 技術架構建議

### 3.1 技術棧

| 層次               | 建議技術                                                                                                                                                  |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI 框架            | React 18 + TypeScript（現有 Nx 專案）                                                                                                                     |
| WYSIWYG 編輯器核心 | [TipTap 2](https://tiptap.dev/)（基於 ProseMirror，支援豐富擴充）或 [Slate.js](https://www.slatejs.org/)（建議 TipTap，生態系完整且有官方 Markdown 擴充） |
| 原始碼欄編輯器     | [CodeMirror 6](https://codemirror.net/)（輕量、支援 Markdown 語法高亮）                                                                                   |
| Markdown 序列化    | TipTap 內建 `@tiptap/extension-markdown`（或 `prosemirror-markdown`），負責 WYSIWYG ↔ Markdown 雙向轉換                                                  |
| 樣式               | CSS Modules（現有）+ Tailwind CSS 或 CSS Variables                                                                                                        |
| Google Auth        | Google Identity Services (GIS) SDK                                                                                                                        |
| Drive API          | Google API Client Library for JavaScript (`gapi`) 或直接 Fetch                                                                                            |
| 狀態管理           | Zustand（輕量）或 React Context                                                                                                                           |
| 建構工具           | Vite（現有）                                                                                                                                              |

### 3.2 專案結構建議

```
web/src/
├── app/
│   ├── components/
│   │   ├── Editor/           # 編輯器元件（CodeMirror wrapper）
│   │   ├── Preview/          # Markdown 預覽元件
│   │   ├── Toolbar/          # 工具列
│   │   ├── RubyDialog/       # 振假名輸入對話框
│   │   ├── ColorPicker/      # 顏色選擇器
│   │   ├── FileManager/      # Google Drive 文件列表
│   │   └── ImageInsert/      # 圖片插入元件
│   ├── hooks/
│   │   ├── useGoogleAuth.ts  # Google OAuth 邏輯
│   │   ├── useGoogleDrive.ts # Drive API 操作
│   │   └── useEditor.ts      # 編輯器狀態
│   ├── lib/
│   │   ├── markdownIt.ts     # markdown-it 實例與 plugin 設定
│   │   └── rubyPlugin.ts     # 振假名 markdown-it plugin
│   └── store/
│       └── editorStore.ts    # 全域狀態（Zustand）
```

### 3.3 Markdown 擴充語法策略

建議使用 `markdown-it` 搭配以下 plugin：

```ts
import MarkdownIt from 'markdown-it';
import markdownItRuby from './lib/rubyPlugin';

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });
md.use(markdownItRuby);
```

自訂 Ruby plugin 解析 `{漢字|ふりがな}` 語法，轉換為標準 HTML `<ruby>` 標籤。

---

## 4. 使用者介面設計建議

### 4.1 版面配置

```
┌─────────────────────────────────────────────────────────┐
│  [Logo]  [開新檔案] [Drive文件列表 ▼]      [帳號] [登出]  │  ← Header
├─────────────────────────────────────────────────────────┤
│ [H1][H2][H3] │ [B][I][U][S] │ [色▼][底色▼] │ [ふ] [🖼]  │  ← Toolbar
├──────────────────────┬──────────────────────────────────┤
│                      │                                  │
│  WYSIWYG 編輯區       │   Markdown 原始碼                 │
│  （所見即所得，        │   （CodeMirror，                  │
│   直接在格式化畫面操作）│    可直接編輯原始語法）             │
│                      │                                  │
│        ← 雙向即時同步 →                                   │
└──────────────────────┴──────────────────────────────────┘
│  字數：1234  行：56  │  字形：[黑體 ▼]  │  [儲存至Drive]  │  ← Footer
```

> **欄位說明：**
>
> - **左欄（WYSIWYG）**：主要操作區域。標題、粗體、表格等均以格式化方式呈現，工具列操作直接反映於此欄。
> - **右欄（原始碼）**：同步顯示目前文件的 Markdown 原始碼，進階使用者可直接在此修改語法，左欄自動更新。
> - 兩欄分隔線可拖曳調整寬度比例。

### 4.2 互動流程

**振假名標注流程：**

```
選取文字 → 點擊「ふ」→ 開啟 Modal → 輸入讀音 → 確認 → 插入語法 → 預覽更新
```

**Google Drive 開啟文件流程：**

```
點擊「文件列表」→ OAuth 登入（若未登入）→ 顯示目錄內容 → 點選檔案 → 載入至編輯器
```

**貼上圖片流程：**

```
Ctrl+V → 偵測圖片資料 → FileReader 轉 Base64 → 插入 Markdown 語法 → 預覽顯示圖片
```

---

## 5. 非功能性需求

| 項目     | 要求                                                                                     |
| -------- | ---------------------------------------------------------------------------------------- |
| 效能     | 文件大小 1 MB 以內，預覽渲染延遲 < 200ms（使用 debounce）                                |
| 相容性   | 支援 Chrome 最新版、Edge 最新版（主要使用場景）                                          |
| 安全性   | OAuth Token 不存於 localStorage；內容渲染需防範 XSS（markdown-it sanitize 或 DOMPurify） |
| 可存取性 | 工具列按鈕提供 `aria-label`；支援鍵盤操作                                                |
| 離線能力 | 暫不要求（Google Drive 功能需網路）                                                      |
| 多語系   | 介面以繁體中文為主，日文文件內容本地端渲染                                               |

---

## 6. 安全性補充說明

- **XSS 防護：** 因啟用 `html: true`，Markdown 渲染前須使用 [DOMPurify](https://github.com/cure53/DOMPurify) 過濾輸出 HTML，僅允許白名單標籤（`ruby`、`rt`、`span`、`img` 等）
- **Base64 圖片：** 限制允許的 MIME 類型（`image/png`、`image/jpeg`、`image/gif`、`image/webp`）
- **Drive API Token：** 使用 Authorization header 傳遞，不附加於 URL query string
- **GCP 設定：** 限制 OAuth Client 的 Authorized origins，避免 Token 被第三方網站濫用

---

## 7. 開發里程碑建議

| 階段    | 內容                                                      | 預估工時 |
| ------- | --------------------------------------------------------- | -------- |
| Phase 1 | 基礎 Markdown 編輯器（CodeMirror + markdown-it + 工具列） | 3–5 天   |
| Phase 2 | 振假名標注功能 + 日文字形整合                             | 2–3 天   |
| Phase 3 | 文字樣式（顏色、底色、底線）+ Color Picker                | 2 天     |
| Phase 4 | 圖片插入（URL + 貼上 Base64）                             | 1–2 天   |
| Phase 5 | Google Drive OAuth 登入 + 文件列表                        | 3–4 天   |
| Phase 6 | Google Drive 開啟 / 儲存 / 另存                           | 2–3 天   |
| Phase 7 | 整合測試、UI 調整、安全性審查                             | 2–3 天   |

---

## 8. 依賴套件清單

```jsonc
// package.json 主要新增依賴
{
  "dependencies": {
    // WYSIWYG 編輯器（TipTap + ProseMirror）
    "@tiptap/react": "^2.x",
    "@tiptap/starter-kit": "^2.x",
    "@tiptap/extension-underline": "^2.x",
    "@tiptap/extension-color": "^2.x",
    "@tiptap/extension-text-style": "^2.x",
    "@tiptap/extension-highlight": "^2.x",
    "@tiptap/extension-image": "^2.x",
    "@tiptap/extension-markdown": "^2.x", // WYSIWYG ↔ Markdown 雙向轉換
    // 原始碼欄編輯器（CodeMirror 6）
    "@codemirror/state": "^6.x",
    "@codemirror/view": "^6.x",
    "@codemirror/lang-markdown": "^6.x",
    // 安全性
    "dompurify": "^3.x",
    // 狀態管理
    "zustand": "^5.x",
    // Google 認證
    "@react-oauth/google": "^0.x", // 或直接使用 GIS script tag
  },
  "devDependencies": {
    "@types/dompurify": "^3.x",
  },
}
```

---

## 9. 開放問題與待確認事項

1. **GCP 專案設定：** 需確認是否已建立 Google Cloud Project 並啟用 Drive API，以及 OAuth Client ID 的申請狀態。
2. **Drive 目錄對應規則：** 「依帳號決定的可讀取目錄」是否有固定命名規則（如特定資料夾名稱），或由使用者自行設定？
3. **匯出格式：** 是否需要匯出為 PDF 或 HTML 以便列印講義？（若需要，可整合 `window.print()` 或 `puppeteer`/`wkhtmltopdf`）
4. **協作功能：** 是否需要多人同時編輯？（若需要，架構複雜度將大幅提升）
5. **振假名語法相容性：** `{漢字|ふりがな}` 語法是否需要相容其他現有工具（如 Obsidian、Typora）？
6. **版本控制：** 是否需要文件的版本歷史記錄？

---

_本文件為初版需求草案，待確認上述開放問題後進行第二版修訂。_
