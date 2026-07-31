import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive');

// In-memory cache for auth state and access token as required by guidelines
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;
let authListenerInitialized = false;

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google Auth');
    }
    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request' ||
      error?.code === 'auth/popup-blocked'
    ) {
      console.log('Google Sign-In popup closed or cancelled by user.');
      return null;
    }
    console.error('Google Sign-In Error:', error);
    throw error;
  }
};

export const googleSignOut = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedUser = null;
};

export const getCachedToken = (): string | null => {
  return cachedAccessToken;
};

export const getCachedUser = (): User | null => {
  return cachedUser;
};

export const initAuthListener = (
  onStateChanged: (user: User | null, accessToken: string | null) => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      cachedAccessToken = null;
      cachedUser = null;
      onStateChanged(null, null);
    } else {
      cachedUser = user;
      // Note: cachedAccessToken is only set via the popup sign-in, as Firebase Client SDK
      // doesn't persist the Google third-party Provider Access Token on reload natively.
      // So if page reloads, they will need to click "Sign In" again to obtain a fresh Google Access Token.
      onStateChanged(user, cachedAccessToken);
    }
  });
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
  // Find files with bundle extension and matching the backup filename structures
  const q = "name contains 'backup-' and name contains '.bundle' and trashed = false";
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
