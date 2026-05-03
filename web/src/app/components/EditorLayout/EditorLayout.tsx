import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Markdown } from 'tiptap-markdown';

import { useEditorStore } from '../../store/editorStore';
import { Toolbar } from '../Toolbar/Toolbar';
import { WysiwygEditor } from '../WysiwygEditor/WysiwygEditor';
import { SourceEditor } from '../SourceEditor/SourceEditor';
import { StatusBar } from '../StatusBar/StatusBar';
import styles from './EditorLayout.module.css';

const DEFAULT_CONTENT = `# 日文講義範例

這是一個 **WYSIWYG** Markdown 編輯器，專為日文講義設計。

## 功能特色

- ✅ 所見即所得（WYSIWYG）編輯
- ✅ 即時 Markdown 原始碼雙向同步
- ✅ 振假名標注（Phase 2）
- ✅ Google Drive 整合（Phase 5）

## 日文範例

日本語の文章をここに入力してください。**太字**、*斜体*、\`インラインコード\` などのフォーマットが使えます。

> 引用ブロックを使って重要な内容を強調することができます。

### 表格範例

| 用語   | 読み方     | 意味 |
| ------ | ---------- | ---- |
| 日本語 | にほんご   | 日文 |
| 勉強   | べんきょう | 學習 |
| 先生   | せんせい   | 老師 |

### 程式碼範例

\`\`\`javascript
const greeting = 'こんにちは！';
console.log(greeting);
\`\`\`
`;

function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function EditorLayout() {
  const { viewMode, fontFamily } = useEditorStore();
  const [markdown, setMarkdown] = useState(DEFAULT_CONTENT);

  // Track which editor was last to update (to prevent sync loops)
  const lastSourceRef = useRef<'wysiwyg' | 'source'>('wysiwyg');

  // ── TipTap editor instance ──────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Markdown.configure({ html: true, transformPastedText: true }),
    ],
    content: DEFAULT_CONTENT,
    onUpdate: ({ editor: ed }) => {
      const md = ed.storage.markdown.getMarkdown() as string;
      lastSourceRef.current = 'wysiwyg';
      debouncedSetFromWysiwyg(md);
    },
  });

  // Debounced handlers to avoid rapid state churn
  const debouncedSetFromWysiwyg = useMemo(
    () => debounce((md: string) => setMarkdown(md), 300),
    [],
  );

  const debouncedSetFromSource = useMemo(
    () =>
      debounce((md: string) => {
        lastSourceRef.current = 'source';
        setMarkdown(md);
      }, 300),
    [],
  );

  // ── Sync CodeMirror → TipTap ────────────────────────────────────────────
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (lastSourceRef.current !== 'source') return;

    const currentMd = editor.storage.markdown.getMarkdown() as string;
    if (currentMd === markdown) return;

    // setContent with emitUpdate=false avoids triggering onUpdate → no loop
    editor.commands.setContent(markdown, false);
  }, [markdown, editor]);

  // ── Derived stats ───────────────────────────────────────────────────────
  const charCount = markdown.replace(/\s/g, '').length;
  const lineCount = markdown.split('\n').length;

  // ── Resizable split pane ─────────────────────────────────────────────────
  const [splitRatio, setSplitRatio] = useState(0.5);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleDividerMouseDown = useCallback(() => {
    isDragging.current = true;
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = Math.min(
        0.8,
        Math.max(0.2, (e.clientX - rect.left) / rect.width),
      );
      setSplitRatio(ratio);
    };
    const onMouseUp = () => {
      isDragging.current = false;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const showWysiwyg = viewMode === 'split' || viewMode === 'wysiwyg';
  const showSource = viewMode === 'split' || viewMode === 'source';

  return (
    <div className={styles.layout}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <span className={styles.logo}>日文講義エディター</span>
      </header>

      {/* ── Toolbar ── */}
      <Toolbar editor={editor} />

      {/* ── Main editor area ── */}
      <main className={styles.main}>
        <div className={styles.editorContainer} ref={containerRef}>
          {showWysiwyg && (
            <div
              className={styles.pane}
              style={
                viewMode === 'split'
                  ? {
                      flexBasis: `${splitRatio * 100}%`,
                      flexGrow: 0,
                      flexShrink: 0,
                    }
                  : {}
              }
            >
              <div className={styles.paneLabel}>WYSIWYG 編輯</div>
              <div className={styles.paneContent}>
                <WysiwygEditor editor={editor} fontFamily={fontFamily} />
              </div>
            </div>
          )}

          {viewMode === 'split' && (
            <div
              className={styles.divider}
              onMouseDown={handleDividerMouseDown}
              role="separator"
              aria-label="調整欄位寬度"
              aria-orientation="vertical"
            />
          )}

          {showSource && (
            <div className={`${styles.pane} ${styles.sourcePaneFlex}`}>
              <SourceEditor
                value={markdown}
                onChange={debouncedSetFromSource}
              />
            </div>
          )}
        </div>
      </main>

      {/* ── Status bar ── */}
      <StatusBar charCount={charCount} lineCount={lineCount} />
    </div>
  );
}
