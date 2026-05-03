import { useEffect, useRef, useState } from 'react';
import { parseYoutubeVideoId } from '../../lib/YoutubeExtension';
import styles from './YoutubeDialog.module.css';

interface YoutubeDialogProps {
  open: boolean;
  onConfirm: (videoId: string) => void;
  onCancel: () => void;
}

export function YoutubeDialog({
  open,
  onConfirm,
  onCancel,
}: YoutubeDialogProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setInput('');
      setError('');
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  const handleConfirm = () => {
    const videoId = parseYoutubeVideoId(input);
    if (!videoId) {
      setError('請輸入有效的 YouTube 網址或影片 ID');
      inputRef.current?.focus();
      return;
    }
    onConfirm(videoId);
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
        aria-label="嵌入 YouTube 影片"
      >
        <h2 className={styles.title}>嵌入 YouTube 影片</h2>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="yt-url-input">
            YouTube 網址或影片 ID<span className={styles.required}>*</span>
          </label>
          <input
            ref={inputRef}
            id="yt-url-input"
            className={`${styles.input} ${error ? styles.inputError : ''}`}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError('');
            }}
            onKeyDown={handleKeyDown}
            placeholder="https://www.youtube.com/watch?v=..."
            autoComplete="off"
          />
          {error && <p className={styles.errorMsg}>{error}</p>}
          <p className={styles.hint}>
            支援格式：youtube.com/watch?v=…、youtu.be/…、或直接輸入影片 ID
          </p>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel} type="button">
            取消
          </button>
          <button
            className={styles.confirmBtn}
            onClick={handleConfirm}
            disabled={input.trim().length === 0}
            type="button"
          >
            嵌入
          </button>
        </div>
      </div>
    </div>
  );
}
