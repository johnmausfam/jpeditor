# 日文講義 Markdown 編輯器 — 需求變更文件

**版本：** 1.3.0
**日期：** 2026-05-03
**基準版本：** change-requirements-2.md v1.2.0（CR-1 ～ CR-6 已完成）
**對象：** 前端開發人員

---

## 變更摘要

| 編號 | 類別     | 變更項目         | 優先度 |
| ---- | -------- | ---------------- | ------ |
| CR-7 | 閱讀體驗 | 新增網頁瀏覽模式 | 中     |

---

## CR-7　網頁瀏覽模式（Preview Mode）

### 7.1 背景

目前編輯器提供三種版面模式（雙欄 / WYSIWYG / 原始碼），均以「編輯」為目的。使用者在整理完講義後，若想閱讀最終排版效果、或示範給學生看，現有任何模式都會顯示編輯用 UI（工具列、游標、選取控點、pane 標籤等），干擾閱讀體驗。

本次新增**瀏覽模式（Preview Mode）**，提供接近網頁出版品的純閱讀視角：全寬排版、無任何編輯 UI，供講師確認成品或展示用。

---

### 7.2 功能需求

#### 7.2.1 模式定義

| 項目 | 描述 |
| ---- | ---- |
| 模式識別字 | `'preview'`（擴充現有 `ViewMode` 型別） |
| 入口 | 工具列版面模式群組新增第四個按鈕「瀏覽」 |
| 離開 | 點擊預覽區右上角懸浮的「✎ 編輯」按鈕，回到進入瀏覽模式前的上一個模式 |

**`ViewMode` 型別更新：**

```ts
// 修改前
export type ViewMode = 'split' | 'wysiwyg' | 'source';

// 修改後
export type ViewMode = 'split' | 'wysiwyg' | 'source' | 'preview';
```

#### 7.2.2 版面行為

| 狀態 | 顯示內容 |
| ---- | -------- |
| 進入瀏覽模式 | 工具列**隱藏**；編輯器區域（雙欄 pane）**隱藏**；`PreviewPane` 元件佔滿整個 main 區域 |
| 退出瀏覽模式 | 工具列**恢復**；`PreviewPane` **隱藏**；回到先前的 split/wysiwyg/source 排版 |

Header（含 ☰ 抽屜按鈕、檔名、💾 儲存、⚙️ 設定）在瀏覽模式中**保持可見**，維持存檔與設定的可及性。

StatusBar 在瀏覽模式中**保持可見**。

#### 7.2.3 `PreviewPane` 元件

| 項目 | 描述 |
| ---- | ---- |
| 元件路徑 | `web/src/app/components/PreviewPane/PreviewPane.tsx` |
| 渲染方式 | 使用 TipTap `editor.getHTML()` 取得當前完整 HTML，以 `dangerouslySetInnerHTML` 注入容器；需使用 [DOMPurify](https://github.com/cure53/DOMPurify) 消毒，防止 XSS |
| 字型 | 沿用 `fontFamily` store 設定，套用與 WysiwygEditor 相同的字型 class（`sans` / `serif`） |
| 容器寬度 | 最大寬度 **860px**，水平置中（`margin: 0 auto`），左右 padding `48px` |
| 背景 | `#ffffff`，整個 main 區域背景 `#f8f9fa`（與現有 pane 一致） |
| 捲動 | `overflow-y: auto`，獨立捲動軸 |

**「✎ 編輯」懸浮按鈕：**

| 項目 | 描述 |
| ---- | ---- |
| 位置 | 相對 main 區域，固定在右下角（`position: fixed`，`bottom: 48px`，`right: 24px`，避開 StatusBar） |
| 樣式 | 圓角方形，深色背景，白色文字，輕微陰影 |
| 行為 | 點擊後呼叫 `setViewMode(previousMode)`，回到進入瀏覽模式前的模式 |

#### 7.2.4 支援的內容類型

以下所有在 WYSIWYG 模式中已正確渲染的內容，在瀏覽模式下應同樣正確顯示（藉由直接重用 TipTap 的 HTML 輸出）：

| 內容類型 | 備註 |
| -------- | ---- |
| 標題（H1–H3） | — |
| 粗體、斜體、底線、刪除線 | — |
| 文字顏色、螢光筆底色 | — |
| 清單（有序 / 無序） | — |
| 引言（blockquote） | — |
| 程式碼（inline / block） | — |
| 表格 | — |
| 振假名（ruby） | `<ruby>/<rt>` 標籤直接輸出 |
| 圖片 | URL 圖片；base64 圖片 |
| 超連結 | 瀏覽模式中連結應**可點擊**（`target="_blank"` + `rel="noopener noreferrer"`） |
| YouTube 嵌入 | `<iframe>` 直接輸出，保留 `sandbox` 屬性 |

**注意**：DOMPurify 預設會移除 `<iframe>`。需以 `ADD_TAGS: ['iframe']` 並配合 `ADD_ATTR` 白名單允許 YouTube embed URL，但嚴格限制 `src` 只允許 `https://www.youtube.com/embed/` 前綴。詳見 7.3 安全性考量。

#### 7.2.5 進入瀏覽模式前的模式記憶

```ts
// EditorLayout 中追蹤上一個非 preview 模式
const [prePreviewMode, setPrePreviewMode] = useState<'split' | 'wysiwyg' | 'source'>('split');

// 工具列切換至 preview 前儲存
const handleSetViewMode = (mode: ViewMode) => {
  if (mode === 'preview' && viewMode !== 'preview') {
    setPrePreviewMode(viewMode as 'split' | 'wysiwyg' | 'source');
  }
  setViewMode(mode);
};
```

「✎ 編輯」按鈕呼叫 `handleSetViewMode(prePreviewMode)` 而非直接呼叫 store 的 `setViewMode`。

---

### 7.3 安全性考量

| 威脅 | 對策 |
| ---- | ---- |
| XSS（透過 `dangerouslySetInnerHTML`） | 使用 **DOMPurify**（`dompurify` npm 套件）消毒所有 HTML |
| 惡意 `<iframe>` src | DOMPurify 設定 `ADD_TAGS: ['iframe']`，同時以 `ALLOWED_ATTR` 限制 `src` 只允許符合 `/^https:\/\/(www\.)?youtube\.com\/embed\//` 的值；其他 iframe 一律移除 |
| `javascript:` 連結 | DOMPurify 預設已阻擋；`href` 只允許 `https:` / `http:` |

**DOMPurify 設定範例：**

```ts
import DOMPurify from 'dompurify';

const ALLOWED_IFRAME_SRC = /^https:\/\/(www\.)?youtube\.com\/embed\//;

const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
  ADD_TAGS: ['iframe'],
  ADD_ATTR: ['allowfullscreen', 'sandbox', 'src', 'width', 'height'],
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  FORBID_ATTR: [],
  // Hook: iframe src の検証
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM: false,
  IN_PLACE: false,
  FORCE_BODY: false,
});

// DOMPurify afterSanitizeAttributes hook で iframe src を検証
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'IFRAME') {
    const src = node.getAttribute('src') ?? '';
    if (!ALLOWED_IFRAME_SRC.test(src)) {
      node.removeAttribute('src');
    }
    // Enforce sandbox
    node.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation');
  }
  // Enforce target="_blank" rel on links
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});
```

> Hook 應在 `PreviewPane` 元件的模組初始化時（import 時）設置一次，避免重複登錄。

---

### 7.4 新增套件

| 套件 | 用途 |
| ---- | ---- |
| `dompurify` | HTML 消毒，防止 XSS |
| `@types/dompurify` | TypeScript 型別定義 |

---

### 7.5 受影響的元件

| 元件 / 檔案 | 異動 |
| ----------- | ---- |
| `web/src/app/store/editorStore.ts` | `ViewMode` 型別加入 `'preview'` |
| `web/src/app/components/Toolbar/Toolbar.tsx` | 版面模式按鈕群組加入「瀏覽」選項；`preview` 模式時整個工具列以 `display: none` 隱藏（由 EditorLayout 控制，Toolbar 本身不需感知） |
| `web/src/app/components/EditorLayout/EditorLayout.tsx` | 新增 `prePreviewMode` state；`preview` 模式時隱藏 Toolbar 與編輯器 pane；渲染 `<PreviewPane>`；傳入 `onEdit` callback |
| `PreviewPane`（新元件） | HTML 渲染 + DOMPurify 消毒 + 「✎ 編輯」懸浮按鈕 |
| `PreviewPane.module.css`（新檔） | 文件排版樣式、懸浮按鈕樣式 |

---

### 7.6 實作順序

```
CR-7a  安裝 dompurify + @types/dompurify
  ↓
CR-7b  editorStore.ts：ViewMode 加入 'preview'
  ↓
CR-7c  PreviewPane 元件（DOMPurify 消毒、文件排版 CSS）
  ↓
CR-7d  EditorLayout：prePreviewMode state + 條件渲染 + Toolbar 隱藏
  ↓
CR-7e  Toolbar：新增「瀏覽」按鈕（並驗證 active 狀態正確）
```

---

### 7.7 不在本次範圍內

- 將預覽內容匯出為 PDF 或 HTML 檔案
- 列印版面優化（`@media print`）
- 自訂預覽主題（深色 / 淺色）
- 預覽內容的超連結開啟行為設定

---

_本文件為需求變更草案 v1.3.0，請確認後開始實作。_
