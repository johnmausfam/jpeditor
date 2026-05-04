# CR-8 開發日誌 — 新文件 / 開啟舊文件的初始檢視模式調整

**日期**: 2026-05-05
**對應需求**: change-requirements-4.md CR-8

---

## 目標

依使用情境自動切換初始 `viewMode`，取代過去沿用上次狀態的行為：

| 情境 | 目標模式 |
| ---- | -------- |
| 建立新文件（＋ 新文件） | `'split'`（雙欄），並將游標焦點置入 WYSIWYG |
| 開啟舊文件（Drive / 最近檔案 / 草稿） | `'preview'`（瀏覽模式） |

---

## 實作細節

### 1. `editorRef` — 解決 TDZ 問題

`handleNewDocument` 在 `useEditor()` 之前宣告，若直接在 `useCallback` 的 deps 中引用 `editor` const，會觸發 JavaScript **Temporal Dead Zone（TDZ）** 錯誤：

```
Uncaught ReferenceError: Cannot access 'editor' before initialization
```

解法：新增 `editorRef`，在 `useEditor()` 之後用 `useEffect` 同步，讓 `handleNewDocument` 透過 ref 取得 editor 實例：

```ts
// 宣告（位於 useEditor 之前）
const editorRef = useRef<ReturnType<typeof useEditor>>(null);

// 同步（位於 useEditor 之後）
useEffect(() => {
  editorRef.current = editor;
}, [editor]);
```

### 2. `handleNewDocument` — 強制進入 `split` 模式

```ts
const handleNewDocument = useCallback(() => {
  const content = useTemplate ? EFFECTIVE_TEMPLATE : '';
  lastSourceRef.current = 'source';
  setMarkdown(content);
  useDriveStore.getState().setCurrentFile(null, null);
  // CR-8
  setViewMode('split');
  setTimeout(() => editorRef.current?.commands.focus('start'), 0);
}, [useTemplate, setViewMode]);
```

- `setViewMode('split')` 強制進入雙欄模式
- `setTimeout(..., 0)` 讓焦點操作排在 React 重新渲染之後執行，確保 WysiwygEditor 已掛載
- `editorRef.current` 透過 ref 存取，不列入 `useCallback` deps，避免 TDZ

### 3. `handleOpenDriveFile` — 強制進入 `preview` 模式

```ts
const handleOpenDriveFile = useCallback(
  async (fileId: string, fileName: string) => {
    // ... 載入內容 ...
    pushRecentFile(fileId, fileName);
    setDrivePanelOpen(false);
    // CR-8
    setPrePreviewMode('split');
    setViewMode('preview');
  },
  [setViewMode],
);
```

- `setPrePreviewMode('split')` 確保使用者點「✎ 編輯」後回到雙欄模式
- `setViewMode('preview')` 進入瀏覽模式
- 錯誤發生時（catch 分支）不執行模式切換，維持現狀

適用所有開啟舊文件入口：`DrivePanel`、`RecentFilesMenu` 均透過 `handleOpenDriveFile` 進來，行為一致。

### 4. `DraftDialog.onApply` — 依 `fileId` 分流

`DraftDialog` 的 `onApply` 原本只傳 `content`，擴充為同時傳 `fileId`，讓 caller 判斷情境：

**`DraftDialog.tsx`**

```ts
// 介面
onApply: (content: string, fileId: string) => void;

// 呼叫點
onClick={() => onApply(selected.content, selected.fileId)}
```

**`EditorLayout.tsx`（handler）**

```ts
onApply={(content, fileId) => {
  lastSourceRef.current = 'source';
  setMarkdown(content);
  setDraftDialogOpen(false);
  if (fileId === '__new__') {
    // 新文件草稿 → split 模式
    setViewMode('split');
    setTimeout(() => editor?.commands.focus('start'), 0);
  } else {
    // 已有 fileId 的草稿 → preview 模式
    setPrePreviewMode('split');
    setViewMode('preview');
  }
}}
```

---

## 修正的 TypeScript 錯誤

CR-8 實作過程中順帶修正了既有的型別錯誤：

| 位置 | 錯誤 | 修法 |
| ---- | ---- | ---- |
| `debounce` 泛型 | `unknown[]` 導致 `(md: string) => void` 不可指派 | 改為 `any[]` |
| `ed.storage.markdown` | TipTap `Storage` 未宣告 `markdown` 屬性 | `(ed.storage as any).markdown` |
| `editor.storage.markdown` | 同上 | 同上 |
| `setContent(markdown, false)` | `false` 與 `SetContentOptions` 型別不符 | `(editor.commands as any).setContent(...)` |

---

## 受影響的檔案

| 檔案 | 異動 |
| ---- | ---- |
| `EditorLayout.tsx` | 新增 `editorRef`；修改 `handleNewDocument`、`handleOpenDriveFile`、DraftDialog `onApply` handler；修正型別錯誤 |
| `DraftDialog.tsx` | `onApply` 介面與呼叫點加入 `fileId` 參數 |
