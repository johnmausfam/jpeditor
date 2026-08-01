# 日文講義 Markdown 編輯器 — 需求變更文件

**版本：** 1.10.0
**日期：** 2026-08-01
**基準版本：** change-requirements-9.md v1.9.0（CR-1 ～ CR-15 已完成）
**對象：** 前端開發人員

---

## 變更摘要

| 編號  | 類別       | 變更項目                                     | 優先度 |
| ----- | ---------- | -------------------------------------------- | ------ |
| CR-16 | 編輯器功能 | 振假名分隔字元擴充：同時支援 `\|`、`;`、`/` | 低     |

---

## CR-16　振假名分隔字元擴充

### 16.1 背景

目前振假名語法的 Markdown 格式為 `{文字|よみかた}`，分隔字元固定為 `|`。

部分使用者習慣以 `;` 或 `/` 作為分隔字元（如 `{文字;よみかた}`、`{文字/よみかた}`），在其他支援振假名的工具中也有類似慣例。若使用者將這些格式的文字貼入編輯器或從外部來源匯入，目前的解析器無法識別，會直接以純文字顯示，造成困惑。

本次變更擴充 `rubyExtension.ts` 的解析邏輯，使 `|`、`;`、`/` 均能作為有效分隔字元。**序列化格式不變**，輸出一律使用 `|`（正規格式），確保既有文件的相容性。

---

### 16.2 變更範圍

僅修改 `web/src/app/lib/rubyExtension.ts`，其餘檔案不受影響。

---

### 16.3 `rubyExtension.ts` — 解析規則修改

#### 16.3.1 現況

`addStorage().markdown.parse.setup()` 中的 `rubyRule` 函式以字元碼 `0x7c`（`|`）定位分隔符位置：

```ts
if (ch === 0x7c && pipePos === -1) pipePos = i; // '|'
```

找到 `pipePos` 後，取 `state.src.slice(pos + 1, pipePos)` 作為本文，`state.src.slice(pipePos + 1, end)` 作為讀音。

#### 16.3.2 修改後

在迴圈中同時偵測 `|`（`0x7c`）、`;`（`0x3b`）、`/`（`0x2f`），以「最先出現者」作為分隔符：

```ts
// 0x7c = '|'  0x3b = ';'  0x2f = '/'
if ((ch === 0x7c || ch === 0x3b || ch === 0x2f) && sepPos === -1) {
  sepPos = i;
}
```

同時將原本的 `pipePos` 變數重新命名為 `sepPos`，以反映其語義已擴展為「任一分隔符的位置」。

修改後的完整迴圈邏輯：

```ts
let sepPos = -1;
let end = -1;

for (let i = pos + 1; i <= max; i++) {
  const ch = state.src.charCodeAt(i);
  if (ch === 0x0a) return false; // 換行 → 中止
  if ((ch === 0x7c || ch === 0x3b || ch === 0x2f) && sepPos === -1) {
    sepPos = i; // 第一個分隔符
  }
  if (ch === 0x7d) { end = i; break; } // '}'
}

// 必須同時找到分隔符與 '}'
if (sepPos === -1 || end === -1) return false;
// 本文與讀音均不可為空
if (sepPos <= pos + 1 || end <= sepPos + 1) return false;

if (!silent) {
  const token = state.push('ruby_inline', 'ruby', 0);
  token.attrSet('data-text', state.src.slice(pos + 1, sepPos));
  token.attrSet('data-reading', state.src.slice(sepPos + 1, end));
  token.content = state.src.slice(pos + 1, sepPos);
}

state.pos = end + 1;
return true;
```

#### 16.3.3 序列化不變

`addStorage().markdown.serialize()` 一律輸出 `{text|reading}`（`|` 格式），無論使用者原始輸入使用何種分隔符，儲存後均統一為正規格式：

```ts
serialize(state, node) {
  state['write'](`{${node.attrs.text}|${node.attrs.reading}}`);
},
```

此行為不需修改。

---

### 16.4 支援的語法格式

修改後，下列三種格式均能正確解析並渲染為振假名：

| 輸入格式 | 說明 |
| -------- | ---- |
| `{日本語\|にほんご}` | 原有格式，維持不變 |
| `{日本語;にほんご}` | 新增支援 |
| `{日本語/にほんご}` | 新增支援 |

**以上三種格式在儲存後均序列化為 `{日本語|にほんご}`。**

---

### 16.5 邊界條件與注意事項

#### 16.5.1 多個分隔符

取「最先出現者」作為分隔符，其後的分隔符視為讀音的一部分：

```
{text/read/ing}  →  本文 = "text"，讀音 = "read/ing"
```

此行為與原本 `|` 的處理方式一致（只取第一個 `|`）。

#### 16.5.2 `/` 與 URL

振假名語法被 `{...}` 括弧限定範圍，URL 不會出現在 `{...}` 結構內，因此不存在誤判問題。

#### 16.5.3 `;` 與 HTML 實體

HTML 實體（如 `&amp;`）以 `;` 結尾，但這些字串不會以 `{` 開頭，因此解析規則的觸發條件（`state.src.charCodeAt(pos) === 0x7b`）天然排除此情況。

---

### 16.6 變更檔案清單

| 檔案 | 變更類型 | 說明 |
| ---- | -------- | ---- |
| `web/src/app/lib/rubyExtension.ts` | 修改 | `rubyRule` 擴充分隔符偵測邏輯；`pipePos` 重新命名為 `sepPos` |
