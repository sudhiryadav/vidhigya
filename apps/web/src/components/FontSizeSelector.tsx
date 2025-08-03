"use client";

import { useFontSize } from "@/contexts/FontSizeContext";
import { Check, Type } from "lucide-react";
import React from "react";

interface FontSizeOption {
  value: "xs" | "sm" | "base" | "lg" | "xl";
  label: string;
  description: string;
  preview: string;
}

const fontSizeOptions: FontSizeOption[] = [
  {
    value: "xs",
    label: "Extra Small",
    description: "Very compact text",
    preview: "Aa",
  },
  {
    value: "sm",
    label: "Small",
    description: "Compact and readable",
    preview: "Aa",
  },
  {
    value: "base",
    label: "Medium",
    description: "Standard size",
    preview: "Aa",
  },
  {
    value: "lg",
    label: "Large",
    description: "Easy to read",
    preview: "Aa",
  },
  {
    value: "xl",
    label: "Extra Large",
    description: "Very easy to read",
    preview: "Aa",
  },
];

export default function FontSizeSelector() {
  const { fontSize, setFontSize } = useFontSize();

  const getPreviewStyle = (size: string) => {
    const sizeMap = {
      xs: "text-xs",
      sm: "text-sm",
      base: "text-base",
      lg: "text-lg",
      xl: "text-xl",
    };
    return sizeMap[size as keyof typeof sizeMap] || "text-base";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Type className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Font Size
        </h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Choose the font size that works best for you. Changes will apply immediately.
      </p>
      
      <div className="grid grid-cols-1 gap-3">
        {fontSizeOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setFontSize(option.value)}
            className={`relative p-4 border rounded-lg transition-all duration-200 ${
              fontSize === option.value
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className={`font-bold text-gray-900 dark:text-white ${getPreviewStyle(
                    option.value
                  )}`}
                >
                  {option.preview}
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {option.label}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {option.description}
                  </div>
                </div>
              </div>
              {fontSize === option.value && (
                <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>
          </button>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <strong>Preview:</strong> This is how text will appear with your selected font size. 
          The change affects all text throughout the application.
        </p>
      </div>
    </div>
  );
} 