"use client";

import { X } from "lucide-react";
import React, { useEffect, useState } from "react";
import "../../styles/modal.css";
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
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const maxWidthClasses = {
    sm: "modal-sm",
    md: "modal-md",
    lg: "modal-lg",
    xl: "modal-xl",
    "2xl": "modal-2xl",
    "3xl": "modal-3xl",
    "4xl": "modal-4xl",
    "5xl": "modal-5xl",
    "6xl": "modal-6xl",
    "7xl": "modal-7xl",
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
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div
        className={`modal-content ${isVisible ? "show" : "hide"} ${maxWidthClasses[maxWidth as keyof typeof maxWidthClasses]} ${className}`}
        style={{
          maxHeight,
          minHeight: 0,
          width,
        }}
      >
        {/* Header with clear border */}
        {header && (
          <div className="modal-header">
            <div className="modal-header-content">{header}</div>
            <button
              onClick={onClose}
              className="modal-close-button"
              aria-label="Close dialog"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Content (scrollable) with clear separation */}
        <div className="modal-body">{children}</div>

        {/* Footer with clear border */}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
