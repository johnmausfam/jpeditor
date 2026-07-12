# 日文講義 Markdown 編輯器 — 需求變更文件

**版本：** 1.9.0
**日期：** 2026-07-12
**基準版本：** change-requirements-8.md v1.8.0（CR-1 ～ CR-14 已完成）
**對象：** 前端開發人員

---

## 變更摘要

| 編號  | 類別       | 變更項目                              | 優先度 |
| ----- | ---------- | ------------------------------------- | ------ |
| CR-15 | 編輯器功能 | Markdown 表格插入與編輯（WYSIWYG 模式） | 中     |

---

## CR-15　Markdown 表格插入與編輯

### 15.1 背景

目前編輯器在 WYSIWYG 模式下缺乏表格支援。使用者若需要插入表格，必須切換至原始碼模式手動撰寫 GFM 表格語法，操作繁瑣且容易出錯。

本次變更整合 TipTap 官方的 `@tiptap/extension-table` 系列擴充，為 WYSIWYG 模式新增表格插入與結構調整功能，並確保表格能正確序列化為 GFM Markdown 語法（`|` 分隔格式）。

---

### 15.2 相依套件

新增下列 npm 套件（`@tiptap` monorepo 已存在，版本跟隨現有 TipTap 版本）：

```
@tiptap/extension-table
@tiptap/extension-table-row
@tiptap/extension-table-cell
@tiptap/extension-table-header
```

---

### 15.3 EditorLayout.tsx — 擴充 TipTap extensions

在 `EditorLayout.tsx` 的 `useEditor` 中加入下列 extensions：

```ts
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';

// useEditor extensions 陣列中加入：
Table.configure({ resizable: false }),
TableRow,
TableCell,
TableHeader,
```

`resizable: false`：避免拖拉調整欄寬的複雜度，保持輸出 Markdown 整潔。

---

### 15.4 Toolbar 變更

#### 15.4.1 新增「插入表格」按鈕

在 `Toolbar.tsx` 的 `ToolbarProps` 中新增：

```ts
onTable: () => void;
```

在工具列「水平分隔線」群組之後、「振假名」群組之前新增一個群組：

```tsx
{/* 表格 */}
<div className={styles.group}>
  <button
    className={`${styles.btn} ${isActive('table') ? styles.active : ''}`}
    onClick={onTable}
    aria-label="插入表格"
    title="插入表格"
  >
    ⊞
  </button>
</div>

<div className={styles.separator} />
```

#### 15.4.2 表格內操作工具列（TableContextToolbar）

當游標在表格內時，在 Toolbar 的表格群組後方以行內方式顯示一組**上下文操作按鈕**（不使用 Dialog，直接在工具列中展開）：

```
[ ⊞ ]  |  [ +列↓ ] [ -列 ] [ +欄→ ] [ -欄 ] [ 刪除表格 ]
```

條件渲染規則：`isActive('table')` 為 `true` 時顯示，否則隱藏。

各按鈕行為：

| 按鈕文字 | TipTap 指令 | 說明 |
| -------- | ----------- | ---- |
| `+列↓`   | `addRowAfter()` | 在當前列下方插入一列 |
| `-列`    | `deleteRow()` | 刪除當前列 |
| `+欄→`   | `addColumnAfter()` | 在當前欄右側插入一欄 |
| `-欄`    | `deleteColumn()` | 刪除當前欄 |
| `刪除表格` | `deleteTable()` | 刪除整個表格 |

所有按鈕使用 `onMouseDown={cmd(() => editor?.chain().focus().<指令>().run())}` 模式，與現有按鈕一致。

---

### 15.5 TableDialog 元件（新增）

新增 `web/src/app/components/TableDialog/` 目錄，包含：

- `TableDialog.tsx`
- `TableDialog.module.css`

#### 15.5.1 用途

讓使用者在插入表格前指定初始的列數與欄數。

#### 15.5.2 Props

```ts
interface TableDialogProps {
  open: boolean;
  onClose: () => void;
  onInsert: (rows: number, cols: number) => void;
}
```

#### 15.5.3 UI 配置

```
┌─────────────────────────────┐
│  插入表格                ✕  │
├─────────────────────────────┤
│  欄數  [  3  ] (1–10)       │
│  列數  [  3  ] (1–20)       │
│  ☑ 包含標題列               │
├─────────────────────────────┤
│              [取消] [插入]  │
└─────────────────────────────┘
```

- **欄數**：數字輸入，範圍 1–10，預設值 3。
- **列數**：數字輸入，範圍 1–20，預設值 3。
- **包含標題列**（`withHeaderRow`）：勾選框，預設勾選；勾選時第一列使用 `<th>` 作為標題欄。
- **插入** 按鈕：呼叫 `onInsert(rows, cols)`，Dialog 由 `EditorLayout` 負責關閉。
- **取消** 按鈕：呼叫 `onClose()`。
- 樣式與現有 Dialog（`RubyDialog`、`ImageDialog` 等）一致，使用 `dialog` HTML 元素 + `dialog[open]` 控制顯示。

#### 15.5.4 輸入驗證

- 欄數或列數不在範圍內時，「插入」按鈕 `disabled`。
- 使用 `clamp` 確保數值有效後再送出。

---

### 15.6 EditorLayout.tsx — Dialog 整合

#### 15.6.1 State

```ts
const [tableDialogOpen, setTableDialogOpen] = useState(false);
```

#### 15.6.2 `handleTableInsert`

```ts
const handleTableInsert = (rows: number, cols: number) => {
  editor
    ?.chain()
    .focus()
    .insertTable({ rows, cols, withHeaderRow: true })
    .run();
  setTableDialogOpen(false);
};
```

`withHeaderRow` 直接由 `TableDialog` 的勾選框控制，傳入 `onInsert` 時一併帶入（調整簽章為 `onInsert(rows, cols, withHeaderRow)`）。

#### 15.6.3 JSX 掛載

```tsx
<TableDialog
  open={tableDialogOpen}
  onClose={() => setTableDialogOpen(false)}
  onInsert={handleTableInsert}
/>
```

在 `Toolbar` 元件加入 `onTable={() => setTableDialogOpen(true)}` prop。

---

### 15.7 Markdown 序列化（`markdown-it` 相容性）

TipTap 預設使用 `prosemirror-markdown` 作為序列化層，但目前專案是否已整合 `tiptap-markdown` 需確認。

#### 15.7.1 若已使用 `tiptap-markdown`

`tiptap-markdown` 的 `Markdown` extension 原生支援 GFM 表格序列化，輸出格式如下：

```markdown
| 欄位一 | 欄位二 | 欄位三 |
| ------ | ------ | ------ |
| 資料   | 資料   | 資料   |
```

無需額外設定。

#### 15.7.2 若未使用 `tiptap-markdown`（回退方案）

若目前使用自訂的 `editor.getHTML()` + `markdown-it` 轉換流程，需確認 `markdown-it` 已啟用 `html: true` 或另行處理 `<table>` HTML 標籤。建議改用 `tiptap-markdown` 套件統一處理。

> **實作前確認點**：檢查 `EditorLayout.tsx` 中取得 Markdown 內容的方式（`editor.storage.markdown.getMarkdown()` 或其他），決定是否需要補充安裝 `tiptap-markdown`。

---

### 15.8 WysiwygEditor 樣式（`WysiwygEditor.module.css`）

在 `.editorContent` 的 `:global` 選擇器中補充表格基本樣式：

```css
.editorContent :global(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
  table-layout: fixed;
}

.editorContent :global(th),
.editorContent :global(td) {
  border: 1px solid #ccc;
  padding: 0.4em 0.6em;
  text-align: left;
  vertical-align: top;
  min-width: 2em;
}

.editorContent :global(th) {
  background: #f0f0f0;
  font-weight: bold;
}

/* TipTap 選取儲存格高亮 */
.editorContent :global(.selectedCell) {
  background: #dbeafe;
}
```

---

### 15.9 原始碼模式（Source Editor）

原始碼模式（`SourceEditor.tsx`）不受本次變更影響。使用者可在原始碼模式中直接編寫 GFM 表格語法，切換回 WYSIWYG 模式時 TipTap 會自動解析並渲染。

---

### 15.10 PreviewPane

`PreviewPane.tsx` 使用的 `markdown-it` 實例若尚未啟用 GFM 表格語法解析，需加入 `markdown-it-multimd-table` 或確認預設的 `markdown-it` 已開啟 `table` rule（預設即啟用）。無需額外安裝套件。

---

### 15.11 變更檔案清單

| 檔案 | 變更類型 | 說明 |
| ---- | -------- | ---- |
| `web/src/app/components/EditorLayout/EditorLayout.tsx` | 修改 | 加入 Table extensions、TableDialog state 與 handler |
| `web/src/app/components/Toolbar/Toolbar.tsx` | 修改 | 新增 `onTable` prop、插入表格按鈕、上下文操作按鈕 |
| `web/src/app/components/TableDialog/TableDialog.tsx` | 新增 | 表格插入 Dialog |
| `web/src/app/components/TableDialog/TableDialog.module.css` | 新增 | Dialog 樣式 |
| `web/src/app/components/WysiwygEditor/WysiwygEditor.module.css` | 修改 | 表格渲染樣式 |
| `package.json` | 修改 | 新增 `@tiptap/extension-table*` 相依 |
