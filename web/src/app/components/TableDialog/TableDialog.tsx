import { useEffect, useRef, useState } from 'react';
import styles from './TableDialog.module.css';

interface TableDialogProps {
  open: boolean;
  onClose: () => void;
  onInsert: (rows: number, cols: number, withHeaderRow: boolean) => void;
}

const MIN_COLS = 1;
const MAX_COLS = 10;
const MIN_ROWS = 1;
const MAX_ROWS = 20;

export function TableDialog({ open, onClose, onInsert }: TableDialogProps) {
  const [cols, setCols] = useState(3);
  const [rows, setRows] = useState(3);
  const [withHeaderRow, setWithHeaderRow] = useState(true);
  const colsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setCols(3);
      setRows(3);
      setWithHeaderRow(true);
      const t = setTimeout(() => colsInputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  const colsValid = cols >= MIN_COLS && cols <= MAX_COLS;
  const rowsValid = rows >= MIN_ROWS && rows <= MAX_ROWS;
  const canInsert = colsValid && rowsValid;

  const handleInsert = () => {
    if (!canInsert) return;
    onInsert(rows, cols, withHeaderRow);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInsert();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-label="插入表格"
      >
        <h2 className={styles.title}>插入表格</h2>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="table-cols">
            欄數（{MIN_COLS}–{MAX_COLS}）
          </label>
          <input
            id="table-cols"
            ref={colsInputRef}
            className={`${styles.input} ${!colsValid ? styles.inputError : ''}`}
            type="number"
            min={MIN_COLS}
            max={MAX_COLS}
            value={cols}
            onChange={(e) => setCols(Number(e.target.value))}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="table-rows">
            列數（{MIN_ROWS}–{MAX_ROWS}）
          </label>
          <input
            id="table-rows"
            className={`${styles.input} ${!rowsValid ? styles.inputError : ''}`}
            type="number"
            min={MIN_ROWS}
            max={MAX_ROWS}
            value={rows}
            onChange={(e) => setRows(Number(e.target.value))}
          />
        </div>

        <div className={styles.checkboxField}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={withHeaderRow}
              onChange={(e) => setWithHeaderRow(e.target.checked)}
            />
            包含標題列
          </label>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>
            取消
          </button>
          <button
            className={styles.confirmBtn}
            onClick={handleInsert}
            disabled={!canInsert}
          >
            插入
          </button>
        </div>
      </div>
    </div>
  );
}
