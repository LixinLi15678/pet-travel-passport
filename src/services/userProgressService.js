import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, firebaseAvailable } from '../firebase/config';

const STORAGE_KEY_PREFIX = 'pet_passport_progress_';

const defaultProgress = () => ({
  currentStep: 'main',
  lastUpdated: null,
  lastFileIds: [],
  lastFileCount: 0,
  activePetId: null,
  pets: [],
  reviewReady: false
});

class UserProgressService {
  constructor() {
    this.useFirebase = firebaseAvailable;
  }

  async getProgress(userId) {
    if (!userId) {
      return defaultProgress();
    }

    const local = this._getLocalProgress(userId);
    let progress = {
      ...defaultProgress(),
      ...local
    };

    if (this.useFirebase) {
      try {
        const docRef = doc(db, 'userProgress', userId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          progress = {
            ...progress,
            ...snapshot.data()
          };
        }
      } catch (error) {
        console.error('Failed to fetch user progress from Firestore:', error);
      }
    }

    return progress;
  }

  async saveProgress(userId, partialProgress = {}) {
    if (!userId) return defaultProgress();

    const merged = {
      ...defaultProgress(),
      ...this._getLocalProgress(userId),
      ...partialProgress,
      lastUpdated: new Date().toISOString()
    };

    this._setLocalProgress(userId, merged);

    if (this.useFirebase) {
      try {
        const docRef = doc(db, 'userProgress', userId);
        await setDoc(docRef, merged, { merge: true });
      } catch (error) {
        console.error('Failed to save user progress to Firestore:', error);
      }
    }

    return merged;
  }

  clearLocal(userId) {
    if (!userId || typeof localStorage === 'undefined') return;
    localStorage.removeItem(this._buildKey(userId));
  }

  _getLocalProgress(userId) {
    if (typeof localStorage === 'undefined') {
      return defaultProgress();
    }

    try {
      const key = this._buildKey(userId);
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : defaultProgress();
    } catch (error) {
      console.error('Failed to parse local progress:', error);
      return defaultProgress();
    }
  }

  _setLocalProgress(userId, progress) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this._buildKey(userId), JSON.stringify(progress));
    } catch (error) {
      console.error('Failed to cache local progress:', error);
    }
  }

  _buildKey(userId) {
    return `${STORAGE_KEY_PREFIX}${userId}`;
  }
}

const userProgressService = new UserProgressService();

export default userProgressService;
