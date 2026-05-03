/**
 * localDrafts.ts — utility for persisting local draft backups in localStorage.
 *
 * Storage key : jpeditor.localDrafts
 * Max entries : 20  (same fileId → overwrite; oldest evicted when full)
 * New files   : fileId = "__new__", fileName = null
 */

const LS_KEY = 'jpeditor.localDrafts';
const MAX_DRAFTS = 20;

export interface LocalDraft {
  fileId: string; // Drive file ID, or "__new__" for unsaved documents
  fileName: string | null; // Drive file name; null for unsaved documents
  content: string; // Full Markdown text at backup time
  savedAt: number; // Unix timestamp (ms)
}

export function getDrafts(): LocalDraft[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as LocalDraft[];
  } catch {
    return [];
  }
}

/**
 * Save (or overwrite) a draft entry for the given fileId.
 * If no existing entry matches, a new one is appended.
 * When the list exceeds MAX_DRAFTS, the oldest entry (by savedAt) is removed.
 */
export function saveDraft(
  fileId: string,
  fileName: string | null,
  content: string,
): void {
  let drafts = getDrafts();
  const now = Date.now();

  // Overwrite existing entry for this fileId
  const existingIdx = drafts.findIndex((d) => d.fileId === fileId);
  if (existingIdx >= 0) {
    drafts[existingIdx] = { fileId, fileName, content, savedAt: now };
  } else {
    drafts.push({ fileId, fileName, content, savedAt: now });
    // Evict oldest if over limit
    if (drafts.length > MAX_DRAFTS) {
      drafts.sort((a, b) => a.savedAt - b.savedAt);
      drafts = drafts.slice(drafts.length - MAX_DRAFTS);
    }
  }

  try {
    localStorage.setItem(LS_KEY, JSON.stringify(drafts));
  } catch {
    // localStorage quota exceeded — silently skip
  }
}

/** Remove a single draft by fileId. */
export function removeDraft(fileId: string): void {
  const drafts = getDrafts().filter((d) => d.fileId !== fileId);
  localStorage.setItem(LS_KEY, JSON.stringify(drafts));
}

/** Remove all drafts. */
export function clearDrafts(): void {
  localStorage.removeItem(LS_KEY);
}

// ── Interval preference ──────────────────────────────────────────────────────

const INTERVAL_LS_KEY = 'jpeditor.draftInterval';
export const DEFAULT_DRAFT_INTERVAL_MS = 60_000; // 1 minute

export const DRAFT_INTERVAL_OPTIONS: { label: string; value: number }[] = [
  { label: '30 秒', value: 30_000 },
  { label: '1 分鐘', value: 60_000 },
  { label: '3 分鐘', value: 180_000 },
  { label: '5 分鐘', value: 300_000 },
];

export function getDraftIntervalMs(): number {
  const raw = localStorage.getItem(INTERVAL_LS_KEY);
  if (!raw) return DEFAULT_DRAFT_INTERVAL_MS;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_DRAFT_INTERVAL_MS;
}

export function setDraftIntervalMs(ms: number): void {
  localStorage.setItem(INTERVAL_LS_KEY, String(ms));
}
