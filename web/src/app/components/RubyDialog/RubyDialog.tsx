import { useEffect, useRef, useState } from 'react';
import styles from './RubyDialog.module.css';

interface RubyDialogProps {
  open: boolean;
  selectedText: string;
  onConfirm: (reading: string) => void;
  onCancel: () => void;
}

export function RubyDialog({
  open,
  selectedText,
  onConfirm,
  onCancel,
}: RubyDialogProps) {
  const [reading, setReading] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset and focus when dialog opens
  useEffect(() => {
    if (open) {
      setReading('');
      // Small delay so the DOM has mounted
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  const canConfirm =
    reading.trim().length > 0 && selectedText.trim().length > 0;

  const handleConfirm = () => {
    if (canConfirm) onConfirm(reading.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
        aria-label="振假名標注"
      >
        {/* Title */}
        <h2 className={styles.title}>振假名（ルビ）標注</h2>

        {/* Live preview */}
        <div className={styles.previewBox} aria-label="預覽">
          <ruby className={styles.rubyPreview}>
            <span>{selectedText || '…'}</span>
            <rt>{reading || 'よみかた'}</rt>
          </ruby>
        </div>

        {/* Selected text (read-only display) */}
        <div className={styles.field}>
          <span className={styles.label}>選取文字</span>
          <div className={styles.readonlyText}>
            {selectedText || (
              <span className={styles.placeholder}>
                （請先在編輯器中選取文字）
              </span>
            )}
          </div>
        </div>

        {/* Reading input */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="ruby-reading-input">
            振假名（読み方）
          </label>
          <input
            ref={inputRef}
            id="ruby-reading-input"
            className={styles.input}
            type="text"
            value={reading}
            onChange={(e) => setReading(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例：にほんご"
            aria-label="振假名讀音"
            autoComplete="off"
          />
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel} type="button">
            取消
          </button>
          <button
            className={styles.confirmBtn}
            onClick={handleConfirm}
            type="button"
            disabled={!canConfirm}
            aria-disabled={!canConfirm}
          >
            套用
          </button>
        </div>
      </div>
    </div>
  );
}
