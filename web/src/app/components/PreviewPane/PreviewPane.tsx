/**
 * PreviewPane — read-only HTML preview of the current document.
 *
 * Uses editor.getHTML() → DOMPurify sanitize → dangerouslySetInnerHTML.
 * A DOMPurify hook is registered once at module load time.
 */
import DOMPurify from 'dompurify';
import type { Editor } from '@tiptap/react';
import styles from './PreviewPane.module.css';

// ── DOMPurify configuration (registered once at module init) ─────────────
const ALLOWED_YOUTUBE_SRC = /^https:\/\/(www\.)?youtube\.com\/embed\//;

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'IFRAME') {
    const src = node.getAttribute('src') ?? '';
    if (!ALLOWED_YOUTUBE_SRC.test(src)) {
      node.removeAttribute('src');
    }
    node.setAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-presentation',
    );
  }
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: [
      'allowfullscreen',
      'sandbox',
      'src',
      'width',
      'height',
      'target',
      'rel',
    ],
  });
}

// ────────────────────────────────────────────────────────────────────────────

interface PreviewPaneProps {
  editor: Editor | null;
  fontFamily: 'sans' | 'serif';
  onEdit: () => void;
}

export function PreviewPane({ editor, fontFamily, onEdit }: PreviewPaneProps) {
  const rawHtml = editor?.getHTML() ?? '';
  const safeHtml = sanitize(rawHtml);

  return (
    <div className={styles.outer}>
      <div
        className={`${styles.document} ${fontFamily === 'serif' ? styles.serif : styles.sans}`}
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />

      <button
        className={styles.editBtn}
        onClick={onEdit}
        title="返回編輯模式"
        aria-label="返回編輯模式"
      >
        ✎ 編輯
      </button>
    </div>
  );
}
