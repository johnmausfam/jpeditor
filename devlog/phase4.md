# Phase 4 開發記錄 — 圖片插入（URL + 貼上 / 拖曳 Base64）＋ 拖曳縮放

**日期：** 2026-05-03  
**目標：** 在 WYSIWYG 編輯器中支援三種圖片插入方式（URL 對話框、Ctrl+V 貼上、拖曳放入），並可用滑鼠拖曳調整圖片寬度。

---

## 1. 套件安裝

```bash
npm install @tiptap/extension-image
```

TipTap 官方 Image 擴充提供基本 `setImage` 指令與 `<img>` ProseMirror Node，作為本 Phase 的基礎。

---

## 2. 架構概覽

Phase 4 分成三個獨立關注點：

| 關注點 | 實作位置 |
|---|---|
| 圖片插入（URL 輸入） | `ImageDialog` 元件 |
| 圖片插入（貼上 / 拖曳 Base64） | `useImageInsert` hook |
| 圖片可縮放渲染 | `ResizableImageExtension` TipTap 擴充 |

---

## 3. ImageDialog — URL 插入對話框

`web/src/app/components/ImageDialog/ImageDialog.tsx`

使用者按工具列的「🖼」按鈕後，會彈出此 modal。

**設計重點：**

- 兩個輸入欄位：**圖片網址（必填）** 和 **替代文字 Alt（選填，預設 `圖片`）**
- URL 欄位為空時，確認按鈕設為 `disabled`
- `useEffect` 在 `open` 變為 `true` 時重設欄位並 `setTimeout(..., 50)` 延遲 focus，避免 React render 時序問題
- Enter 確認 / Escape 取消 / 點擊遮罩取消，與 RubyDialog 行為一致
- `role="dialog" aria-modal="true"` 無障礙語意

---

## 4. useImageInsert — 貼上與拖曳 Hook

`web/src/app/lib/useImageInsert.ts`

將圖片插入邏輯封裝成可重用 hook，掛載到 WYSIWYG 窗格 DOM 節點。

### 4-1. 安全驗證

```ts
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
```

- **MIME 白名單**：拒絕非圖片格式（防止任意檔案嵌入）
- **大小上限 5 MB**：Base64 會增加約 33% 體積，過大的圖片嵌入 Markdown 原始碼不切實際
- 驗證失敗時用 `alert` 明確告知使用者，而非靜默忽略

### 4-2. insertFileAsBase64

```ts
function insertFileAsBase64(editor: Editor, file: File): Promise<boolean>
```

用 `FileReader.readAsDataURL()` 非同步讀取，完成後呼叫：

```ts
editor.chain().focus().setImage({ src, alt: file.name }).run()
```

回傳 `Promise<boolean>` 以便後續鏈式操作（多圖循序插入）。

### 4-3. 事件監聽

hook 接收 `{ editor, targetEl }` 兩個參數：

- **paste**：從 `clipboardData.items` 找第一個 `image/*` 項目，呼叫 `insertFileAsBase64`
- **dragover**：只有當 `dataTransfer.items` 含有 `file` 時才 `e.preventDefault()`，不干擾文字拖曳
- **drop**：收集所有 `image/*` 檔案，以 `Promise.reduce` 循序插入（保持順序一致性）

`useEffect` 回傳清理函式移除監聽器，避免記憶體洩漏。

### 4-4. 為何不用 TipTap 內建的 handlePaste / handleDrop？

TipTap 的 `addProseMirrorPlugins` 也能攔截貼上事件，但它的回呼在 ProseMirror 內部觸發，無法取得原始 `ClipboardEvent.items`（只能拿到 slice/content）。直接在 DOM 層監聽保留了完整的 File API 存取能力。

---

## 5. ResizableImageExtension — 可縮放圖片擴充

`web/src/app/lib/ResizableImageExtension.tsx`

取代原本直接使用 `@tiptap/extension-image`，改以 `Image.extend()` 建立自訂擴充，透過 React NodeView 渲染。

### 5-1. 新增 width 屬性

```ts
width: {
  default: null,
  parseHTML: (el) => {
    const raw = el.getAttribute('width') ?? el.style.width ?? '';
    const n = parseInt(raw, 10);
    return isNaN(n) ? null : n;
  },
  renderHTML: (attrs) => {
    if (!attrs['width']) return {};
    return { width: String(attrs['width']) };
  },
},
```

- 以 `parseInt` 從 HTML `width` 屬性或 `style.width` 解析像素整數
- 序列化回 `width="NNN"` 屬性，確保複製貼上富文字時寬度保留
- `null` 表示未設定（圖片以原生 100% 寬度呈現）

### 5-2. React NodeView（ResizableImageNodeView）

核心邏輯在右下角的縮放 handle：

```ts
const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
  e.preventDefault();
  e.stopPropagation();

  const startX = e.clientX;
  const startWidth = imgRef.current?.offsetWidth ?? 300;

  const onMouseMove = (ev: MouseEvent) => {
    const newWidth = Math.max(50, startWidth + ev.clientX - startX);
    updateAttributes({ width: Math.round(newWidth) });
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
};
```

**設計重點：**

- `e.preventDefault()` 阻止瀏覽器原生文字選取行為
- `e.stopPropagation()` 避免觸發 ProseMirror 的拖曳邏輯
- 監聽器掛在 `document` 而非 handle 本身，游標拖出圖片範圍也能持續追蹤
- 最小寬度 50 px，防止圖片縮到不可見
- `updateAttributes({ width })` 直接更新 ProseMirror Node 屬性，觸發重新渲染

**Handle 顯示條件：**

```ts
const showHandle = selected || hovered;
```

用 `opacity` + CSS `transition` 實現淡入淡出，避免 DOM 元素頻繁掛載/卸載。

**NodeViewWrapper 樣式：**

```ts
const wrapperStyle: React.CSSProperties = {
  display: 'inline-block',
  position: 'relative',
  maxWidth: '100%',
  lineHeight: 0,         // 消除 inline 元素底部的幽靈空白
  ...(width ? { width: `${width}px` } : {}),
};
```

`lineHeight: 0` 是一個常見但容易忽略的細節：`inline-block` 圖片容器下方會有因 line-height 產生的幽靈空白（ghost gap），設為 0 可消除。

### 5-3. 為何不用 CSS resize？

CSS `resize: horizontal` 只能作用在 `block`/`inline-block` 元素自身，且 UX 不夠直觀（resize 手柄在瀏覽器右下角，位置固定不美觀）。自訂 handle 可以精確控制樣式、顯示時機與互動回饋。

---

## 6. Toolbar 整合

在 `Toolbar.tsx` 中新增 `onImage: () => void` prop 與「🖼」按鈕：

```tsx
<button className={`${styles.btn} ${styles.imageBtn}`} onClick={onImage} ...>
  🖼
</button>
```

注意此按鈕使用 **`onClick`**（非 `onMouseDown + preventDefault`），因為點擊按鈕後會立即開啟 dialog，焦點轉移至 dialog，不需要保留編輯器的 ProseMirror selection。

---

## 7. EditorLayout 整合

新增三處變更：

1. **extensions 陣列**：改用 `ResizableImageExtension.configure({ inline: false, allowBase64: true })`
2. **WYSIWYG 窗格 ref**：`wysiwygPaneRef` 傳給 `useImageInsert` 作為事件監聽目標
3. **ImageDialog 狀態與 handler**：`imageDialogOpen` state、`handleImageConfirm`、`handleImageCancel`

```ts
useImageInsert({ editor, targetEl: wysiwygPaneRef.current });
```

`wysiwygPaneRef.current` 在 `useImageInsert` 的 `useEffect` 中作為依賴項，確保元素掛載後才綁定監聽器。

---

## 8. 安全考量

- **Base64 圖片來源**：所有貼上 / 拖曳的圖片均在本地轉換為 `data:image/*;base64,...`，不發送至外部伺服器
- **URL 圖片**：由使用者自行輸入，瀏覽器原生 CORS 規則仍適用，編輯器不做額外處理（Phase 7 安全審查時可考慮加入 CSP `img-src` 限制）
- **MIME 白名單**：`image/svg+xml` 刻意排除，因為 SVG 可嵌入任意 JavaScript（XSS 風險），待 DOMPurify 整合完成後再評估是否支援

---

## 9. 已知限制

- 縮放寬度目前只儲存在 TipTap 節點屬性中；tiptap-markdown 序列化為 Markdown 時，`![alt](src)` 語法不帶寬度資訊，寬度會在「切換到 Source 後再切回」時遺失。Markdown 本身不支援圖片寬度，解決方案待 Phase 7 討論（可考慮輸出 HTML `<img width="...">` 或使用 GitHub Flavored Markdown 擴充）。
- 行內圖片（`inline: true`）目前未啟用，所有圖片為 block 層級。
