import { useMemo, useState } from 'react';
import { useDriveStore } from '../../store/driveStore';
import type { DriveFile } from '../../store/driveStore';
import styles from './DrivePanel.module.css';

type SortKey = 'modifiedTime' | 'name';

const LS_SORT = 'jpeditor_drive_sort';

function readSortKey(): SortKey {
  const v = localStorage.getItem(LS_SORT);
  return v === 'name' ? 'name' : 'modifiedTime';
}

interface DrivePanelProps {
  open: boolean;
  onClose: () => void;
  onOpenFile: (fileId: string, fileName: string) => Promise<void>;
  onRefresh: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function DrivePanel({
  open,
  onClose,
  onOpenFile,
  onRefresh,
}: DrivePanelProps) {
  const {
    files,
    workFolders,
    activeFolderId,
    setActiveFolderId,
    isLoadingFiles,
    error,
  } = useDriveStore();

  const [openingFileId, setOpeningFileId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [selectedOwner, setSelectedOwner] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>(readSortKey);

  // Collect unique owner names from the full file list
  const ownerOptions = useMemo(() => {
    const names = files.map((f) => f.ownerName ?? '').filter(Boolean);
    return Array.from(new Set(names)).sort();
  }, [files]);

  // Filter + sort
  const displayedFiles = useMemo(() => {
    const kw = keyword.toLowerCase();
    return files
      .filter((f) => (kw ? f.name.toLowerCase().includes(kw) : true))
      .filter((f) => (selectedOwner ? f.ownerName === selectedOwner : true))
      .sort((a, b) => {
        if (sortKey === 'name') {
          return a.name.localeCompare(b.name, 'ja');
        }
        return b.modifiedTime.localeCompare(a.modifiedTime);
      });
  }, [files, keyword, selectedOwner, sortKey]);

  if (!open) return null;

  const handleClickFile = async (file: DriveFile) => {
    setOpeningFileId(file.id);
    try {
      await onOpenFile(file.id, file.name);
    } finally {
      setOpeningFileId(null);
    }
  };

  const handleRefresh = () => {
    setKeyword('');
    onRefresh();
  };

  const handleFolderChange = (folderId: string) => {
    setActiveFolderId(folderId);
    setKeyword('');
    onRefresh();
  };

  const handleSortChange = (key: SortKey) => {
    setSortKey(key);
    localStorage.setItem(LS_SORT, key);
  };

  return (
    <>
      {/* Backdrop — click to close */}
      <div
        className={styles.backdrop}
        onClick={onClose}
        role="presentation"
        aria-hidden="true"
      />

      <aside
        className={styles.panel}
        role="complementary"
        aria-label="Google Drive 文件列表"
      >
        {/* ── Panel header ── */}
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>📁 Google Drive 文件</span>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="關閉面板"
          >
            ✕
          </button>
        </div>

        {/* ── Folder selector ── */}
        <div className={styles.folderSection}>
          {workFolders.length > 0 ? (
            <select
              className={styles.folderSelect}
              value={activeFolderId}
              onChange={(e) => handleFolderChange(e.target.value)}
              aria-label="切換工作目錄"
            >
              {workFolders.map((f) => (
                <option key={f.folderId} value={f.folderId}>
                  📂 {f.label}
                </option>
              ))}
            </select>
          ) : (
            <p className={styles.folderHint}>
              尚未設定工作目錄。請點選右上角 ⚙️ 新增工作目錄後重新整理。
            </p>
          )}
        </div>

        {/* ── List header ── */}
        <div className={styles.listHeader}>
          <span className={styles.fileCount}>
            {!isLoadingFiles && !error && activeFolderId
              ? `${files.length} 個 .md 檔案`
              : ''}
          </span>
          <button
            className={styles.refreshBtn}
            onClick={handleRefresh}
            disabled={isLoadingFiles || !activeFolderId}
            aria-label="重新整理文件列表"
          >
            {isLoadingFiles ? '載入中…' : '↺ 重新整理'}
          </button>
        </div>

        {/* ── Control bar: search / owner filter / sort ── */}
        {!isLoadingFiles && activeFolderId && !error && files.length > 0 && (
          <div className={styles.controlBar}>
            <div className={styles.searchWrapper}>
              <input
                className={styles.searchInput}
                type="text"
                placeholder="搜尋檔名…"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                aria-label="搜尋檔名"
              />
              {keyword && (
                <button
                  className={styles.searchClear}
                  onClick={() => setKeyword('')}
                  aria-label="清除搜尋"
                >
                  ✕
                </button>
              )}
            </div>
            {ownerOptions.length > 0 && (
              <select
                className={styles.filterSelect}
                value={selectedOwner}
                onChange={(e) => setSelectedOwner(e.target.value)}
                aria-label="依擁有者過濾"
              >
                <option value="">全部</option>
                {ownerOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
            <select
              className={styles.filterSelect}
              value={sortKey}
              onChange={(e) => handleSortChange(e.target.value as SortKey)}
              aria-label="排序方式"
            >
              <option value="modifiedTime">依編輯時間</option>
              <option value="name">依檔名</option>
            </select>
          </div>
        )}

        {/* ── Error banner ── */}
        {error && (
          <div className={styles.error} role="alert">
            ⚠ {error}
          </div>
        )}

        {/* ── File list ── */}
        <div className={styles.fileList}>
          {isLoadingFiles && (
            <p className={styles.statusMsg} aria-live="polite">
              載入中…
            </p>
          )}

          {!isLoadingFiles && !activeFolderId && (
            <p className={styles.statusMsg}>
              請先設定 Google Drive 資料夾 ID。
            </p>
          )}

          {!isLoadingFiles &&
            activeFolderId &&
            !error &&
            files.length === 0 && (
              <p className={styles.statusMsg}>此資料夾中沒有 .md 檔案。</p>
            )}

          {!isLoadingFiles &&
            activeFolderId &&
            !error &&
            files.length > 0 &&
            displayedFiles.length === 0 && (
              <p className={styles.statusMsg}>找不到符合「{keyword}」的檔案</p>
            )}

          {!isLoadingFiles &&
            displayedFiles.map((file) => (
              <button
                key={file.id}
                className={styles.fileItem}
                onClick={() => handleClickFile(file)}
                disabled={openingFileId !== null}
                title={`開啟 ${file.name}`}
              >
                <span className={styles.fileIcon}>📄</span>
                <span className={styles.fileInfo}>
                  <span className={styles.fileName}>{file.name}</span>
                  <span className={styles.fileMeta}>
                    {formatDate(file.modifiedTime)}
                    {file.size
                      ? ` · ${Math.ceil(Number(file.size) / 1024)} KB`
                      : ''}
                    {file.ownerName ? ` · ${file.ownerName}` : ''}
                  </span>
                </span>
                {openingFileId === file.id && (
                  <span className={styles.fileOpening}>開啟中…</span>
                )}
              </button>
            ))}
        </div>
      </aside>
    </>
  );
}
