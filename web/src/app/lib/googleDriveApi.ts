/**
 * Google Drive REST API v3 — helper functions.
 *
 * All functions accept a bearer access token obtained via GIS and make
 * unauthenticated-safe fetch calls (Authorization header, never query string).
 */

import type { DriveFile } from '../store/driveStore';

const BASE = 'https://www.googleapis.com';

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

async function assertOk(res: Response): Promise<void> {
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Drive API ${res.status}: ${body.slice(0, 300)}`);
  }
}

// ── User info ─────────────────────────────────────────────────────────────────

/** Fetch the authenticated user's basic profile from Google's userinfo endpoint. */
export async function fetchUserInfo(
  token: string,
): Promise<{ email: string; name: string; picture: string }> {
  const res = await fetch(`${BASE}/oauth2/v3/userinfo`, {
    headers: authHeaders(token),
  });
  await assertOk(res);
  const data = (await res.json()) as {
    email: string;
    name: string;
    picture: string;
  };
  return { email: data.email, name: data.name, picture: data.picture };
}

// ── File listing ──────────────────────────────────────────────────────────────

/**
 * List plain-text files in a Drive folder, filtered to `.md` extension,
 * ordered by most-recently modified first.
 *
 * Requires `drive` or `drive.readonly` scope.
 */
export async function listMarkdownFiles(
  token: string,
  folderId: string,
): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id,name,modifiedTime,size,mimeType)',
    orderBy: 'modifiedTime desc',
    pageSize: '100',
  });

  const res = await fetch(`${BASE}/drive/v3/files?${params.toString()}`, {
    headers: authHeaders(token),
  });
  await assertOk(res);

  const data = (await res.json()) as {
    files: Array<{
      id: string;
      name: string;
      modifiedTime: string;
      size?: string;
      mimeType: string;
    }>;
  };

  return (data.files ?? []).filter((f) => f.name.endsWith('.md'));
}

// ── File content ──────────────────────────────────────────────────────────────

/** Download the plain-text content of a Drive file. */
export async function downloadFileContent(
  token: string,
  fileId: string,
): Promise<string> {
  const res = await fetch(
    `${BASE}/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`,
    { headers: authHeaders(token) },
  );
  await assertOk(res);
  return res.text();
}

// ── File write ────────────────────────────────────────────────────────────────

/**
 * Create a new `.md` file in the given Drive folder.
 * Returns the new file's Drive ID.
 */
export async function createDriveFile(
  token: string,
  folderId: string,
  fileName: string,
  content: string,
): Promise<string> {
  const metadata = JSON.stringify({
    name: fileName.endsWith('.md') ? fileName : `${fileName}.md`,
    mimeType: 'text/plain',
    parents: [folderId],
  });

  const body = new FormData();
  body.append('metadata', new Blob([metadata], { type: 'application/json' }));
  body.append('media', new Blob([content], { type: 'text/plain' }));

  const res = await fetch(
    `${BASE}/upload/drive/v3/files?uploadType=multipart&fields=id`,
    { method: 'POST', headers: authHeaders(token), body },
  );
  await assertOk(res);
  const data = (await res.json()) as { id: string };
  return data.id;
}

/**
 * Update an existing Drive file's content (overwrite).
 */
export async function updateDriveFile(
  token: string,
  fileId: string,
  content: string,
): Promise<void> {
  const res = await fetch(
    `${BASE}/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media`,
    {
      method: 'PATCH',
      headers: { ...authHeaders(token), 'Content-Type': 'text/plain' },
      body: content,
    },
  );
  await assertOk(res);
}
