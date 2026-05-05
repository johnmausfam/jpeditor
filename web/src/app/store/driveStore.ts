/**
 * Zustand store for Google Drive authentication and file list state.
 *
 * Auth fields (access token, user profile) are mirrored to sessionStorage so
 * they survive a page reload within the same browser tab but are cleared when
 * the tab is closed (sessionStorage is tab-scoped).
 *
 * Work folders are persisted in localStorage as a JSON array.
 * Legacy single-folder key (jpeditor_drive_folder) is migrated on first load.
 */
import { create } from 'zustand';

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
  ownerName?: string;
}

/** A named Google Drive working directory entry. */
export interface WorkFolder {
  /** User-defined display label. */
  label: string;
  /** Google Drive folder ID. */
  folderId: string;
}

// sessionStorage keys
const SS_TOKEN = 'jpeditor_gtoken';
const SS_EXPIRY = 'jpeditor_gtoken_expiry';
const SS_EMAIL = 'jpeditor_user_email';
const SS_NAME = 'jpeditor_user_name';
const SS_PICTURE = 'jpeditor_user_picture';

// localStorage keys
const LS_FOLDER_LEGACY = 'jpeditor_drive_folder'; // deprecated, kept for migration
const LS_FOLDERS = 'jpeditor_drive_folders';
const LS_ACTIVE = 'jpeditor_drive_active';

interface DriveState {
  isLoggedIn: boolean;
  accessToken: string | null;
  userEmail: string | null;
  userName: string | null;
  userPicture: string | null;
  files: DriveFile[];
  /** List of configured working directories. */
  workFolders: WorkFolder[];
  /** Folder ID of the currently active working directory. */
  activeFolderId: string;
  /** ID of the currently open Drive file (null = new / unsaved). */
  currentFileId: string | null;
  /** File name of the currently open Drive file. */
  currentFileName: string | null;
  isLoadingFiles: boolean;
  error: string | null;

  /** Set all auth fields and persist user info to sessionStorage. */
  setAuth: (
    token: string,
    email: string,
    name: string,
    picture: string,
  ) => void;
  /** Clear all auth state and remove persisted values. */
  logout: () => void;
  setFiles: (files: DriveFile[]) => void;
  /** Update work folder list and persist to localStorage. */
  setWorkFolders: (folders: WorkFolder[]) => void;
  /** Switch active working directory and persist to localStorage. */
  setActiveFolderId: (id: string) => void;
  setCurrentFile: (id: string | null, name: string | null) => void;
  setLoadingFiles: (v: boolean) => void;
  setError: (error: string | null) => void;
}

/** On page load, restore auth state from sessionStorage if the token is valid. */
function restoreAuth(): Pick<
  DriveState,
  'isLoggedIn' | 'accessToken' | 'userEmail' | 'userName' | 'userPicture'
> {
  const token = sessionStorage.getItem(SS_TOKEN);
  const expiry = Number(sessionStorage.getItem(SS_EXPIRY) ?? 0);
  const valid = !!token && Date.now() < expiry;

  if (valid) {
    return {
      isLoggedIn: true,
      accessToken: token,
      userEmail: sessionStorage.getItem(SS_EMAIL),
      userName: sessionStorage.getItem(SS_NAME),
      userPicture: sessionStorage.getItem(SS_PICTURE),
    };
  }

  return {
    isLoggedIn: false,
    accessToken: null,
    userEmail: null,
    userName: null,
    userPicture: null,
  };
}

/**
 * Initialise work folders from localStorage, migrating legacy single-folder
 * key if necessary.
 */
function initWorkFolders(): {
  workFolders: WorkFolder[];
  activeFolderId: string;
} {
  const foldersRaw = localStorage.getItem(LS_FOLDERS);
  let workFolders: WorkFolder[] = [];

  if (foldersRaw) {
    try {
      workFolders = JSON.parse(foldersRaw) as WorkFolder[];
    } catch {
      workFolders = [];
    }
  } else {
    const legacy = localStorage.getItem(LS_FOLDER_LEGACY);
    if (legacy) {
      workFolders = [{ label: '預設目錄', folderId: legacy }];
      localStorage.setItem(LS_FOLDERS, JSON.stringify(workFolders));
    }
  }

  const savedActive = localStorage.getItem(LS_ACTIVE);
  // Use saved active ID if it still exists in the list; otherwise fall back to first entry
  const validActive =
    savedActive && workFolders.some((f) => f.folderId === savedActive)
      ? savedActive
      : (workFolders[0]?.folderId ?? '');

  return { workFolders, activeFolderId: validActive };
}

export const useDriveStore = create<DriveState>((set) => ({
  ...restoreAuth(),
  files: [],
  ...initWorkFolders(),
  currentFileId: null,
  currentFileName: null,
  isLoadingFiles: false,
  error: null,

  setAuth: (token, email, name, picture) => {
    sessionStorage.setItem(SS_EMAIL, email);
    sessionStorage.setItem(SS_NAME, name);
    sessionStorage.setItem(SS_PICTURE, picture);
    set({
      isLoggedIn: true,
      accessToken: token,
      userEmail: email,
      userName: name,
      userPicture: picture,
      error: null,
    });
  },

  logout: () => {
    sessionStorage.removeItem(SS_EMAIL);
    sessionStorage.removeItem(SS_NAME);
    sessionStorage.removeItem(SS_PICTURE);
    set({
      isLoggedIn: false,
      accessToken: null,
      userEmail: null,
      userName: null,
      userPicture: null,
      files: [],
      currentFileId: null,
      currentFileName: null,
      error: null,
    });
  },

  setFiles: (files) => set({ files }),

  setWorkFolders: (folders) => {
    localStorage.setItem(LS_FOLDERS, JSON.stringify(folders));
    set({ workFolders: folders });
  },

  setActiveFolderId: (id) => {
    localStorage.setItem(LS_ACTIVE, id);
    set({ activeFolderId: id });
  },

  setCurrentFile: (id, name) =>
    set({ currentFileId: id, currentFileName: name }),

  setLoadingFiles: (v) => set({ isLoadingFiles: v }),
  setError: (error) => set({ error }),
}));
