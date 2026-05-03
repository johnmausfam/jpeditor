# CR-6 開發日誌 — Header 功能收合至左側抽屜選單

**日期**: 2026-05-03
**對應需求**: change-requirements-2.md CR-6

---

## 目標

CR-1 完成後，Header 已累積「＋ 新文件」、「☐ 範本」、「最近檔案 ▾」、「💾 儲存」、「另存新檔」、「📁 Drive 文件」、「🗒 草稿」、「⚙️」、使用者名稱、「登出」等多個元素，在中小寬度螢幕上排列擁擠。本次將大部分功能收合至**左側抽屜選單（AppDrawer）**，Header 回歸簡潔，只保留高頻操作。

---

## 實作細節

### 1. `AppDrawer` 元件（新增）

#### 1.1 版面結構

```
╔══════════════════════════════╗
║ 日文講義エディター        [✕] ║  ← 抽屜 Header
╠══════════════════════════════╣
║ 📄 文件                       ║
║ ─────────────────────────    ║
║  ＋ 新文件  [ ☐ 使用範本 ]    ║
║  📋 最近開啟的檔案  ▾         ║  ← accordion，預設收起
║      ├ 第1課講義.md  05/03    ║
║      ├ 第2課單字表.md ...     ║
║      └ 清除記錄               ║
╠══════════════════════════════╣
║ ☁️ Google Drive               ║
║ ─────────────────────────    ║
║ （未登入）🔑 Google 登入      ║
║ （已登入） 👤 使用者名稱       ║
║            📁 Drive 文件      ║
║            另存新檔           ║
║            登出               ║
╠══════════════════════════════╣
║ ─────────────────────────    ║
║ 🗒 草稿備份                   ║
╚══════════════════════════════╝
```

#### 1.2 動畫與層級

抽屜以 CSS transform 實現滑入動畫，不依賴 JS 計算：

```css
.drawer {
  transform: translateX(-100%);
  transition: transform 200ms ease;
}
.drawerOpen {
  transform: translateX(0);
}
```

- 寬度固定 **280px**，`z-index: 600`（高於 Dialog 的 500）
- Backdrop：`opacity: 0 → rgba(0,0,0,0.4)`，同樣 CSS transition；`pointer-events: none` 在收起狀態下避免攔截點擊

#### 1.3 關閉方式

三種關閉路徑均支援：

| 方式 | 實作 |
| ---- | ---- |
| 點擊 backdrop | backdrop 的 `onClick` → `onClose()` |
| 點擊抽屜內 ✕ 按鈕 | 直接呼叫 `onClose()` |
| 按 Escape 鍵 | `useEffect` 監聽 `keydown`，僅在 `open` 時掛載，組件 unmount 或 `open` 變 false 時清除 |

#### 1.4 最近開啟的檔案 Accordion

```ts
// accordion 開啟時才讀取，避免元件 mount 就觸發 localStorage read
useEffect(() => {
  if (accordionOpen) setRecentFiles(getRecentFiles());
}, [accordionOpen]);

// 抽屜關閉時重置 accordion，下次開啟時呈現收起狀態
useEffect(() => {
  if (!open) setAccordionOpen(false);
}, [open]);
```

點擊某筆最近檔案後：
1. 呼叫 `onOpenFile(fileId, fileName)`（原有的 `handleOpenDriveFile`）
2. 成功後呼叫 `onClose()` 自動關閉抽屜

最近開啟失敗的容錯由 `EditorLayout` 的 `handleOpenDriveFile` 負責（已實作於 CR-1），`AppDrawer` 無需額外處理。

#### 1.5 Props 設計

所有業務邏輯（Drive API、store 操作）留在 `EditorLayout`，`AppDrawer` 只接收 callback props，保持元件純粹：

```ts
interface AppDrawerProps {
  open: boolean;
  onClose: () => void;
  useTemplate: boolean;
  onToggleTemplate: (checked: boolean) => void;
  onNewDocument: () => void;
  onOpenFile: (fileId: string, fileName: string) => Promise<void>;
  onOpenDrive: () => void;
  onSaveAs: () => void;
  onLogin: () => void;
  onLogout: () => void;
  isLoggedIn: boolean;
  userName: string | null;
  userEmail: string | null;
  onOpenDrafts: () => void;
}
```

`useTemplate` / `isLoggedIn` / `userName` / `userEmail` 直接由 `EditorLayout` 從 store 或 state 取得後向下傳遞。

---

### 2. EditorLayout Header 精簡（CR-6b）

#### 2.1 精簡後的 Header 結構

```
[☰]  檔名 / 日文講義エディター ─────────────────  [💾 儲存]  [⚙️]
```

| 位置 | 元素 | 條件 |
| ---- | ---- | ---- |
| 最左 | `☰` 抽屜開關 | 常駐 |
| 中間（flex-grow） | 目前檔名 or `'日文講義エディター'` | 常駐 |
| 右側 | `💾 儲存` | 登入後才顯示 |
| 最右 | `⚙️` | 常駐 |

#### 2.2 移入抽屜的元素

| 原 Header 元素 | 去向 |
| -------------- | ---- |
| ＋ 新文件 + 範本 checkbox | AppDrawer 📄 文件區塊 |
| 最近檔案 ▾（`RecentFilesMenu`） | AppDrawer 📄 文件區塊（accordion） |
| 另存新檔 | AppDrawer ☁️ Drive 區塊 |
| 📁 Drive 文件 | AppDrawer ☁️ Drive 區塊 |
| 🗒 草稿 | AppDrawer 底部 |
| 🔑 Google 登入 | AppDrawer ☁️ Drive 區塊 |
| 使用者名稱 + 登出 | AppDrawer ☁️ Drive 區塊 |

#### 2.3 新增 state

```ts
const [drawerOpen, setDrawerOpen] = useState(false);
```

#### 2.4 `RecentFilesMenu` 元件

`RecentFilesMenu` 元件的最近檔案邏輯（讀取 `getRecentFiles`、處理 outside click、顯示開啟中狀態）全數移入 `AppDrawer` 內部實作。`RecentFilesMenu` 元件的 import 從 `EditorLayout` 移除；元件本身保留在專案中（未刪除），但已無任何地方引用，可於後續整理時刪除。

---

### 3. CSS 清理

從 `EditorLayout.module.css` 移除以下已無使用的 class：

- `.newDocGroup`
- `.templateLabel`
- `.templateCheckbox`
- `.userInfo`

新增：

- `.drawerBtn`：☰ 開關按鈕樣式（透明背景、hover 淡入）
- `.logo`：加入 `flex: 1`、`overflow: hidden`、`text-overflow: ellipsis`，適應長檔名

---

## 新增 / 異動檔案

| 檔案 | 異動類型 |
| ---- | -------- |
| `web/src/app/components/AppDrawer/AppDrawer.tsx` | 新增 |
| `web/src/app/components/AppDrawer/AppDrawer.module.css` | 新增 |
| `web/src/app/components/EditorLayout/EditorLayout.tsx` | 修改 |
| `web/src/app/components/EditorLayout/EditorLayout.module.css` | 修改 |
