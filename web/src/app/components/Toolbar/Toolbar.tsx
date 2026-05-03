import type { Editor } from '@tiptap/react';
import { useEditorStore } from '../../store/editorStore';
import type { ViewMode, FontFamily } from '../../store/editorStore';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  editor: Editor | null;
  onRuby: () => void;
}

type HeadingLevel = 1 | 2 | 3;

export function Toolbar({ editor, onRuby }: ToolbarProps) {
  const { viewMode, setViewMode, fontFamily, setFontFamily } = useEditorStore();

  const cmd = (action: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    action();
    editor?.view.focus();
  };

  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    editor?.isActive(name, attrs) ?? false;

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="格式工具列">
      {/* 標題 */}
      <div className={styles.group}>
        {([1, 2, 3] as HeadingLevel[]).map((level) => (
          <button
            key={level}
            className={`${styles.btn} ${isActive('heading', { level }) ? styles.active : ''}`}
            onMouseDown={cmd(() =>
              editor?.chain().focus().toggleHeading({ level }).run(),
            )}
            aria-label={`標題 ${level}`}
            title={`標題 ${level} (H${level})`}
          >
            H{level}
          </button>
        ))}
      </div>

      <div className={styles.separator} />

      {/* 文字格式 */}
      <div className={styles.group}>
        <button
          className={`${styles.btn} ${styles.bold} ${isActive('bold') ? styles.active : ''}`}
          onMouseDown={cmd(() => editor?.chain().focus().toggleBold().run())}
          aria-label="粗體"
          title="粗體 (Ctrl+B)"
        >
          B
        </button>
        <button
          className={`${styles.btn} ${styles.italic} ${isActive('italic') ? styles.active : ''}`}
          onMouseDown={cmd(() => editor?.chain().focus().toggleItalic().run())}
          aria-label="斜體"
          title="斜體 (Ctrl+I)"
        >
          I
        </button>
        <button
          className={`${styles.btn} ${styles.underline} ${isActive('underline') ? styles.active : ''}`}
          onMouseDown={cmd(() =>
            editor?.chain().focus().toggleUnderline().run(),
          )}
          aria-label="底線"
          title="底線 (Ctrl+U)"
        >
          U
        </button>
        <button
          className={`${styles.btn} ${styles.strike} ${isActive('strike') ? styles.active : ''}`}
          onMouseDown={cmd(() => editor?.chain().focus().toggleStrike().run())}
          aria-label="刪除線"
          title="刪除線"
        >
          S
        </button>
      </div>

      <div className={styles.separator} />

      {/* 程式碼與引言 */}
      <div className={styles.group}>
        <button
          className={`${styles.btn} ${isActive('code') ? styles.active : ''}`}
          onMouseDown={cmd(() => editor?.chain().focus().toggleCode().run())}
          aria-label="行內程式碼"
          title="行內程式碼"
        >
          {'</>'}
        </button>
        <button
          className={`${styles.btn} ${isActive('codeBlock') ? styles.active : ''}`}
          onMouseDown={cmd(() =>
            editor?.chain().focus().toggleCodeBlock().run(),
          )}
          aria-label="程式碼區塊"
          title="程式碼區塊"
        >
          ≡
        </button>
        <button
          className={`${styles.btn} ${isActive('blockquote') ? styles.active : ''}`}
          onMouseDown={cmd(() =>
            editor?.chain().focus().toggleBlockquote().run(),
          )}
          aria-label="引言"
          title="引言"
        >
          ❝
        </button>
      </div>

      <div className={styles.separator} />

      {/* 清單 */}
      <div className={styles.group}>
        <button
          className={`${styles.btn} ${isActive('bulletList') ? styles.active : ''}`}
          onMouseDown={cmd(() =>
            editor?.chain().focus().toggleBulletList().run(),
          )}
          aria-label="項目清單"
          title="項目清單"
        >
          •≡
        </button>
        <button
          className={`${styles.btn} ${isActive('orderedList') ? styles.active : ''}`}
          onMouseDown={cmd(() =>
            editor?.chain().focus().toggleOrderedList().run(),
          )}
          aria-label="編號清單"
          title="編號清單"
        >
          1.≡
        </button>
      </div>

      <div className={styles.separator} />

      {/* 水平分隔線 */}
      <div className={styles.group}>
        <button
          className={styles.btn}
          onMouseDown={cmd(() =>
            editor?.chain().focus().setHorizontalRule().run(),
          )}
          aria-label="水平分隔線"
          title="水平分隔線"
        >
          ——
        </button>
      </div>

      <div className={styles.separator} />

      {/* 振假名 */}
      <div className={styles.group}>
        <button
          className={`${styles.btn} ${styles.rubyBtn}`}
          onClick={onRuby}
          aria-label="振假名標注"
          title="振假名（ルビ）標注 (Ctrl+R)"
        >
          ふ
        </button>
      </div>

      {/* 彈性空間 */}
      <div className={styles.spacer} />

      {/* 字型切換 */}
      <div className={styles.group}>
        <button
          className={`${styles.btn} ${fontFamily === 'sans' ? styles.active : ''}`}
          onClick={() => setFontFamily('sans' as FontFamily)}
          aria-label="黑體"
          title="切換為黑體（Noto Sans JP）"
        >
          黑
        </button>
        <button
          className={`${styles.btn} ${styles.serifBtn} ${fontFamily === 'serif' ? styles.active : ''}`}
          onClick={() => setFontFamily('serif' as FontFamily)}
          aria-label="明朝體"
          title="切換為明朝體（Noto Serif JP）"
        >
          明
        </button>
      </div>

      <div className={styles.separator} />

      {/* 版面模式 */}
      <div className={styles.group} role="group" aria-label="版面模式">
        {(
          [
            { mode: 'split', label: '雙欄' },
            { mode: 'wysiwyg', label: 'WYSIWYG' },
            { mode: 'source', label: '原始碼' },
          ] as { mode: ViewMode; label: string }[]
        ).map(({ mode, label }) => (
          <button
            key={mode}
            className={`${styles.btn} ${styles.modeBtn} ${viewMode === mode ? styles.active : ''}`}
            onClick={() => setViewMode(mode)}
            aria-label={`切換為${label}模式`}
            title={`${label}模式`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
