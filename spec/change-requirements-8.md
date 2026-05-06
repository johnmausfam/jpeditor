# 日文講義 Markdown 編輯器 — 需求變更文件

**版本：** 1.8.0
**日期：** 2026-05-07
**基準版本：** change-requirements-7.md v1.7.0（CR-1 ～ CR-13 已完成）
**對象：** 前端開發人員

---

## 變更摘要

| 編號  | 類別     | 變更項目                           | 優先度 |
| ----- | -------- | ---------------------------------- | ------ |
| CR-14 | 草稿管理 | 草稿版本化：每檔保留 40 個版本，最多 20 個檔案 | 中     |

---

## CR-14　草稿版本化管理

### 14.1 背景

目前草稿備份系統（`localDrafts.ts`）對每個檔案只保留最新一份草稿（`MAX_DRAFTS = 20`，每個 `fileId` 只有一筆記錄）。當使用者在短時間內誤操作、或需要回溯到稍早的內容時，現有機制無法提供歷史版本。

本次變更將儲存結構改為版本化設計：
- **每個檔案最多保留 40 個草稿版本**，超過時移除最舊版本。
- **最多追蹤 20 個檔案**，超過時移除「最舊草稿版本的備份時間」最早的那個檔案（即整體上最久沒有活動的檔案）。

---

### 14.2 資料結構變更（`localDrafts.ts`）

#### 14.2.1 新介面定義

移除舊的 `LocalDraft` 介面，改為下列兩個介面：

```ts
/** 單一草稿版本 */
export interface DraftVersion {
  content: string;  // 完整 Markdown 文字
  savedAt: number;  // Unix 時間戳記（ms）
}

/** 單一檔案的所有草稿版本 */
export interface FileDrafts {
  fileId: string;         // Drive 檔案 ID；未儲存文件為 "__new__"
  fileName: string | null; // Drive 檔案名稱；未儲存文件為 null
  versions: DraftVersion[]; // 依 savedAt 降冪排列（最新在前），最多 40 筆
}
```

localStorage 的格式由 `LocalDraft[]` 改為 `FileDrafts[]`。  
Storage key 維持 `jpeditor.localDrafts` 不變。

#### 14.2.2 常數更新

```ts
const MAX_FILES    = 20;  // 最多追蹤的檔案數（原 MAX_DRAFTS）
const MAX_VERSIONS = 40;  // 每個檔案最多保留的草稿版本數
```

---

### 14.3 函式變更（`localDrafts.ts`）

#### 14.3.1 `getFileDrafts(): FileDrafts[]`

原 `getDrafts()` 重新命名為 `getFileDrafts()`，回傳型別改為 `FileDrafts[]`。

```ts
export function getFileDrafts(): FileDrafts[] { … }
```

#### 14.3.2 `saveDraft(fileId, fileName, content)` — 邏輯修改

新的儲存邏輯：

1. 讀取現有的 `FileDrafts[]`。
2. 找到 `fileId` 對應的 `FileDrafts`（若無則建立新項目）。
3. 在該項目的 `versions` 開頭插入新的 `DraftVersion`（`savedAt = Date.now()`）。
4. 若 `versions.length > MAX_VERSIONS`，截斷尾端（移除最舊的版本）。
5. 若是新增的 `FileDrafts` 且總檔案數超過 `MAX_FILES`，找出 **`versions` 陣列末端（最舊版本）的 `savedAt` 最小**的那個 `FileDrafts` 並移除之（即整體最早備份的檔案）。
6. 更新 `fileName`（允許檔案名稱在後續操作中修正）。
7. 將結果序列化並寫入 localStorage。

```ts
export function saveDraft(
  fileId: string,
  fileName: string | null,
  content: string,
): void { … }
```

#### 14.3.3 `removeDraft(fileId)` — 語義不變，型別更新

移除整個 `FileDrafts` 項目（該檔案的所有版本）。行為與舊版相同，但操作對象由 `LocalDraft[]` 改為 `FileDrafts[]`。

```ts
export function removeDraft(fileId: string): void { … }
```

#### 14.3.4 `removeVersion(fileId, savedAt)` — 新增

允許移除單一特定版本。

```ts
export function removeVersion(fileId: string, savedAt: number): void { … }
```

實作：找到對應的 `FileDrafts`，過濾掉 `savedAt` 相符的版本；若該檔案的 `versions` 變為空陣列則一併移除該 `FileDrafts` 項目。

#### 14.3.5 `clearDrafts()` — 不變

行為不變，清除整個 `jpeditor.localDrafts` key。

---

### 14.4 UI 變更（`DraftDialog.tsx`）

現有 DraftDialog 以單層列表展示草稿（一個 `fileId` 一筆）。改版後改為**兩層式**：左欄顯示檔案列表，中欄顯示所選檔案的版本列表，右欄顯示所選版本的內容預覽。

#### 14.4.1 版面配置

```
┌────────────────────────────────────────────────────────────┐
│  🗒 草稿備份                                            ✕  │
├─────────────────┬──────────────────┬───────────────────────┤
│  檔案列表       │  版本列表        │  內容預覽             │
│  (FileDrafts[]) │  (versions[])    │  (selected version)   │
│                 │                  │                       │
│  ● 課文A.md     │  ● 14:32 ← 選取 │  # 課文A              │
│    3 個版本     │  ○ 13:15        │  …                    │
│  ○ 課文B.md     │  ○ 12:00        │  [套用至編輯器]       │
│    1 個版本     │                  │                       │
└─────────────────┴──────────────────┴───────────────────────┘
│  [清除全部備份]                                            │
└────────────────────────────────────────────────────────────┘
```

#### 14.4.2 檔案列表（左欄）

- 依該檔案「最新版本」的 `savedAt` 降冪排列（最近有活動的在上方）。
- 每筆顯示：檔案名稱（`fileName ?? '（未儲存的新文件）'`）、版本數量（`N 個版本`）。
- 點選切換選取的 `FileDrafts`，同時自動選取該檔案的最新版本（`versions[0]`）。
- 每筆右側有「🗑」按鈕，呼叫 `removeDraft(fileId)` 移除整個檔案的所有版本。

#### 14.4.3 版本列表（中欄）

- 顯示選取的 `FileDrafts.versions`，依 `savedAt` 降冪排列（最新在上方）。
- 每筆顯示備份時間（`formatDate(savedAt)`）。
- 點選切換選取的 `DraftVersion`。
- 每筆右側有「🗑」按鈕，呼叫 `removeVersion(fileId, savedAt)` 移除單一版本。

#### 14.4.4 內容預覽（右欄）

- 顯示 `selectedVersion.content`（`<pre>` 區塊）。
- 顯示備份時間與檔案名稱。
- 「套用至編輯器」按鈕：呼叫 `onApply(selectedVersion.content, selectedFileDrafts.fileId)`，行為與舊版相同。
- 套用後對話框不自動關閉（與舊版一致，由 `EditorLayout` 的 `onApply` 回呼負責）。

#### 14.4.5 State 管理

```ts
const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
const [selectedSavedAt, setSelectedSavedAt] = useState<number | null>(null);
```

`fileDrafts` 由 `getFileDrafts()` 取得（dialog 開啟時更新），以 `selectedFileId` 找到對應 `FileDrafts`，再以 `selectedSavedAt` 找到對應 `DraftVersion`。

每次呼叫 `removeDraft` 或 `removeVersion` 後重新呼叫 `getFileDrafts()` 更新畫面，並調整選取狀態（若刪除了當前選取的項目，自動選取同層的第一項；若該層沒有剩餘項目則清除選取）。

---

### 14.5 `EditorLayout.tsx` 變更

#### 14.5.1 `saveDraft` 呼叫不變

`EditorLayout` 中呼叫 `saveDraft(fileId, fileName, content)` 的介面簽章不變，無需修改。

#### 14.5.2 `onApply` 回呼不變

`DraftDialog` 的 `onApply(content, fileId)` 簽章不變，`EditorLayout` 無需修改。

---

### 14.6 CSS 調整（`DraftDialog.module.css`）

現有的兩欄式版面（`.body { display: flex }`）擴充為三欄式：

```css
.body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.fileList  { width: 180px; /* 左欄 */ }
.versionList { width: 160px; /* 中欄 */ }
.preview   { flex: 1; /* 右欄 */ }
```

各欄均有 `overflow-y: auto` 及內部 padding。版本列表的項目樣式（`.versionItem`、`.versionItemActive`）參照現有 `.listItem`、`.listItemActive` 設計。

---

### 14.7 遷移相容性

localStorage 中若存有舊格式（`LocalDraft[]`，每筆有 `content` 欄位但無 `versions` 欄位），`getFileDrafts()` 讀取時需做一次性遷移：

```ts
// 遷移判斷：若第一筆有 content 欄位（舊格式）→ 轉換為新格式
if (parsed.length > 0 && 'content' in parsed[0]) {
  const migrated: FileDrafts[] = (parsed as OldLocalDraft[]).map((d) => ({
    fileId: d.fileId,
    fileName: d.fileName,
    versions: [{ content: d.content, savedAt: d.savedAt }],
  }));
  localStorage.setItem(LS_KEY, JSON.stringify(migrated));
  return migrated;
}
```

遷移完成後，舊有的每筆草稿會以「單一版本」的形式保留在新結構中。

---

### 14.8 不在本次範圍內

- 草稿自動命名（目前仍沿用 Drive 檔案名稱或 `null`）。
- 版本 diff 比對 UI。
- 草稿匯出 / 匯入功能。
