import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration - values come from environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Initialize Firebase
let app = null;
let auth = null;
let db = null;
let firebaseAvailable = false;

try {
  // Check if all required config values are present
  const configValues = Object.values(firebaseConfig);
  const hasAllConfig = configValues.every(val => val && val !== 'undefined' && !val.includes('your_'));

  if (hasAllConfig) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    firebaseAvailable = true;
    console.log('Firebase initialized successfully');
  } else {
    console.warn('Firebase configuration incomplete - using local storage fallback');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
  console.warn('Falling back to local storage');
}

export { auth, db, firebaseAvailable };
export default app;
