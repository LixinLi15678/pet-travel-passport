import {
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db, firebaseAvailable } from '../firebase/config';

/**
 * Data Service - Handles data persistence with Firebase Firestore
 * Falls back to localStorage when Firebase is unavailable
 */

const STORAGE_KEY_PREFIX = 'pet_passport_';

class DataService {
  constructor() {
    this.useFirebase = firebaseAvailable;
  }

  /**
   * Save user data to Firestore or localStorage
   * @param {string} userId - User ID
   * @param {object} data - Data to save
   * @returns {Promise<boolean>} Success status
   */
  async saveUserData(userId, data) {
    const dataWithTimestamp = {
      ...data,
      updatedAt: new Date().toISOString(),
      userId
    };

    if (this.useFirebase) {
      try {
        const userDocRef = doc(db, 'users', userId);
        await setDoc(userDocRef, dataWithTimestamp, { merge: true });
        console.log('Data saved to Firestore');

        // Also save to localStorage as backup
        this._saveToLocalStorage(userId, dataWithTimestamp);
        return true;
      } catch (error) {
        console.error('Firestore save error:', error);
        // Fallback to localStorage
        return this._saveToLocalStorage(userId, dataWithTimestamp);
      }
    } else {
      // Use localStorage directly
      return this._saveToLocalStorage(userId, dataWithTimestamp);
    }
  }

  /**
   * Load user data from Firestore or localStorage
   * @param {string} userId - User ID
   * @returns {Promise<object|null>} User data or null
   */
  async loadUserData(userId) {
    if (this.useFirebase) {
      try {
        const userDocRef = doc(db, 'users', userId);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          console.log('Data loaded from Firestore');
          const data = docSnap.data();
          // Backup to localStorage
          this._saveToLocalStorage(userId, data);
          return data;
        } else {
          console.log('No data in Firestore, checking localStorage');
          return this._loadFromLocalStorage(userId);
        }
      } catch (error) {
        console.error('Firestore load error:', error);
        // Fallback to localStorage
        return this._loadFromLocalStorage(userId);
      }
    } else {
      // Use localStorage directly
      return this._loadFromLocalStorage(userId);
    }
  }

  /**
   * Save pet data for a specific user
   * @param {string} userId - User ID
   * @param {string} petId - Pet ID
   * @param {object} petData - Pet data to save
   * @returns {Promise<boolean>} Success status
   */
  async savePetData(userId, petId, petData) {
    const petDataWithTimestamp = {
      ...petData,
      petId,
      userId,
      updatedAt: new Date().toISOString()
    };

    if (this.useFirebase) {
      try {
        const petDocRef = doc(db, 'users', userId, 'pets', petId);
        await setDoc(petDocRef, petDataWithTimestamp, { merge: true });
        console.log('Pet data saved to Firestore');

        // Also save to localStorage
        this._savePetToLocalStorage(userId, petId, petDataWithTimestamp);
        return true;
      } catch (error) {
        console.error('Firestore pet save error:', error);
        return this._savePetToLocalStorage(userId, petId, petDataWithTimestamp);
      }
    } else {
      return this._savePetToLocalStorage(userId, petId, petDataWithTimestamp);
    }
  }

  /**
   * Load pet data for a specific user
   * @param {string} userId - User ID
   * @param {string} petId - Pet ID
   * @returns {Promise<object|null>} Pet data or null
   */
  async loadPetData(userId, petId) {
    if (this.useFirebase) {
      try {
        const petDocRef = doc(db, 'users', userId, 'pets', petId);
        const docSnap = await getDoc(petDocRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          this._savePetToLocalStorage(userId, petId, data);
          return data;
        } else {
          return this._loadPetFromLocalStorage(userId, petId);
        }
      } catch (error) {
        console.error('Firestore pet load error:', error);
        return this._loadPetFromLocalStorage(userId, petId);
      }
    } else {
      return this._loadPetFromLocalStorage(userId, petId);
    }
  }

  // Private methods for localStorage operations
  _saveToLocalStorage(userId, data) {
    try {
      const key = `${STORAGE_KEY_PREFIX}user_${userId}`;
      localStorage.setItem(key, JSON.stringify(data));
      console.log('Data saved to localStorage');
      return true;
    } catch (error) {
      console.error('localStorage save error:', error);
      return false;
    }
  }

  _loadFromLocalStorage(userId) {
    try {
      const key = `${STORAGE_KEY_PREFIX}user_${userId}`;
      const data = localStorage.getItem(key);
      if (data) {
        console.log('Data loaded from localStorage');
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('localStorage load error:', error);
      return null;
    }
  }

  _savePetToLocalStorage(userId, petId, data) {
    try {
      const key = `${STORAGE_KEY_PREFIX}user_${userId}_pet_${petId}`;
      localStorage.setItem(key, JSON.stringify(data));
      console.log('Pet data saved to localStorage');
      return true;
    } catch (error) {
      console.error('localStorage pet save error:', error);
      return false;
    }
  }

  _loadPetFromLocalStorage(userId, petId) {
    try {
      const key = `${STORAGE_KEY_PREFIX}user_${userId}_pet_${petId}`;
      const data = localStorage.getItem(key);
      if (data) {
        console.log('Pet data loaded from localStorage');
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('localStorage pet load error:', error);
      return null;
    }
  }

  /**
   * Clear all local storage data (useful for testing)
   */
  clearLocalData() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log('Local storage cleared');
  }
}

const dataService = new DataService();

export default dataService;
