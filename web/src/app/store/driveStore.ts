/**
 * Zustand store for Google Drive authentication and file list state.
 *
 * Auth fields (access token, user profile) are mirrored to sessionStorage so
 * they survive a page reload within the same browser tab but are cleared when
 * the tab is closed (sessionStorage is tab-scoped).
 *
 * The working folder ID is persisted in localStorage (non-sensitive, survives
 * restarts, per-origin).
 */
import { create } from 'zustand';

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

// sessionStorage / localStorage keys
const SS_TOKEN = 'jpeditor_gtoken';
const SS_EXPIRY = 'jpeditor_gtoken_expiry';
const SS_EMAIL = 'jpeditor_user_email';
const SS_NAME = 'jpeditor_user_name';
const SS_PICTURE = 'jpeditor_user_picture';
const LS_FOLDER = 'jpeditor_drive_folder';

interface DriveState {
  isLoggedIn: boolean;
  accessToken: string | null;
  userEmail: string | null;
  userName: string | null;
  userPicture: string | null;
  files: DriveFile[];
  /** Google Drive folder ID of the current working directory. */
  folderId: string;
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
  /** Persist folder ID to localStorage. */
  setFolderId: (id: string) => void;
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

export const useDriveStore = create<DriveState>((set) => ({
  ...restoreAuth(),
  files: [],
  folderId: localStorage.getItem(LS_FOLDER) ?? '',
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
      error: null,
    });
  },

  setFiles: (files) => set({ files }),

  setFolderId: (id) => {
    localStorage.setItem(LS_FOLDER, id);
    set({ folderId: id });
  },

  setLoadingFiles: (v) => set({ isLoadingFiles: v }),
  setError: (error) => set({ error }),
}));
