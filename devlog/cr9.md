# CR-9 開發日誌 — Google Drive 文件列表增強

**日期**: 2026-05-05
**對應需求**: change-requirements-5.md CR-9

---

## 目標

強化 `DrivePanel` 文件列表的可用性，新增以下四項功能：

| 功能 | 說明 |
| ---- | ---- |
| 顯示文件擁有者 | 每筆文件顯示 Google Drive 擁有者名稱 |
| 關鍵字搜尋 | 即時依檔名過濾，含清除按鈕 |
| 擁有者過濾選單 | 依擁有者篩選，預設「全部」 |
| 排序功能 | 依編輯時間（降冪）或依檔名（升冪），以 localStorage 持久化 |

---

## 實作細節

### 1. `DriveFile` 介面新增 `ownerName`（`driveStore.ts`）

```ts
export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
  ownerName?: string;   // ← 新增
}
```

### 2. Drive API 查詢加入 `owners` 欄位（`googleDriveApi.ts`）

`fields` 參數加入 `owners`，並將原本的 `.filter()` 鏈改為 `.filter().map()`，在映射階段提取 `owners[0]?.displayName`：

```ts
fields: 'files(id,name,modifiedTime,size,mimeType,owners)',

return (data.files ?? [])
  .filter((f) => f.name.endsWith('.md'))
  .map((f) => ({
    id: f.id,
    name: f.name,
    modifiedTime: f.modifiedTime,
    size: f.size,
    ownerName: f.owners?.[0]?.displayName,
  }));
```

API 端的 `orderBy: 'modifiedTime desc'` 保留，作為前端排序的初始依據，減少重排代價。

### 3. 排序狀態持久化設計（`DrivePanel.tsx`）

排序偏好以 localStorage 鍵 `jpeditor_drive_sort` 儲存。使用 `useState` 的 initializer 函式傳入 `readSortKey`，確保只在元件第一次掛載時讀取一次：

```ts
type SortKey = 'modifiedTime' | 'name';
const LS_SORT = 'jpeditor_drive_sort';

function readSortKey(): SortKey {
  const v = localStorage.getItem(LS_SORT);
  return v === 'name' ? 'name' : 'modifiedTime';
}

// 元件內
const [sortKey, setSortKey] = useState<SortKey>(readSortKey);
```

切換時立即寫入：

```ts
const handleSortChange = (key: SortKey) => {
  setSortKey(key);
  localStorage.setItem(LS_SORT, key);
};
```

### 4. Rules of Hooks 問題修正

初版實作將 `useMemo`（`ownerOptions`、`displayedFiles`）置於 `if (!open) return null` 之後，違反 Rules of Hooks，導致 React 在 Panel 首次開啟時報錯：

```
Rendered more hooks than during the previous render.
```

修正方式：將所有 `useMemo` 移至 early return 之前；事件處理函式（非 Hook）則留在 early return 之後：

```ts
// ── 正確順序 ──────────────────────────────────────
// [所有 useState / useMemo 在此]
const ownerOptions = useMemo(...);
const displayedFiles = useMemo(...);

if (!open) return null;   // ← early return 在所有 Hook 之後

// [事件處理函式在此]
const handleClickFile = ...
const handleRefresh = ...
```

### 5. 過濾與排序邏輯（`useMemo`）

`displayedFiles` 在一個 `useMemo` 中完成「搜尋過濾 → 擁有者過濾 → 排序」三個步驟：

```ts
const displayedFiles = useMemo(() => {
  const kw = keyword.toLowerCase();
  return files
    .filter((f) => (kw ? f.name.toLowerCase().includes(kw) : true))
    .filter((f) => (selectedOwner ? f.ownerName === selectedOwner : true))
    .sort((a, b) => {
      if (sortKey === 'name') {
        return a.name.localeCompare(b.name, 'ja');  // 日文排序
      }
      return b.modifiedTime.localeCompare(a.modifiedTime);  // 降冪
    });
}, [files, keyword, selectedOwner, sortKey]);
```

`localeCompare(b, 'ja')` 使日文假名依あいうえお順排列。

`ownerOptions` 也用 `useMemo` 計算，僅在 `files` 陣列變更時重算：

```ts
const ownerOptions = useMemo(() => {
  const names = files.map((f) => f.ownerName ?? '').filter(Boolean);
  return Array.from(new Set(names)).sort();
}, [files]);
```

### 6. 搜尋狀態重置

`handleRefresh` 在呼叫 `onRefresh` 之前先清空搜尋關鍵字，避免重新整理後仍套用舊的過濾條件：

```ts
const handleRefresh = () => {
  setKeyword('');
  onRefresh();
};
```

---

## UI 版面說明

控制列（`.controlBar`）置於 `listHeader` 與文件列表之間，橫向排列搜尋框、擁有者選單、排序選單。當文件清單為空或載入中時，控制列整體隱藏：

```
{!isLoadingFiles && activeFolderId && !error && files.length > 0 && (
  <div className={styles.controlBar}>
    ...
  </div>
)}
```

搜尋框使用 `position: relative` 的 wrapper，清除按鈕以 `position: absolute` 置於右側，不佔用寬度。

---

## 受影響的檔案

| 檔案 | 異動 |
| ---- | ---- |
| `driveStore.ts` | `DriveFile` 介面新增 `ownerName?: string` |
| `googleDriveApi.ts` | `fields` 加入 `owners`；回傳時映射 `ownerName` |
| `DrivePanel.tsx` | 新增 `keyword`、`selectedOwner`、`sortKey` state；`useMemo` 計算 `ownerOptions` 與 `displayedFiles`；新增控制列 JSX；修正 Rules of Hooks 問題 |
| `DrivePanel.module.css` | 新增 `.controlBar`、`.searchWrapper`、`.searchInput`、`.searchClear`、`.filterSelect` |
