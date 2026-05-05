import { useEffect, useRef, useState } from 'react';
import { useDriveStore } from '../../store/driveStore';
import type { WorkFolder } from '../../store/driveStore';
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
  const { workFolders, setWorkFolders, activeFolderId, setActiveFolderId } =
    useDriveStore();
  const [folderList, setFolderList] = useState<WorkFolder[]>([]);
  const [draftInterval, setDraftInterval] = useState(getDraftIntervalMs());
  const firstLabelRef = useRef<HTMLInputElement>(null);

  // Sync local state when dialog opens
  useEffect(() => {
    if (open) {
      setFolderList(
        workFolders.length > 0
          ? workFolders.map((f) => ({ ...f }))
          : [{ label: '', folderId: '' }],
      );
      setDraftInterval(getDraftIntervalMs());
      setTimeout(() => firstLabelRef.current?.focus(), 50);
    }
  }, [open, workFolders]);

  if (!open) return null;

  const handleAddFolder = () => {
    setFolderList((prev) => [...prev, { label: '', folderId: '' }]);
  };

  const handleRemoveFolder = (index: number) => {
    setFolderList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFolderChange = (
    index: number,
    field: keyof WorkFolder,
    value: string,
  ) => {
    setFolderList((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)),
    );
  };

  const handleSave = () => {
    const valid = folderList.filter(
      (f) => f.label.trim() !== '' && f.folderId.trim() !== '',
    );
    const saved = valid.length > 0 ? valid : [{ label: '', folderId: '' }];
    setWorkFolders(saved);

    // If current activeFolderId is no longer in the list, switch to first
    const stillValid = saved.some((f) => f.folderId === activeFolderId);
    if (!stillValid) {
      setActiveFolderId(saved[0]?.folderId ?? '');
    }

    setDraftIntervalMs(draftInterval);
    window.dispatchEvent(new CustomEvent('jpeditor:draft-interval-changed'));
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label="設定"
      >
        <h2 className={styles.title}>⚙️ 設定</h2>

        {/* ── Google Drive 工作目錄 ── */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Google Drive</h3>

          <div className={styles.field}>
            <span className={styles.label}>工作目錄</span>
            <div className={styles.folderList}>
              {folderList.map((folder, index) => (
                <div key={index} className={styles.folderRow}>
                  <input
                    ref={index === 0 ? firstLabelRef : undefined}
                    className={styles.input}
                    type="text"
                    value={folder.label}
                    onChange={(e) =>
                      handleFolderChange(index, 'label', e.target.value)
                    }
                    placeholder="資料夾名稱"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <input
                    className={`${styles.input} ${styles.folderIdInput}`}
                    type="text"
                    value={folder.folderId}
                    onChange={(e) =>
                      handleFolderChange(index, 'folderId', e.target.value)
                    }
                    placeholder="Google Drive 資料夾 ID"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button
                    className={styles.removeBtn}
                    onClick={() => handleRemoveFolder(index)}
                    disabled={folderList.length <= 1}
                    aria-label="刪除此工作目錄"
                    title="刪除"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
            <button className={styles.addBtn} onClick={handleAddFolder}>
              ＋ 新增工作目錄
            </button>
            <p className={styles.hint}>
              在 Google Drive 開啟目標資料夾，從網址列複製 ID：
              <br />
              <code className={styles.code}>
                drive.google.com/drive/folders/<strong>資料夾ID</strong>
              </code>
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
