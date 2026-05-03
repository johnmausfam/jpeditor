import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { EditorView } from '@codemirror/view';
import styles from './SourceEditor.module.css';

const cmExtensions = [
  markdown({ base: markdownLanguage }),
  EditorView.lineWrapping,
  EditorView.theme({
    '&': { height: '100%', fontSize: '13px' },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: "'BIZ UDGothic', 'Courier New', monospace",
    },
    '.cm-content': { padding: '16px 12px' },
    '.cm-line': { lineHeight: '1.7' },
  }),
];

interface SourceEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function SourceEditor({ value, onChange }: SourceEditorProps) {
  return (
    <div className={styles.container}>
      <div className={styles.label}>Markdown 原始碼</div>
      <CodeMirror
        value={value}
        height="100%"
        extensions={cmExtensions}
        onChange={onChange}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          autocompletion: false,
          foldGutter: false,
        }}
      />
    </div>
  );
}
