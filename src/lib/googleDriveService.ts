import firebaseConfig from '../../firebase-applet-config.json';

declare const google: any;

const CLIENT_ID = (firebaseConfig as any).oAuthClientId || (firebaseConfig as any).clientId || '835508675554-sunhji3fn09g9u51u26f5ps328ndtdfl.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

// In-memory cache for auth state and access token as required by guidelines
let cachedAccessToken: string | null = null;
let cachedUser: any = null;
const listeners: Array<(user: any | null, accessToken: string | null) => void> = [];

const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener(cachedUser, cachedAccessToken);
    } catch (e) {
      console.error(e);
    }
  });
};

/**
 * Ensures Google Identity Services (GSI) script is loaded and available.
 */
export const ensureGsiLoaded = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof google !== 'undefined' && google.accounts?.oauth2) {
      return resolve();
    }
    let script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    let count = 0;
    const interval = setInterval(() => {
      count++;
      if (typeof google !== 'undefined' && google.accounts?.oauth2) {
        clearInterval(interval);
        resolve();
      } else if (count > 50) {
        clearInterval(interval);
        reject(new Error('Google Identity Services script failed to initialize. Please check your network or ad blocker.'));
      }
    }, 100);
  });
};

/**
 * Initiates Google OAuth token acquisition using Google Identity Services (GSI).
 */
export const googleSignIn = async (): Promise<{ user: any; accessToken: string } | null> => {
  await ensureGsiLoaded();

  return new Promise((resolve, reject) => {
    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (response: any) => {
          if (response.error) {
            if (response.error === 'access_denied' || response.error === 'popup_closed_by_user') {
              resolve(null);
            } else {
              reject(new Error(response.error_description || response.error));
            }
            return;
          }

          if (!response.access_token) {
            reject(new Error('No access token received from Google'));
            return;
          }

          const accessToken = response.access_token;
          cachedAccessToken = accessToken;

          try {
            // Fetch user profile from Google OAuth userinfo endpoint
            const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (userRes.ok) {
              const info = await userRes.json();
              cachedUser = {
                displayName: info.name || info.email,
                email: info.email,
                photoURL: info.picture,
                uid: info.sub,
              };
            } else {
              cachedUser = {
                displayName: 'Google Account',
                email: 'Connected',
                photoURL: null,
                uid: 'google-user',
              };
            }

            try {
              localStorage.setItem('gdrive_user_cache', JSON.stringify(cachedUser));
            } catch (e) {}

            notifyListeners();
            resolve({ user: cachedUser, accessToken });
          } catch (e) {
            console.error('Failed to fetch userinfo:', e);
            cachedUser = {
              displayName: 'Google Account',
              email: 'Connected',
              photoURL: null,
              uid: 'google-user',
            };
            notifyListeners();
            resolve({ user: cachedUser, accessToken });
          }
        },
        error_callback: (err: any) => {
          if (err?.type === 'popup_closed') {
            resolve(null);
          } else {
            reject(new Error(err?.message || 'Google Sign-in failed.'));
          }
        },
      });

      client.requestAccessToken();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Signs out and clears cached tokens and user profile.
 */
export const googleSignOut = async (): Promise<void> => {
  if (cachedAccessToken && typeof google !== 'undefined' && google.accounts?.oauth2?.revoke) {
    try {
      google.accounts.oauth2.revoke(cachedAccessToken, () => {});
    } catch (e) {}
  }
  cachedAccessToken = null;
  cachedUser = null;
  try {
    localStorage.removeItem('gdrive_user_cache');
  } catch (e) {}
  notifyListeners();
};

/**
 * Returns current cached access token.
 */
export const getCachedToken = (): string | null => {
  return cachedAccessToken;
};

/**
 * Returns current cached user profile.
 */
export const getCachedUser = (): any | null => {
  return cachedUser;
};

/**
 * Registers an auth listener for Google Drive connection state changes.
 */
export const initAuthListener = (
  onStateChanged: (user: any | null, accessToken: string | null) => void
) => {
  try {
    const raw = localStorage.getItem('gdrive_user_cache');
    if (raw && !cachedUser) {
      cachedUser = JSON.parse(raw);
    }
  } catch (e) {}

  listeners.push(onStateChanged);
  onStateChanged(cachedUser, cachedAccessToken);

  return () => {
    const idx = listeners.indexOf(onStateChanged);
    if (idx !== -1) {
      listeners.splice(idx, 1);
    }
  };
};

/**
 * Uploads a file blob to Google Drive using the provided accessToken with Resumable Upload protocol.
 */
export const uploadBackupToDrive = async (
  filename: string,
  blob: Blob,
  accessToken: string,
  label?: string
): Promise<{ id: string; name: string; webViewLink?: string }> => {
  // Step 1: Initiate Resumable Session
  const initRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': 'application/octet-stream',
        'X-Upload-Content-Length': String(blob.size),
      },
      body: JSON.stringify({
        name: filename,
        description: label ? `DejavuFM Backup: ${label}` : 'DejavuFM Backup Snapshot',
      }),
    }
  );

  if (!initRes.ok) {
    const errText = await initRes.text();
    throw new Error(`Failed to initiate Google Drive upload session: ${initRes.statusText} (${errText})`);
  }

  const uploadUrl = initRes.headers.get('Location');
  if (!uploadUrl) {
    throw new Error('Google Drive API did not return an upload URL location.');
  }

  // Step 2: Perform PUT request with the binary blob
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/octet-stream',
    },
    body: blob,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Google Drive upload failed during transmission: ${uploadRes.statusText} (${errText})`);
  }

  return uploadRes.json();
};

/**
 * Lists backups stored in Google Drive.
 */
export const listBackupsInDrive = async (accessToken: string): Promise<any[]> => {
  // Find backup files created for DejavuFM (.bundle and .db)
  const q = "(name contains 'backup-' or name contains 'manual-backup-') and trashed = false";
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,size,createdTime,webViewLink)&orderBy=createdTime+desc`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to list backups in Google Drive: ${res.statusText} (${errText})`);
  }

  const data = await res.json();
  return data.files || [];
};

/**
 * Deletes a backup from Google Drive.
 */
export const deleteBackupFromDrive = async (fileId: string, accessToken: string): Promise<void> => {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to delete backup from Google Drive: ${res.statusText} (${errText})`);
  }
};

/**
 * Downloads a file as media from Google Drive.
 */
export const downloadFileFromDrive = async (fileId: string, accessToken: string): Promise<Blob> => {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to download file from Google Drive: ${res.statusText} (${errText})`);
  }

  return res.blob();
};
