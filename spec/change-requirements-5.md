# 日文講義 Markdown 編輯器 — 需求變更文件

**版本：** 1.5.0
**日期：** 2026-05-05
**基準版本：** change-requirements-4.md v1.4.0（CR-1 ～ CR-8 已完成）
**對象：** 前端開發人員

---

## 變更摘要

| 編號  | 類別              | 變更項目                           | 優先度 |
| ----- | ----------------- | ---------------------------------- | ------ |
| CR-9  | Google Drive UX   | 文件列表增強（擁有者、搜尋、排序） | 高     |
| CR-10 | Google Drive 設定 | 多工作目錄管理                     | 高     |

---

## CR-9　Google Drive 文件列表增強

### 9.1 背景

目前 `DrivePanel` 僅顯示檔名與最後編輯時間，無法快速找到特定文件。隨著共用資料夾中的文件數量增加，需要搜尋、擁有者篩選與排序功能以提升可用性。

---

### 9.2 功能需求

#### 9.2.1 顯示文件擁有者

`DriveFile` 資料模型新增 `ownerName` 欄位，來源為 Drive API `owners[0].displayName`。

**`DriveFile` 介面更新（`driveStore.ts`）：**

```ts
// 修改前
export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

// 修改後
export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
  ownerName?: string;   // ← 新增
}
```

**Drive API 查詢更新（`googleDriveApi.ts`）：**

`listMarkdownFiles` 函式的 `fields` 參數加入 `owners`：

```ts
// 修改前
fields: 'files(id,name,modifiedTime,size,mimeType)',

// 修改後
fields: 'files(id,name,modifiedTime,size,mimeType,owners)',
```

回傳時將 `owners[0]?.displayName` 對應至 `ownerName`。

**UI 顯示（`DrivePanel.tsx`）：**

在每筆文件項目的 `fileMeta` 行新增擁有者名稱，顯示於編輯時間之後：

```
📄 lesson-01.md
   2026-04-20 · 32 KB · 山田 太郎
```

若 `ownerName` 為空則省略此欄位，不顯示佔位符。

---

#### 9.2.2 關鍵字搜尋

在文件列表上方新增搜尋輸入框，對 **檔名** 進行前端過濾（大小寫不敏感、全形半形不轉換）。

| 項目         | 描述                                                        |
| ------------ | ----------------------------------------------------------- |
| 位置         | `listHeader` 區塊與文件列表之間，獨立一列                   |
| 輸入框 placeholder | `搜尋檔名…`                                          |
| 過濾邏輯     | `file.name.toLowerCase().includes(keyword.toLowerCase())`   |
| 搜尋時機     | 即時（每次 `onChange` 觸發，不需按 Enter）                  |
| 清除         | 輸入框右側顯示 ✕ 清除按鈕，僅在有輸入內容時顯示            |
| 無結果       | 顯示提示文字「找不到符合「{keyword}」的檔案」               |
| 搜尋狀態重置 | 呼叫 `onRefresh` 重新載入文件列表後，清空搜尋關鍵字         |
| 持久化       | **不**持久化搜尋關鍵字（每次開啟面板重置為空白）            |

---

#### 9.2.3 擁有者過濾選單

在搜尋輸入框同一列（右側）新增擁有者下拉選單，對文件列表進行二次過濾。

| 項目         | 描述                                                                               |
| ------------ | ---------------------------------------------------------------------------------- |
| 選項來源     | 動態從當前 `files` 陣列收集所有不重複的 `ownerName`，並排序                       |
| 預設選項     | 清單第一項固定為「全部」（value = `''`）                                            |
| 過濾邏輯     | 選擇「全部」時不過濾；選擇特定擁有者時，`file.ownerName === selectedOwner`         |
| 選項更新時機 | 每次 `files` 陣列更新時重新計算（不持久化選取狀態）                                |
| 無擁有者資訊 | 若所有文件的 `ownerName` 皆為空，選單只顯示「全部」一項（等同於不顯示選單亦可）   |

**過濾邏輯組合（渲染前計算）：**

```
displayedFiles = files
  .filter(f => keyword ? f.name.toLowerCase().includes(keyword.toLowerCase()) : true)
  .filter(f => selectedOwner ? f.ownerName === selectedOwner : true)
  .sort(/* 見 9.2.4 */)
```

---

#### 9.2.4 排序功能

在文件列表上方（搜尋列同列或另起一列）新增排序下拉選單。

**排序選項：**

| 選項值        | 顯示文字       |
| ------------- | -------------- |
| `modifiedTime`| 依編輯時間     |
| `name`        | 依檔名         |

**排序行為：**

| 排序方式      | 升冪 / 降冪                         |
| ------------- | ----------------------------------- |
| `modifiedTime`| 降冪（最近編輯的排在最前面）        |
| `name`        | 升冪（A → Z，あ → ん）              |

**持久化（localStorage）：**

| 項目         | 描述                                                           |
| ------------ | -------------------------------------------------------------- |
| localStorage 鍵 | `jpeditor_drive_sort`                                       |
| 值           | `'modifiedTime'` \| `'name'`                                   |
| 初始值       | 讀取 localStorage；若無記錄則預設 `'modifiedTime'`             |
| 更新時機     | 使用者變更排序選單時立即寫入 localStorage                      |

> 注意：排序在前端對 API 回傳的 `files` 陣列進行，`listMarkdownFiles` 的 `orderBy` 參數可移除或保留（以 `modifiedTime desc` 作為 API 端初始排序，減少前端重排代價）。

---

### 9.3 UI 版面規劃

```
┌─────────────────────────────────────────┐
│ 📁 Google Drive 文件              [✕]   │  ← panelHeader
├─────────────────────────────────────────┤
│ 📂 工作目錄下拉選單（CR-10）            │  ← folderSection（見 CR-10）
├─────────────────────────────────────────┤
│ N 個 .md 檔案        [↺ 重新整理]       │  ← listHeader
├─────────────────────────────────────────┤
│ [🔍 搜尋檔名…  ✕]  [擁有者 ▼]  [排序 ▼]│  ← 新增控制列
├─────────────────────────────────────────┤
│ 📄 lesson-01.md                         │
│    2026-04-20 · 32 KB · 山田 太郎       │
│ ...                                     │
└─────────────────────────────────────────┘
```

---

### 9.4 LocalStorage 鍵一覽（CR-9 新增）

| 鍵名                  | 型別                       | 說明               |
| --------------------- | -------------------------- | ------------------ |
| `jpeditor_drive_sort` | `'modifiedTime' \| 'name'` | 最後使用的排序方式 |

---

## CR-10　多工作目錄管理

### 10.1 背景

目前 `driveStore` 僅支援單一 `folderId`，並在 `SettingsDialog` 以單一文字輸入框設定。當使用者需要管理多個 Google Drive 資料夾（例如不同班級或課程）時，需頻繁進入設定修改，體驗不佳。

本次變更改為支援**多組工作目錄**，讓使用者在 `SettingsDialog` 中建立並命名多個目錄清單，並在 `DrivePanel` 的頂部提供下拉選單切換，快速切換作用中目錄。

---

### 10.2 資料模型

#### 10.2.1 工作目錄項目

```ts
/** 單筆工作目錄設定 */
export interface WorkFolder {
  /** 使用者自訂的顯示名稱（必填） */
  label: string;
  /** Google Drive 資料夾 ID（必填） */
  folderId: string;
}
```

#### 10.2.2 `driveStore` 更新

| 欄位 / 方法 | 修改前 | 修改後 |
| ----------- | ------ | ------ |
| `folderId: string` | 單一資料夾 ID | **移除**（由 `activeFolderId` 取代） |
| `setFolderId(id: string)` | 設定單一資料夾 ID | **移除** |
| `workFolders: WorkFolder[]` | ─ | **新增**：工作目錄清單 |
| `activeFolderId: string` | ─ | **新增**：當前作用中資料夾 ID |
| `setWorkFolders(folders: WorkFolder[])` | ─ | **新增**：更新目錄清單並持久化 |
| `setActiveFolderId(id: string)` | ─ | **新增**：切換作用中目錄並持久化 |

**向後相容性：** 若 localStorage 僅存有舊鍵 `jpeditor_drive_folder`（單一 ID），初始化時自動遷移為含一筆項目的 `WorkFolder[]`，`label` 預設為 `'預設目錄'`。

#### 10.2.3 localStorage 鍵更新

| 鍵名                         | 型別             | 說明                                                       |
| ---------------------------- | ---------------- | ---------------------------------------------------------- |
| `jpeditor_drive_folder`      | `string`         | **棄用**（保留僅供向後相容遷移，遷移後可移除）             |
| `jpeditor_drive_folders`     | `WorkFolder[]`（JSON） | 工作目錄清單                                     |
| `jpeditor_drive_active`      | `string`         | 最後一次使用的工作目錄 `folderId`；作為下拉選單的初始選項 |

---

### 10.3 SettingsDialog 變更

#### 10.3.1 移除單一 ID 輸入框

移除原有「預設工作目錄 ID」的 `<input>` 欄位，以下方多目錄管理 UI 取代。

#### 10.3.2 多目錄管理 UI

在「Google Drive」區段顯示工作目錄清單，每筆項目佔一列：

```
工作目錄
┌─────────────────────────────────────────┐
│ [顯示名稱輸入框]  [資料夾 ID 輸入框]  [🗑]│
│ [顯示名稱輸入框]  [資料夾 ID 輸入框]  [🗑]│
└─────────────────────────────────────────┘
[＋ 新增工作目錄]
```

| 項目           | 描述                                                                    |
| -------------- | ----------------------------------------------------------------------- |
| 顯示名稱       | 文字輸入框，placeholder `資料夾名稱`，必填（儲存時驗證非空白）         |
| 資料夾 ID      | 文字輸入框，placeholder `Google Drive 資料夾 ID`，必填                 |
| 刪除按鈕（🗑）  | 移除該列；若清單僅剩一筆，停用刪除按鈕（至少保留一筆）                 |
| 新增按鈕       | 在清單最後新增一筆空白列（`label: '', folderId: ''`）                  |
| 儲存行為       | 點擊「儲存」按鈕時，移除所有 `label` 或 `folderId` 為空白的項目後寫入 |
| 順序           | 可直接依列表順序存入，不需拖曳排序                                      |

#### 10.3.3 驗證規則

| 驗證項目           | 說明                                                  |
| ------------------ | ----------------------------------------------------- |
| 空白欄位過濾       | 儲存時自動移除 `label` 或 `folderId` 任一為空的項目   |
| 最少一筆           | 若儲存後清單為空，保留一筆空白項目（不寫入空陣列）    |
| 重複 ID            | 不強制驗證（允許相同 Drive 資料夾以不同名稱儲存）     |

---

### 10.4 DrivePanel 變更

#### 10.4.1 工作目錄下拉選單

在 `folderSection` 區塊改以下拉選單顯示工作目錄清單，並允許直接切換。

| 項目         | 描述                                                                     |
| ------------ | ------------------------------------------------------------------------ |
| 元件         | `<select>` 下拉選單，選項來自 `workFolders`                              |
| 選項文字     | `{label}`                                                                 |
| 選項 value   | `{folderId}`                                                              |
| 初始選取     | 讀取 `activeFolderId`，對應至選單中的目前選項                            |
| 切換行為     | `onChange` 呼叫 `setActiveFolderId(newFolderId)` 並立即觸發 `onRefresh` |
| 無目錄時     | 顯示原有提示文字「尚未設定工作目錄…」，隱藏下拉選單                     |
| 僅一筆目錄時 | 顯示下拉選單（但只有一個選項），行為與多筆相同                           |

#### 10.4.2 移除舊有 `folderId` 顯示

移除目前顯示原始資料夾 ID 字串（`📂 <strong>{folderId}</strong>`）的段落，以上方下拉選單取代。

---

### 10.5 其他受影響元件

| 元件 / 函式           | 受影響之處                                                              |
| --------------------- | ----------------------------------------------------------------------- |
| `EditorLayout.tsx`    | 所有讀取 `folderId` 之處改為讀取 `activeFolderId`                      |
| `googleDriveApi.ts`   | `listMarkdownFiles`、`createDriveFile` 等接收 `folderId` 的函式無需修改（呼叫端改傳 `activeFolderId`） |
| `app.tsx` / 其他元件  | 所有從 `useDriveStore()` 解構 `folderId` 之處改為 `activeFolderId`     |

---

### 10.6 向後相容遷移邏輯

`driveStore` 初始化時執行一次性遷移：

```
初始化時：
  若 localStorage['jpeditor_drive_folders'] 存在
    → 直接解析為 WorkFolder[]
  否則若 localStorage['jpeditor_drive_folder'] 存在（舊資料）
    → 遷移為 [{ label: '預設目錄', folderId: <舊值> }]
    → 寫入 jpeditor_drive_folders
    → 刪除 jpeditor_drive_folder（可選，避免再次遷移即可）
  否則
    → workFolders = []

  activeFolderId：
    讀取 localStorage['jpeditor_drive_active']
    若無記錄，取 workFolders[0]?.folderId ?? ''
```

---

### 10.7 LocalStorage 鍵一覽（CR-10 新增）

| 鍵名                     | 型別                  | 說明                           |
| ------------------------ | --------------------- | ------------------------------ |
| `jpeditor_drive_folders` | `WorkFolder[]`（JSON）| 工作目錄清單                   |
| `jpeditor_drive_active`  | `string`              | 最後一次使用的工作目錄 folderId |

---

## 附錄：LocalStorage 鍵總表（全版本）

| 鍵名                    | 引入版本 | 型別                             | 說明                          |
| ----------------------- | -------- | -------------------------------- | ----------------------------- |
| `jpeditor.useTemplate`  | v1.1.0   | `'true' \| 'false'`              | 新文件是否套用範本            |
| `jpeditor_drive_folder` | v1.1.0   | `string`                         | ⚠ 棄用，v1.5.0 遷移後移除    |
| `jpeditor_draft_interval` | v1.2.0 | `string`（毫秒數）               | 草稿自動備份間隔              |
| `jpeditor_drive_sort`   | v1.5.0   | `'modifiedTime' \| 'name'`       | 最後使用的排序方式            |
| `jpeditor_drive_folders`| v1.5.0   | `WorkFolder[]`（JSON）           | 工作目錄清單                  |
| `jpeditor_drive_active` | v1.5.0   | `string`                         | 最後使用的工作目錄 folderId   |
