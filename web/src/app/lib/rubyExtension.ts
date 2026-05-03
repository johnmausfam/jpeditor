import { Node } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';

// ── TypeScript command augmentation ────────────────────────────────────────
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    ruby: {
      /** Insert a ruby (furigana) node replacing the current selection */
      setRuby: (attrs: { text: string; reading: string }) => ReturnType;
      /** Replace an existing ruby node at the given document position */
      editRuby: (attrs: { pos: number; text: string; reading: string }) => ReturnType;
    };
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Internal types for markdown-it inline rule ───────────────────────────────
interface MdToken {
  attrSet: (k: string, v: string) => void;
  attrGet: (k: string) => string | null;
  content: string;
}

interface MdInlineState {
  src: string;
  pos: number;
  posMax: number;
  push: (type: string, tag: string, nesting: number) => MdToken;
}

interface MdInstance {
  __rubyAdded?: boolean;
  inline: {
    ruler: {
      push: (name: string, fn: (state: MdInlineState, silent: boolean) => boolean) => void;
    };
  };
  renderer: {
    rules: Record<string, (tokens: MdToken[], idx: number) => string>;
  };
}

// ── RubyExtension ────────────────────────────────────────────────────────────
export const RubyExtension = Node.create({
  name: 'ruby',
  group: 'inline',
  inline: true,
  atom: true,     // treated as a single unit (not editable inside)
  draggable: false, // base spec flag (selectNode still overrides this in default NodeView)

  addAttributes() {
    return {
      text: { default: '' },
      reading: { default: '' },
    };
  },

  // ── Parse <ruby>text<rt>reading</rt></ruby> from HTML ──────────────────
  parseHTML() {
    return [
      {
        tag: 'ruby',
        getAttrs: (element) => {
          if (typeof element === 'string') return false;
          const rt = element.querySelector('rt');
          const reading = rt?.textContent?.trim() ?? '';
          // Collect text from all child nodes that are NOT <rt>
          const text = Array.from(element.childNodes)
            .filter((n) => n.nodeName !== 'RT')
            .map((n) => n.textContent ?? '')
            .join('')
            .trim();
          return { text, reading };
        },
      },
    ];
  },

  // ── Render as <ruby>text<rt>reading</rt></ruby> in TipTap ──────────────
  renderHTML({ node }) {
    return [
      'ruby',
      {},
      node.attrs.text as string,
      ['rt', {}, node.attrs.reading as string],
    ];
  },

  // ── Custom NodeView — fixes draggable/selection issues ──────────────────
  addNodeView() {
    return (props: {
      node: PMNode;
      getPos: (() => number | undefined) | boolean;
    }) => {
      const { node, getPos } = props;
      const ruby = document.createElement('ruby');

      const buildDOM = (text: string, reading: string) => {
        ruby.innerHTML = '';
        ruby.appendChild(document.createTextNode(text));
        const rt = document.createElement('rt');
        rt.textContent = reading;
        ruby.appendChild(rt);
      };

      buildDOM(
        node.attrs['text'] as string,
        node.attrs['reading'] as string,
      );

      // Double-click → open edit dialog with current values pre-filled
      ruby.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const pos =
          typeof getPos === 'function' ? (getPos() ?? -1) : -1;
        document.dispatchEvent(
          new CustomEvent('jpeditor:edit-ruby', {
            detail: {
              text: node.attrs['text'],
              reading: node.attrs['reading'],
              pos,
            },
          }),
        );
      });

      return {
        dom: ruby,

        update(updatedNode: PMNode): boolean {
          if (updatedNode.type.name !== 'ruby') return false;
          buildDOM(
            updatedNode.attrs['text'] as string,
            updatedNode.attrs['reading'] as string,
          );
          return true;
        },

        // Override to NEVER add draggable="true" when node is selected
        selectNode() {
          ruby.classList.add('ProseMirror-selectednode');
        },
        deselectNode() {
          ruby.classList.remove('ProseMirror-selectednode');
        },

        // Block dragstart so the node cannot be accidentally dragged
        stopEvent(event: Event): boolean {
          return event.type === 'dragstart';
        },
      };
    };
  },

  // ── Commands ────────────────────────────────────────────────────────────
  addCommands() {
    return {
      setRuby:
        (attrs: { text: string; reading: string }) =>
        ({ chain }) => {
          return chain()
            .focus()
            .deleteSelection()
            .insertContent({ type: this.name, attrs })
            .run();
        },

      editRuby:
        (attrs: { pos: number; text: string; reading: string }) =>
        ({ tr, dispatch, state }) => {
          if (dispatch) {
            const rubyNode = state.schema.nodes['ruby'].create({
              text: attrs.text,
              reading: attrs.reading,
            });
            tr.replaceWith(attrs.pos, attrs.pos + 1, rubyNode);
            dispatch(tr);
          }
          return true;
        },
    };
  },

  // ── Keyboard shortcut: Ctrl/Cmd + R → open the Ruby dialog ─────────────
  addKeyboardShortcuts() {
    return {
      'Mod-r': () => {
        document.dispatchEvent(new CustomEvent('jpeditor:open-ruby'));
        return true; // prevent browser's default Ctrl+R (reload)
      },
    };
  },

  // ── tiptap-markdown integration ─────────────────────────────────────────
  addStorage() {
    return {
      markdown: {
        // Serialize Ruby node → {text|reading} in markdown
        serialize(
          state: Record<string, (...args: unknown[]) => void>,
          node: { attrs: { text: string; reading: string } },
        ) {
          state['write'](`{${node.attrs.text}|${node.attrs.reading}}`);
        },

        parse: {
          // Called by tiptap-markdown before each markdown render pass.
          // Adds an inline rule to markdown-it that converts {text|reading}
          // → <ruby>text<rt>reading</rt></ruby>
          setup(this: unknown, md: MdInstance) {
            // Guard against duplicate registration (called on every parse)
            if (md.__rubyAdded) return;
            md.__rubyAdded = true;

            // Add inline rule: {漢字|ふりがな} → ruby token
            md.inline.ruler.push(
              'ruby_inline',
              function rubyRule(state: MdInlineState, silent: boolean) {
                const pos = state.pos;
                // Must start with '{'
                if (state.src.charCodeAt(pos) !== 0x7b) return false;

                const max = state.posMax;
                let pipePos = -1;
                let end = -1;

                for (let i = pos + 1; i <= max; i++) {
                  const ch = state.src.charCodeAt(i);
                  if (ch === 0x0a) return false; // newline inside → abort
                  if (ch === 0x7c && pipePos === -1) pipePos = i; // '|'
                  if (ch === 0x7d) {
                    end = i;
                    break;
                  } // '}'
                }

                // Need both '|' and '}'
                if (pipePos === -1 || end === -1) return false;
                // Text and reading must be non-empty
                if (pipePos <= pos + 1 || end <= pipePos + 1) return false;

                if (!silent) {
                  const token = state.push('ruby_inline', 'ruby', 0);
                  token.attrSet('data-text', state.src.slice(pos + 1, pipePos));
                  token.attrSet(
                    'data-reading',
                    state.src.slice(pipePos + 1, end),
                  );
                  token.content = state.src.slice(pos + 1, pipePos);
                }

                state.pos = end + 1;
                return true;
              },
            );

            // Render the token as HTML
            md.renderer.rules['ruby_inline'] = (tokens, idx) => {
              const token = tokens[idx];
              const text = token.attrGet('data-text') ?? '';
              const reading = token.attrGet('data-reading') ?? '';
              return `<ruby>${escapeHtml(text)}<rt>${escapeHtml(reading)}</rt></ruby>`;
            };
          },
        },
      },
    };
  },
});
