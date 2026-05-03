# CR-3 開發日誌 — 範本 Markdown 內容

**日期**: 2026-05-03
**對應需求**: change-requirements.md CR-3

---

## 目標

講師建立新講義時通常有固定的章節結構。本次在 CR-1 已建立的「新文件 + 使用範本」流程基礎上，確立 `template.md` 的正式內容，並補強應對範本檔遺失的 fallback 機制。

---

## 實作細節

### 1. `web/src/assets/template.md` — 範本內容定稿

對齊 change-requirements.md CR-3.2.2 規格，最終內容如下：

```markdown
# 第　課　タイトル

**日期：**　　　　**班級：**　　　　**教師：**

---

## 學習目標

-
-
-

---

## 單字表

| 単語 | 読み方 | 意味 |
| ---- | ------ | ---- |
|      |        |      |

---

## 文法說明

### 文型 1：

**例句：**

> 

---

## 練習題

1.
2.
3.

---

## 課後作業
```

與 CR-1 建立的 stub 相比，調整了以下細節：
- 日期/班級/教師 間的全形空格數對齊規格（4 個）
- 單字表保留 1 筆空白資料列（spec 範例為 1 筆）
- 引言行改為 `> `（保留尾端空格，確保 Markdown 解析器正確產生 `<blockquote>`）

---

### 2. `EditorLayout.tsx` — Fallback 機制（CR-3.2.3）

CR-3.2.3 說明：若 `template.md` 不存在（首次 clone 專案），`import` 會失敗；需提供 fallback。

Vite `?raw` 靜態匯入在建置期決定，若檔案存在則永遠成功；但為防止開發環境中手動刪除 `template.md` 後直接使用 `vite dev`（未重啟），加入執行期 fallback：

```ts
import templateContent from '../../../assets/template.md?raw';

// CR-3: fallback in case the static import yields an empty string
// (e.g. template.md was manually deleted before a dev-server restart)
const TEMPLATE_FALLBACK = '# 第　課　タイトル\n\n**日期：**　　　　**班級：**　　　　**教師：**\n';
const EFFECTIVE_TEMPLATE = templateContent || TEMPLATE_FALLBACK;
```

`handleNewDocument` 改用 `EFFECTIVE_TEMPLATE`：

```ts
const handleNewDocument = useCallback(() => {
  const content = useTemplate ? EFFECTIVE_TEMPLATE : '';
  lastSourceRef.current = 'source';
  setMarkdown(content);
  useDriveStore.getState().setCurrentFile(null, null);
}, [useTemplate]);
```

---

## 載入流程總覽

```
建置期（Vite）
  template.md 存在 → templateContent = 檔案全文
  template.md 不存在 → 建置失敗（需修復）

執行期（handleNewDocument）
  useTemplate = true
    → EFFECTIVE_TEMPLATE = templateContent || TEMPLATE_FALLBACK
    → setMarkdown(EFFECTIVE_TEMPLATE)
    → setCurrentFile(null, null)   ← 清空檔名 / currentFileId
  useTemplate = false
    → setMarkdown('')              ← 空白文件
    → setCurrentFile(null, null)
```

---

## 注意事項

- `template.md` 為本地自訂範本，不應提交機敏內容至版本控制。建議在 `.gitignore` 中加入排除規則，或於 README 說明此檔案的定位。
- 本次未提供 UI 編輯入口：使用者若要自訂範本，直接以文字編輯器修改 `web/src/assets/template.md` 後重新建置即可。

---

## 受影響的檔案

| 檔案 | 變更類型 |
| ---- | -------- |
| `web/src/assets/template.md` | 修改（內容定稿） |
| `web/src/app/components/EditorLayout/EditorLayout.tsx` | 修改（新增 `TEMPLATE_FALLBACK` / `EFFECTIVE_TEMPLATE`，更新 `handleNewDocument`） |
