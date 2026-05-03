import { useEffect, useRef, useState } from 'react';
import styles from './ColorPicker.module.css';

export const TEXT_COLOR_PRESETS = [
  // 灰階
  '#111827',
  '#374151',
  '#6b7280',
  '#9ca3af',
  '#d1d5db',
  '#f3f4f6',
  // 紅
  '#7f1d1d',
  '#b91c1c',
  '#dc2626',
  '#f87171',
  '#fca5a5',
  '#fee2e2',
  // 橙
  '#7c2d12',
  '#c2410c',
  '#ea580c',
  '#fb923c',
  '#fdba74',
  '#ffedd5',
  // 黃
  '#713f12',
  '#a16207',
  '#ca8a04',
  '#facc15',
  '#fde68a',
  '#fef9c3',
  // 淺綠
  '#365314',
  '#4d7c0f',
  '#65a30d',
  '#a3e635',
  '#d9f99d',
  '#f7fee7',
  // 深綠
  '#14532d',
  '#15803d',
  '#16a34a',
  '#4ade80',
  '#bbf7d0',
  '#f0fdf4',
  // 紫
  '#4c1d95',
  '#6d28d9',
  '#7c3aed',
  '#a78bfa',
  '#ddd6fe',
  '#ede9fe',
  // 淺藍
  '#0c4a6e',
  '#0369a1',
  '#0284c7',
  '#38bdf8',
  '#bae6fd',
  '#f0f9ff',
  // 深藍
  '#1e3a8a',
  '#1d4ed8',
  '#2563eb',
  '#60a5fa',
  '#bfdbfe',
  '#eff6ff',
];

export const HIGHLIGHT_PRESETS = [
  // 灰階
  '#111827',
  '#374151',
  '#6b7280',
  '#9ca3af',
  '#d1d5db',
  '#f3f4f6',
  // 紅
  '#7f1d1d',
  '#b91c1c',
  '#dc2626',
  '#f87171',
  '#fca5a5',
  '#fee2e2',
  // 橙
  '#7c2d12',
  '#c2410c',
  '#ea580c',
  '#fb923c',
  '#fdba74',
  '#ffedd5',
  // 黃
  '#713f12',
  '#a16207',
  '#ca8a04',
  '#facc15',
  '#fde68a',
  '#fef9c3',
  // 淺綠
  '#365314',
  '#4d7c0f',
  '#65a30d',
  '#a3e635',
  '#d9f99d',
  '#f7fee7',
  // 深綠
  '#14532d',
  '#15803d',
  '#16a34a',
  '#4ade80',
  '#bbf7d0',
  '#f0fdf4',
  // 紫
  '#4c1d95',
  '#6d28d9',
  '#7c3aed',
  '#a78bfa',
  '#ddd6fe',
  '#ede9fe',
  // 淺藍
  '#0c4a6e',
  '#0369a1',
  '#0284c7',
  '#38bdf8',
  '#bae6fd',
  '#f0f9ff',
  // 深藍
  '#1e3a8a',
  '#1d4ed8',
  '#2563eb',
  '#60a5fa',
  '#bfdbfe',
  '#eff6ff',
];

interface ColorPickerProps {
  label: string;
  currentColor: string | null;
  presetColors: string[];
  /** 'text' → colored underline swatch; 'highlight' → filled rectangle swatch */
  swatchType: 'text' | 'highlight';
  onApply: (color: string) => void;
  onClear: () => void;
  /** Called just before the native <input type="color"> steals browser focus */
  onSaveSelection?: () => void;
  ariaLabel: string;
  title: string;
  disabled?: boolean;
}

export function ColorPicker({
  label,
  currentColor,
  presetColors,
  swatchType,
  onApply,
  onClear,
  onSaveSelection,
  ariaLabel,
  title,
  disabled,
}: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const swatchStyle =
    swatchType === 'text'
      ? {
          borderBottom: currentColor
            ? `3px solid ${currentColor}`
            : '3px solid transparent',
        }
      : {
          background: currentColor ?? 'transparent',
          border: '1px solid #d1d5db',
        };

  return (
    <div className={styles.container} ref={containerRef}>
      {/* Trigger button — onMouseDown + preventDefault keeps editor selection alive */}
      <button
        className={`${styles.btn} ${open ? styles.active : ''}`}
        onMouseDown={(e) => {
          e.preventDefault();
          if (!disabled) setOpen((v) => !v);
        }}
        aria-label={ariaLabel}
        title={title}
        type="button"
        disabled={disabled}
      >
        <span className={styles.labelText}>{label}</span>
        <span className={styles.swatch} style={swatchStyle} />
      </button>

      {open && (
        <div
          className={styles.dropdown}
          role="dialog"
          aria-label={`${ariaLabel} 選色器`}
        >
          {/* Preset color swatches */}
          <div className={styles.presetGrid}>
            {presetColors.map((color) => (
              <button
                key={color}
                className={`${styles.colorSwatch} ${
                  currentColor === color ? styles.selected : ''
                }`}
                style={{ backgroundColor: color }}
                title={color}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onApply(color);
                  setOpen(false);
                }}
                type="button"
                aria-label={`顏色 ${color}`}
              />
            ))}
          </div>

          {/* Custom color via native picker */}
          <div className={styles.customRow}>
            <label
              className={styles.customLabel}
              htmlFor={`${label}-${ariaLabel}-custom`}
            >
              自訂
            </label>
            <input
              id={`${label}-${ariaLabel}-custom`}
              type="color"
              className={styles.customInput}
              value={
                currentColor ?? (swatchType === 'text' ? '#000000' : '#fef08a')
              }
              onMouseDown={() => {
                // Save editor selection before native dialog steals focus
                onSaveSelection?.();
              }}
              onChange={(e) => onApply(e.target.value)}
              aria-label="自訂顏色"
            />
          </div>

          {/* Clear / remove color */}
          {currentColor && (
            <button
              className={styles.clearBtn}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              type="button"
            >
              取消顏色
            </button>
          )}
        </div>
      )}
    </div>
  );
}
