import { deleteField, doc, getDoc, setDoc } from 'firebase/firestore';
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
          progress = this._stripLegacyFields({
            ...progress,
            ...(snapshot.data() as UserProgress)
          });
        }
      } catch (error) {
        console.error('Failed to fetch user progress from Firestore:', error);
      }
    }

    return this._stripLegacyFields(progress);
  }

  async saveProgress(userId: string, partialProgress: Partial<UserProgress> = {}): Promise<UserProgress> {
    if (!userId) return defaultProgress();

    const merged: UserProgress = this._stripLegacyFields({
      ...defaultProgress(),
      ...this._getLocalProgress(userId),
      ...partialProgress
    });

    this._setLocalProgress(userId, merged);

    if (this.useFirebase && db) {
      try {
        const docRef = doc(db, 'userProgress', userId);
        await setDoc(
          docRef,
          { ...merged, weightdata: deleteField(), weightData: deleteField() },
          { merge: true }
        );
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

  private _stripLegacyFields(progress: UserProgress): UserProgress {
    // Remove legacy weightData/weightdata fields so we don't keep writing them back.
    const sanitized = { ...progress } as Record<string, unknown>;
    delete sanitized.weightdata;
    delete sanitized.weightData;
    return sanitized as UserProgress;
  }

  private _buildKey(userId: string): string {
    return `${STORAGE_KEY_PREFIX}${userId}`;
  }
}

const userProgressService = new UserProgressService();

export default userProgressService;
