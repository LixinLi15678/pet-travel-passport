/**
 * Image Compression Utility
 * Compresses images to reduce file size before upload
 * Thanks Claude :) - Lixin
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export type CompressionProgressCallback = (current: number, total: number) => void;

/**
 * Compress an image file
 * @param file - Image file to compress
 * @param options - Compression options
 * @returns Compressed image file
 */
export const compressImage = async (file: File, options: CompressionOptions = {}): Promise<File> => {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    mimeType = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        // Create canvas and compress
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, '.jpg'),
                {
                  type: mimeType,
                  lastModified: Date.now()
                }
              );
              resolve(compressedFile);
            } else {
              reject(new Error('Image compression failed'));
            }
          },
          mimeType,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        reject(new Error('Failed to read file result'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Compress multiple images
 * @param files - Array of image files
 * @param options - Compression options
 * @param onProgress - Progress callback
 * @returns Array of compressed files
 */
export const compressImages = async (
  files: File[],
  options: CompressionOptions = {},
  onProgress: CompressionProgressCallback | null = null
): Promise<File[]> => {
  const compressedFiles: File[] = [];

  for (let i = 0; i < files.length; i++) {
    try {
      const compressed = await compressImage(files[i], options);
      compressedFiles.push(compressed);

      if (onProgress) {
        onProgress(i + 1, files.length);
      }
    } catch (error) {
      console.error(`Failed to compress ${files[i].name}:`, error);
      // Use original file if compression fails
      compressedFiles.push(files[i]);
    }
  }

  return compressedFiles;
};

/**
 * Check if file is an image
 * @param file - File to check
 * @returns True if file is an image
 */
export const isImageFile = (file: File): boolean => {
  return Boolean(file && file.type && file.type.startsWith('image/'));
};

/**
 * Get image dimensions
 * @param file - Image file
 * @returns Image dimensions
 */
export const getImageDimensions = (file: File): Promise<ImageDimensions> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height
        });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        reject(new Error('Failed to read file result'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * Calculate compression ratio
 * @param originalSize - Original file size in bytes
 * @param compressedSize - Compressed file size in bytes
 * @returns Compression ratio as percentage
 */
export const getCompressionRatio = (originalSize: number, compressedSize: number): number => {
  return Math.round((1 - compressedSize / originalSize) * 100);
};
