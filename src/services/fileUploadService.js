import { doc, setDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db, firebaseAvailable } from '../firebase/config';

/**
 * File Upload Service - Stores files as base64 in Firestore or localStorage
 * No Firebase Storage needed - all files stored as base64 strings
 */

const STORAGE_KEY_PREFIX = 'pet_passport_files_';
const LOCAL_STORAGE_MAX_BYTES = 1024 * 1024; // keep cached payloads under ~1MB
const DEFAULT_PET_ID = 'pet_default';

class FileUploadService {
  constructor() {
    this.useFirebase = firebaseAvailable;
    this.fileCache = new Map(); // In-memory cache for uploaded files
  }

  /**
   * Upload multiple files
   * @param {FileList|Array} files - Files to upload
   * @param {string} userId - User ID
   * @param {string} category - File category (e.g., 'vaccination', 'measurement')
   * @param {Function} onProgress - Progress callback (optional)
   * @returns {Promise<Array>} Array of uploaded file info
   */
  async uploadFiles(files, userId, category = 'general', petId = DEFAULT_PET_ID, onProgress = null) {
    const filesArray = Array.from(files);
    const uploadPromises = filesArray.map((file, index) =>
      this.uploadSingleFile(file, userId, category, petId, (progress) => {
        if (onProgress) {
          onProgress(index, progress);
        }
      })
    );

    try {
      const results = await Promise.all(uploadPromises);
      console.log(`Uploaded ${results.length} files successfully`);
      return results;
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  }

  /**
   * Upload a single file as base64
   * @param {File} file - File to upload
   * @param {string} userId - User ID
   * @param {string} category - File category
   * @param {Function} onProgress - Progress callback (optional)
   * @returns {Promise<object>} Uploaded file info
   */
  async uploadSingleFile(file, userId, category, petId = DEFAULT_PET_ID, onProgress = null) {
    const fileId = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    // Convert file to base64
    const base64Data = await this._fileToBase64(file, onProgress);

    const fileInfo = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      category,
      data: base64Data, // base64 string
      uploadedAt: new Date().toISOString(),
      userId,
      petId
    };

    if (this.useFirebase) {
      try {
        // Store in Firestore
        const fileDocRef = doc(db, 'files', `${userId}_${fileId}`);
        await setDoc(fileDocRef, fileInfo);

        console.log('File stored in Firestore:', fileId);

        // Also cache locally
        const storedInfo = {
          ...fileInfo,
          source: 'firestore'
        };
        this._saveToLocalStorage(userId, petId, fileId, storedInfo);

        return storedInfo;
      } catch (error) {
        console.error('Firestore save error:', error);
        // Fallback to localStorage
        const storedInfo = {
          ...fileInfo,
          source: 'local'
        };
        this._saveToLocalStorage(userId, petId, fileId, storedInfo);
        return storedInfo;
      }
    } else {
      // Use localStorage directly
      const storedInfo = {
        ...fileInfo,
        source: 'local'
      };
      this._saveToLocalStorage(userId, petId, fileId, storedInfo);
      return storedInfo;
    }
  }

  /**
   * Load all non-expired files for a user
   * @param {string} userId
   * @returns {Promise<Array>} File info array
   */
  async loadFiles(userId, petId = null) {
    if (!userId) return [];

    const filesMap = new Map();

    const localFiles = this._getLocalFiles(userId, petId);
    localFiles.forEach((file) => {
      filesMap.set(file.id, { ...file, source: file.source || 'local' });
    });

    if (this.useFirebase) {
      try {
        const filesQuery = query(collection(db, 'files'), where('userId', '==', userId));
        const snapshot = await getDocs(filesQuery);
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (petId && data.petId !== petId) {
            return;
          }
          const remoteFile = { ...data, source: 'firestore' };
          filesMap.set(remoteFile.id, remoteFile);
          this._saveToLocalStorage(
            userId,
            remoteFile.petId || DEFAULT_PET_ID,
            remoteFile.id,
            remoteFile
          );
        });
      } catch (error) {
        console.error('Failed to load files from Firestore:', error);
      }
    }

    const files = Array.from(filesMap.values()).filter((file) =>
      petId ? file.petId === petId : true
    );
    files.sort((a, b) => {
      const aTime = new Date(a.uploadedAt || 0).getTime();
      const bTime = new Date(b.uploadedAt || 0).getTime();
      return aTime - bTime;
    });

    return files;
  }

  /**
   * Re-upload files (replace existing files)
   * @param {FileList|Array} newFiles - New files to upload
   * @param {Array} existingFiles - Existing file info to replace
   * @param {string} userId - User ID
   * @param {string} category - File category
   * @returns {Promise<Array>} Array of uploaded file info
   */
  async reUploadFiles(newFiles, existingFiles, userId, category, petId = DEFAULT_PET_ID) {
    console.log('Re-uploading files, existing count:', existingFiles.length);

    // Delete old files
    await this.deleteFiles(existingFiles, userId);

    // Upload new files
    const newFileInfos = await this.uploadFiles(newFiles, userId, category, petId);

    console.log('Re-upload complete, new count:', newFileInfos.length);
    return newFileInfos;
  }

  /**
   * Delete files
   * @param {Array} fileInfos - Array of file info objects
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async deleteFiles(fileInfos, userId) {
    const deletePromises = fileInfos.map(async (info) => {
      try {
        if (this.useFirebase && info.source !== 'local') {
          // Delete from Firestore
          const fileDocRef = doc(db, 'files', `${userId}_${info.id}`);
          await deleteDoc(fileDocRef);
        }

        // Delete from localStorage
        this._deleteFromLocalStorage(userId, info.petId, info.id);

        // Clear cache
        this.fileCache.delete(info.id);

        console.log('Deleted file:', info.id);
      } catch (error) {
        console.error('Error deleting file:', info.id, error);
      }
    });

    await Promise.all(deletePromises);
  }

  /**
   * Convert file to base64
   * @param {File} file - File to convert
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<string>} Base64 string
   */
  _fileToBase64(file, onProgress) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadstart = () => {
        if (onProgress) onProgress(0);
      };

      reader.onprogress = (event) => {
        if (onProgress && event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      };

      reader.onload = () => {
        if (onProgress) onProgress(100);
        resolve(reader.result); // base64 string with data URL prefix
      };

      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Save file info to localStorage
   * @param {string} userId - User ID
   * @param {string} fileId - File ID
   * @param {object} fileInfo - File information
   */
  _saveToLocalStorage(userId, petId, fileId, fileInfo) {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const key = this._buildStorageKey(userId, petId || DEFAULT_PET_ID, fileId);
    const shouldStoreData = typeof fileInfo.size !== 'number' || fileInfo.size <= LOCAL_STORAGE_MAX_BYTES;
    const payload = shouldStoreData
      ? fileInfo
      : {
          ...fileInfo,
          data: null,
          dataStoredLocally: false
        };

    if (!shouldStoreData) {
      console.warn(
        `File ${fileId} (${fileInfo.size} bytes) skipped data caching; exceeds ${LOCAL_STORAGE_MAX_BYTES} byte limit`
      );
    }

    const serialized = JSON.stringify(payload);

    try {
      localStorage.setItem(key, serialized);
      this.fileCache.set(fileId, fileInfo);
      console.log('File saved to localStorage:', fileId);
      return;
    } catch (error) {
      if (this._isQuotaExceededError(error)) {
        console.warn('localStorage quota exceeded, attempting eviction before caching:', fileId);
        const evicted = this._evictOldLocalEntries();
        if (evicted > 0) {
          try {
            localStorage.setItem(key, serialized);
            this.fileCache.set(fileId, fileInfo);
            console.log('File saved to localStorage after eviction:', fileId);
            return;
          } catch (secondError) {
            if (!this._isQuotaExceededError(secondError)) {
              console.error('localStorage save error after eviction:', secondError);
            }
          }
        }
        console.warn('localStorage quota still exceeded, skipping cache for:', fileId);
      } else {
        console.error('localStorage save error:', error);
      }
    }

    try {
      localStorage.removeItem(key);
    } catch (cleanupError) {
      console.error('Failed to cleanup localStorage key:', cleanupError);
    }
  }

  /**
   * Delete file from localStorage
   * @param {string} userId - User ID
   * @param {string} fileId - File ID
   */
  _deleteFromLocalStorage(userId, petId, fileId) {
    try {
      const key = this._buildStorageKey(userId, petId || DEFAULT_PET_ID, fileId);
      localStorage.removeItem(key);
      if (fileId) {
        this.fileCache.delete(fileId);
      }
    } catch (error) {
      console.error('localStorage delete error:', error);
    }
  }

  /**
   * Validate file before upload
   * @param {File} file - File to validate
   * @param {object} options - Validation options
   * @returns {object} Validation result
   */
  validateFile(file, options = {}) {
    const {
      maxSize = 5 * 1024 * 1024, // 5MB default (reduced from 10MB for base64 storage)
      allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    } = options;

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit`
      };
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not allowed`
      };
    }

    return { valid: true };
  }

  /**
   * Get cached file info
   * @param {string} fileId - File ID
   * @returns {object|null} File info or null
   */
  getCachedFile(fileId) {
    return this.fileCache.get(fileId) || null;
  }

  /**
   * Clear file cache
   */
  clearCache() {
    this.fileCache.clear();
    console.log('File cache cleared');
  }

  _isQuotaExceededError(error) {
    if (!error) return false;
    return (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.code === 22 ||
      error.code === 1014
    );
  }

  _evictOldLocalEntries(entriesToRemove = 3) {
    if (typeof localStorage === 'undefined') {
      return 0;
    }

    const keys = [];

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        keys.push(key);
      }
    }

    if (keys.length === 0) {
      return 0;
    }

    const entries = keys
      .map((key) => {
        try {
          const value = JSON.parse(localStorage.getItem(key));
          return {
            key,
            uploadedAt: value?.uploadedAt || null
          };
        } catch (error) {
          return { key, uploadedAt: null };
        }
      })
      .sort((a, b) => {
        const aTime = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
        const bTime = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
        return aTime - bTime;
      });

    let removed = 0;
    for (const entry of entries) {
      localStorage.removeItem(entry.key);
      removed += 1;
      if (removed >= entriesToRemove) {
        break;
      }
    }

    if (removed > 0) {
      console.warn(`Evicted ${removed} cached file(s) from localStorage to free space`);
    }

    return removed;
  }

  _getLocalFiles(userId, petId = null) {
    if (typeof localStorage === 'undefined' || !userId) {
      return [];
    }

    const userPrefix = this._buildStoragePrefix(userId);
    const petPrefix = petId ? this._buildStoragePrefix(userId, petId) : null;
    const files = [];

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(userPrefix)) {
        if (petPrefix && !key.startsWith(petPrefix)) {
          continue;
        }
        try {
          const value = JSON.parse(localStorage.getItem(key));
          if (value) {
            if (value.id) {
              this.fileCache.set(value.id, value);
            }
            files.push(value);
          }
        } catch (error) {
          console.error('Failed to parse cached file:', key, error);
        }
      }
    }

    return files;
  }

  _buildStorageKey(userId, petId, fileId) {
    return `${this._buildStoragePrefix(userId, petId)}${fileId}`;
  }

  _buildStoragePrefix(userId, petId = null) {
    const base = `${STORAGE_KEY_PREFIX}${userId}_`;
    if (!petId) {
      return base;
    }
    return `${base}${petId}_`;
  }
}

const fileUploadService = new FileUploadService();

export { DEFAULT_PET_ID };
export default fileUploadService;
