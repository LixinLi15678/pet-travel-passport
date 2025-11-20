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

const resolveCredentials = () => {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT env variable.');
  }
  return JSON.parse(serviceAccountJson);
};

const bootstrap = () => {
  if (admin.apps.length > 0) {
    return;
  }
  const serviceAccount = resolveCredentials();
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || (serviceAccount as any).project_id
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
