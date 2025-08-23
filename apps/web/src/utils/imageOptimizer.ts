/**
 * Client-side image optimization utility
 * Resizes and compresses images before uploading to reduce bandwidth and storage
 */

interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "jpeg" | "png" | "webp";
  maxFileSize?: number; // in bytes
}

const defaultOptions: Required<ImageOptimizationOptions> = {
  maxWidth: 400,
  maxHeight: 400,
  quality: 0.8,
  format: "jpeg",
  maxFileSize: 1024 * 1024, // 1MB target, but will compress to meet backend limit
};

export class ImageOptimizer {
  /**
   * Optimize an image file for avatar upload
   */
  static async optimizeImage(
    file: File,
    options: ImageOptimizationOptions = {}
  ): Promise<File> {
    const opts = { ...defaultOptions, ...options };

    // Don't throw error for large files, instead compress them aggressively
    const needsCompression = file.size > opts.maxFileSize;

    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        try {
          // Calculate new dimensions while maintaining aspect ratio
          let { width, height } = this.calculateDimensions(
            img.width,
            img.height,
            opts.maxWidth,
            opts.maxHeight
          );

          // If file is large, be more aggressive with compression
          if (needsCompression) {
            // Reduce dimensions further for large files
            const scale = Math.min(
              0.8,
              Math.sqrt(opts.maxFileSize / file.size)
            );
            width = Math.round(width * scale);
            height = Math.round(height * scale);

            // Also reduce quality for large files
            opts.quality = Math.max(0.6, opts.quality * 0.8);
          }

          // Set canvas dimensions
          canvas.width = width;
          canvas.height = height;

          // Draw and resize image
          ctx?.drawImage(img, 0, 0, width, height);

          // Convert to blob with specified quality
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // Create new file with optimized data
                const optimizedFile = new File([blob], file.name, {
                  type: `image/${opts.format}`,
                  lastModified: Date.now(),
                });

                console.log("Image optimization complete:", {
                  originalSize: file.size,
                  optimizedSize: optimizedFile.size,
                  compressionRatio:
                    (
                      ((file.size - optimizedFile.size) / file.size) *
                      100
                    ).toFixed(1) + "%",
                  dimensions: `${width}x${height}`,
                  quality: opts.quality,
                });

                // If still too large and we're compressing, try recursive compression
                if (optimizedFile.size > opts.maxFileSize && needsCompression) {
                  // Try even more aggressive compression
                  const recursiveOptions = {
                    ...opts,
                    quality: Math.max(0.4, opts.quality * 0.7),
                    maxWidth: Math.round(width * 0.8),
                    maxHeight: Math.round(height * 0.8),
                  };

                  // Convert blob back to file and compress again
                  const recursiveFile = new File([blob], file.name, {
                    type: `image/${opts.format}`,
                    lastModified: Date.now(),
                  });

                  ImageOptimizer.optimizeImage(recursiveFile, recursiveOptions)
                    .then(resolve)
                    .catch(() => resolve(optimizedFile)); // Fallback to current result
                } else {
                  resolve(optimizedFile);
                }
              } else {
                reject(new Error("Failed to create optimized image"));
              }
            },
            `image/${opts.format}`,
            opts.quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      // Load image from file
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Calculate new dimensions while maintaining aspect ratio
   */
  private static calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    let { width, height } = { width: originalWidth, height: originalHeight };

    // Calculate scaling factors
    const scaleX = maxWidth / width;
    const scaleY = maxHeight / height;
    const scale = Math.min(scaleX, scaleY, 1); // Don't upscale

    // Apply scaling
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    return { width, height };
  }

  /**
   * Validate file type and size
   */
  static validateFile(
    file: File,
    maxSize: number = 5 * 1024 * 1024
  ): string | null {
    // Check file type more thoroughly
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    // Check MIME type first
    if (!allowedTypes.includes(file.type)) {
      // Also check file extension as fallback
      const fileName = file.name.toLowerCase();
      const hasValidExtension = [".jpg", ".jpeg", ".png", ".gif", ".webp"].some(
        (ext) => fileName.endsWith(ext)
      );

      if (!hasValidExtension) {
        return "Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.";
      }
    }

    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / 1024 / 1024).toFixed(1);
      const actualSizeMB = (file.size / 1024 / 1024).toFixed(1);
      return `File size ${actualSizeMB}MB exceeds maximum allowed size of ${maxSizeMB}MB.`;
    }

    return null; // No error
  }

  /**
   * Get file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}
