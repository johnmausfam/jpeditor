# CR-4 開發日誌 — WYSIWYG 工具列新增功能

**日期**: 2026-05-03
**對應需求**: change-requirements.md CR-4

---

## 目標

工具列缺少超連結、影片嵌入、特殊符號等常見功能。本次新增三組功能並整合至現有工具列，維持既有架構不變。

---

## 實作細節

### 1. 新套件

安裝 `@tiptap/extension-link`，用於超連結的 TipTap 擴充。

```
npm install @tiptap/extension-link
```

YouTube 嵌入採自訂 Extension，不依賴 `@tiptap/extension-youtube`，以規避版本相依問題。

---

### 2. 超連結（CR-4.2.1）

#### 2.1 `web/src/app/lib/YoutubeExtension.tsx`（僅 `parseYoutubeVideoId` 對外匯出）

LinkDialog 不涉及新 lib，直接在 component 層做 URL 驗證：

```ts
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}
```

**安全性**：以 `URL` 建構子解析後，只允許 `https:` 或 `http:` 協定，天然阻擋 `javascript:` 及其他危險協定。

#### 2.2 `web/src/app/components/LinkDialog/LinkDialog.tsx`（新增）

Props：

```ts
interface LinkDialogProps {
  open: boolean;
  hasSelection: boolean;   // 開啟時是否有文字選取
  initialUrl?: string;     // 游標在連結上時預填現有 href
  onConfirm: (url: string, displayText: string) => void;
  onCancel: () => void;
}
```

**行為邏輯：**

```
有選取文字
  → 只顯示 URL 欄
  → 確認後：editor.setLink({ href: url })

無選取文字
  → 顯示 URL 欄 + 顯示文字欄
  → 確認後：insertContent({ text: displayText, marks: [link] })
```

Enter = 確認；Escape / 點擊背景 = 取消；URL 格式錯誤時顯示行內錯誤訊息並 focus 回欄位。

#### 2.3 Toolbar 超連結按鈕

游標**不在**連結上時：顯示 🔗，`onMouseDown` → 呼叫 `onLink()` 開啟 LinkDialog。

游標**在**連結上時：按鈕呈 active 樣式，`onMouseDown` → 直接呼叫 `editor.unsetLink()` 移除連結，無需再開 Dialog。

```tsx
<button
  className={`${styles.btn} ${isActive('link') ? styles.active : ''}`}
  onMouseDown={cmd(() => {
    if (editor?.isActive('link')) {
      editor.chain().focus().unsetLink().run();
    } else {
      onLink();
    }
  })}
  title={editor?.isActive('link') ? '移除連結' : '插入超連結'}
>
  🔗
</button>
```

---

### 3. YouTube 嵌入（CR-4.2.2）

#### 3.1 `web/src/app/lib/YoutubeExtension.tsx`（新增）

自訂 TipTap Block Node Extension，使用 React NodeView 渲染 iframe。

**`parseYoutubeVideoId(input)` 邏輯：**

```
輸入字串
  → 嘗試 new URL(input)
      ├─ youtu.be/{id}            → 取 pathname[1]
      ├─ youtube.com?v={id}       → 取 searchParams.get('v')
      └─ youtube.com/embed/{id}   → regex 取 embed path
  → URL 解析失敗 → 嘗試 /^[A-Za-z0-9_-]{11}$/ 裸 ID
  → 都不符合 → 回傳 null
```

**安全性**：`parseHTML` 的 `getAttrs` 嚴格比對 `^https://(?:www\.)?youtube\.com/embed/`，其他任何 domain 的 `<iframe>` 均回傳 `false`（不被解析為 youtube 節點）。React NodeView 的 `<iframe>` 加上 `sandbox="allow-scripts allow-same-origin allow-presentation"`。

**Markdown 序列化（tiptap-markdown）：**

```ts
serialize(state, node) {
  state.write(
    `<iframe src="https://www.youtube.com/embed/${videoId}" width="560" height="315" allowfullscreen></iframe>`,
  );
  state.closeBlock(node);
}
```

#### 3.2 `web/src/app/components/YoutubeDialog/YoutubeDialog.tsx`（新增）

- 輸入 YouTube 網址或裸 ID，呼叫 `parseYoutubeVideoId` 驗證
- 失敗時顯示錯誤訊息，focus 回輸入欄
- 提示文字列出三種支援格式

#### 3.3 EditorLayout 整合

在 TipTap `useEditor` extensions 陣列中加入：

```ts
Link.configure({ autolink: false, openOnClick: false }),
YoutubeExtension,
```

新增 `youtubeDialogOpen` state 與 `handleYoutubeConfirm` handler：

```ts
editor.chain().focus()
  .insertContent({ type: 'youtube', attrs: { videoId } })
  .run();
```

---

### 4. 特殊符號（CR-4.2.3）

#### 4.1 `web/src/app/components/SymbolPicker/SymbolPicker.tsx`（新增）

自包含 Popover 元件，嵌入 Toolbar 本體內。

**符號清單以常數陣列定義，便於未來擴充：**

```ts
const SYMBOL_GROUPS = [
  {
    label: '丸数字',
    symbols: ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'],
  },
];
```

**保持 editor focus 的關鍵**：觸發按鈕與符號按鈕均使用 `onMouseDown + e.preventDefault()`（非 `onClick`），避免 blur 導致插入位置遺失。

```ts
const insertSymbol = (symbol: string) => {
  editor?.chain().focus().insertContent(symbol).run();
  setOpen(false);
};
```

外部點擊（`mousedown` listener）自動關閉 Popover。

#### 4.2 Toolbar 整合

`SymbolPicker` 接受 `btnClassName` prop，直接套用 Toolbar 的 `.btn` class，外觀與其他工具列按鈕一致：

```tsx
<SymbolPicker editor={editor} btnClassName={styles.btn} />
```

---

## 資料流

```
── 超連結 ──────────────────────────────────────────────────────────
使用者點擊 🔗（無連結 active）
  → openLinkDialog()
      → 讀取 editor.getAttributes('link').href → linkInitialUrl
      → 讀取 selection.empty → linkHasSelection
  → LinkDialog 開啟
  → 確認 → handleLinkConfirm(url, displayText)
      ├─ 有選取 → setLink({ href: url })
      └─ 無選取 → insertContent({ text, marks: [link] })

使用者點擊 🔗（連結 active）
  → editor.unsetLink()（不開 Dialog）

── YouTube ──────────────────────────────────────────────────────────
使用者點擊 ▶
  → YoutubeDialog 開啟
  → 輸入 URL / ID → parseYoutubeVideoId() 驗證
  → 確認 → handleYoutubeConfirm(videoId)
      → insertContent({ type: 'youtube', attrs: { videoId } })
      → WYSIWYG 渲染 <iframe>
      → Markdown 序列化為 <iframe ...> HTML 字串

── 特殊符號 ─────────────────────────────────────────────────────────
使用者點擊 ①（Toolbar 按鈕）
  → SymbolPicker Popover 開啟
  → 點擊符號 → editor.insertContent(symbol) → Popover 關閉
```

---

## 受影響的檔案

| 檔案 | 變更類型 |
| ---- | -------- |
| `web/src/app/lib/YoutubeExtension.tsx` | 新增 |
| `web/src/app/components/LinkDialog/LinkDialog.tsx` | 新增 |
| `web/src/app/components/LinkDialog/LinkDialog.module.css` | 新增 |
| `web/src/app/components/YoutubeDialog/YoutubeDialog.tsx` | 新增 |
| `web/src/app/components/YoutubeDialog/YoutubeDialog.module.css` | 新增 |
| `web/src/app/components/SymbolPicker/SymbolPicker.tsx` | 新增 |
| `web/src/app/components/SymbolPicker/SymbolPicker.module.css` | 新增 |
| `web/src/app/components/Toolbar/Toolbar.tsx` | 修改（新增 `onLink`/`onYoutube` props、三個新按鈕） |
| `web/src/app/components/EditorLayout/EditorLayout.tsx` | 修改（擴充 extensions、新增 dialog state 與 handler） |
| `package.json` | 修改（新增 `@tiptap/extension-link`） |
