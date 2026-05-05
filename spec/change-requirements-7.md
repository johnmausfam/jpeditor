# 日文講義 Markdown 編輯器 — 需求變更文件

**版本：** 1.7.0
**日期：** 2026-05-05
**基準版本：** change-requirements-6.md v1.6.0（CR-1 ～ CR-12 已完成）
**對象：** 前端開發人員

---

## 變更摘要

| 編號  | 類別        | 變更項目                                   | 優先度 |
| ----- | ----------- | ------------------------------------------ | ------ |
| CR-13 | UX / 過場   | 加強儲存、讀取文件與 Drive 列表的 Loading 體驗 | 低     |

---

## CR-13　加強 Loading 過場體驗

### 13.1 背景

目前各項耗時操作（儲存文件、從 Drive 讀取文件、重新整理 Drive 文件列表）缺乏視覺上的進度提示，使用者難以判斷操作是否正在執行中。本次變更新增兩處 Loading 過場效果：

1. **全局進度條（Top Progress Bar）**：貼附在 Header 下緣，表示儲存或讀取文件的進行中狀態。
2. **DrivePanel 文件列表 Skeleton**：取代現有純文字「載入中…」，以骨架屏（Skeleton）提示文件列表正在載入。

---

### 13.2 功能需求

#### 13.2.1　全局進度條（EditorLayout Header 下緣）

| 項目     | 描述 |
| -------- | ---- |
| 位置     | `<header>` 的正下方，緊貼 Header 底部（`position: absolute` 或獨立 DOM 元素） |
| 觸發條件 | 以下任一為 `true`：`isSaving`（儲存中）、`isOpeningFile`（讀取文件中）|
| 動畫     | 橫向掃描（indeterminate）線性進度條，寬度 100%，高度 3px |
| 顏色     | 搭配主題使用亮色（建議 `#38bdf8`，sky-400） |
| 消失     | 操作結束後立即隱藏（不需淡出動畫，保持簡潔） |

**新增 `isOpeningFile` state**（`EditorLayout`）：

目前讀取文件（`handleOpenDriveFile` / `handleOpenSharedFile`）沒有對應的 loading state，本次新增：

```ts
const [isOpeningFile, setIsOpeningFile] = useState(false);
```

在 `handleOpenDriveFile` 開始時 `setIsOpeningFile(true)`，結束（成功或失敗）後 `setIsOpeningFile(false)`。

進度條的顯示條件：

```tsx
{(isSaving || isOpeningFile) && (
  <div className={styles.progressBar} aria-hidden="true" />
)}
```

#### 13.2.2　DrivePanel 文件列表 Skeleton

取代目前 `isLoadingFiles` 時顯示的純文字 `<p>載入中…</p>`，改為骨架屏：

| 項目         | 描述 |
| ------------ | ---- |
| 骨架列數     | 固定顯示 5 列（模擬文件列表項目） |
| 每列外觀     | 高度與實際 `.fileItem` 相同，背景為灰色漸層動畫（shimmer） |
| 動畫         | CSS `@keyframes shimmer`：背景位置從左滑到右，週期 1.2s infinite |
| 實作位置     | `DrivePanel.tsx` 的 `{isLoadingFiles && ...}` 分支；新增 `.skeleton`、`.skeletonItem` CSS class |

骨架屏 JSX 結構：

```tsx
{isLoadingFiles && (
  <div className={styles.skeleton} aria-busy="true" aria-label="載入中">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className={styles.skeletonItem} />
    ))}
  </div>
)}
```

---

### 13.3 受影響的元件

| 元件 / 檔案                       | 異動說明 |
| --------------------------------- | -------- |
| `EditorLayout.tsx`                | 新增 `isOpeningFile` state；在 `handleOpenDriveFile` 前後設定；JSX 加入進度條 DOM |
| `EditorLayout.module.css`         | 新增 `.progressBar`（indeterminate 動畫） |
| `DrivePanel.tsx`                  | 將 `isLoadingFiles` 分支從純文字改為骨架屏 JSX |
| `DrivePanel.module.css`           | 新增 `.skeleton`、`.skeletonItem`（shimmer 動畫） |

---

### 13.4 實作注意事項

- 進度條使用 CSS `animation` 而非 JavaScript，避免對渲染造成額外負擔。
- `aria-hidden="true"` 避免螢幕閱讀器播報裝飾性進度條；骨架屏使用 `aria-busy="true"` 讓輔助技術知道內容正在載入。
- 不需新增 Zustand store 欄位，`isOpeningFile` 屬於本地 UI 狀態，保留在 `EditorLayout` 即可。
