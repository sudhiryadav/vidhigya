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
  maxWidth: 200,
  maxHeight: 200,
  quality: 0.8,
  format: "jpeg",
  maxFileSize: 1024 * 1024, // 1MB
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

    // Check file size first
    if (file.size > opts.maxFileSize) {
      throw new Error(
        `File size ${file.size} bytes exceeds maximum allowed size of ${opts.maxFileSize} bytes`
      );
    }

    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        try {
          // Calculate new dimensions while maintaining aspect ratio
          const { width, height } = this.calculateDimensions(
            img.width,
            img.height,
            opts.maxWidth,
            opts.maxHeight
          );

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
                });

                resolve(optimizedFile);
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
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];

    if (!allowedTypes.includes(file.type)) {
      return "Invalid file type. Please upload a JPEG or PNG image.";
    }

    if (file.size > maxSize) {
      return `File size ${(file.size / 1024 / 1024).toFixed(1)}MB exceeds maximum allowed size of ${(maxSize / 1024 / 1024).toFixed(1)}MB.`;
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
