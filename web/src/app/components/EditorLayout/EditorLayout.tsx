import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { ResizableImageExtension } from '../../lib/ResizableImageExtension';
import { Markdown } from 'tiptap-markdown';

import { RubyExtension } from '../../lib/rubyExtension';
import { useImageInsert } from '../../lib/useImageInsert';
import { useEditorStore } from '../../store/editorStore';
import { Toolbar } from '../Toolbar/Toolbar';
import { WysiwygEditor } from '../WysiwygEditor/WysiwygEditor';
import { SourceEditor } from '../SourceEditor/SourceEditor';
import { StatusBar } from '../StatusBar/StatusBar';
import { RubyDialog } from '../RubyDialog/RubyDialog';
import { ImageDialog } from '../ImageDialog/ImageDialog';
import styles from './EditorLayout.module.css';

const DEFAULT_CONTENT = `# 日文講義範例

這是一個 **WYSIWYG** Markdown 編輯器，專為日文講義設計。

## 功能特色

- ✅ 所見即所得（WYSIWYG）編輯
- ✅ 即時 Markdown 原始碼雙向同步
- ✅ 振假名標注（{日本語|にほんご}）
- ✅ Google Drive 整合（Phase 5）

## 振假名範例

選取文字後，點擊工具列的「ふ」按鈕或按 \`Ctrl+R\`，即可為文字添加振假名：

{日本語|にほんご}・{勉強|べんきょう}・{先生|せんせい}・{学生|がくせい}

> {振假名|ふりがな}標注功能讓日文講義更易讀。

### 表格範例

| 用語       | 読み方             | 意味 |
| ---------- | ------------------ | ---- |
| {日本語|にほんご}  | にほんご   | 日文 |
| {勉強|べんきょう}  | べんきょう | 學習 |
| {先生|せんせい}    | せんせい   | 老師 |

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

  // ── Ruby dialog state ────────────────────────────────────────────────────
  const [rubyDialogOpen, setRubyDialogOpen] = useState(false);
  const [rubySelectedText, setRubySelectedText] = useState('');
  const [rubyInitialReading, setRubyInitialReading] = useState('');
  const [rubyEditPos, setRubyEditPos] = useState(-1); // -1 = insert mode

  // ── Image dialog state ───────────────────────────────────────────────────
  const [imageDialogOpen, setImageDialogOpen] = useState(false);

  // Ref for the WYSIWYG pane DOM node — used by useImageInsert for paste/drop
  const wysiwygPaneRef = useRef<HTMLDivElement>(null);

  // Track which editor was last to update (to prevent sync loops)
  const lastSourceRef = useRef<'wysiwyg' | 'source'>('wysiwyg');

  // ── TipTap editor instance ──────────────────────────────────────────────
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      ResizableImageExtension.configure({ inline: false, allowBase64: true }),
      RubyExtension,
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

  // ── Ruby dialog helpers ──────────────────────────────────────────────────
  const openRubyDialog = useCallback(() => {
    if (!editor) return;
    const { selection, doc } = editor.state;
    const selectedText = doc.textBetween(selection.from, selection.to, '');
    setRubySelectedText(selectedText);
    setRubyInitialReading('');
    setRubyEditPos(-1);
    setRubyDialogOpen(true);
  }, [editor]);

  // Keep a ref so the document event listener always has the latest version
  const openRubyDialogRef = useRef(openRubyDialog);
  useEffect(() => {
    openRubyDialogRef.current = openRubyDialog;
  }, [openRubyDialog]);

  // Listen for Ctrl+R shortcut dispatched by RubyExtension keyboard handler
  useEffect(() => {
    const handler = () => openRubyDialogRef.current();
    document.addEventListener('jpeditor:open-ruby', handler);
    return () => document.removeEventListener('jpeditor:open-ruby', handler);
  }, []);

  // Listen for double-click on existing ruby node (edit mode)
  useEffect(() => {
    const handler = (e: Event) => {
      const { text, reading, pos } = (
        e as CustomEvent<{ text: string; reading: string; pos: number }>
      ).detail;
      setRubySelectedText(text);
      setRubyInitialReading(reading);
      setRubyEditPos(pos);
      setRubyDialogOpen(true);
    };
    document.addEventListener('jpeditor:edit-ruby', handler);
    return () => document.removeEventListener('jpeditor:edit-ruby', handler);
  }, []);

  const handleRubyConfirm = useCallback(
    (reading: string) => {
      if (!editor) return;
      if (rubyEditPos >= 0) {
        // Edit mode: replace the ruby node at the known position
        editor
          .chain()
          .focus()
          .editRuby({ pos: rubyEditPos, text: rubySelectedText, reading })
          .run();
      } else {
        // Insert mode: replace selected text with new ruby node
        editor
          .chain()
          .focus()
          .setRuby({ text: rubySelectedText, reading })
          .run();
      }
      setRubyDialogOpen(false);
      setRubySelectedText('');
      setRubyInitialReading('');
      setRubyEditPos(-1);
    },
    [editor, rubySelectedText, rubyEditPos],
  );

  const handleRubyCancel = useCallback(() => {
    setRubyDialogOpen(false);
    setRubySelectedText('');
    setRubyInitialReading('');
    setRubyEditPos(-1);
    editor?.view.focus();
  }, [editor]);

  // ── Image helpers ────────────────────────────────────────────────────────
  const handleImageConfirm = useCallback(
    (src: string, alt: string) => {
      editor?.chain().focus().setImage({ src, alt }).run();
      setImageDialogOpen(false);
    },
    [editor],
  );

  const handleImageCancel = useCallback(() => {
    setImageDialogOpen(false);
    editor?.view.focus();
  }, [editor]);

  // Paste / drag-drop image insertion into the WYSIWYG pane
  useImageInsert({ editor, targetEl: wysiwygPaneRef.current });

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
      <Toolbar
        editor={editor}
        onRuby={openRubyDialog}
        onImage={() => setImageDialogOpen(true)}
      />

      {/* ── Main editor area ── */}
      <main className={styles.main}>
        <div className={styles.editorContainer} ref={containerRef}>
          {showWysiwyg && (
            <div
              className={styles.pane}
              ref={wysiwygPaneRef}
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

      {/* ── Ruby dialog (portal-like, rendered at layout root) ── */}
      <RubyDialog
        open={rubyDialogOpen}
        selectedText={rubySelectedText}
        initialReading={rubyInitialReading}
        isEditing={rubyEditPos >= 0}
        onConfirm={handleRubyConfirm}
        onCancel={handleRubyCancel}
      />

      {/* ── Image URL dialog ── */}
      <ImageDialog
        open={imageDialogOpen}
        onConfirm={handleImageConfirm}
        onCancel={handleImageCancel}
      />
    </div>
  );
}
