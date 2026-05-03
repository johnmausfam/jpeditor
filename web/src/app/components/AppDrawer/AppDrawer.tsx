import { useEffect, useRef, useState } from 'react';
import {
  clearRecentFiles,
  getRecentFiles,
  type RecentFile,
} from '../../lib/recentFiles';
import styles from './AppDrawer.module.css';

interface AppDrawerProps {
  open: boolean;
  onClose: () => void;
  // ── Document actions ──
  useTemplate: boolean;
  onToggleTemplate: (checked: boolean) => void;
  onNewDocument: () => void;
  onOpenFile: (fileId: string, fileName: string) => Promise<void>;
  // ── Drive actions ──
  onOpenDrive: () => void;
  onSaveAs: () => void;
  onLogin: () => void;
  onLogout: () => void;
  isLoggedIn: boolean;
  userName: string | null;
  userEmail: string | null;
  // ── Draft actions ──
  onOpenDrafts: () => void;
}

export function AppDrawer({
  open,
  onClose,
  useTemplate,
  onToggleTemplate,
  onNewDocument,
  onOpenFile,
  onOpenDrive,
  onSaveAs,
  onLogin,
  onLogout,
  isLoggedIn,
  userName,
  userEmail,
  onOpenDrafts,
}: AppDrawerProps) {
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [openingId, setOpeningId] = useState<string | null>(null);

  // Refresh recent files whenever accordion opens
  useEffect(() => {
    if (accordionOpen) setRecentFiles(getRecentFiles());
  }, [accordionOpen]);

  // Close accordion when drawer closes
  useEffect(() => {
    if (!open) setAccordionOpen(false);
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleOpenFile = async (file: RecentFile) => {
    setOpeningId(file.fileId);
    try {
      await onOpenFile(file.fileId, file.fileName);
      onClose();
    } finally {
      setOpeningId(null);
    }
  };

  const handleClearRecent = () => {
    clearRecentFiles();
    setRecentFiles([]);
  };

  const handleNewDocument = () => {
    onNewDocument();
    onClose();
  };

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className={`${styles.backdrop} ${open ? styles.backdropVisible : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Drawer panel ── */}
      <div
        className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="選單"
      >
        {/* ── Drawer header ── */}
        <div className={styles.drawerHeader}>
          <span className={styles.drawerTitle}>日文講義エディター</span>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="關閉選單"
          >
            ✕
          </button>
        </div>

        {/* ── Section: 文件 ── */}
        <div className={styles.section}>
          <p className={styles.sectionTitle}>📄 文件</p>
          <div className={styles.sectionDivider} />

          {/* New document */}
          <div className={styles.newDocRow}>
            <button
              className={styles.btn}
              onClick={handleNewDocument}
              title="建立新文件"
            >
              ＋ 新文件
            </button>
            <label className={styles.templateLabel} title="開新文件時載入範本">
              <input
                type="checkbox"
                className={styles.templateCheckbox}
                checked={useTemplate}
                onChange={(e) => onToggleTemplate(e.target.checked)}
              />
              使用範本
            </label>
          </div>

          {/* Recent files accordion */}
          <div className={styles.accordion}>
            <button
              className={styles.accordionHeader}
              onClick={() => setAccordionOpen((v) => !v)}
              aria-expanded={accordionOpen}
            >
              <span>📋 最近開啟的檔案</span>
              <span className={styles.chevron}>
                {accordionOpen ? '▲' : '▾'}
              </span>
            </button>

            {accordionOpen && (
              <div className={styles.accordionContent}>
                {recentFiles.length === 0 ? (
                  <p className={styles.emptyRecent}>尚無最近開啟的記錄</p>
                ) : (
                  <>
                    {recentFiles.map((f) => (
                      <button
                        key={f.fileId}
                        className={styles.recentItem}
                        onClick={() => handleOpenFile(f)}
                        disabled={openingId !== null}
                        title={f.fileName}
                      >
                        <span className={styles.recentName}>
                          {openingId === f.fileId ? '開啟中…' : f.fileName}
                        </span>
                        <span className={styles.recentDate}>
                          {new Date(f.openedAt).toLocaleDateString('zh-TW', {
                            month: '2-digit',
                            day: '2-digit',
                          })}
                        </span>
                      </button>
                    ))}
                    <button
                      className={styles.clearBtn}
                      onClick={handleClearRecent}
                    >
                      清除記錄
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Section: Google Drive ── */}
        <div className={styles.section}>
          <p className={styles.sectionTitle}>☁️ Google Drive</p>
          <div className={styles.sectionDivider} />

          {isLoggedIn ? (
            <>
              <div className={styles.userRow}>
                <span className={styles.userIcon}>👤</span>
                <span
                  className={styles.userName}
                  title={userEmail ?? undefined}
                >
                  {userName ?? userEmail}
                </span>
              </div>
              <button
                className={styles.btn}
                onClick={() => {
                  onOpenDrive();
                  onClose();
                }}
              >
                📁 Drive 文件
              </button>
              <button
                className={styles.btn}
                onClick={() => {
                  onSaveAs();
                  onClose();
                }}
              >
                另存新檔
              </button>
              <button
                className={`${styles.btn} ${styles.btnLogout}`}
                onClick={() => {
                  onLogout();
                  onClose();
                }}
              >
                登出
              </button>
            </>
          ) : (
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => {
                onLogin();
                onClose();
              }}
            >
              🔑 Google 登入
            </button>
          )}
        </div>

        {/* ── Section: 草稿備份 ── */}
        <div className={styles.section}>
          <div className={styles.sectionDivider} />
          <button
            className={styles.btn}
            onClick={() => {
              onOpenDrafts();
              onClose();
            }}
          >
            🗒 草稿備份
          </button>
        </div>
      </div>
    </>
  );
}
