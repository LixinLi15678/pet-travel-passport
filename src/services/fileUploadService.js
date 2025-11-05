import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, firebaseAvailable } from '../firebase/config';

/**
 * File Upload Service - Stores files as base64 in Firestore or localStorage
 * No Firebase Storage needed - all files stored as base64 strings
 */

const STORAGE_KEY_PREFIX = 'pet_passport_files_';

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
  async uploadFiles(files, userId, category = 'general', onProgress = null) {
    const filesArray = Array.from(files);
    const uploadPromises = filesArray.map((file, index) =>
      this.uploadSingleFile(file, userId, category, (progress) => {
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
  async uploadSingleFile(file, userId, category, onProgress = null) {
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
      userId
    };

    if (this.useFirebase) {
      try {
        // Store in Firestore
        const fileDocRef = doc(db, 'files', `${userId}_${fileId}`);
        await setDoc(fileDocRef, fileInfo);

        console.log('File stored in Firestore:', fileId);

        // Also cache locally
        this._saveToLocalStorage(userId, fileId, fileInfo);

        return {
          ...fileInfo,
          source: 'firestore'
        };
      } catch (error) {
        console.error('Firestore save error:', error);
        // Fallback to localStorage
        this._saveToLocalStorage(userId, fileId, fileInfo);
        return {
          ...fileInfo,
          source: 'local'
        };
      }
    } else {
      // Use localStorage directly
      this._saveToLocalStorage(userId, fileId, fileInfo);
      return {
        ...fileInfo,
        source: 'local'
      };
    }
  }

  /**
   * Re-upload files (replace existing files)
   * @param {FileList|Array} newFiles - New files to upload
   * @param {Array} existingFiles - Existing file info to replace
   * @param {string} userId - User ID
   * @param {string} category - File category
   * @returns {Promise<Array>} Array of uploaded file info
   */
  async reUploadFiles(newFiles, existingFiles, userId, category) {
    console.log('Re-uploading files, existing count:', existingFiles.length);

    // Delete old files
    await this._deleteFiles(existingFiles, userId);

    // Upload new files
    const newFileInfos = await this.uploadFiles(newFiles, userId, category);

    console.log('Re-upload complete, new count:', newFileInfos.length);
    return newFileInfos;
  }

  /**
   * Delete files
   * @param {Array} fileInfos - Array of file info objects
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async _deleteFiles(fileInfos, userId) {
    const deletePromises = fileInfos.map(async (info) => {
      try {
        if (this.useFirebase && info.source === 'firestore') {
          // Delete from Firestore
          const fileDocRef = doc(db, 'files', `${userId}_${info.id}`);
          await deleteDoc(fileDocRef);
        }

        // Delete from localStorage
        this._deleteFromLocalStorage(userId, info.id);

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
  _saveToLocalStorage(userId, fileId, fileInfo) {
    try {
      const key = `${STORAGE_KEY_PREFIX}${userId}_${fileId}`;
      localStorage.setItem(key, JSON.stringify(fileInfo));
      this.fileCache.set(fileId, fileInfo);
      console.log('File saved to localStorage:', fileId);
    } catch (error) {
      console.error('localStorage save error:', error);
    }
  }

  /**
   * Delete file from localStorage
   * @param {string} userId - User ID
   * @param {string} fileId - File ID
   */
  _deleteFromLocalStorage(userId, fileId) {
    try {
      const key = `${STORAGE_KEY_PREFIX}${userId}_${fileId}`;
      localStorage.removeItem(key);
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
}

export default new FileUploadService();
