import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, firebaseAvailable } from '../firebase/config';
import { UserProgress } from '../types';

const STORAGE_KEY_PREFIX = 'pet_passport_progress_';

const defaultProgress = (): UserProgress => ({
  currentStep: 'main',
  lastFileIds: [],
  lastFileCount: 0,
  activePetId: null,
  pets: [],
  reviewReady: false
});

class UserProgressService {
  private useFirebase: boolean;

  constructor() {
    this.useFirebase = firebaseAvailable;
  }

  async getProgress(userId: string): Promise<UserProgress> {
    if (!userId) {
      return defaultProgress();
    }

    const local = this._getLocalProgress(userId);
    let progress: UserProgress = {
      ...defaultProgress(),
      ...local
    };

    if (this.useFirebase && db) {
      try {
        const docRef = doc(db, 'userProgress', userId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          progress = {
            ...progress,
            ...snapshot.data() as UserProgress
          };
        }
      } catch (error) {
        console.error('Failed to fetch user progress from Firestore:', error);
      }
    }

    return progress;
  }

  async saveProgress(userId: string, partialProgress: Partial<UserProgress> = {}): Promise<UserProgress> {
    if (!userId) return defaultProgress();

    const merged: UserProgress = {
      ...defaultProgress(),
      ...this._getLocalProgress(userId),
      ...partialProgress
    };

    this._setLocalProgress(userId, merged);

    if (this.useFirebase && db) {
      try {
        const docRef = doc(db, 'userProgress', userId);
        await setDoc(docRef, merged, { merge: true });
      } catch (error) {
        console.error('Failed to save user progress to Firestore:', error);
      }
    }

    return merged;
  }

  clearLocal(userId: string): void {
    if (!userId || typeof localStorage === 'undefined') return;
    localStorage.removeItem(this._buildKey(userId));
  }

  private _getLocalProgress(userId: string): UserProgress {
    if (typeof localStorage === 'undefined') {
      return defaultProgress();
    }

    try {
      const key = this._buildKey(userId);
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) as UserProgress : defaultProgress();
    } catch (error) {
      console.error('Failed to parse local progress:', error);
      return defaultProgress();
    }
  }

  private _setLocalProgress(userId: string, progress: UserProgress): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this._buildKey(userId), JSON.stringify(progress));
    } catch (error) {
      console.error('Failed to cache local progress:', error);
    }
  }

  private _buildKey(userId: string): string {
    return `${STORAGE_KEY_PREFIX}${userId}`;
  }
}

const userProgressService = new UserProgressService();

export default userProgressService;
