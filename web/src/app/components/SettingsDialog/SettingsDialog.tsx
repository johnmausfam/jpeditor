import { useEffect, useRef, useState } from 'react';
import { useDriveStore } from '../../store/driveStore';
import styles from './SettingsDialog.module.css';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { folderId, setFolderId } = useDriveStore();
  const [folderInput, setFolderInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input with store when dialog opens
  useEffect(() => {
    if (open) {
      setFolderInput(folderId);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, folderId]);

  if (!open) return null;

  const handleSave = () => {
    setFolderId(folderInput.trim());
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="設定"
      >
        <h2 className={styles.title}>⚙️ 設定</h2>

        {/* ── Google Drive 工作目錄 ── */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Google Drive</h3>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="settings-folder-id">
              預設工作目錄 ID
            </label>
            <input
              ref={inputRef}
              id="settings-folder-id"
              className={styles.input}
              type="text"
              value={folderInput}
              onChange={(e) => setFolderInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="貼上 Google Drive 資料夾 ID"
              autoComplete="off"
              spellCheck={false}
            />
            <p className={styles.hint}>
              在 Google Drive 開啟目標資料夾，從網址列複製 ID：
              <br />
              <code className={styles.code}>
                drive.google.com/drive/folders/<strong>資料夾ID</strong>
              </code>
              <br />
              登入 Google 後，「Drive 文件」面板將自動套用此目錄。
            </p>
          </div>
        </section>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>
            取消
          </button>
          <button className={styles.saveBtn} onClick={handleSave}>
            儲存設定
          </button>
        </div>
      </div>
    </div>
  );
}
