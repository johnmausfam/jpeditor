# 日文講義 Markdown 編輯器 — 需求變更文件

**版本：** 1.4.0
**日期：** 2026-05-05
**基準版本：** change-requirements-3.md v1.3.0（CR-1 ～ CR-7 已完成）
**對象：** 前端開發人員

---

## 變更摘要

| 編號 | 類別   | 變更項目                 | 優先度 |
| ---- | ------ | ------------------------ | ------ |
| CR-8 | UX 動線 | 新文件 / 開啟舊文件的初始模式調整 | 高     |

---

## CR-8　新文件 / 開啟舊文件的初始檢視模式調整

### 8.1 背景

目前應用程式在建立新文件或開啟舊文件後，會沿用使用者上一次的 `viewMode` 狀態（或預設值），而不依情境切換至最合適的模式。

使用情境分析：

- **建立新文件**：使用者需立即輸入內容，應直接進入「雙欄編輯模式（split）」以便同時撰寫 WYSIWYG 並確認 Markdown 原始碼。
- **開啟舊文件**：使用者通常先確認文件整體內容，再決定是否需要編輯；應直接進入「瀏覽模式（preview）」以提供最佳閱讀體驗。

本次變更明確規定上述兩種情境的初始 `viewMode`，覆寫任何已儲存的 `viewMode` 狀態。

---

### 8.2 功能需求

#### 8.2.1 新文件 → 強制進入雙欄模式

| 項目 | 描述 |
| ---- | ---- |
| 觸發時機 | 使用者點擊「＋ 新文件」按鈕（無論是否套用範本） |
| 目標模式 | `'split'`（雙欄：WYSIWYG + 原始碼） |
| 覆寫行為 | 不論目前 `viewMode` 為何，強制呼叫 `setViewMode('split')` |
| WYSIWYG 游標 | 模式切換後，將游標焦點置於 WYSIWYG 編輯器起始位置，使使用者可直接打字 |

**行為流程：**

```
點擊「＋ 新文件」
  ├─ 載入內容（空白 或 template.md）
  ├─ 清空 currentFileId / currentFileName
  ├─ setViewMode('split')          ← 新增
  └─ WysiwygEditor 取得焦點        ← 新增
```

#### 8.2.2 開啟舊文件 → 強制進入瀏覽模式

適用以下所有開啟舊文件的入口：

| 入口 | 元件 / 函式 |
| ---- | ----------- |
| DrivePanel 文件列表點擊 | `DrivePanel.tsx` → `handleOpenDriveFile()` |
| RecentFilesMenu 項目點擊 | `RecentFilesMenu.tsx` → `handleOpenDriveFile()` |
| DraftDialog 草稿項目點擊（已有 fileId 的草稿）| `DraftDialog.tsx` → 開啟流程 |

| 項目 | 描述 |
| ---- | ---- |
| 目標模式 | `'preview'`（瀏覽模式） |
| 覆寫行為 | 文件內容載入完成後，強制呼叫 `setViewMode('preview')` |
| previousMode 記憶 | 進入 `'preview'` 時，`previousMode` 應設為 `'split'`，使「✎ 編輯」按鈕點擊後回到雙欄模式 |

**行為流程：**

```
開啟舊文件（Drive / 最近檔案 / 草稿）
  ├─ 取得檔案內容
  ├─ 載入至編輯器（markdown、currentFileId、currentFileName）
  ├─ setPreviousMode('split')      ← 新增
  └─ setViewMode('preview')        ← 新增
```

---

### 8.3 受影響的元件與 Store

#### 8.3.1 `editorStore.ts`

目前 `viewMode` 初始值可能為 `'split'`；`previousMode` 需確認已存在（CR-7 引入）。

| 異動 | 描述 |
| ---- | ---- |
| 無需修改 store 型別 | `ViewMode` 與 `previousMode` 均已在 CR-7 定義 |
| `handleNewDocument()` | 新增 `setViewMode('split')` 呼叫 |
| `handleOpenDriveFile()` | 新增 `setPreviousMode('split')` + `setViewMode('preview')` 呼叫 |

#### 8.3.2 受影響元件列表

| 元件 | 異動說明 |
| ---- | -------- |
| `EditorLayout.tsx` | 「新文件」按鈕 handler 中加入 `setViewMode('split')` 與 WYSIWYG 焦點設定 |
| `DrivePanel.tsx` | 開啟文件成功後加入 `setPreviousMode('split')` + `setViewMode('preview')` |
| `RecentFilesMenu.tsx` | 同上 |
| `DraftDialog.tsx` | 已有 `fileId` 的草稿開啟時，同上；無 `fileId` 的新文件草稿恢復時，行為同「新文件」（進入 `split`） |

---

### 8.4 邊界情境

| 情境 | 處理方式 |
| ---- | -------- |
| 使用者在瀏覽模式中點「＋ 新文件」 | 正常執行：強制切換至 `'split'`，`previousMode` 不需更新 |
| 草稿恢復（無 fileId，`"__new__"`） | 視為「新文件」，進入 `'split'` 模式 |
| 網路錯誤導致 Drive 檔案開啟失敗 | 不切換模式；保持目前 `viewMode` 不變，顯示錯誤訊息（現有行為不變） |

---

### 8.5 不在本次範圍內

- 不新增「記憶上次使用模式」的 localStorage 持久化（需求中明確要求依情境強制覆寫）。
- 不修改工具列版面切換按鈕的行為，使用者仍可在進入各情境後自由切換模式。
