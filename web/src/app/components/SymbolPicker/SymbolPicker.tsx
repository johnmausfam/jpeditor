import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import styles from './SymbolPicker.module.css';

/** Symbols that must be available per CR-4.2.3. Extend as needed. */
const SYMBOL_GROUPS = [
  {
    label: '丸数字',
    symbols: ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'],
  },
];

interface SymbolPickerProps {
  editor: Editor | null;
  /** Passed-through btn className from parent toolbar */
  btnClassName: string;
}

export function SymbolPicker({ editor, btnClassName }: SymbolPickerProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const insertSymbol = (symbol: string) => {
    editor?.chain().focus().insertContent(symbol).run();
    setOpen(false);
  };

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        className={btnClassName}
        onMouseDown={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        aria-label="插入特殊符號"
        aria-haspopup="true"
        aria-expanded={open}
        title="插入特殊符號"
        disabled={!editor}
      >
        ①
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="特殊符號選擇">
          {SYMBOL_GROUPS.map((group) => (
            <div key={group.label} className={styles.group}>
              <p className={styles.groupLabel}>{group.label}</p>
              <div className={styles.symbolGrid}>
                {group.symbols.map((sym) => (
                  <button
                    key={sym}
                    className={styles.symbolBtn}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertSymbol(sym);
                    }}
                    title={`插入 ${sym}`}
                    aria-label={`插入 ${sym}`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
