# Phase 2 開發記錄 — 振假名標注功能 + 日文字形整合

**日期：** 2026-05-03  
**階段：** Phase 2 — 振假名（ルビ）標注 + 日文排版完善  
**預估工時：** 2–3 天  
**對應需求：** §2.2 振假名標注、§2.4 日文字形支援

---

## 目標

讓使用者能夠選取 WYSIWYG 編輯器中的文字，為其添加振假名（ふりがな）注音。振假名以 `{漢字|ふりがな}` 格式儲存於 Markdown，並在 WYSIWYG 欄以 HTML `<ruby>/<rt>` 標籤正確渲染。支援新增、編輯（雙擊），以及 `Ctrl+R` 鍵盤快捷鍵。

---

## 新增檔案

```
app/
├── components/
│   └── RubyDialog/
│       ├── RubyDialog.tsx          ← 振假名輸入對話框
│       └── RubyDialog.module.css
└── lib/
    └── rubyExtension.ts            ← TipTap 自訂 Node 擴充
```

---

## 技術設計

### 資料流

```
使用者選取文字
      ↓
點擊工具列「ふ」或按 Ctrl+R
      ↓
EditorLayout.openRubyDialog()
  讀取 editor.state.selection → selectedText
      ↓
<RubyDialog> 開啟
  使用者輸入讀音 → 點擊「套用」
      ↓
editor.chain().setRuby({ text, reading }).run()
      ↓
TipTap 插入 ruby node（替換原選取文字）
      ↓
tiptap-markdown 序列化 → {text|reading} 寫入 Markdown 狀態
      ↓
CodeMirror 原始碼欄即時更新
```

---

## `RubyExtension`（`lib/rubyExtension.ts`）

### 節點定義

```ts
Node.create({
  name: 'ruby',
  group: 'inline',
  inline: true,
  atom: true,     // 視為不可分割的單一單元
  draggable: false,
  // ...
})
```

- `atom: true`：整個 ruby 節點作為單一原子操作，游標無法進入其內部。
- `group: 'inline'`：可插入段落行內任何位置，與一般文字混排。

### HTML 解析（`parseHTML`）

```ts
parseHTML() {
  return [{
    tag: 'ruby',
    getAttrs: (element) => {
      const rt = element.querySelector('rt');
      const reading = rt?.textContent?.trim() ?? '';
      const text = Array.from(element.childNodes)
        .filter((n) => n.nodeName !== 'RT')
        .map((n) => n.textContent ?? '')
        .join('').trim();
      return { text, reading };
    },
  }];
}
```

從 HTML 中讀取 `<ruby>` 標籤，分別提取本文（排除 `<rt>` 節點）和讀音。

### HTML 渲染（`renderHTML`）

```ts
renderHTML({ node }) {
  return ['ruby', {}, node.attrs.text, ['rt', {}, node.attrs.reading]];
}
```

TipTap 的宣告式 renderHTML DSL，輸出 `<ruby>text<rt>reading</rt></ruby>`。

---

## 自訂 NodeView — 解決拖曳與選取問題

TipTap 預設 atom node 的 NodeView 會在被選取時加上 `draggable="true"`，導致使用者意外拖曳節點而非點選。為修正此行為，實作手動 NodeView：

```ts
addNodeView() {
  return (props) => {
    const ruby = document.createElement('ruby');

    const buildDOM = (text, reading) => {
      ruby.innerHTML = '';
      ruby.appendChild(document.createTextNode(text));
      const rt = document.createElement('rt');
      rt.textContent = reading;
      ruby.appendChild(rt);
    };

    buildDOM(node.attrs.text, node.attrs.reading);

    return {
      dom: ruby,
      update(updatedNode) { /* 重建 DOM */ },
      selectNode()   { ruby.classList.add('ProseMirror-selectednode'); },
      deselectNode() { ruby.classList.remove('ProseMirror-selectednode'); },
      stopEvent(event) { return event.type === 'dragstart'; }, // 阻擋拖曳
    };
  };
}
```

### 雙擊編輯（Edit Mode）

NodeView 監聽 `dblclick` 事件，透過 `CustomEvent` 通知 React 層：

```ts
ruby.addEventListener('dblclick', (e) => {
  e.preventDefault();
  e.stopPropagation();
  const pos = typeof getPos === 'function' ? (getPos() ?? -1) : -1;
  document.dispatchEvent(new CustomEvent('jpeditor:edit-ruby', {
    detail: { text: node.attrs.text, reading: node.attrs.reading, pos },
  }));
});
```

採用 `document.dispatchEvent` 的自訂事件橋接模式，是因為 NodeView 存在於 ProseMirror DOM 中，無法直接呼叫 React state setter。`EditorLayout` 監聽此事件，取得節點位置（`pos`）後以編輯模式開啟 `RubyDialog`。

---

## 命令系統

```ts
addCommands() {
  return {
    // 插入模式：刪除選取後插入新 ruby node
    setRuby: (attrs) => ({ chain }) => {
      return chain().focus().deleteSelection().insertContent({
        type: 'ruby',
        attrs,
      }).run();
    },

    // 編輯模式：以新 ruby node 替換指定位置的舊節點
    editRuby: (attrs) => ({ tr, dispatch, state }) => {
      if (dispatch) {
        const rubyNode = state.schema.nodes['ruby'].create({
          text: attrs.text,
          reading: attrs.reading,
        });
        tr.replaceWith(attrs.pos, attrs.pos + 1, rubyNode);
        dispatch(tr);
      }
      return true;
    },
  };
}
```

`editRuby` 透過 `tr.replaceWith(pos, pos + 1, newNode)` 直接操作 ProseMirror transaction，精確替換單一 atom node（atom node 在 document 中永遠佔 1 個位置）。

---

## 鍵盤快捷鍵

```ts
addKeyboardShortcuts() {
  return {
    'Mod-r': () => {
      document.dispatchEvent(new CustomEvent('jpeditor:open-ruby'));
      return true; // 攔截瀏覽器預設的 Ctrl+R（重新整理）
    },
  };
}
```

回傳 `true` 告知 TipTap 已處理此快捷鍵，阻止事件繼續冒泡。

---

## Markdown 雙向序列化整合（tiptap-markdown）

`tiptap-markdown` 透過 `addStorage().markdown` 介面讓自訂節點參與序列化與解析。

### 序列化（TipTap → Markdown）

```ts
serialize(state, node) {
  state.write(`{${node.attrs.text}|${node.attrs.reading}}`);
}
```

當 `tiptap-markdown` 遍歷 document tree 時，遇到 `ruby` 節點呼叫此函式，輸出 `{漢字|ふりがな}` 語法。

### 解析（Markdown → TipTap）

`tiptap-markdown` 底層使用 `markdown-it` 解析 Markdown。透過 `parse.setup()` hook 在 markdown-it 實例上新增 inline 解析規則：

```
{漢字|ふりがな}  →  <ruby>漢字<rt>ふりがな</rt></ruby>  →  TipTap ruby node
```

解析器邏輯：
1. 偵測 `{` 起始字元（charCode 0x7B）
2. 向前搜尋 `|`（pipePos）與 `}`（end），遇換行符即放棄
3. text = `src[pos+1 … pipePos-1]`，reading = `src[pipePos+1 … end-1]`
4. 兩段均不得為空
5. 推入 `ruby_inline` token，由 renderer 輸出 `<ruby>` HTML
6. TipTap 的 `parseHTML` 規則再將 HTML 轉回 ruby node

防重複注冊保護：以 `md.__rubyAdded` flag 確保同一 markdown-it 實例不重複添加規則（`setup` 在每次 parse 前都會被呼叫）。

---

## `RubyDialog` 元件

### Props

```ts
interface RubyDialogProps {
  open: boolean;
  selectedText: string;         // 要標注的文字（唯讀顯示）
  initialReading?: string;      // 編輯模式時預填的讀音
  isEditing?: boolean;          // 切換標題文字（「標注」vs「編輯」）
  onConfirm: (reading: string) => void;
  onCancel: () => void;
}
```

### 功能特點

| 功能 | 實作方式 |
|------|----------|
| 即時預覽 | `<ruby>selectedText<rt>{reading || 'よみかた'}</rt></ruby>` |
| 自動聚焦 | `useEffect` 監聽 `open`，以 50ms setTimeout 呼叫 `inputRef.current?.focus()` |
| 編輯預填 | `useEffect` 在 `open` 時將 `initialReading` 寫入 local state |
| 鍵盤操作 | Enter → 套用；Escape → 取消 |
| 確認保護 | `canConfirm = reading.trim().length > 0 && selectedText.trim().length > 0` |
| 點擊遮罩關閉 | overlay `onClick={onCancel}`，dialog 本身 `stopPropagation` |
| 無障礙 | `role="dialog"`, `aria-modal="true"`, `aria-label="振假名標注"` |

---

## `EditorLayout` 整合更新

### 新增狀態

```ts
const [rubyDialogOpen, setRubyDialogOpen]       = useState(false);
const [rubySelectedText, setRubySelectedText]   = useState('');
const [rubyInitialReading, setRubyInitialReading] = useState('');
const [rubyEditPos, setRubyEditPos]             = useState(-1); // -1 = 插入模式
```

`rubyEditPos === -1` 表示新增模式，`>= 0` 表示編輯模式（存放該 ruby node 在 document 中的位置索引）。

### 事件監聽

```ts
// Ctrl+R 快捷鍵（由 RubyExtension keyboard handler 發出）
document.addEventListener('jpeditor:open-ruby', handler);

// 雙擊現有 ruby node（由 NodeView dblclick 發出）
document.addEventListener('jpeditor:edit-ruby', handler);
```

透過 `useRef` 保持事件 handler 持有最新版 `openRubyDialog`，避免 closure 陳舊問題：

```ts
const openRubyDialogRef = useRef(openRubyDialog);
useEffect(() => { openRubyDialogRef.current = openRubyDialog; }, [openRubyDialog]);
```

### 確認回呼

```ts
const handleRubyConfirm = (reading: string) => {
  if (rubyEditPos >= 0) {
    // 編輯模式：替換既有 ruby node
    editor.chain().focus().editRuby({ pos: rubyEditPos, text: rubySelectedText, reading }).run();
  } else {
    // 插入模式：以選取文字建立新 ruby node
    editor.chain().focus().setRuby({ text: rubySelectedText, reading }).run();
  }
  // 重置所有 dialog 狀態
};
```

---

## 日文字形整合（完善）

Phase 1 已載入 Google Fonts，Phase 2 在 CSS 層面補完細節：

- WYSIWYG 編輯區 `line-height: 1.8`，確保 `<rt>` 振假名文字有足夠垂直空間，不與上行文字重疊
- `ruby` 元素 `ruby-align: center`
- `rt` 元素字型大小設為本文的 50%（`font-size: 0.5em`）
- `RubyDialog` 預覽區套用與 WYSIWYG 相同的日文字型，讓預覽所見即所得

---

## 遇到的問題與解決方案

### 問題 1：atom node 在選取時變為可拖曳，意外觸發 ProseMirror 的拖曳行為

**原因：** TipTap 預設在 atom node 被選取時設定 `draggable="true"`。  
**解法：** 實作自訂 NodeView，在 `selectNode` / `deselectNode` 中手動操作 CSS class，並在 `stopEvent` 中攔截 `dragstart` 事件，完全阻止拖曳。

### 問題 2：`md.__rubyAdded` 守衛機制失效，inline rule 在某些條件下被重複加入

**原因：** 某些情境下 `tiptap-markdown` 會傳入不同的 markdown-it 實例。  
**解法：** 確認 flag 附加在傳入的 `md` 物件上（`md.__rubyAdded = true`），與實例一對一綁定，不使用模組層級變數。

### 問題 3：雙擊事件中取得的 `pos` 值在 dialog 開啟後文件變動時過期

**原因：** ProseMirror document 中任何編輯操作都可能使舊的位置索引失效。  
**解法：** `RubyDialog` 僅在使用者主動雙擊時開啟（不會有其他同時發生的編輯），`editRuby` 命令直接以 `tr.replaceWith` 操作，由 ProseMirror 本身管理 transaction 的合法性。

### 問題 4：`RubyDialog` 輸入框在 `open` 狀態改變時未正確重置

**原因：** `useEffect` 依賴 `[open]`，但 `initialReading` 變更時 `open` 維持 `true`，不觸發 effect。  
**解法：** 將 `RubyDialog` 的 `open=false` 時直接 `return null`（unmount），下次 `open=true` 時元件重新掛載，所有 state 自然重置；`useEffect` 只需在 `open` 為 `true` 時執行一次聚焦與預填。

---

## Phase 2 完成功能清單

- [x] TipTap 自訂 Node（`RubyExtension`）
  - [x] HTML 解析 `<ruby>/<rt>` → ruby node
  - [x] HTML 渲染 ruby node → `<ruby>/<rt>`
  - [x] 自訂 NodeView（修正 drag/selection 問題）
  - [x] 雙擊現有節點觸發編輯模式（CustomEvent 橋接）
  - [x] `setRuby` 命令（插入）
  - [x] `editRuby` 命令（替換，精確位置操作）
  - [x] `Ctrl+R` / `Cmd+R` 鍵盤快捷鍵
- [x] Markdown 雙向序列化
  - [x] 序列化：`ruby node → {text|reading}`
  - [x] 解析：`{text|reading} → ruby node`（markdown-it inline rule）
  - [x] 防重複注冊 guard
- [x] `RubyDialog` 元件
  - [x] 插入模式（新增）
  - [x] 編輯模式（預填讀音）
  - [x] 即時 `<ruby>` 預覽
  - [x] Enter / Escape 鍵盤操作
  - [x] 點擊遮罩關閉
  - [x] 無障礙標記
- [x] 工具列「ふ」按鈕
- [x] 日文字形微調（line-height、ruby-align、rt 大小）

---

## 建構驗證

```bash
npx nx build web
# Exit: 0 — 建構成功
```

---

## 下一步（Phase 3 預告）

- 文字顏色、背景底色（螢光筆）功能（`@tiptap/extension-color` + `@tiptap/extension-text-style` + `@tiptap/extension-highlight`）
- Color Picker 元件
- 對應的 Markdown 儲存格式：HTML inline `<span style="...">` 嵌入
