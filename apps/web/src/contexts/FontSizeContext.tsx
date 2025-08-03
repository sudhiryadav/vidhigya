"use client";

import { useSettings } from "@/contexts/SettingsContext";
import React, { createContext, useContext, useEffect } from "react";

interface FontSizeContextType {
  fontSize: string;
  setFontSize: (size: "xs" | "sm" | "base" | "lg" | "xl") => Promise<void>;
}

const FontSizeContext = createContext<FontSizeContextType | undefined>(
  undefined
);

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const { getSetting, updateSettings } = useSettings();

  const fontSize = getSetting("fontSize") || "sm";

  const setFontSize = async (size: "xs" | "sm" | "base" | "lg" | "xl") => {
    try {
      await updateSettings({ fontSize: size });
    } catch (error) {
      console.error("Error updating font size:", error);
    }
  };

  useEffect(() => {
    // Apply font size to document
    const root = document.documentElement;
    root.setAttribute("data-font-size", fontSize);
  }, [fontSize]);

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export function useFontSize() {
  const context = useContext(FontSizeContext);
  if (context === undefined) {
    throw new Error("useFontSize must be used within a FontSizeProvider");
  }
  return context;
} 