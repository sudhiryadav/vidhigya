"use client";

import { AlertTriangle, CheckCircle, Info, X, XCircle } from "lucide-react";
import React, { useEffect, useState } from "react";
import "../../styles/toast.css";

export interface ToastProps {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 4000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Show toast with animation
    const showTimer = setTimeout(() => setIsVisible(true), 100);

    // Auto-hide timer
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300); // Wait for exit animation
    }, duration);

    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(progressInterval);
          return 0;
        }
        return prev - 100 / (duration / 50); // Update every 50ms
      });
    }, 50);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearInterval(progressInterval);
    };
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-4 h-4" />;
      case "error":
        return <XCircle className="w-4 h-4" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4" />;
      case "info":
        return <Info className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300);
  };

  return (
    <div
      className={`toast toast-${type} ${isVisible ? "show" : "hide"}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="toast-icon">{getIcon()}</div>

      <div className="toast-content">
        {title && <div className="toast-title">{title}</div>}
        <div className="toast-message">{message}</div>
      </div>

      <button
        className="toast-close"
        onClick={handleClose}
        aria-label="Close notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="toast-progress" style={{ width: `${progress}%` }} />
    </div>
  );
};

export default Toast;
