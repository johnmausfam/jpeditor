import styles from './StatusBar.module.css';
import { useEditorStore } from '../../store/editorStore';
import { useDriveStore } from '../../store/driveStore';

interface StatusBarProps {
  charCount: number;
  lineCount: number;
}

export function StatusBar({ charCount, lineCount }: StatusBarProps) {
  const { fontFamily } = useEditorStore();
  const { currentFileName, isLoggedIn } = useDriveStore();

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
    </div>
  );
}
