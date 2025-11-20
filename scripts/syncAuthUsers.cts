// Lixin: This script is used to sync the auth users to the userProfiles collection in the Firebase Firestore.
// Personally used

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const admin = require('firebase-admin');

const ROOT_DIR = path.resolve(__dirname, '..');

const loadEnvFiles = () => {
  const candidates = ['.env.local', '.env'];
  candidates.forEach((fileName) => {
    const filePath = path.join(ROOT_DIR, fileName);
    if (fs.existsSync(filePath)) {
      dotenv.config({ path: filePath });
    }
  });
};

loadEnvFiles();

const resolveCredentials = () => {
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
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || serviceAccount.project_id
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
    providerIds: user.providerData.map((p) => p?.providerId).filter((v): v is string => Boolean(v)),
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
