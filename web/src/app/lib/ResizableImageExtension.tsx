/**
 * ResizableImageExtension
 *
 * Extends @tiptap/extension-image with a React NodeView that renders a
 * drag-handle in the bottom-right corner so the user can resize the image
 * by dragging. The resulting width (px) is stored as a node attribute and
 * is round-tripped via the HTML `width` attribute when copy-pasting rich
 * content.
 */
import { useState, useCallback, useRef } from 'react';
import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';

// ─────────────────────────────────────────────────────────────────────────────
// NodeView component
// ─────────────────────────────────────────────────────────────────────────────

function ResizableImageNodeView({
  node,
  updateAttributes,
  selected,
}: NodeViewProps) {
  const { src, alt, title, width } = node.attrs as {
    src: string;
    alt?: string;
    title?: string;
    width?: number | null;
  };

  const [hovered, setHovered] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const showHandle = selected || hovered;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const startX = e.clientX;
      const startWidth = imgRef.current?.offsetWidth ?? 300;

      const onMouseMove = (ev: MouseEvent) => {
        const newWidth = Math.max(50, startWidth + ev.clientX - startX);
        updateAttributes({ width: Math.round(newWidth) });
      };

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [updateAttributes],
  );

  const wrapperStyle: React.CSSProperties = {
    display: 'inline-block',
    position: 'relative',
    maxWidth: '100%',
    lineHeight: 0,
    ...(width ? { width: `${width}px` } : {}),
  };

  const handleStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 12,
    height: 12,
    background: '#2563eb',
    border: '2px solid #fff',
    borderRadius: 3,
    cursor: 'nwse-resize',
    opacity: showHandle ? 1 : 0,
    transition: 'opacity 0.15s',
    zIndex: 10,
  };

  return (
    <NodeViewWrapper
      as="div"
      style={wrapperStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt ?? ''}
        title={title}
        draggable={false}
        style={{ display: 'block', width: '100%', height: 'auto' }}
      />
      {/* Resize handle — drag bottom-right corner to resize */}
      <div
        role="presentation"
        aria-hidden="true"
        style={handleStyle}
        onMouseDown={handleMouseDown}
      />
    </NodeViewWrapper>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TipTap extension
// ─────────────────────────────────────────────────────────────────────────────

export const ResizableImageExtension = Image.extend({
  /**
   * Add a `width` attribute that is stored as a pixel integer.
   * Parsed from both `width` attribute and `style.width` on `<img>` tags.
   * Rendered back as `width="NNN"` so it survives HTML copy-paste.
   */
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => {
          const raw = el.getAttribute('width') ?? el.style.width ?? '';
          const n = parseInt(raw, 10);
          return isNaN(n) ? null : n;
        },
        renderHTML: (attrs) => {
          if (!attrs['width']) return {};
          return { width: String(attrs['width']) };
        },
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageNodeView);
  },
});
