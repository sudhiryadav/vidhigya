"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import "../../styles/toast.css";
import Toast, { ToastProps } from "./Toast";

interface ToastContextType {
  showToast: (toast: Omit<ToastProps, "id" | "onClose">) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

interface ToastContainerProps {
  children: React.ReactNode;
}

export const ToastContainer = ({ children }: ToastContainerProps) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastProps, "id" | "onClose">) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast: ToastProps = {
        ...toast,
        id,
        onClose: removeToast,
      };
      setToasts((prev) => [...prev, newToast]);
    },
    [removeToast]
  );

  const showSuccess = useCallback(
    (message: string, title?: string) => {
      showToast({ type: "success", message, title });
    },
    [showToast]
  );

  const showError = useCallback(
    (message: string, title?: string) => {
      showToast({ type: "error", message, title });
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string, title?: string) => {
      showToast({ type: "warning", message, title });
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, title?: string) => {
      showToast({ type: "info", message, title });
    },
    [showToast]
  );

  const contextValue: ToastContextType = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
