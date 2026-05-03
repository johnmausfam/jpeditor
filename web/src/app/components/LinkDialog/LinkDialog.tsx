import { useEffect, useRef, useState } from 'react';
import styles from './LinkDialog.module.css';

interface LinkDialogProps {
  open: boolean;
  /** True when the user had text selected when the dialog was opened */
  hasSelection: boolean;
  /** Pre-fill URL when editing an existing link */
  initialUrl?: string;
  onConfirm: (url: string, displayText: string) => void;
  onCancel: () => void;
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function LinkDialog({
  open,
  hasSelection,
  initialUrl = '',
  onConfirm,
  onCancel,
}: LinkDialogProps) {
  const [url, setUrl] = useState('');
  const [displayText, setDisplayText] = useState('');
  const [urlError, setUrlError] = useState('');
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setUrl(initialUrl);
      setDisplayText('');
      setUrlError('');
      const t = setTimeout(() => urlInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open, initialUrl]);

  if (!open) return null;

  const trimmedUrl = url.trim();
  const canConfirm =
    trimmedUrl.length > 0 && (hasSelection || displayText.trim().length > 0);

  const handleConfirm = () => {
    if (!trimmedUrl) return;
    if (!isValidUrl(trimmedUrl)) {
      setUrlError('請輸入有效的 https:// 或 http:// 網址');
      urlInputRef.current?.focus();
      return;
    }
    onConfirm(trimmedUrl, displayText.trim());
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
        aria-label="插入超連結"
      >
        <h2 className={styles.title}>插入超連結</h2>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="link-url-input">
            網址（URL）<span className={styles.required}>*</span>
          </label>
          <input
            ref={urlInputRef}
            id="link-url-input"
            className={`${styles.input} ${urlError ? styles.inputError : ''}`}
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setUrlError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder="https://example.com"
            autoComplete="off"
          />
          {urlError && <p className={styles.errorMsg}>{urlError}</p>}
        </div>

        {!hasSelection && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="link-text-input">
              顯示文字<span className={styles.required}>*</span>
            </label>
            <input
              id="link-text-input"
              className={styles.input}
              type="text"
              value={displayText}
              onChange={(e) => setDisplayText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="連結文字"
              autoComplete="off"
            />
          </div>
        )}

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel} type="button">
            取消
          </button>
          <button
            className={styles.confirmBtn}
            onClick={handleConfirm}
            disabled={!canConfirm}
            type="button"
          >
            確認
          </button>
        </div>
      </div>
    </div>
  );
}
