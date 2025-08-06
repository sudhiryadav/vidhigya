"use client";

import { useToast } from "@/components/ui/ToastContainer";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import DragAndDrop from "./DragAndDrop";

interface DocumentUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  onFilesSelected?: (files: File[]) => void; // New callback for selected files
  maxFiles?: number;
  maxSize?: number;
  accept?: Record<string, string[]>;
  disabled?: boolean;
  className?: string;
  showPreview?: boolean;
  autoUpload?: boolean; // New prop to control auto-upload behavior
}

export default function DocumentUpload({
  onUpload,
  onFilesSelected,
  maxFiles = 5,
  maxSize = parseInt(process.env.NEXT_PUBLIC_MAX_DOCUMENT_SIZE || "20971520"), // 20MB from env
  accept = {
    "application/pdf": [".pdf"],
    "application/msword": [".doc"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      ".docx",
    ],
    "text/plain": [".txt"],
    "image/*": [".jpg", ".jpeg", ".png", ".gif"],
  },
  disabled = false,
  className = "",
  showPreview = false,
  autoUpload = false, // Default to false for manual upload
}: DocumentUploadProps) {
  const { showSuccess, showError } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Notify parent component when files are selected
  useEffect(() => {
    if (onFilesSelected) {
      onFilesSelected(selectedFiles);
    }
  }, [selectedFiles, onFilesSelected]);

  const handleFilesAccepted = async (files: File[]) => {
    if (disabled) return;

    if (autoUpload) {
      // Auto-upload behavior (original)
      try {
        setIsUploading(true);
        await onUpload(files);
        showSuccess(`${files.length} file(s) uploaded successfully`);
      } catch (error) {
        console.error("Upload error:", error);
        showError("Failed to upload files");
      } finally {
        setIsUploading(false);
      }
    } else {
      // Manual upload behavior - just store files
      setSelectedFiles((prev) => [...prev, ...files]);
      // Only show success toast if files were actually added
      if (files.length > 0) {
        showSuccess(`${files.length} file(s) selected`);
      }
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return "🖼️";
    } else if (file.type === "application/pdf") {
      return "📄";
    } else if (file.type.includes("word")) {
      return "📝";
    } else if (file.type === "text/plain") {
      return "📄";
    }
    return "📎";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drag and Drop Upload Area */}
      <DragAndDrop
        onFilesAccepted={handleFilesAccepted}
        accept={accept}
        maxFiles={maxFiles}
        maxSize={maxSize}
        disabled={disabled || isUploading}
        className="w-full"
        showPreview={showPreview}
      >
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Drag & drop documents here
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            or click to browse files
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Supported: PDF, DOC, DOCX, TXT, Images (Max{" "}
            {formatFileSize(maxSize)})
          </p>
        </div>
      </DragAndDrop>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Selected Files
          </h4>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getFileIcon(file)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploading Indicator */}
      {isUploading && (
        <div className="flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-blue-600 dark:text-blue-400">
            Uploading files...
          </span>
        </div>
      )}
    </div>
  );
}
