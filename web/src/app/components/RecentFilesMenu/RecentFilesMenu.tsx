import { useEffect, useRef, useState } from 'react';
import {
  clearRecentFiles,
  getRecentFiles,
  removeRecentFile,
  type RecentFile,
} from '../../lib/recentFiles';
import styles from './RecentFilesMenu.module.css';

interface RecentFilesMenuProps {
  onOpenFile: (fileId: string, fileName: string) => Promise<void>;
}

export function RecentFilesMenu({ onOpenFile }: RecentFilesMenuProps) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<RecentFile[]>([]);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Refresh list whenever the dropdown opens
  useEffect(() => {
    if (open) setFiles(getRecentFiles());
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleClickFile = async (file: RecentFile) => {
    setOpeningId(file.fileId);
    try {
      await onOpenFile(file.fileId, file.fileName);
      setOpen(false);
    } catch {
      // If open failed, remove from recent list
      removeRecentFile(file.fileId);
      setFiles(getRecentFiles());
    } finally {
      setOpeningId(null);
    }
  };

  const handleClear = () => {
    clearRecentFiles();
    setFiles([]);
  };

  return (
    <div className={styles.wrapper} ref={menuRef}>
      <button
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        title="最近開啟的檔案"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        最近檔案 ▾
      </button>

      {open && (
        <div
          className={styles.dropdown}
          role="listbox"
          aria-label="最近開啟的檔案"
        >
          {files.length === 0 ? (
            <p className={styles.empty}>尚無最近開啟的記錄</p>
          ) : (
            <ul className={styles.list}>
              {files.map((f) => (
                <li key={f.fileId}>
                  <button
                    className={styles.item}
                    onClick={() => handleClickFile(f)}
                    disabled={openingId !== null}
                    title={f.fileName}
                    role="option"
                    aria-selected={false}
                  >
                    <span className={styles.icon}>📄</span>
                    <span className={styles.name}>
                      {openingId === f.fileId ? '開啟中…' : f.fileName}
                    </span>
                    <span className={styles.date}>
                      {new Date(f.openedAt).toLocaleDateString('zh-TW', {
                        month: '2-digit',
                        day: '2-digit',
                      })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className={styles.footer}>
            <button
              className={styles.clearBtn}
              onClick={handleClear}
              disabled={files.length === 0}
            >
              清除記錄
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
