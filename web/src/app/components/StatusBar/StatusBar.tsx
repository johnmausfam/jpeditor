import { useEffect, useState } from 'react';
import styles from './StatusBar.module.css';
import { useEditorStore } from '../../store/editorStore';
import { useDriveStore } from '../../store/driveStore';

interface StatusBarProps {
  charCount: number;
  lineCount: number;
  lastDraftAt: number | null;
}

function formatDraftAge(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60_000);
  if (mins < 1) return '剛才';
  if (mins === 1) return '1 分鐘前';
  return `${mins} 分鐘前`;
}

export function StatusBar({
  charCount,
  lineCount,
  lastDraftAt,
}: StatusBarProps) {
  const { fontFamily } = useEditorStore();
  const { currentFileName, isLoggedIn } = useDriveStore();

  // Tick every 30 s so the relative time stays accurate
  const [, setTick] = useState(0);
  useEffect(() => {
    if (lastDraftAt === null) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [lastDraftAt]);

  return (
    <div className={styles.statusBar} role="status" aria-live="polite">
      <span className={styles.item}>字數：{charCount.toLocaleString()}</span>
      <span className={styles.divider}>|</span>
      <span className={styles.item}>行數：{lineCount.toLocaleString()}</span>
      <span className={styles.divider}>|</span>
      <span className={styles.item}>
        字型：{fontFamily === 'serif' ? '明朝體' : '黑體'}
      </span>
      {isLoggedIn && (
        <>
          <span className={styles.divider}>|</span>
          <span className={styles.item} title={currentFileName ?? undefined}>
            {currentFileName ? currentFileName : '新文件'}
          </span>
          <span className={styles.hint}>（Ctrl+S 儲存）</span>
        </>
      )}
      {lastDraftAt !== null && (
        <>
          <span className={styles.divider}>|</span>
          <span
            className={styles.hint}
            title={new Date(lastDraftAt).toLocaleString('zh-TW')}
          >
            🗒 草稿備份：{formatDraftAge(lastDraftAt)}
          </span>
        </>
      )}
    </div>
  );
}
