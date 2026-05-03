/**
 * Google Identity Services (GIS) – Token Model OAuth helper.
 *
 * Uses the GIS Token Model to request an access token directly via a popup.
 * No client secret is stored in the browser. GIS handles CSRF protection
 * internally.
 *
 * References:
 *   https://developers.google.com/identity/oauth2/web/guides/use-token-model
 */

const CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

/**
 * OAuth scopes requested by this app.
 * - `drive`: full Drive access for listing + reading + writing files.
 * - `userinfo.*`: name / email / avatar for the header display.
 */
const SCOPE = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

const SS_TOKEN = 'jpeditor_gtoken';
const SS_EXPIRY = 'jpeditor_gtoken_expiry';

// ── Minimal GIS type declarations ────────────────────────────────────────────

interface GisTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  error?: string;
}

interface GisTokenClient {
  requestAccessToken(): void;
}

interface GisTokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: GisTokenResponse) => void;
  error_callback?: (error: { type: string }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: GisTokenClientConfig): GisTokenClient;
          revoke(token: string, done: () => void): void;
        };
      };
    };
  }
}

// ── Token storage (sessionStorage) ───────────────────────────────────────────

/** Persist the access token with its expiry time. */
export function storeToken(token: string, expiresIn: number): void {
  // Subtract 60 s as a safety margin so the token is refreshed before expiry.
  const expiry = Date.now() + expiresIn * 1000 - 60_000;
  sessionStorage.setItem(SS_TOKEN, token);
  sessionStorage.setItem(SS_EXPIRY, String(expiry));
}

/** Return the stored token if still valid, or null otherwise. */
export function getStoredToken(): string | null {
  const token = sessionStorage.getItem(SS_TOKEN);
  const expiry = Number(sessionStorage.getItem(SS_EXPIRY) ?? 0);
  if (!token || Date.now() > expiry) return null;
  return token;
}

/** Remove the access token from sessionStorage. */
export function clearStoredToken(): void {
  sessionStorage.removeItem(SS_TOKEN);
  sessionStorage.removeItem(SS_EXPIRY);
}

// ── OAuth request ─────────────────────────────────────────────────────────────

/**
 * Open the GIS OAuth popup and call `callback` with the access token on
 * success, or `null` on failure / user-cancel.
 *
 * If the GIS script hasn't finished loading yet, retries after 500 ms (up to
 * 10 times) before giving up.
 */
export function requestGoogleLogin(
  callback: (token: string | null) => void,
  _attempt = 0,
): void {
  if (!CLIENT_ID) {
    console.error(
      '[googleAuth] VITE_GOOGLE_CLIENT_ID is not set.\n' +
        'Copy web/.env.example → web/.env.local and add your Client ID.',
    );
    callback(null);
    return;
  }

  if (!window.google?.accounts?.oauth2) {
    if (_attempt >= 10) {
      console.error('[googleAuth] GIS SDK failed to load after 5 s.');
      callback(null);
      return;
    }
    setTimeout(() => requestGoogleLogin(callback, _attempt + 1), 500);
    return;
  }

  const client = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPE,
    callback: (response) => {
      if (response.error || !response.access_token) {
        console.error('[googleAuth] Token error:', response.error);
        callback(null);
        return;
      }
      storeToken(response.access_token, response.expires_in);
      callback(response.access_token);
    },
    error_callback: (err) => {
      console.error('[googleAuth] OAuth error:', err.type);
      callback(null);
    },
  });

  client.requestAccessToken();
}

/** Best-effort revoke the token and clear sessionStorage. */
export function revokeGoogleToken(token: string): void {
  clearStoredToken();
  window.google?.accounts.oauth2.revoke(token, () => {
    /* revocation is fire-and-forget */
  });
}
