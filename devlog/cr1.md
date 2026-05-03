# CR-1 開發日誌 — 編輯器入口與開啟文件動線修改

**日期**: 2026-05-03
**對應需求**: change-requirements.md CR-1

---

## 目標

應用程式啟動後缺乏明確的「從何處開始」入口，使用者難以快速建立新文件或重開近期檔案。本次改版在 Header 新增**新文件按鈕**、**使用範本 Checkbox**，以及**最近開啟檔案下拉選單**，讓入口動線更清晰。

---

## 實作細節

### 1. 新工具函式 `recentFiles.ts`

新增 `web/src/app/lib/recentFiles.ts`，集中管理「最近開啟」清單的 localStorage 讀寫邏輯。

**介面定義：**

```ts
export interface RecentFile {
  fileId: string;
  fileName: string;
  openedAt: number; // Unix timestamp (ms)
}
```

**匯出函式：**

| 函式 | 說明 |
| ---- | ---- |
| `getRecentFiles()` | 從 `jpeditor.recentFiles` 讀取並回傳陣列；解析失敗時回傳 `[]` |
| `pushRecentFile(fileId, fileName)` | 將檔案加至清單頂端；若已存在則先移除後再插入；上限 10 筆 |
| `removeRecentFile(fileId)` | 從清單中移除指定 `fileId`（用於開啟失敗時清理） |
| `clearRecentFiles()` | 清除整份清單（`localStorage.removeItem`） |

localStorage key 固定為常數 `LS_KEY = 'jpeditor.recentFiles'`，避免散落的字串魔法值。

---

### 2. 新元件 `RecentFilesMenu`

新增 `web/src/app/components/RecentFilesMenu/` 目錄，包含：

- `RecentFilesMenu.tsx` — 下拉選單主體
- `RecentFilesMenu.module.css` — 樣式

**Props：**

```ts
interface RecentFilesMenuProps {
  onOpenFile: (fileId: string, fileName: string) => Promise<void>;
}
```

**行為規格：**

- 點擊「最近檔案 ▾」觸發按鈕 → 展開下拉選單，同時從 localStorage 重新讀取最新清單
- 點擊選單外部（`mousedown` 監聽）→ 收起選單
- 點擊某筆記錄 → 呼叫 `onOpenFile(fileId, fileName)`；等待期間顯示「開啟中…」並停用該按鈕
- 開啟失敗 → 呼叫 `removeRecentFile(fileId)` 並重新整理清單（失效記錄自動消失）
- 清單為空時顯示「尚無最近開啟的記錄」空白提示
- 底部「清除記錄」按鈕 → 呼叫 `clearRecentFiles()` 並清空本地 state

**UI 定位：**

```
Header 左側
 [＋ 新文件]  [☐ 使用範本]  |  [最近檔案 ▾]
                               └─ 下拉選單 (position: absolute, top: calc(100% + 6px))
```

---

### 3. 新文件流程

在 `EditorLayout.tsx` 新增以下狀態與 handler：

```ts
// 從 localStorage 讀取初始值，預設 false
const [useTemplate, setUseTemplate] = useState<boolean>(
  () => localStorage.getItem('jpeditor.useTemplate') === 'true',
);
```

```ts
const handleToggleTemplate = (v: boolean) => {
  setUseTemplate(v);
  localStorage.setItem('jpeditor.useTemplate', String(v));
};
```

```ts
const handleNewDocument = () => {
  const content = useTemplate ? templateContent : '';
  // 更新 editor 內容（同時觸發 SourceEditor 同步）
  setMarkdown(content);
  setCurrentFile(null, null); // 清空 currentFileId / currentFileName
};
```

`templateContent` 透過 Vite `?raw` 靜態匯入：

```ts
import templateContent from '../../../assets/template.md?raw';
```

（路徑從 `EditorLayout/` 往上三層至 `src/`，再進入 `assets/`）

---

### 4. 最近檔案整合

`handleOpenDriveFile` 在開啟成功後呼叫 `pushRecentFile`：

```ts
// 開啟成功
pushRecentFile(fileId, fileName);
```

開啟失敗時呼叫 `removeRecentFile`，防止清單留有已刪除或無法存取的檔案：

```ts
// 開啟失敗
removeRecentFile(fileId);
```

---

### 5. Header 佈局調整

Header 左側新增 `newDocGroup` 區塊（以 `border-right` 與右側「最近檔案」按鈕做視覺區隔）：

```
[＋ 新文件]  [☐ 範本]  │  [最近檔案 ▾]
```

對應 CSS：

```css
.newDocGroup {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-right: 6px;
  border-right: 1px solid #334155;
}
```

---

## 資料流

```
使用者點擊「＋ 新文件」
  ├─ useTemplate = true  → 載入 templateContent（template.md）至編輯器
  └─ useTemplate = false → 清空編輯器（空字串）
  → setCurrentFile(null, null)  ← driveStore：清空 currentFileId / currentFileName
  → Header 標題恢復為預設（無檔名顯示）

使用者成功開啟 Drive 檔案
  → pushRecentFile(fileId, fileName)  ← 寫入 jpeditor.recentFiles

使用者點擊「最近檔案 ▾」
  → 從 localStorage 讀取 jpeditor.recentFiles（重新整理清單）
  → 點擊某筆 → onOpenFile(fileId, fileName)
    ├─ 成功 → 關閉選單
    └─ 失敗 → removeRecentFile(fileId) → 清單自動移除該筆
```

---

## 遇到的問題

### 問題：template.md 匯入路徑錯誤

`EditorLayout.tsx` 位於 `web/src/app/components/EditorLayout/`，若寫成：

```ts
import templateContent from '../../assets/template.md?raw';
```

Vite 會解析到 `web/src/app/assets/`（不存在），導致建置失敗。

**修正：** 需往上三層才能到達 `web/src/`：

```ts
import templateContent from '../../../assets/template.md?raw';
```

---

## 受影響的檔案

| 檔案 | 變更類型 |
| ---- | -------- |
| `web/src/app/lib/recentFiles.ts` | 新增 |
| `web/src/app/components/RecentFilesMenu/RecentFilesMenu.tsx` | 新增 |
| `web/src/app/components/RecentFilesMenu/RecentFilesMenu.module.css` | 新增 |
| `web/src/assets/template.md` | 新增（範本內容，供 CR-3 完善） |
| `web/src/app/components/EditorLayout/EditorLayout.tsx` | 修改 |
| `web/src/app/components/EditorLayout/EditorLayout.module.css` | 修改 |
