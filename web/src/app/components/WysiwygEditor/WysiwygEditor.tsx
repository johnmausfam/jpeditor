import { EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import styles from './WysiwygEditor.module.css';

interface WysiwygEditorProps {
  editor: Editor | null;
  fontFamily: 'sans' | 'serif';
}

export function WysiwygEditor({ editor, fontFamily }: WysiwygEditorProps) {
  return (
    <div
      className={`${styles.container} ${
        fontFamily === 'serif' ? styles.serif : styles.sans
      }`}
    >
      <EditorContent editor={editor} className={styles.editorContent} />
    </div>
  );
}
