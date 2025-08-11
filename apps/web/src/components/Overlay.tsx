"use client";

import { Loader2 } from "lucide-react";
import React from "react";

interface OverlayProps {
  isVisible: boolean;
  title?: string;
  message?: string;
  showSpinner?: boolean;
  absolute?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export default function Overlay({
  isVisible,
  title = "Loading...",
  message,
  showSpinner = true,
  absolute = false,
  className = "",
  children,
}: OverlayProps) {
  if (!isVisible) return null;

  const baseClasses =
    "bg-black bg-opacity-50 flex items-center justify-center z-50";
  const positionClasses = absolute ? "absolute inset-0" : "fixed inset-0";
  const containerClasses = `${baseClasses} ${positionClasses} ${className}`;

  return (
    <div className={containerClasses}>
      <div className="bg-card rounded-lg shadow-xl p-8 flex flex-col items-center">
        {showSpinner && (
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
        )}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        {message && (
          <p className="text-gray-500 dark:text-gray-400 text-center">
            {message}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
