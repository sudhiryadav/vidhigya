"use client";

import { createContext, ReactNode, useContext } from "react";

interface DialogContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return context;
}

interface DialogProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export function Dialog({ children, isOpen, onClose, title }: DialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {title && (
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {title}
            </h3>
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

export function DialogTrigger({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <div onClick={onClick} className="cursor-pointer">
      {children}
    </div>
  );
}

export function DialogContent({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

export function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="mb-4">{children}</div>;
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return <div className="flex justify-end space-x-2 mt-4">{children}</div>;
}

export function DialogTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
      {children}
    </h3>
  );
}

export function DialogDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm text-gray-500 dark:text-gray-400">{children}</p>;
}
