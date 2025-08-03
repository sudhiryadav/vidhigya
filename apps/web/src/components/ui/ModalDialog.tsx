"use client";

import { X } from "lucide-react";
import React, { useEffect } from "react";

interface ModalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  maxHeight?: string | number;
  width?: string;
  maxWidth?: string;
  className?: string;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
}

export default function ModalDialog({
  isOpen,
  onClose,
  header,
  footer,
  children,
  maxHeight = "90vh",
  width = "auto",
  maxWidth = "2xl",
  className = "",
  closeOnEscape = false,
  closeOnOverlayClick = false,
}: ModalDialogProps) {
  if (!isOpen) {
    return null;
  }

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl",
  };

  // Handle ESC key press
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEscape) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, closeOnEscape, onClose]);

  // Handle overlay click
  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleOverlayClick}
    >
      <div
        className={`flex flex-col rounded-lg bg-white dark:bg-gray-800 shadow-xl mx-4 ${maxWidthClasses[maxWidth as keyof typeof maxWidthClasses]} w-full ${className}`}
        style={{
          maxHeight,
          minHeight: 0,
          width,
        }}
      >
        {/* Header with clear border */}
        {header && (
          <div className="flex items-center justify-between border-b-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-6 py-4 rounded-t-lg">
            <div className="flex-1 text-xl font-semibold text-gray-900 dark:text-white">
              {header}
            </div>
            <button
              onClick={onClose}
              className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full p-1"
              aria-label="Close dialog"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Content (scrollable) with clear separation */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-800">
          {children}
        </div>

        {/* Footer with clear border */}
        {footer && (
          <div className="flex justify-end border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-6 py-4 rounded-b-lg">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
