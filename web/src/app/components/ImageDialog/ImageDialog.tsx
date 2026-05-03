import { useEffect, useRef, useState } from 'react';
import styles from './ImageDialog.module.css';

interface ImageDialogProps {
  open: boolean;
  onConfirm: (src: string, alt: string) => void;
  onCancel: () => void;
}

export function ImageDialog({ open, onConfirm, onCancel }: ImageDialogProps) {
  const [src, setSrc] = useState('');
  const [alt, setAlt] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset & focus when dialog opens
  useEffect(() => {
    if (open) {
      setSrc('');
      setAlt('');
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  const canConfirm = src.trim().length > 0;

  const handleConfirm = () => {
    if (canConfirm) onConfirm(src.trim(), alt.trim() || '圖片');
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
        aria-label="插入圖片"
      >
        <h2 className={styles.title}>插入圖片</h2>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="img-src-input">
            圖片網址（URL）<span className={styles.required}>*</span>
          </label>
          <input
            ref={inputRef}
            id="img-src-input"
            className={styles.input}
            type="url"
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://example.com/image.png"
            aria-label="圖片網址"
            autoComplete="off"
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="img-alt-input">
            替代文字（Alt）
          </label>
          <input
            id="img-alt-input"
            className={styles.input}
            type="text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="圖片說明（選填）"
            aria-label="替代文字"
            autoComplete="off"
          />
        </div>

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
            插入
          </button>
        </div>
      </div>
    </div>
  );
}
