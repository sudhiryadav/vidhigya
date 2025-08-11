"use client";

import { useAuth } from "@/contexts/AuthContext";
import { ImageOptimizer } from "@/utils/imageOptimizer";
import { useState } from "react";
import toast from "react-hot-toast";
import DragAndDrop from "./DragAndDrop";
import ProfilePicture from "./ProfilePicture";

interface ProfilePictureUploadProps {
  currentAvatar?: string | null;
  name?: string;
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showUploadArea?: boolean;
  showRemoveButton?: boolean;
}

export default function ProfilePictureUpload({
  currentAvatar,
  name,
  onUpload,
  onRemove,
  size = "lg",
  className = "",
  showUploadArea = true,
  showRemoveButton = true,
}: ProfilePictureUploadProps) {
  const { updateAvatar } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFilesAccepted = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    // Clear previous errors and preview
    setValidationError(null);
    setUploadError(null);
    setPreviewUrl(null);

    try {
      console.log("Profile picture upload started:", {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      });

      // Validate file using ImageOptimizer
      const validationError = ImageOptimizer.validateFile(
        file,
        parseInt(process.env.NEXT_PUBLIC_MAX_AVATAR_SIZE || "5242880") // 5MB from env
      );
      if (validationError) {
        console.error("File validation failed:", validationError);
        setValidationError(validationError);
        return;
      }

      // Show optimization progress
      toast.loading("Optimizing image...", { id: "image-optimization" });

      // Optimize the image
      const optimizedFile = await ImageOptimizer.optimizeImage(file, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.8,
        format: "jpeg",
        maxFileSize: 1024 * 1024, // 1MB
      });

      console.log("Image optimization complete:", {
        originalSize: file.size,
        optimizedSize: optimizedFile.size,
      });

      // Dismiss loading toast
      toast.dismiss("image-optimization");

      // Show optimization results
      const originalSize = ImageOptimizer.formatFileSize(file.size);
      const optimizedSize = ImageOptimizer.formatFileSize(optimizedFile.size);
      toast.success(`Image optimized: ${originalSize} → ${optimizedSize}`);

      // Create preview and base64 for auth context
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64data = e.target?.result as string;
        setPreviewUrl(base64data);
        // Update auth context immediately with the new avatar
        updateAvatar(base64data);
        console.log("Avatar preview updated in auth context");
      };
      reader.readAsDataURL(optimizedFile);

      // Upload optimized file
      console.log("Starting file upload to backend...");
      await handleUpload(optimizedFile);
    } catch (error) {
      toast.dismiss("image-optimization");
      console.error("Image optimization error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to process image";
      setUploadError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      console.log("Calling onUpload with file:", {
        fileName: file.name,
        fileSize: file.size,
      });
      await onUpload(file);
      console.log("Upload successful");
      toast.success("Profile picture updated successfully");
    } catch (error) {
      console.error("Upload failed:", error);
      const errorMessage = "Failed to update profile picture";
      setUploadError(errorMessage);
      toast.error(errorMessage);
      setPreviewUrl(null);
      // Remove avatar from auth context on error
      updateAvatar("");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = async () => {
    try {
      if (onRemove) {
        await onRemove();
        toast.success("Profile picture removed successfully");
      }
      setPreviewUrl(null);
      setValidationError(null);
      setUploadError(null);
      // Remove avatar from auth context
      updateAvatar("");
    } catch (error) {
      console.error("Error removing avatar:", error);
      toast.error("Failed to remove profile picture");
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "w-16 h-16";
      case "md":
        return "w-20 h-20";
      case "xl":
        return "w-32 h-32";
      default:
        return "w-24 h-24";
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Profile Picture Display */}
      <div className="flex flex-col items-center space-y-4">
        <div className="relative group">
          <ProfilePicture
            src={previewUrl || currentAvatar}
            name={name}
            size={size}
            className="mx-auto"
          />

          {/* Remove Button (if has image and showRemoveButton is true) */}
          {showRemoveButton && (previewUrl || currentAvatar) && (
            <button
              onClick={handleRemove}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>

        {showUploadArea && (
          <div className="text-center">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              Profile Picture
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              Upload a new profile picture
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Supported formats:
              </span>{" "}
              JPG, PNG, GIF, WebP
              <br />
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Max size:
              </span>{" "}
              5MB
            </p>

            {/* Drag and Drop Upload Area */}
            <DragAndDrop
              onFilesAccepted={handleFilesAccepted}
              accept={{
                "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
              }}
              maxFiles={1}
              maxSize={5 * 1024 * 1024} // 5MB
              disabled={isUploading}
              className="w-full max-w-xs mx-auto"
              showPreview={false}
            >
              <div className="text-center p-6">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Drag & drop your image here
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  or click to browse files
                </p>
              </div>
            </DragAndDrop>

            {/* File Info Display */}
            {previewUrl && (
              <div className="mt-3 p-3 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg transition-all duration-200 ease-in-out hover:bg-green-200 dark:hover:bg-green-900/30">
                <div className="flex items-center space-x-2">
                  <div className="flex-shrink-0 w-4 h-4">
                    <svg
                      className="w-4 h-4 text-green-600 dark:text-green-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Image Selected
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Your image has been processed and is ready for upload
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Messages */}
            {(validationError || uploadError) && (
              <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg">
                {validationError && (
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0 w-4 h-4 mt-0.5">
                      <svg
                        className="w-4 h-4 text-red-600 dark:text-red-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        File Validation Error
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        {validationError}
                      </p>
                      <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                        <p>
                          💡 <strong>Tip:</strong> Make sure your file is:
                        </p>
                        <ul className="list-disc list-inside mt-1 ml-2">
                          <li>A valid image file (JPG, PNG, GIF, or WebP)</li>
                          <li>Under 5MB in size</li>
                          <li>Not corrupted or damaged</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {uploadError && (
                  <div className="flex items-start space-x-2 mt-2">
                    <div className="flex-shrink-0 w-4 h-4 mt-0.5">
                      <svg
                        className="w-4 h-4 text-red-600 dark:text-red-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        Upload Error
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        {uploadError}
                      </p>
                      <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                        <p>
                          💡 <strong>Tip:</strong> Try:
                        </p>
                        <ul className="list-disc list-inside mt-1 ml-2">
                          <li>Checking your internet connection</li>
                          <li>Using a different image file</li>
                          <li>Refreshing the page and trying again</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Clear Errors Button */}
                <div className="mt-3 pt-3 border-t border-red-300 dark:border-red-700">
                  <button
                    onClick={() => {
                      setValidationError(null);
                      setUploadError(null);
                    }}
                    className="text-xs text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-200 hover:bg-red-200 dark:hover:bg-red-800/30 underline px-2 py-1 rounded transition-all duration-200 ease-in-out"
                  >
                    Clear errors and try again
                  </button>
                </div>
              </div>
            )}

            {/* Uploading Indicator */}
            {isUploading && (
              <div className="flex items-center justify-center p-4 bg-blue-100 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg mt-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 dark:border-blue-400"></div>
                <span className="ml-2 text-sm text-blue-800 dark:text-blue-300 font-medium">
                  Uploading...
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
