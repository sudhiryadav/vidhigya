"use client";

import { useAuth } from "@/contexts/AuthContext";
import { ImageOptimizer } from "@/utils/imageOptimizer";
import { X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import DragAndDrop from "./DragAndDrop";
import ProfilePicture from "./ProfilePicture";

interface ProfilePictureUploadProps {
  currentAvatar?: string | null;
  name: string;
  onUpload: (file: File) => Promise<void>;
  onRemove?: () => Promise<void>; // New prop for handling avatar removal
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

  const handleFilesAccepted = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    try {
      // Validate file using ImageOptimizer
      const validationError = ImageOptimizer.validateFile(
        file,
        parseInt(process.env.NEXT_PUBLIC_MAX_AVATAR_SIZE || "5242880") // 5MB from env
      );
      if (validationError) {
        toast.error(validationError);
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
      };
      reader.readAsDataURL(optimizedFile);

      // Upload optimized file
      await handleUpload(optimizedFile);
    } catch (error) {
      toast.dismiss("image-optimization");
      console.error("Image optimization error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to process image"
      );
    }
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      await onUpload(file);
      toast.success("Profile picture updated successfully");
    } catch (error) {
      toast.error("Failed to update profile picture");
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
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {showUploadArea && (
          <div className="text-center">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              Profile Picture
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Upload a new profile picture. Supported formats: JPG, PNG, GIF
              (Max 5MB)
            </p>

            {/* Drag and Drop Upload Area */}
            <DragAndDrop
              onFilesAccepted={handleFilesAccepted}
              accept={{
                "image/*": [".png", ".jpg", ".jpeg", ".gif"],
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

            {/* Uploading Indicator */}
            {isUploading && (
              <div className="flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg mt-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
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
