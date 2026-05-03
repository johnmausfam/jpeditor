import { useEffect, useState } from 'react';
import {
  clearDrafts,
  getDrafts,
  removeDraft,
  type LocalDraft,
} from '../../lib/localDrafts';
import styles from './DraftDialog.module.css';

interface DraftDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called when the user clicks "套用至編輯器" */
  onApply: (content: string) => void;
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

export function DraftDialog({ open, onClose, onApply }: DraftDialogProps) {
  const [drafts, setDrafts] = useState<LocalDraft[]>([]);
  const [selected, setSelected] = useState<LocalDraft | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // Reload drafts whenever the dialog opens
  useEffect(() => {
    if (open) {
      const list = getDrafts().sort((a, b) => b.savedAt - a.savedAt);
      setDrafts(list);
      setSelected(list[0] ?? null);
      setConfirmClear(false);
    }
  }, [open]);

  if (!open) return null;

  const handleRemove = (fileId: string) => {
    removeDraft(fileId);
    const updated = getDrafts().sort((a, b) => b.savedAt - a.savedAt);
    setDrafts(updated);
    if (selected?.fileId === fileId) {
      setSelected(updated[0] ?? null);
    }
  };

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clearDrafts();
    setDrafts([]);
    setSelected(null);
    setConfirmClear(false);
  };

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

        {drafts.length === 0 ? (
          <p className={styles.empty}>目前沒有草稿備份。</p>
        ) : (
          <div className={styles.body}>
            {/* ── Left: list ── */}
            <ul className={styles.list} role="listbox" aria-label="備份清單">
              {drafts.map((d) => (
                <li
                  key={d.fileId}
                  className={`${styles.listItem} ${selected?.fileId === d.fileId ? styles.listItemActive : ''}`}
                  role="option"
                  aria-selected={selected?.fileId === d.fileId}
                  onClick={() => setSelected(d)}
                >
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>
                      {d.fileName ?? '（未儲存的新文件）'}
                    </span>
                    <span className={styles.itemDate}>
                      {formatDate(d.savedAt)}
                    </span>
                  </div>
                  <button
                    className={styles.removeBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(d.fileId);
                    }}
                    aria-label={`刪除 ${d.fileName ?? '新文件'} 的備份`}
                    title="刪除此備份"
                  >
                    🗑
                  </button>
                </li>
              ))}
            </ul>

            {/* ── Right: preview ── */}
            <div className={styles.preview}>
              {selected ? (
                <>
                  <div className={styles.previewHeader}>
                    <span className={styles.previewName}>
                      {selected.fileName ?? '（未儲存的新文件）'}
                    </span>
                    <span className={styles.previewDate}>
                      備份於 {formatDate(selected.savedAt)}
                    </span>
                  </div>
                  <pre className={styles.previewContent}>
                    {selected.content}
                  </pre>
                  <div className={styles.previewActions}>
                    <button
                      className={styles.applyBtn}
                      onClick={() => onApply(selected.content)}
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
        {drafts.length > 0 && (
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
