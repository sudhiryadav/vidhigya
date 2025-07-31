"use client";

import { Upload, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import DragAndDrop from "./DragAndDrop";

interface DocumentUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  maxFiles?: number;
  maxSize?: number;
  accept?: Record<string, string[]>;
  disabled?: boolean;
  className?: string;
  showPreview?: boolean;
}

export default function DocumentUpload({
  onUpload,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB default
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
  showPreview = true,
}: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleFilesAccepted = async (files: File[]) => {
    if (disabled) return;

    try {
      setIsUploading(true);
      await onUpload(files);
      setUploadedFiles((prev) => [...prev, ...files]);
      toast.success(`${files.length} file(s) uploaded successfully`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload files");
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
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
        <div className="flex flex-col items-center justify-center space-y-2">
          <Upload className="w-8 h-8 text-gray-400" />
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
        </div>
      </DragAndDrop>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
            Uploaded Files
          </h4>
          <div className="space-y-2">
            {uploadedFiles.map((file, index) => (
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
