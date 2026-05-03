import { useEffect, useState } from 'react';
import { useDriveStore } from '../../store/driveStore';
import type { DriveFile } from '../../store/driveStore';
import styles from './DrivePanel.module.css';

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
  const { files, folderId, isLoadingFiles, error, setFolderId } =
    useDriveStore();

  const [folderInput, setFolderInput] = useState(folderId);
  const [openingFileId, setOpeningFileId] = useState<string | null>(null);

  // Sync local input whenever the panel opens or the stored folderId changes
  useEffect(() => {
    if (open) setFolderInput(folderId);
  }, [open, folderId]);

  if (!open) return null;

  const folderChanged = folderInput.trim() !== folderId;

  const handleFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = folderInput.trim();
    if (!id) return;
    setFolderId(id);
    onRefresh();
  };

  const handleClickFile = async (file: DriveFile) => {
    setOpeningFileId(file.id);
    try {
      await onOpenFile(file.id, file.name);
    } finally {
      setOpeningFileId(null);
    }
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

        {/* ── Folder ID configuration ── */}
        <div className={styles.folderSection}>
          <p className={styles.folderLabel}>工作目錄 ID</p>
          <form className={styles.folderForm} onSubmit={handleFolderSubmit}>
            <input
              className={styles.folderInput}
              type="text"
              value={folderInput}
              onChange={(e) => setFolderInput(e.target.value)}
              placeholder="貼上 Google Drive 資料夾 ID"
              aria-label="Google Drive 資料夾 ID"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              className={styles.folderBtn}
              type="submit"
              disabled={!folderInput.trim() || !folderChanged}
              title="套用資料夾並重新整理"
            >
              套用
            </button>
          </form>
          <p className={styles.folderHint}>
            在 Google Drive 開啟目標資料夾，從網址列複製 ID：
            <br />
            <code>drive.google.com/drive/folders/</code>
            <strong>資料夾ID</strong>
          </p>
        </div>

        {/* ── List header ── */}
        <div className={styles.listHeader}>
          <span className={styles.fileCount}>
            {!isLoadingFiles && !error && folderId
              ? `${files.length} 個 .md 檔案`
              : ''}
          </span>
          <button
            className={styles.refreshBtn}
            onClick={onRefresh}
            disabled={isLoadingFiles || !folderId}
            aria-label="重新整理文件列表"
          >
            {isLoadingFiles ? '載入中…' : '↺ 重新整理'}
          </button>
        </div>

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

          {!isLoadingFiles && !folderId && (
            <p className={styles.statusMsg}>
              請先設定 Google Drive 資料夾 ID。
            </p>
          )}

          {!isLoadingFiles && folderId && !error && files.length === 0 && (
            <p className={styles.statusMsg}>此資料夾中沒有 .md 檔案。</p>
          )}

          {!isLoadingFiles &&
            files.map((file) => (
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
