"use client";

import { Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

interface DragAndDropProps {
  onFilesAccepted: (files: File[]) => void;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  showPreview?: boolean;
  previewClassName?: string;
}

export default function DragAndDrop({
  onFilesAccepted,
  accept = {
    "image/*": [".png", ".jpg", ".jpeg", ".gif"],
  },
  maxFiles = 1,
  maxSize = 5 * 1024 * 1024, // 5MB default
  disabled = false,
  className = "",
  children,
  showPreview = false,
  previewClassName = "",
}: DragAndDropProps) {
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (disabled) return;

      // Create preview URLs for images
      if (showPreview) {
        const urls = acceptedFiles.map((file) => URL.createObjectURL(file));
        setPreviewUrls(urls);
      }

      onFilesAccepted(acceptedFiles);
    },
    [onFilesAccepted, disabled, showPreview]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept,
      maxFiles,
      maxSize,
      disabled,
      onDragEnter: () => setDragActive(true),
      onDragLeave: () => setDragActive(false),
    });

  const clearPreviews = () => {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    setPreviewUrls([]);
  };

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-all duration-200
          ${
            isDragActive && !isDragReject
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : isDragReject
                ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center justify-center space-y-4">
          <Upload
            className={`w-8 h-8 ${
              isDragActive && !isDragReject
                ? "text-blue-500"
                : isDragReject
                  ? "text-red-500"
                  : "text-gray-400"
            }`}
          />

          {children || (
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isDragActive && !isDragReject
                  ? "Drop files here"
                  : isDragReject
                    ? "Invalid file type"
                    : "Drag & drop files here"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                or click to select files
              </p>
            </div>
          )}
        </div>

        {/* Preview Section */}
        {showPreview && previewUrls.length > 0 && (
          <div className={`mt-4 ${previewClassName}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Preview
              </span>
              <button
                type="button"
                onClick={clearPreviews}
                className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative">
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
