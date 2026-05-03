# Phase 1 開發記錄 — 基礎 Markdown 編輯器

**日期：** 2026-05-03  
**階段：** Phase 1 — 基礎 WYSIWYG + 原始碼雙欄編輯器  
**預估工時：** 3–5 天  
**對應需求：** §2.1 Markdown 核心編輯器、§2.4 日文字形支援（部分）

---

## 目標

建立可運作的雙欄 Markdown 編輯器：左欄 WYSIWYG 所見即所得，右欄 CodeMirror 原始碼，兩者即時雙向同步。工具列提供常用格式快捷按鈕，底部狀態列顯示字數與行數。

---

## 環境設置

- Nx monorepo，既有 `web/` 應用（React 18 + TypeScript + Vite）
- 安裝主要套件：

```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit \
            @tiptap/extension-underline tiptap-markdown \
            @uiw/react-codemirror @codemirror/lang-markdown \
            dompurify zustand
npm install -D @types/dompurify
```

| 套件 | 版本策略 | 用途 |
|------|----------|------|
| `@tiptap/react` | ^2.x | WYSIWYG 編輯器核心（ProseMirror wrapper） |
| `@tiptap/starter-kit` | ^2.x | 一次啟用標題、粗體、斜體、清單等標準擴充 |
| `@tiptap/extension-underline` | ^2.x | 底線格式（StarterKit 不含） |
| `tiptap-markdown` | latest | TipTap ↔ Markdown 雙向序列化 |
| `@uiw/react-codemirror` | ^4.x | CodeMirror 6 的 React wrapper |
| `@codemirror/lang-markdown` | ^6.x | 原始碼欄 Markdown 語法高亮 |
| `dompurify` | ^3.x | XSS 防護（後續渲染使用） |
| `zustand` | ^5.x | 全域 UI 狀態管理 |

---

## 日文字型整合（index.html）

在 `web/index.html` 的 `<head>` 引入 Google Fonts，確保 WYSIWYG 區域有適合日文閱讀的字型：

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&family=Noto+Serif+JP:wght@400;700&display=swap"
  rel="stylesheet"
/>
```

- `lang="ja"` 設定於 `<html>` 標籤
- WYSIWYG 區域預設套用 Noto Sans JP（黑體），可在工具列切換為 Noto Serif JP（明朝體）

---

## 元件結構

```
app/
├── components/
│   ├── EditorLayout/       ← 主容器，管理所有編輯器狀態與版面
│   ├── WysiwygEditor/      ← TipTap EditorContent wrapper
│   ├── SourceEditor/       ← CodeMirror wrapper
│   ├── Toolbar/            ← 格式工具列
│   └── StatusBar/          ← 字數 / 行數 / 字型顯示
├── store/
│   └── editorStore.ts      ← Zustand store（viewMode, fontFamily）
└── app.tsx                 ← 根元件，直接渲染 <EditorLayout />
```

---

## 各元件實作說明

### `editorStore.ts`

以 Zustand 管理兩個全域 UI 狀態：

```ts
type ViewMode   = 'split' | 'wysiwyg' | 'source';
type FontFamily = 'sans' | 'serif';
```

刻意保持 store 輕量，不在此儲存 Markdown 內容本身（內容以 React state 管理於 `EditorLayout`，因為需與 TipTap editor 實例緊密耦合）。

---

### `WysiwygEditor.tsx`

TipTap `EditorContent` 的薄包裝，接受 `editor` 實例與 `fontFamily` prop。根據 fontFamily 套用不同 CSS class，切換 Noto Sans JP / Noto Serif JP：

```tsx
<div className={`${styles.container} ${fontFamily === 'serif' ? styles.serif : styles.sans}`}>
  <EditorContent editor={editor} className={styles.editorContent} />
</div>
```

CSS 中 `.serif` 套用 `font-family: 'Noto Serif JP', serif`，`.sans` 套用 `'Noto Sans JP', sans-serif`，並設 `line-height: 1.8` 為振假名預留空間（Phase 2 需要）。

---

### `SourceEditor.tsx`

使用 `@uiw/react-codemirror` 包裝 CodeMirror 6，設定：
- Markdown 語法高亮（`@codemirror/lang-markdown`）
- 自動換行（`EditorView.lineWrapping`）
- 字型為 BIZ UDGothic（等寬日文字型）
- 行號、高亮選取行

整個元件為受控元件（`value` + `onChange`），外部傳入目前 Markdown 字串。

---

### `Toolbar.tsx`

依功能分組，各組之間以分隔線區隔：

| 分組 | 按鈕 |
|------|------|
| 標題 | H1 / H2 / H3 |
| 文字格式 | **B**（粗體）/ _I_（斜體）/ U（底線）/ S（刪除線） |
| 程式碼與引言 | `</>` 行內程式碼 / `≡` 程式碼區塊 / `❝` 引言 |
| 清單 | `•≡` 項目清單 / `1.≡` 編號清單 |
| 分隔線 | `——` 水平分隔線 |
| 振假名 | `ふ`（Phase 2 接入，`onRuby` prop 回呼） |
| 字型切換 | 黑 / 明 |
| 版面模式 | 雙欄 / WYSIWYG / 原始碼 |

所有格式按鈕使用 `onMouseDown` + `e.preventDefault()` 而非 `onClick`，以避免按鈕點擊搶走 TipTap 的焦點，導致選取範圍遺失。

`isActive()` helper 查詢 TipTap `editor.isActive(name, attrs)` 決定按鈕的 `active` 樣式。

---

### `StatusBar.tsx`

顯示三項即時資訊：
- **字數**：`markdown.replace(/\s/g, '').length`（排除空白）
- **行數**：`markdown.split('\n').length`
- **字型**：從 Zustand store 讀取，顯示「黑體」或「明朝體」

---

### `EditorLayout.tsx`（核心）

最複雜的元件，負責：

#### TipTap 初始化

```ts
const editor = useEditor({
  extensions: [
    StarterKit,
    Underline,
    RubyExtension,           // Phase 2 新增
    Markdown.configure({ html: true, transformPastedText: true }),
  ],
  content: DEFAULT_CONTENT,
  onUpdate: ({ editor: ed }) => {
    const md = ed.storage.markdown.getMarkdown();
    lastSourceRef.current = 'wysiwyg';
    debouncedSetFromWysiwyg(md);
  },
});
```

`Markdown.configure({ html: true })` 允許 Markdown 中嵌入 HTML（後續 ruby 標籤與 span 樣式需要）。

#### 雙向同步機制

為防止兩欄互相觸發無限更新迴圈，以 `lastSourceRef` 追蹤最後更新來源：

```
WYSIWYG 變更 → onUpdate → setMarkdown（來源標記為 'wysiwyg'）
                                       ↓
                               useEffect 偵測到 markdown 改變
                               BUT lastSourceRef === 'wysiwyg'，跳過回寫 TipTap

Source 變更 → debouncedSetFromSource → setMarkdown（來源標記為 'source'）
                                                     ↓
                                             useEffect 偵測到改變
                                             lastSourceRef === 'source'，執行
                                             editor.commands.setContent(markdown, false)
                                                             ↑
                                             emitUpdate=false 防止再次觸發 onUpdate
```

兩個方向均套用 300 ms debounce，避免每次按鍵都觸發序列化 / 反序列化。

#### 可調整分欄寬度

以 `mousedown` / `mousemove` / `mouseup` 事件追蹤拖曳：
- 分欄比例範圍限制在 `[0.2, 0.8]`，避免任一欄過窄
- 左欄使用 `flexBasis` + `flexGrow:0` 固定寬度，右欄自動佔滿剩餘空間

#### 版面切換邏輯

```ts
const showWysiwyg = viewMode === 'split' || viewMode === 'wysiwyg';
const showSource  = viewMode === 'split' || viewMode === 'source';
```

---

## 遇到的問題與解決方案

### 問題 1：按鈕點擊搶走 TipTap 焦點，格式按鈕無法正常作用於選取範圍

**原因：** 使用 `onClick` 時，點擊按鈕會使編輯器失焦，導致 TipTap 清除選取。  
**解法：** 工具列所有格式按鈕改用 `onMouseDown` 並呼叫 `e.preventDefault()`，阻止焦點轉移。振假名按鈕（需要先取得選取內容）仍使用 `onClick`，由 `EditorLayout` 在打開 dialog 前先讀取 selection。

### 問題 2：Source editor 每次 keystroke 都觸發 TipTap 重新解析，導致游標跳動

**原因：** Source editor 的 `onChange` 直接呼叫 `editor.commands.setContent()`。  
**解法：** 加入 300 ms debounce，讓使用者停止輸入後才更新 TipTap。

### 問題 3：`tiptap-markdown` 序列化 `ruby` 節點為空字串

**原因：** `tiptap-markdown` 不知道如何序列化自訂節點。  
**解法：** 在 `RubyExtension` 中為 `tiptap-markdown` 的 markdown-it 實例添加 inline 解析規則，並讓序列化器輸出 `{text|reading}` 格式。此問題在 Phase 2 詳細處理。

---

## 建構驗證

```bash
npx nx build web
# Exit: 0 — 建構成功
```

---

## Phase 1 完成功能清單

- [x] TipTap WYSIWYG 編輯器（StarterKit + Underline）
- [x] CodeMirror 6 原始碼編輯器（Markdown 語法高亮）
- [x] WYSIWYG ↔ Markdown 雙向即時同步（debounce 300 ms）
- [x] 同步迴圈防護（`lastSourceRef` + `emitUpdate=false`）
- [x] 工具列：H1/H2/H3、B/I/U/S、程式碼、引言、清單、水平線
- [x] 版面切換：雙欄 / 純 WYSIWYG / 純原始碼
- [x] 可拖曳調整分欄寬度（比例限制 20%–80%）
- [x] 字型切換：Noto Sans JP（黑體）/ Noto Serif JP（明朝體）
- [x] 狀態列：即時字數、行數、目前字型
- [x] 全域狀態管理（Zustand）
- [x] 日文字型載入（Google Fonts）
- [x] `aria-label` 無障礙標記
- [x] 鍵盤快捷鍵（TipTap 內建：Ctrl+B / Ctrl+I / Ctrl+Z / Ctrl+Y 等）

---

## 下一步（Phase 2 預告）

- 實作 `RubyExtension`（自訂 TipTap Node）支援 `{漢字|ふりがな}` 語法
- 建立 `RubyDialog` 對話框（輸入、預覽、編輯模式）
- 工具列「ふ」按鈕與 `Ctrl+R` 快捷鍵接入
