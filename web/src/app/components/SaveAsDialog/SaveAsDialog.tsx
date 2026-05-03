import { useEffect, useRef, useState } from 'react';
import styles from './SaveAsDialog.module.css';

interface SaveAsDialogProps {
  open: boolean;
  /** Pre-fill the file name (e.g. current file name without the folder context). */
  defaultFileName?: string;
  onConfirm: (fileName: string) => void;
  onCancel: () => void;
}

export function SaveAsDialog({
  open,
  defaultFileName = '',
  onConfirm,
  onCancel,
}: SaveAsDialogProps) {
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setFileName(defaultFileName);
      const t = setTimeout(() => {
        const el = inputRef.current;
        if (!el) return;
        el.focus();
        // Select the name part (without .md extension) for easy replacement
        const dotIdx = el.value.lastIndexOf('.');
        el.setSelectionRange(0, dotIdx > 0 ? dotIdx : el.value.length);
      }, 50);
      return () => clearTimeout(t);
    }
  }, [open, defaultFileName]);

  if (!open) return null;

  const normalized = fileName.trim();
  const canConfirm = normalized.length > 0;
  const displayName = normalized.endsWith('.md')
    ? normalized
    : normalized
      ? `${normalized}.md`
      : '';

  const handleConfirm = () => {
    if (canConfirm) onConfirm(normalized);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className={styles.overlay} onClick={onCancel} role="presentation">
      <div
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="另存新檔"
      >
        <h2 className={styles.title}>另存新檔</h2>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="saveas-filename">
            檔案名稱 <span className={styles.required}>*</span>
          </label>
          <input
            ref={inputRef}
            id="saveas-filename"
            className={styles.input}
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="講義檔名"
            autoComplete="off"
            spellCheck={false}
          />
          {displayName && (
            <p className={styles.preview}>
              將儲存為：<strong>{displayName}</strong>
            </p>
          )}
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>
            取消
          </button>
          <button
            className={styles.confirmBtn}
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            儲存
          </button>
        </div>
      </div>
    </div>
  );
}
