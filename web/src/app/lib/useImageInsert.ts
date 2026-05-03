import { useCallback, useEffect } from 'react';
import type { Editor } from '@tiptap/react';

/** Allowed MIME types for pasted / dropped images */
const ALLOWED_MIME: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
];

/** Maximum file size: 5 MB */
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Read a File as a data URL and insert it into the TipTap editor.
 * Returns a promise that resolves to true on success, false on failure.
 */
function insertFileAsBase64(editor: Editor, file: File): Promise<boolean> {
  return new Promise((resolve) => {
    if (!ALLOWED_MIME.includes(file.type)) {
      alert(`不支援的圖片格式：${file.type}\n僅允許 PNG、JPEG、GIF、WebP。`);
      resolve(false);
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      alert(
        `圖片大小（${(file.size / 1024 / 1024).toFixed(1)} MB）超過上限 5 MB，請壓縮後再試。`,
      );
      resolve(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      editor.chain().focus().setImage({ src, alt: file.name }).run();
      resolve(true);
    };
    reader.onerror = () => {
      alert('讀取圖片時發生錯誤，請再試一次。');
      resolve(false);
    };
    reader.readAsDataURL(file);
  });
}

interface UseImageInsertOptions {
  editor: Editor | null;
  /** DOM element to attach paste / dragover / drop listeners to */
  targetEl: HTMLElement | null;
}

/**
 * Attaches paste and drag-and-drop image handlers to `targetEl`.
 * When an image is detected, it is converted to Base64 and inserted
 * into the TipTap editor at the current cursor position.
 */
export function useImageInsert({ editor, targetEl }: UseImageInsertOptions) {
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (!editor) return;
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItem = items.find((item) => item.type.startsWith('image/'));
      if (!imageItem) return;

      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) insertFileAsBase64(editor, file);
    },
    [editor],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    // Allow drop only if it contains files
    const hasFiles = Array.from(e.dataTransfer?.items ?? []).some(
      (item) => item.kind === 'file',
    );
    if (hasFiles) e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      if (!editor) return;
      const files = Array.from(e.dataTransfer?.files ?? []);
      const imageFiles = files.filter((f) => f.type.startsWith('image/'));
      if (imageFiles.length === 0) return;

      e.preventDefault();
      // Insert each image sequentially
      imageFiles.reduce<Promise<void>>(
        (chain, file) =>
          chain.then(() =>
            insertFileAsBase64(editor, file).then(() => undefined),
          ),
        Promise.resolve(),
      );
    },
    [editor],
  );

  useEffect(() => {
    if (!targetEl) return;
    targetEl.addEventListener('paste', handlePaste);
    targetEl.addEventListener('dragover', handleDragOver);
    targetEl.addEventListener('drop', handleDrop);
    return () => {
      targetEl.removeEventListener('paste', handlePaste);
      targetEl.removeEventListener('dragover', handleDragOver);
      targetEl.removeEventListener('drop', handleDrop);
    };
  }, [targetEl, handlePaste, handleDragOver, handleDrop]);
}
