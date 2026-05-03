/**
 * Utility for persisting the "recently opened Drive files" list
 * in localStorage. Entries are kept in reverse-chronological order,
 * capped at MAX_RECENT items.
 */

const LS_KEY = 'jpeditor.recentFiles';
const MAX_RECENT = 10;

export interface RecentFile {
  fileId: string;
  fileName: string;
  openedAt: number;
}

export function getRecentFiles(): RecentFile[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as RecentFile[];
  } catch {
    return [];
  }
}

/**
 * Add or refresh a file in the recent-files list.
 * If the file already exists, it is moved to the top.
 */
export function pushRecentFile(fileId: string, fileName: string): void {
  const list = getRecentFiles().filter((f) => f.fileId !== fileId);
  list.unshift({ fileId, fileName, openedAt: Date.now() });
  localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}

/** Remove a specific file from the recent-files list (e.g. on 404 open failure). */
export function removeRecentFile(fileId: string): void {
  const list = getRecentFiles().filter((f) => f.fileId !== fileId);
  localStorage.setItem(LS_KEY, JSON.stringify(list));
}

export function clearRecentFiles(): void {
  localStorage.removeItem(LS_KEY);
}
