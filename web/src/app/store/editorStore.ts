import { create } from 'zustand';

export type ViewMode = 'split' | 'wysiwyg' | 'source';
export type FontFamily = 'sans' | 'serif';

interface EditorState {
  viewMode: ViewMode;
  fontFamily: FontFamily;
  setViewMode: (mode: ViewMode) => void;
  setFontFamily: (font: FontFamily) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  viewMode: 'split',
  fontFamily: 'sans',
  setViewMode: (mode) => set({ viewMode: mode }),
  setFontFamily: (font) => set({ fontFamily: font }),
}));
