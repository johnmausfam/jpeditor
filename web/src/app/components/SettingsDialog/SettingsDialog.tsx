import { useEffect, useRef, useState } from 'react';
import { useDriveStore } from '../../store/driveStore';
import {
  getDraftIntervalMs,
  setDraftIntervalMs,
  DRAFT_INTERVAL_OPTIONS,
} from '../../lib/localDrafts';
import styles from './SettingsDialog.module.css';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { folderId, setFolderId } = useDriveStore();
  const [folderInput, setFolderInput] = useState('');
  const [draftInterval, setDraftInterval] = useState(getDraftIntervalMs());
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input with store when dialog opens
  useEffect(() => {
    if (open) {
      setFolderInput(folderId);
      setDraftInterval(getDraftIntervalMs());
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, folderId]);

  if (!open) return null;

  const handleSave = () => {
    setFolderId(folderInput.trim());
    setDraftIntervalMs(draftInterval);
    // Notify EditorLayout to restart the backup interval
    window.dispatchEvent(new CustomEvent('jpeditor:draft-interval-changed'));
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

        {/* ── 草稿備份 ── */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>草稿備份</h3>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="settings-draft-interval">
              備份間隔
            </label>
            <select
              id="settings-draft-interval"
              className={styles.select}
              value={draftInterval}
              onChange={(e) => setDraftInterval(Number(e.target.value))}
            >
              {DRAFT_INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className={styles.hint}>
              編輯器內容有變更時，每隔此時間自動備份一次至本機。最多保留 20
              個檔案的最新備份。
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
