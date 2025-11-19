import { doc, setDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db, firebaseAvailable } from '../firebase/config';
import { FileInfo, FileValidationOptions, FileValidationResult, ProgressCallback, FileProgressCallback } from '../types';

/**
 * File Upload Service - Stores files as base64 in Firestore or localStorage
 * No Firebase Storage needed - all files stored as base64 strings
 */

const STORAGE_KEY_PREFIX = 'pet_passport_files_';
const LOCAL_STORAGE_MAX_BYTES = 1024 * 1024; // keep cached payloads under ~1MB
const DEFAULT_PET_ID = 'pet_default';

const normalizePetId = (petId: string | null | undefined): string | null =>
  (petId && petId !== DEFAULT_PET_ID ? petId : null);

class FileUploadService {
  private useFirebase: boolean;
  private fileCache: Map<string, FileInfo>;

  constructor() {
    this.useFirebase = firebaseAvailable;
    this.fileCache = new Map(); // In-memory cache for uploaded files
  }

  private _requirePetId(petId: string | null | undefined): string {
    const normalized = normalizePetId(petId);
    if (!normalized) {
      throw new Error('A valid petId is required before uploading files.');
    }
    return normalized;
  }

  /**
   * Upload multiple files
   * @param files - Files to upload
   * @param userId - User ID
   * @param category - File category (e.g., 'vaccination', 'measurement')
   * @param petId - Pet ID
   * @param onProgress - Progress callback (optional)
   * @returns Array of uploaded file info
   */
  async uploadFiles(
    files: FileList | File[],
    userId: string,
    category: string = 'general',
    petId: string | null = null,
    onProgress: FileProgressCallback | null = null
  ): Promise<FileInfo[]> {
    const filesArray = Array.from(files);
    const targetPetId = this._requirePetId(petId);
    const uploadPromises = filesArray.map((file, index) =>
      this.uploadSingleFile(file, userId, category, targetPetId, (progress) => {
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
   * @param file - File to upload
   * @param userId - User ID
   * @param category - File category
   * @param petId - Pet ID
   * @param onProgress - Progress callback (optional)
   * @returns Uploaded file info
   */
  async uploadSingleFile(
    file: File,
    userId: string,
    category: string,
    petId: string | null = null,
    onProgress: ProgressCallback | null = null
  ): Promise<FileInfo> {
    const targetPetId = this._requirePetId(petId);
    const fileId = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    // Convert file to base64
    const base64Data = await this._fileToBase64(file, onProgress);

    const fileInfo: FileInfo = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      category,
      data: base64Data, // base64 string
      uploadedAt: new Date().toISOString(),
      userId,
      petId: targetPetId
    };

    if (this.useFirebase && db) {
      try {
        // Store in Firestore
        const fileDocRef = doc(db, 'files', `${userId}_${fileId}`);
        await setDoc(fileDocRef, fileInfo);

        console.log('File stored in Firestore:', fileId);

        // Also cache locally
        const storedInfo: FileInfo = {
          ...fileInfo,
          source: 'firestore'
        };
        this._saveToLocalStorage(userId, targetPetId, fileId, storedInfo);

        return storedInfo;
      } catch (error) {
        console.error('Firestore save error:', error);
        // Fallback to localStorage
        const storedInfo: FileInfo = {
          ...fileInfo,
          source: 'local'
        };
        this._saveToLocalStorage(userId, targetPetId, fileId, storedInfo);
        return storedInfo;
      }
    } else {
      // Use localStorage directly
      const storedInfo: FileInfo = {
        ...fileInfo,
        source: 'local'
      };
      this._saveToLocalStorage(userId, targetPetId, fileId, storedInfo);
      return storedInfo;
    }
  }

  /**
   * Load all non-expired files for a user
   * @param userId - User ID
   * @param petId - Optional pet ID filter
   * @returns File info array
   */
  async loadFiles(userId: string, petId: string | null = null): Promise<FileInfo[]> {
    if (!userId) return [];

    const filesMap = new Map<string, FileInfo>();

    const localFiles = this._getLocalFiles(userId, petId);
    localFiles.forEach((file) => {
      filesMap.set(file.id, { ...file, source: file.source || 'local' });
    });

    if (this.useFirebase && db) {
      try {
        const filesQuery = query(collection(db, 'files'), where('userId', '==', userId));
        const snapshot = await getDocs(filesQuery);
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as FileInfo;
          if (petId && data.petId !== petId) {
            return;
          }
          const remoteFile: FileInfo = { ...data, source: 'firestore' };
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
   * @param newFiles - New files to upload
   * @param existingFiles - Existing file info to replace
   * @param userId - User ID
   * @param category - File category
   * @param petId - Pet ID
   * @returns Array of uploaded file info
   */
  async reUploadFiles(
    newFiles: FileList | File[],
    existingFiles: FileInfo[],
    userId: string,
    category: string,
    petId: string | null = null
  ): Promise<FileInfo[]> {
    console.log('Re-uploading files, existing count:', existingFiles.length);

    // Delete old files
    await this.deleteFiles(existingFiles, userId);

    // Upload new files
    const targetPetId = this._requirePetId(petId);
    const newFileInfos = await this.uploadFiles(newFiles, userId, category, targetPetId);

    console.log('Re-upload complete, new count:', newFileInfos.length);
    return newFileInfos;
  }

  /**
   * Delete files
   * @param fileInfos - Array of file info objects
   * @param userId - User ID
   */
  async deleteFiles(fileInfos: FileInfo[], userId: string): Promise<void> {
    const deletePromises = fileInfos.map(async (info) => {
      try {
        if (this.useFirebase && db && info.source !== 'local') {
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
   * @param file - File to convert
   * @param onProgress - Progress callback
   * @returns Base64 string
   */
  private _fileToBase64(file: File, onProgress: ProgressCallback | null): Promise<string> {
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
        resolve(reader.result as string); // base64 string with data URL prefix
      };

      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Save file info to localStorage
   * @param userId - User ID
   * @param petId - Pet ID
   * @param fileId - File ID
   * @param fileInfo - File information
   */
  private _saveToLocalStorage(userId: string, petId: string, fileId: string, fileInfo: FileInfo): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const key = this._buildStorageKey(userId, petId || DEFAULT_PET_ID, fileId);
    const shouldStoreData = typeof fileInfo.size !== 'number' || fileInfo.size <= LOCAL_STORAGE_MAX_BYTES;
    const payload = shouldStoreData
      ? fileInfo
      : {
          ...fileInfo,
          data: '',
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
   * @param userId - User ID
   * @param petId - Pet ID
   * @param fileId - File ID
   */
  private _deleteFromLocalStorage(userId: string, petId: string, fileId: string): void {
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
   * @param file - File to validate
   * @param options - Validation options
   * @returns Validation result
   */
  validateFile(file: File, options: FileValidationOptions = {}): FileValidationResult {
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
   * @param fileId - File ID
   * @returns File info or null
   */
  getCachedFile(fileId: string): FileInfo | null {
    return this.fileCache.get(fileId) || null;
  }

  /**
   * Clear file cache
   */
  clearCache(): void {
    this.fileCache.clear();
    console.log('File cache cleared');
  }

  private _isQuotaExceededError(error: any): boolean {
    if (!error) return false;
    return (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.code === 22 ||
      error.code === 1014
    );
  }

  private _evictOldLocalEntries(entriesToRemove: number = 3): number {
    if (typeof localStorage === 'undefined') {
      return 0;
    }

    const keys: string[] = [];

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
          const value = JSON.parse(localStorage.getItem(key) || '{}');
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

  private _getLocalFiles(userId: string, petId: string | null = null): FileInfo[] {
    if (typeof localStorage === 'undefined' || !userId) {
      return [];
    }

    const userPrefix = this._buildStoragePrefix(userId);
    const petPrefix = petId ? this._buildStoragePrefix(userId, petId) : null;
    const files: FileInfo[] = [];

    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(userPrefix)) {
        if (petPrefix && !key.startsWith(petPrefix)) {
          continue;
        }
        try {
          const value = JSON.parse(localStorage.getItem(key) || '{}') as FileInfo;
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

  private _buildStorageKey(userId: string, petId: string, fileId: string): string {
    return `${this._buildStoragePrefix(userId, petId)}${fileId}`;
  }

  private _buildStoragePrefix(userId: string, petId: string | null = null): string {
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
