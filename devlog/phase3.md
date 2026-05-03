# Phase 3 開發記錄 — 文字樣式（顏色、底色）+ Color Picker

**日期：** 2026-05-03  
**階段：** Phase 3 — 文字顏色、螢光筆底色 + ColorPicker 元件  
**預估工時：** 2 天  
**對應需求：** §2.3 文字樣式功能（顏色、底色）

---

## 目標

為 WYSIWYG 編輯器新增文字顏色與螢光筆底色功能。使用者選取文字後，可透過工具列的下拉選色器選擇顏色套用，選色器提供 preset 色票與原生色彩對話框兩種輸入方式。

底線（U）與刪除線（S）已於 Phase 1 完成，Phase 3 專注於顏色類樣式。

---

## 新增套件

```bash
npm install @tiptap/extension-color @tiptap/extension-text-style @tiptap/extension-highlight
```

| 套件 | 說明 |
|------|------|
| `@tiptap/extension-text-style` | TipTap v3 中 `TextStyle` mark 為 named export，為 `Color` 的基礎依賴 |
| `@tiptap/extension-color` | 文字前景色，透過 `TextStyle` mark 的 `color` 屬性實作 |
| `@tiptap/extension-highlight` | 螢光筆底色，設定 `multicolor: true` 支援多色 |

> **注意：** TipTap v3 將 `@tiptap/extension-text-style` 中的 `TextStyle` 改為 named export（非 default export），直接 `import TextStyle from '...'` 會在 Rolldown 建構時報 `[MISSING_EXPORT]` 錯誤。需使用 `import { TextStyle } from '@tiptap/extension-text-style'`。

---

## 新增元件

### `ColorPicker`（`components/ColorPicker/`）

可複用的通用選色器元件，文字色與螢光筆各自使用一個實例。

#### Props 設計

```ts
interface ColorPickerProps {
  label: string;                 // 按鈕顯示文字（"A" / "Ab"）
  currentColor: string | null;   // 目前套用的顏色（用於色票 selected 樣式）
  presetColors: string[];        // 預設色票陣列
  swatchType: 'text' | 'highlight'; // 觸發按鈕的色條樣式
  onApply: (color: string) => void;
  onClear: () => void;
  onSaveSelection?: () => void;  // 原生 dialog 開啟前的 hook
  ariaLabel: string;
  title: string;
  disabled?: boolean;
}
```

- `swatchType === 'text'`：按鈕底部以彩色底線條顯示目前顏色（仿 Word 的「A」按鈕）
- `swatchType === 'highlight'`：按鈕底部以填色矩形顯示目前底色

#### 觸發按鈕：`onMouseDown + preventDefault`

選色器觸發按鈕必須使用 `onMouseDown` 並呼叫 `e.preventDefault()`，而非 `onClick`。這與 Phase 1/2 工具列格式按鈕的原則相同：防止點擊按鈕時 TipTap 失去焦點並清除文字選取範圍。

#### 關閉邏輯

```ts
// Close when clicking outside
useEffect(() => {
  if (!open) return;
  const handle = (e: MouseEvent) => {
    if (!containerRef.current?.contains(e.target as Node)) {
      setOpen(false);
    }
  };
  document.addEventListener('mousedown', handle);
  return () => document.removeEventListener('mousedown', handle);
}, [open]);
```

以 `mousedown` 而非 `click` 偵測外部點擊，避免事件時序問題。

#### Preset 色票

色票按鈕亦使用 `onMouseDown={(e) => e.preventDefault()}`，確保點選顏色不影響 TipTap 選取。點擊後呼叫 `onApply(color)` 並關閉 dropdown。

#### 原生 Color Picker（`<input type="color">`）

```tsx
<input
  type="color"
  onMouseDown={() => onSaveSelection?.()}
  onChange={(e) => onApply(e.target.value)}
/>
```

原生 `<input type="color">` 開啟作業系統色彩對話框時，瀏覽器會搶走焦點並清除 TipTap 的選取範圍。解法：
1. `onMouseDown` 呼叫 `onSaveSelection()`，在 TipTap 失焦前儲存 ProseMirror `Selection` 物件
2. `onChange` 呼叫 `onApply(color)`，`applyTextColor` / `applyHighlight` 在執行指令前先呼叫 `restoreSelection()` 恢復選取

#### CSS（`ColorPicker.module.css`）

```css
/* Preset grid — 6 欄 × N 列 */
.presetGrid {
  display: grid;
  grid-template-columns: repeat(6, 24px);
  gap: 4px;
}
```

初始版本為 5 欄，後因 preset 擴充至 9 列 × 6 色（54 色）改為 6 欄。

---

## Preset 色票設計演進

### 第一版（Phase 3 初始）
- 文字色 10 色 / 螢光筆 10 色
- 兩組各自獨立色系，螢光筆偏向淡色調
- Grid：`repeat(5, 24px)`（5 欄）

### 第二版（使用者需求調整 #1）
- 兩組均擴充至 20 色（4 列 × 5 欄）
- Grid 維持 5 欄

### 第三版（使用者需求調整 #2 — 最終版）
- 兩組統一結構：9 列 × 6 色 = 54 色
- 每列以單一色系為基礎，由深至淺排列
- 兩組（文字色 / 螢光筆）採用完全相同的色彩對照表
- Grid：`repeat(6, 24px)`（6 欄）

| 列 | 色系 | 最深色 | 最淺色 |
|----|------|--------|--------|
| 1 | 灰階 | `#111827` | `#f3f4f6` |
| 2 | 紅 | `#7f1d1d` | `#fee2e2` |
| 3 | 橙 | `#7c2d12` | `#ffedd5` |
| 4 | 黃 | `#713f12` | `#fef9c3` |
| 5 | 淺綠 | `#365314` | `#f7fee7` |
| 6 | 深綠 | `#14532d` | `#f0fdf4` |
| 7 | 紫 | `#4c1d95` | `#ede9fe` |
| 8 | 淺藍 | `#0c4a6e` | `#f0f9ff` |
| 9 | 深藍 | `#1e3a8a` | `#eff6ff` |

色值全部取自 Tailwind CSS v3 色盤（100–900 對應範圍），確保色彩層次感均勻且符合 Web 設計慣例。

---

## `EditorLayout` 整合

### 新增 extensions

```ts
import { TextStyle } from '@tiptap/extension-text-style'; // named export
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';       // default export

const editor = useEditor({
  extensions: [
    StarterKit,
    Underline,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    RubyExtension,
    Markdown.configure({ html: true, transformPastedText: true }),
  ],
  // ...
});
```

`Highlight.configure({ multicolor: true })` 允許對不同文字套用不同底色，若設為 `false` 則只能有一種底色。

---

## `Toolbar` 整合

### Selection 保存機制

```ts
const savedSelRef = useRef<Selection | null>(null);

const saveSelection = () => {
  if (editor) savedSelRef.current = editor.view.state.selection;
};

const restoreSelection = () => {
  if (editor && savedSelRef.current) {
    try {
      editor.view.dispatch(
        editor.view.state.tr.setSelection(savedSelRef.current),
      );
    } catch {
      // selection became invalid — proceed anyway
    }
    savedSelRef.current = null;
  }
};
```

`try/catch` 處理選取範圍因文件內容變動而失效的邊緣情況。

### 顏色指令

```ts
const applyTextColor  = (color: string) => { restoreSelection(); editor?.chain().focus().setColor(color).run(); };
const removeTextColor = ()              => { restoreSelection(); editor?.chain().focus().unsetColor().run(); };
const applyHighlight  = (color: string) => { restoreSelection(); editor?.chain().focus().setHighlight({ color }).run(); };
const removeHighlight = ()              => { restoreSelection(); editor?.chain().focus().unsetHighlight().run(); };
```

### 目前顏色偵測（用於按鈕 swatch 顯示）

```ts
const currentTextColor =
  (editor?.getAttributes('textStyle').color as string | undefined) ?? null;
const currentHighlight =
  (editor?.getAttributes('highlight').color as string | undefined) ?? null;
```

這兩個值用於：
1. 按鈕底部色條即時反映目前套用顏色
2. 色票中高亮顯示已選中的顏色（`.selected` class）

### 工具列 JSX（B/I/U/S 分組之後插入）

```tsx
{/* 文字顏色 & 螢光筆 */}
<div className={styles.group}>
  <ColorPicker
    label="A"
    currentColor={currentTextColor}
    presetColors={TEXT_COLOR_PRESETS}
    swatchType="text"
    onApply={applyTextColor}
    onClear={removeTextColor}
    onSaveSelection={saveSelection}
    ariaLabel="文字顏色"
    title="文字顏色"
    disabled={!editor}
  />
  <ColorPicker
    label="Ab"
    currentColor={currentHighlight}
    presetColors={HIGHLIGHT_PRESETS}
    swatchType="highlight"
    onApply={applyHighlight}
    onClear={removeHighlight}
    onSaveSelection={saveSelection}
    ariaLabel="螢光筆底色"
    title="螢光筆底色"
    disabled={!editor}
  />
</div>
```

---

## 遇到的問題與解決方案

### 問題 1：TipTap v3 `TextStyle` 改為 named export，建構失敗

**錯誤訊息：**
```
[MISSING_EXPORT] "default" is not exported by "@tiptap/extension-text-style/dist/index.js"
```

**原因：** TipTap v3 重構了 `@tiptap/extension-text-style`，`TextStyle` 現在與 `BackgroundColor`、`Color`、`FontFamily` 等同為 named export，不再有 default export。  
**解法：** 改用 `import { TextStyle } from '@tiptap/extension-text-style'`。

### 問題 2：套用顏色後選取範圍遺失（原生 color picker 搶走焦點）

**原因：** 使用者在輸入框輸入自訂顏色時，`<input type="color">` 觸發作業系統原生色彩選擇器，此行為會使瀏覽器將焦點移出 TipTap，導致 ProseMirror 清除 Selection。  
**解法：** `onMouseDown` 於開啟前先儲存 `editor.view.state.selection`，`onChange` 套用顏色前先用 `tr.setSelection()` 恢復。

### 問題 3：點擊 preset 色票時，色票按鈕 `onClick` 使 TipTap 失焦

**原因：** 同 Phase 1 的工具列按鈕問題，點擊任何 DOM 元素都會觸發 blur。  
**解法：** 色票按鈕加上 `onMouseDown={(e) => e.preventDefault()}`，阻止焦點轉移，再透過 `onClick` 執行 `onApply`。由於觸發按鈕本身亦使用 `onMouseDown + preventDefault`，整個 dropdown 互動流程都不會清除 TipTap 選取。

---

## 建構驗證

```bash
npx nx build web
# Exit: 0 — 建構成功（有 chunk size 警告，屬正常現象）
```

---

## Phase 3 完成功能清單

- [x] 安裝 `@tiptap/extension-text-style`、`@tiptap/extension-color`、`@tiptap/extension-highlight`
- [x] `EditorLayout` 註冊三個新 extension（`TextStyle`、`Color`、`Highlight` multicolor）
- [x] `ColorPicker` 元件
  - [x] 觸發按鈕（`onMouseDown + preventDefault`）
  - [x] `swatchType` 區分文字色樣式與螢光筆樣式
  - [x] Preset 色票（9 列 × 6 色 = 54 色，按色系深至淺排列）
  - [x] 原生 `<input type="color">` 自訂色
  - [x] `onSaveSelection` / `restoreSelection` 保護選取範圍
  - [x] 點擊外部關閉
  - [x] 「取消顏色」清除按鈕（有顏色時才顯示）
  - [x] 無障礙標記（`role="dialog"`、`aria-label`）
  - [x] 按鈕 `disabled` 狀態（editor 尚未初始化時）
- [x] `Toolbar` 整合 ColorPicker（文字色「A」、螢光筆「Ab」）
- [x] Preset 色票三次迭代（10 → 20 → 54 色）

---

## 下一步（Phase 4 預告）

- 圖片插入：網址輸入（`![alt](url)`）
- 貼上圖片（`Ctrl+V`）：`ClipboardEvent` 偵測 `image/*`，`FileReader.readAsDataURL()` 轉 Base64
- 拖曳上傳：`dragover` + `drop` 事件處理
- 檔案大小限制（5 MB）與 MIME 類型白名單
- 需安裝 `@tiptap/extension-image`
