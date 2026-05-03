/**
 * YoutubeExtension — custom TipTap block node for embedded YouTube iframes.
 *
 * Markdown storage:
 *   <iframe src="https://www.youtube.com/embed/{videoId}" width="560" height="315" allowfullscreen></iframe>
 *
 * Security: only youtube.com/youtu.be embeds are accepted; other iframe src
 * values are rejected by parseHTML returning false.
 */
import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';

// ── URL parser (exported for use in YoutubeDialog) ───────────────────────────

/**
 * Extract a YouTube video ID from a variety of URL formats:
 *   youtu.be/{id}
 *   youtube.com/watch?v={id}
 *   youtube.com/embed/{id}
 * Also accepts a bare 11-character video ID directly.
 *
 * Returns null when the input cannot be resolved to a valid ID.
 */
export function parseYoutubeVideoId(input: string): string | null {
  const s = input.trim();
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0];
      if (id) return id;
    }
    if (host === 'youtube.com') {
      // watch?v=
      const v = u.searchParams.get('v');
      if (v) return v;
      // embed/
      const embed = u.pathname.match(/^\/embed\/([A-Za-z0-9_-]+)/);
      if (embed) return embed[1];
    }
  } catch {
    // not a URL — fall through to bare ID check
  }
  // bare video ID (11 chars, base64url charset)
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return null;
}

// ── React NodeView ───────────────────────────────────────────────────────────

function YoutubeNodeView({ node, selected }: NodeViewProps) {
  const { videoId } = node.attrs as { videoId: string };

  return (
    <NodeViewWrapper
      style={{
        display: 'block',
        margin: '1em 0',
        outline: selected ? '2px solid #2563eb' : 'none',
        borderRadius: 4,
      }}
    >
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        width="560"
        height="315"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ border: 'none', display: 'block', maxWidth: '100%' }}
        title="YouTube 影片"
        sandbox="allow-scripts allow-same-origin allow-presentation"
      />
    </NodeViewWrapper>
  );
}

// ── Extension ────────────────────────────────────────────────────────────────

export const YoutubeExtension = Node.create({
  name: 'youtube',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      videoId: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'iframe[src]',
        getAttrs: (node) => {
          const el = node as HTMLElement;
          const src = el.getAttribute('src') ?? '';
          // Only accept youtube.com embed URLs
          const match = src.match(
            /^https:\/\/(?:www\.)?youtube\.com\/embed\/([A-Za-z0-9_-]+)/,
          );
          if (!match) return false;
          return { videoId: match[1] };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { videoId } = node.attrs as { videoId: string };
    return [
      'iframe',
      {
        src: `https://www.youtube.com/embed/${videoId}`,
        width: '560',
        height: '315',
        allowfullscreen: 'true',
        frameborder: '0',
      },
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(YoutubeNodeView);
  },

  // ── tiptap-markdown serialization ────────────────────────────────────────
  addStorage() {
    return {
      markdown: {
        serialize(
          state: Record<string, (...args: unknown[]) => void>,
          node: { attrs: { videoId: string } },
        ) {
          const { videoId } = node.attrs;
          state['write'](
            `<iframe src="https://www.youtube.com/embed/${videoId}" width="560" height="315" allowfullscreen></iframe>`,
          );
          state['closeBlock'](node);
        },
      },
    };
  },
});
