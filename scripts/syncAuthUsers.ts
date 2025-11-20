/**
 Lixin: This script is used to sync the auth users to the userProfiles collection in the Firebase Firestore.
 Personally used only
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import admin from 'firebase-admin';

const ROOT_DIR = path.resolve(__dirname, '..');

const loadEnvFiles = (): void => {
  ['.env.local', '.env'].forEach((fileName) => {
    const filePath = path.join(ROOT_DIR, fileName);
    if (fs.existsSync(filePath)) {
      dotenv.config({ path: filePath });
    }
  });
};

loadEnvFiles();

const normalizeRaw = (value: string): string => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

const parseInlineServiceAccount = (payload: string): Record<string, unknown> => {
  const normalized = normalizeRaw(payload);

  // If it starts with {, it's JSON
  if (normalized.startsWith('{')) {
    return JSON.parse(normalized);
  }

  // Check if it looks like a file path (contains . or / and is short)
  const looksLikePath = (normalized.includes('.') || normalized.includes('/')) && normalized.length < 200;

  if (looksLikePath) {
    // Try as relative path from project root
    const possiblePath = path.resolve(ROOT_DIR, normalized);
    if (fs.existsSync(possiblePath)) {
      const raw = fs.readFileSync(possiblePath, 'utf8');
      return JSON.parse(raw);
    }
    // Try as absolute path
    if (fs.existsSync(normalized)) {
      const raw = fs.readFileSync(normalized, 'utf8');
      return JSON.parse(raw);
    }
  }

  // Try base64 decode
  try {
    const decoded = Buffer.from(normalized, 'base64').toString('utf8');
    if (decoded.startsWith('{')) {
      return JSON.parse(decoded);
    }
    throw new Error('Decoded base64 is not valid JSON');
  } catch (decodeError) {
    throw new Error(`Unable to parse service account. Provide valid JSON, base64, or file path. Input starts with: ${normalized.substring(0, 20)}...`);
  }
};

const resolveCredentials = () => {
  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (inlineJson && inlineJson.trim().length > 0) {
    return parseInlineServiceAccount(inlineJson.trim());
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsPath) {
    throw new Error('Missing GOOGLE_APPLICATION_CREDENTIALS env variable.');
  }
  const absolutePath = path.resolve(credentialsPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Service account file not found at ${absolutePath}`);
  }
  const raw = fs.readFileSync(absolutePath, 'utf8');
  return JSON.parse(raw);
};

const bootstrap = () => {
  if (admin.apps.length > 0) {
    return;
  }
  const serviceAccount = resolveCredentials();
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || (serviceAccount as any).project_id
  });
};

interface SyncedUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerIds: string[];
  createdAt: string | null;
  lastLoginAt: string | null;
  syncedAt: string;
}

const syncUserRecord = async (user: admin.auth.UserRecord): Promise<void> => {
  const db = admin.firestore();
  const docRef = db.collection('userProfiles').doc(user.uid);
  const payload: SyncedUser = {
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    providerIds: user.providerData
      .map((p) => p?.providerId)
      .filter((v): v is string => Boolean(v)),
    createdAt: user.metadata.creationTime || null,
    lastLoginAt: user.metadata.lastSignInTime || null,
    syncedAt: new Date().toISOString()
  };
  await docRef.set(payload, { merge: true });
};

const listAllUsers = async (nextPageToken?: string): Promise<void> => {
  const auth = admin.auth();
  const result = await auth.listUsers(1000, nextPageToken);
  for (const user of result.users) {
    await syncUserRecord(user);
    console.log(`[sync] Synced ${user.email || user.uid}`);
  }
  if (result.pageToken) {
    await listAllUsers(result.pageToken);
  }
};

const run = async () => {
  try {
    bootstrap();
    await listAllUsers();
    console.log('All auth users synced to userProfiles collection.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to sync auth users:', error);
    process.exit(1);
  }
};

run();

export {};
