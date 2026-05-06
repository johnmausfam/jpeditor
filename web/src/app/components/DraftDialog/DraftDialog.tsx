import { useEffect, useState } from 'react';
import {
  clearDrafts,
  getFileDrafts,
  removeDraft,
  removeVersion,
  type FileDrafts,
  type DraftVersion,
} from '../../lib/localDrafts';
import styles from './DraftDialog.module.css';

interface DraftDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called when the user clicks "套用至編輯器" */
  onApply: (content: string, fileId: string) => void;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Sort FileDrafts by the newest version's savedAt, descending. */
function sortedFileDrafts(list: FileDrafts[]): FileDrafts[] {
  return [...list].sort((a, b) => {
    const aTop = a.versions[0]?.savedAt ?? 0;
    const bTop = b.versions[0]?.savedAt ?? 0;
    return bTop - aTop;
  });
}

export function DraftDialog({ open, onClose, onApply }: DraftDialogProps) {
  const [fileDrafts, setFileDrafts] = useState<FileDrafts[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedSavedAt, setSelectedSavedAt] = useState<number | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // Reload drafts whenever the dialog opens
  useEffect(() => {
    if (open) {
      const list = sortedFileDrafts(getFileDrafts());
      setFileDrafts(list);
      const firstFile = list[0] ?? null;
      setSelectedFileId(firstFile?.fileId ?? null);
      setSelectedSavedAt(firstFile?.versions[0]?.savedAt ?? null);
      setConfirmClear(false);
    }
  }, [open]);

  if (!open) return null;

  const selectedFile =
    fileDrafts.find((f) => f.fileId === selectedFileId) ?? null;
  const selectedVersion: DraftVersion | null =
    selectedFile?.versions.find((v) => v.savedAt === selectedSavedAt) ?? null;

  const reload = () => {
    const list = sortedFileDrafts(getFileDrafts());
    setFileDrafts(list);
    return list;
  };

  const handleSelectFile = (file: FileDrafts) => {
    setSelectedFileId(file.fileId);
    setSelectedSavedAt(file.versions[0]?.savedAt ?? null);
  };

  const handleRemoveFile = (fileId: string) => {
    removeDraft(fileId);
    const list = reload();
    if (selectedFileId === fileId) {
      const first = list[0] ?? null;
      setSelectedFileId(first?.fileId ?? null);
      setSelectedSavedAt(first?.versions[0]?.savedAt ?? null);
    }
  };

  const handleRemoveVersion = (fileId: string, savedAt: number) => {
    removeVersion(fileId, savedAt);
    const list = reload();
    const updatedFile = list.find((f) => f.fileId === fileId) ?? null;
    if (selectedSavedAt === savedAt) {
      // Select the first remaining version of the same file, or move to another file
      if (updatedFile) {
        setSelectedSavedAt(updatedFile.versions[0]?.savedAt ?? null);
      } else {
        const first = list[0] ?? null;
        setSelectedFileId(first?.fileId ?? null);
        setSelectedSavedAt(first?.versions[0]?.savedAt ?? null);
      }
    }
  };

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clearDrafts();
    setFileDrafts([]);
    setSelectedFileId(null);
    setSelectedSavedAt(null);
    setConfirmClear(false);
  };

  const hasAny = fileDrafts.length > 0;

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="草稿備份"
      >
        {/* ── Header ── */}
        <div className={styles.header}>
          <h2 className={styles.title}>🗒 草稿備份</h2>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="關閉"
          >
            ✕
          </button>
        </div>

        {!hasAny ? (
          <p className={styles.empty}>目前沒有草稿備份。</p>
        ) : (
          <div className={styles.body}>
            {/* ── Column 1: file list ── */}
            <ul className={styles.list} role="listbox" aria-label="檔案清單">
              {fileDrafts.map((f) => (
                <li
                  key={f.fileId}
                  className={`${styles.listItem} ${selectedFileId === f.fileId ? styles.listItemActive : ''}`}
                  role="option"
                  aria-selected={selectedFileId === f.fileId}
                  onClick={() => handleSelectFile(f)}
                >
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>
                      {f.fileName ?? '（未儲存的新文件）'}
                    </span>
                    <span className={styles.itemDate}>
                      {f.versions.length} 個版本
                    </span>
                  </div>
                  <button
                    className={styles.removeBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(f.fileId);
                    }}
                    aria-label={`刪除 ${f.fileName ?? '新文件'} 的全部備份`}
                    title="刪除此檔案的全部版本"
                  >
                    🗑
                  </button>
                </li>
              ))}
            </ul>

            {/* ── Column 2: version list ── */}
            <ul
              className={styles.versionList}
              role="listbox"
              aria-label="版本清單"
            >
              {selectedFile ? (
                selectedFile.versions.map((v) => (
                  <li
                    key={v.savedAt}
                    className={`${styles.versionItem} ${selectedSavedAt === v.savedAt ? styles.versionItemActive : ''}`}
                    role="option"
                    aria-selected={selectedSavedAt === v.savedAt}
                    onClick={() => setSelectedSavedAt(v.savedAt)}
                  >
                    <span className={styles.versionDate}>
                      {formatDate(v.savedAt)}
                    </span>
                    <button
                      className={styles.removeBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveVersion(selectedFile.fileId, v.savedAt);
                      }}
                      aria-label={`刪除 ${formatDate(v.savedAt)} 的備份`}
                      title="刪除此版本"
                    >
                      🗑
                    </button>
                  </li>
                ))
              ) : (
                <li className={styles.versionEmpty}>請從左側選取檔案</li>
              )}
            </ul>

            {/* ── Column 3: content preview ── */}
            <div className={styles.preview}>
              {selectedVersion && selectedFile ? (
                <>
                  <div className={styles.previewHeader}>
                    <span className={styles.previewName}>
                      {selectedFile.fileName ?? '（未儲存的新文件）'}
                    </span>
                    <span className={styles.previewDate}>
                      備份於 {formatDate(selectedVersion.savedAt)}
                    </span>
                  </div>
                  <pre className={styles.previewContent}>
                    {selectedVersion.content}
                  </pre>
                  <div className={styles.previewActions}>
                    <button
                      className={styles.applyBtn}
                      onClick={() =>
                        onApply(selectedVersion.content, selectedFile.fileId)
                      }
                    >
                      套用至編輯器
                    </button>
                    <p className={styles.applyNote}>
                      套用後不會自動存檔至 Drive，請手動儲存。
                    </p>
                  </div>
                </>
              ) : (
                <p className={styles.noSelection}>請從左側選取一筆備份</p>
              )}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        {hasAny && (
          <div className={styles.footer}>
            <button
              className={`${styles.clearBtn} ${confirmClear ? styles.clearBtnConfirm : ''}`}
              onClick={handleClearAll}
            >
              {confirmClear ? '確認清除全部？再按一次確認' : '清除全部備份'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
