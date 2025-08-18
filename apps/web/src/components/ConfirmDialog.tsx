"use client";

import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import ModalDialog from "./ui/ModalDialog";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning",
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getIconColor = () => {
    switch (type) {
      case "danger":
        return "text-red-600 dark:text-red-400";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      case "info":
        return "text-blue-600 dark:text-blue-400";
      default:
        return "text-yellow-600 dark:text-yellow-400";
    }
  };

  const getConfirmButtonColor = () => {
    switch (type) {
      case "danger":
        return "bg-red-600 hover:bg-red-700 focus:ring-red-500";
      case "warning":
        return "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500";
      case "info":
        return "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500";
      default:
        return "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500";
    }
  };

  const header = (
    <div className="flex items-center space-x-3">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted">
        <ExclamationTriangleIcon
          className={`h-6 w-6 ${getIconColor()}`}
          aria-hidden="true"
        />
      </div>
      <div>
        <h3 className="text-base font-semibold leading-6 text-foreground">
          {title}
        </h3>
      </div>
    </div>
  );

  const footer = (
    <div className="flex flex-col sm:flex-row-reverse gap-3">
      <button
        type="button"
        className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 sm:w-auto ${getConfirmButtonColor()}`}
        onClick={handleConfirm}
      >
        {confirmText}
      </button>
      <button
        type="button"
        className="inline-flex w-full justify-center rounded-md bg-background px-3 py-2 text-sm font-semibold text-foreground shadow-sm ring-1 ring-inset ring-border hover:bg-muted focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-auto"
        onClick={onClose}
      >
        {cancelText}
      </button>
    </div>
  );

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      header={header}
      footer={footer}
      maxWidth="lg"
      closeOnEscape={true}
      closeOnOverlayClick={true}
    >
      {/* Content is now in the header, so this can be empty or used for additional content */}
      {message}
    </ModalDialog>
  );
}
