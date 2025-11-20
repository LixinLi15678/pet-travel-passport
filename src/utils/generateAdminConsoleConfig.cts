// Lixin: This file is used to generate the admin console config.
// Personal used only

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const OUTPUT_PATH = path.join(ROOT_DIR, 'public', 'admin-console.config.js');

const REQUIRED_KEYS = [
  'REACT_APP_FIREBASE_API_KEY',
  'REACT_APP_FIREBASE_AUTH_DOMAIN',
  'REACT_APP_FIREBASE_PROJECT_ID',
  'REACT_APP_FIREBASE_STORAGE_BUCKET',
  'REACT_APP_FIREBASE_MESSAGING_SENDER_ID',
  'REACT_APP_FIREBASE_APP_ID'
] as const;

type FirebaseEnvKey = typeof REQUIRED_KEYS[number];

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const loadEnvFiles = (): void => {
  const candidates = ['.env.local', '.env'];
  candidates.forEach((fileName) => {
    const filePath = path.join(ROOT_DIR, fileName);
    if (fs.existsSync(filePath)) {
      dotenv.config({ path: filePath });
    }
  });
};

const readEnv = (key: FirebaseEnvKey): string | undefined => process.env[key];

const findMissingKeys = (): FirebaseEnvKey[] => (
  REQUIRED_KEYS.filter((key) => {
    const value = readEnv(key);
    return !value || value.trim().length === 0;
  })
);

const writeWarningFile = (missingKeys: FirebaseEnvKey[]): void => {
  const warningMessage = `window.ADMIN_CONSOLE_CONFIG = null;\n` +
    `console.warn('Missing Firebase environment variables for admin console: ${missingKeys.join(', ')}');\n`;
  fs.writeFileSync(OUTPUT_PATH, warningMessage, 'utf8');
  console.warn('[admin-console] Missing environment variables:', missingKeys.join(', '));
};

const buildFirebaseConfig = (): FirebaseConfig => ({
  apiKey: readEnv('REACT_APP_FIREBASE_API_KEY')!.trim(),
  authDomain: readEnv('REACT_APP_FIREBASE_AUTH_DOMAIN')!.trim(),
  projectId: readEnv('REACT_APP_FIREBASE_PROJECT_ID')!.trim(),
  storageBucket: readEnv('REACT_APP_FIREBASE_STORAGE_BUCKET')!.trim(),
  messagingSenderId: readEnv('REACT_APP_FIREBASE_MESSAGING_SENDER_ID')!.trim(),
  appId: readEnv('REACT_APP_FIREBASE_APP_ID')!.trim()
});

const writeConfigFile = (config: FirebaseConfig): void => {
  const fileContents = `window.ADMIN_CONSOLE_CONFIG = ${JSON.stringify(config, null, 2)};\n`;
  fs.writeFileSync(OUTPUT_PATH, fileContents, 'utf8');
  console.log('[admin-console] Configuration generated at public/admin-console.config.js');
};

const run = (): void => {
  loadEnvFiles();
  const missingKeys = findMissingKeys();
  if (missingKeys.length > 0) {
    writeWarningFile(missingKeys);
    return;
  }

  const config = buildFirebaseConfig();
  writeConfigFile(config);
};

run();
export {};
