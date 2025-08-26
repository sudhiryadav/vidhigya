"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { ChevronDown, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Show loading state if theme is not loaded yet
  if (!theme) {
    return (
      <div className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-muted-foreground rounded-lg border border-border bg-card">
        <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
        <span className="hidden sm:inline">Loading...</span>
      </div>
    );
  }

  const themes = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  const currentTheme = themes.find((t) => t.value === theme);
  const Icon = currentTheme?.icon || Sun;

  console.log("ThemeToggle: Rendering with theme:", {
    theme,
    currentTheme,
    isOpen,
  });

  // Temporarily force dropdown to be open for testing
  const forceOpen = true;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          console.log("ThemeToggle: Button clicked, current isOpen:", isOpen);
          setIsOpen(!isOpen);
        }}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors duration-200 border border-border bg-card"
      >
        <Icon className="w-4 h-4" />
        <span className="hidden sm:inline">{currentTheme?.label}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {(isOpen || forceOpen) && (
        <div className="absolute right-0 bottom-full mb-2 w-48 bg-card rounded-lg shadow-lg border border-border py-1 z-50 backdrop-blur-sm">
          {themes.map((themeOption) => {
            const ThemeIcon = themeOption.icon;
            return (
              <button
                key={themeOption.value}
                onClick={() => {
                  console.log(
                    "ThemeToggle: Theme option clicked:",
                    themeOption.value
                  );
                  setTheme(themeOption.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-2 text-sm hover:bg-muted transition-colors duration-200 ${
                  theme === themeOption.value
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                    : "text-foreground"
                }`}
              >
                <ThemeIcon className="w-4 h-4" />
                <span>{themeOption.label}</span>
                {theme === themeOption.value && (
                  <div className="ml-auto w-2 h-2 bg-blue-600 dark:text-blue-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
