# CR-5 開發日誌 — 離開確認與本地草稿備份

**日期**: 2026-05-03
**對應需求**: change-requirements-2.md CR-5

---

## 目標

編輯器目前沒有自動儲存至 Google Drive 的功能，若使用者意外關閉分頁或重新整理，編輯中的內容將全數遺失。本次透過兩道輕量防護解決此問題：

1. **離開確認**：內容不為空時，瀏覽器原生彈窗提醒使用者確認是否離開。
2. **本地草稿備份**：定時將編輯器內容快照至 `localStorage`，並提供調閱介面供緊急還原。

使用者感知的額外負擔接近零（背景自動執行），但可在關鍵時刻取回資料。

---

## 實作細節

### 1. `web/src/app/lib/localDrafts.ts`（新增）

集中管理 `localStorage` 草稿讀寫的工具模組，所有邏輯與元件解耦。

**資料結構：**

```ts
interface LocalDraft {
  fileId: string;          // Drive 檔案 ID；未儲存的新文件固定為 "__new__"
  fileName: string | null; // Drive 檔名；新文件為 null
  content: string;         // 備份的 Markdown 全文
  savedAt: number;         // 備份時間（Unix ms）
}
```

**`saveDraft`（核心邏輯）：**

```
saveDraft(fileId, fileName, content)
  → 讀取現有 drafts 陣列
  → 若已有相同 fileId 的條目 → 原地覆蓋（不增加筆數）
  → 否則 append；若超過 20 筆 → 依 savedAt 排序後移除最舊一筆
  → 寫回 localStorage
```

同一份文件無論備份幾次，僅佔用一個名額。最多 20 個不同檔案的最新備份並存。

**備份間隔偏好設定：**

額外匯出 `getDraftIntervalMs / setDraftIntervalMs`（localStorage 鍵 `jpeditor.draftInterval`）與常數 `DRAFT_INTERVAL_OPTIONS`，供 SettingsDialog 直接使用，避免分散管理。

---

### 2. `EditorLayout.tsx` — `beforeunload` 監聽（CR-5b）

```ts
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (markdown !== '') {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, [markdown]);
```

**啟用條件**：`markdown !== ''`，空白文件不觸發，避免剛開啟頁面就出現確認框干擾使用者。現代瀏覽器不允許自訂確認框文字，一律顯示瀏覽器預設措辭。

---

### 3. `EditorLayout.tsx` — 草稿備份 interval（CR-5b）

```ts
// 確保 interval callback 永遠讀到最新值，不依賴 closure capture
const markdownRef = useRef(markdown);
useEffect(() => { markdownRef.current = markdown; }, [markdown]);

const lastBackedUpRef = useRef<string | null>(null);
const [lastDraftAt, setLastDraftAt] = useState<number | null>(null);
```

```ts
useEffect(() => {
  const startInterval = () => {
    const ms = getDraftIntervalMs();
    return window.setInterval(() => {
      const current = markdownRef.current;
      // 內容未變更 → 不寫入，避免無謂 IO
      if (current === '' || current === lastBackedUpRef.current) return;
      const { currentFileId, currentFileName } = useDriveStore.getState();
      saveDraft(currentFileId ?? '__new__', currentFileName, current);
      lastBackedUpRef.current = current;
      setLastDraftAt(Date.now());
    }, ms);
  };

  let id = startInterval();

  // SettingsDialog 儲存新間隔後派送此事件，interval 自動重啟
  const handler = () => { clearInterval(id); id = startInterval(); };
  window.addEventListener('jpeditor:draft-interval-changed', handler);
  return () => {
    clearInterval(id);
    window.removeEventListener('jpeditor:draft-interval-changed', handler);
  };
}, []);
```

**設計要點：**
- `markdownRef` 讓 interval callback 不需因 `markdown` 變更而重建，避免頻繁清除 / 重建計時器。
- `lastBackedUpRef` 做 dirty check，相同內容不重複寫入 localStorage。
- `jpeditor:draft-interval-changed` CustomEvent 是 SettingsDialog 與 interval 之間的鬆耦合通知橋樑，無需提升狀態或透過 props 傳遞 callback。

---

### 4. `SettingsDialog.tsx` — 草稿備份間隔設定（CR-5c）

在現有 Google Drive 設定區塊下方新增「草稿備份」section：

```tsx
<select
  value={draftInterval}
  onChange={(e) => setDraftInterval(Number(e.target.value))}
>
  {DRAFT_INTERVAL_OPTIONS.map((opt) => (
    <option key={opt.value} value={opt.value}>{opt.label}</option>
  ))}
</select>
```

`handleSave` 同步更新間隔並派送事件：

```ts
setDraftIntervalMs(draftInterval);
window.dispatchEvent(new CustomEvent('jpeditor:draft-interval-changed'));
```

對話框重新開啟時，從 localStorage 讀取目前值（`setDraftInterval(getDraftIntervalMs())`），確保顯示與實際設定一致。

---

### 5. `DraftDialog`（新增）— 草稿調閱介面（CR-5d）

**版面結構（700px 寬 modal）：**

```
┌───────────────────────────────────────────────────────────┐
│ 🗒 草稿備份                                            [✕] │
├──────────────────┬────────────────────────────────────────┤
│  備份清單        │  Markdown 原文預覽（<pre> 唯讀）       │
│  （240px）       │                                        │
│  ─ 檔名          │  ── 已選取檔名 + 備份時間戳            │
│    備份時間  [🗑] │                                        │
│  ─ …             │  [套用至編輯器]                        │
│                  │  套用後不會自動存檔至 Drive，請手動儲存│
├──────────────────┴────────────────────────────────────────┤
│ [清除全部備份]                                            │
└───────────────────────────────────────────────────────────┘
```

**UX 細節：**
- 對話框開啟時，清單依 `savedAt` **由新至舊**排列，預設選取第一筆。
- 「清除全部備份」需**二次點擊確認**（第一次顯示「確認清除全部？再按一次確認」），防止誤操作。
- 各筆備份旁「🗑」刪除後立即更新清單；若刪除的是目前選取的條目，自動改選新清單的第一筆。
- 備份時間以 `zh-TW` locale 格式化顯示（`new Date(ts).toLocaleString('zh-TW', ...)`）。

**套用限制（刻意設計）：**
- `onApply` 僅將備份內容載入 `markdown` state，**不更改** `currentFileId` / `currentFileName`。
- 使用者仍需手動「💾 儲存」或「另存新檔」才會寫入 Drive，防止意外覆蓋原始檔案。

---

### 6. StatusBar — 草稿備份提示（追加需求）

上次草稿備份時間以相對格式顯示於狀態欄右側，讓使用者隨時得知備份狀態：

```
🗒 草稿備份：剛才 | 1 分鐘前 | N 分鐘前
```

**實作：**
- `EditorLayout` 透過 `lastDraftAt: number | null` prop 傳入最後備份時間戳。
- `StatusBar` 內每 30 秒觸發一次 `setTick` 強制重新計算相對時間（interval 僅在 `lastDraftAt !== null` 時啟動）。
- `formatDraftAge(ts)` 計算 `Math.floor((Date.now() - ts) / 60_000)` 分鐘數，0 分鐘顯示「剛才」。
- hover 顯示完整備份時間戳記（`title` 屬性）。

---

### 7. 草稿按鈕入口設計（調整）

初版設計將「查看草稿備份 →」連結按鈕放在 SettingsDialog 內。實作後考量**草稿調閱是獨立的工作流程**，與「設定」語意不符，因此改為在 Header 直接放置「🗒 草稿」按鈕（登入與未登入狀態均顯示），可隨時一鍵開啟，不需繞道設定頁面。

---

## 新增 / 異動檔案

| 檔案 | 異動類型 |
| ---- | -------- |
| `web/src/app/lib/localDrafts.ts` | 新增 |
| `web/src/app/components/DraftDialog/DraftDialog.tsx` | 新增 |
| `web/src/app/components/DraftDialog/DraftDialog.module.css` | 新增 |
| `web/src/app/components/EditorLayout/EditorLayout.tsx` | 修改 |
| `web/src/app/components/SettingsDialog/SettingsDialog.tsx` | 修改 |
| `web/src/app/components/SettingsDialog/SettingsDialog.module.css` | 修改 |
| `web/src/app/components/StatusBar/StatusBar.tsx` | 修改 |

---

## localStorage 鍵一覽（CR-5 新增）

| 鍵名 | 類型 | 說明 |
| ---- | ---- | ---- |
| `jpeditor.localDrafts` | JSON array | `LocalDraft[]`；最多 20 筆 |
| `jpeditor.draftInterval` | 數字字串 | 備份間隔 ms；預設 `"60000"` |
