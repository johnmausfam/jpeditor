/**
 * localDrafts.ts — utility for persisting local draft backups in localStorage.
 *
 * Storage key  : jpeditor.localDrafts
 * Max files    : 20  (oldest-activity file evicted when over limit)
 * Max versions : 40  per file (oldest version evicted when over limit)
 * New files    : fileId = "__new__", fileName = null
 */

const LS_KEY = 'jpeditor.localDrafts';
const MAX_FILES = 20;
const MAX_VERSIONS = 40;

/** Single draft version snapshot. */
export interface DraftVersion {
  content: string; // Full Markdown text at backup time
  savedAt: number; // Unix timestamp (ms)
}

/** All draft versions for one file. */
export interface FileDrafts {
  fileId: string; // Drive file ID, or "__new__" for unsaved documents
  fileName: string | null; // Drive file name; null for unsaved documents
  versions: DraftVersion[]; // Descending by savedAt (newest first), max 40
}

// ── Legacy format used before CR-14 ─────────────────────────────────────────
interface LegacyDraft {
  fileId: string;
  fileName: string | null;
  content: string;
  savedAt: number;
}

function isLegacyFormat(arr: unknown[]): arr is LegacyDraft[] {
  return arr.length > 0 && 'content' in (arr[0] as object);
}

function migrateLegacy(legacy: LegacyDraft[]): FileDrafts[] {
  const migrated: FileDrafts[] = legacy.map((d) => ({
    fileId: d.fileId,
    fileName: d.fileName,
    versions: [{ content: d.content, savedAt: d.savedAt }],
  }));
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(migrated));
  } catch {
    // ignore quota errors during migration
  }
  return migrated;
}

export function getFileDrafts(): FileDrafts[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (isLegacyFormat(parsed)) return migrateLegacy(parsed);
    return parsed as FileDrafts[];
  } catch {
    return [];
  }
}

/**
 * Save a new draft version for the given fileId.
 * Prepends to the file's version list; trims to MAX_VERSIONS.
 * If the file is new and total files exceed MAX_FILES, evicts the file
 * whose oldest version has the earliest savedAt (least recently active).
 */
export function saveDraft(
  fileId: string,
  fileName: string | null,
  content: string,
): void {
  const allFiles = getFileDrafts();
  const now = Date.now();
  const newVersion: DraftVersion = { content, savedAt: now };

  const existingIdx = allFiles.findIndex((f) => f.fileId === fileId);
  if (existingIdx >= 0) {
    const entry = allFiles[existingIdx];
    entry.fileName = fileName;
    entry.versions = [newVersion, ...entry.versions].slice(0, MAX_VERSIONS);
  } else {
    const newEntry: FileDrafts = {
      fileId,
      fileName,
      versions: [newVersion],
    };
    allFiles.push(newEntry);

    // Evict file with the oldest single version when over the file limit
    if (allFiles.length > MAX_FILES) {
      let oldestIdx = 0;
      let oldestTime = Infinity;
      for (let i = 0; i < allFiles.length; i++) {
        const file = allFiles[i];
        const tail = file.versions[file.versions.length - 1];
        if (tail && tail.savedAt < oldestTime) {
          oldestTime = tail.savedAt;
          oldestIdx = i;
        }
      }
      allFiles.splice(oldestIdx, 1);
    }
  }

  try {
    localStorage.setItem(LS_KEY, JSON.stringify(allFiles));
  } catch {
    // localStorage quota exceeded — silently skip
  }
}

/** Remove all versions for a file. */
export function removeDraft(fileId: string): void {
  const updated = getFileDrafts().filter((f) => f.fileId !== fileId);
  localStorage.setItem(LS_KEY, JSON.stringify(updated));
}

/** Remove a single version from a file; removes the file entry if no versions remain. */
export function removeVersion(fileId: string, savedAt: number): void {
  const allFiles = getFileDrafts();
  const idx = allFiles.findIndex((f) => f.fileId === fileId);
  if (idx < 0) return;
  allFiles[idx].versions = allFiles[idx].versions.filter(
    (v) => v.savedAt !== savedAt,
  );
  const updated =
    allFiles[idx].versions.length === 0
      ? allFiles.filter((_, i) => i !== idx)
      : allFiles;
  localStorage.setItem(LS_KEY, JSON.stringify(updated));
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
