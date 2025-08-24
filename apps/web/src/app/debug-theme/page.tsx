"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { useEffect, useState } from "react";

export default function DebugThemePage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [htmlClasses, setHtmlClasses] = useState<string>("");

  useEffect(() => {
    const updateDebugInfo = () => {
      const root = document.documentElement;
      setHtmlClasses(root.className);
    };

    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 100);
    return () => clearInterval(interval);
  }, [resolvedTheme]);

  const testThemeChange = (newTheme: "light" | "dark" | "system") => {
    console.log("Testing theme change to:", newTheme);
    setTheme(newTheme);
  };

  return (
    <div className="theme-test-bg min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="theme-test-text text-3xl font-bold mb-8">
          Tailwind v4 Theme Debug Page
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Debug Information */}
          <div className="theme-test-card">
            <h2 className="theme-test-text text-xl font-semibold mb-4">
              Current Theme State
            </h2>

            <div className="space-y-4">
              <div>
                <strong className="theme-test-text">Theme Context:</strong>
                <p className="text-muted-foreground">Selected: {theme}</p>
                <p className="text-muted-foreground">
                  Resolved: {resolvedTheme}
                </p>
              </div>

              <div>
                <strong className="theme-test-text">HTML Element:</strong>
                <p className="text-muted-foreground">Classes: {htmlClasses}</p>
              </div>

              <div>
                <strong className="theme-test-text">System Preference:</strong>
                <p className="text-muted-foreground">
                  {window.matchMedia("(prefers-color-scheme: dark)").matches
                    ? "Dark"
                    : "Light"}
                </p>
              </div>
            </div>
          </div>

          {/* Theme Controls */}
          <div className="theme-test-card">
            <h2 className="theme-test-text text-xl font-semibold mb-4">
              Theme Controls
            </h2>

            <div className="space-y-3">
              <button
                onClick={() => testThemeChange("light")}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Set Light Theme
              </button>
              <button
                onClick={() => testThemeChange("dark")}
                className="w-full px-4 py-2 bg-muted text-foreground rounded hover:bg-muted/80 transition-colors"
              >
                Set Dark Theme
              </button>
              <button
                onClick={() => testThemeChange("system")}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Set System Theme
              </button>
            </div>
          </div>
        </div>

        {/* Visual Test */}
        <div className="mt-8 theme-test-card">
          <h2 className="theme-test-text text-xl font-semibold mb-4">
            Visual Theme Test
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded">
              <p className="text-gray-800 dark:text-gray-200 font-medium">
                Background Test
              </p>
              <p className="text-muted-foreground text-sm">
                This should be light gray in light mode, dark gray in dark mode
              </p>
            </div>

            <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded">
              <p className="text-blue-800 dark:text-blue-200 font-medium">
                Blue Test
              </p>
              <p className="text-blue-600 dark:text-blue-400 text-sm">
                This should be light blue in light mode, dark blue in dark mode
              </p>
            </div>

            <div className="p-4 bg-green-100 dark:bg-green-900 rounded">
              <p className="text-green-800 dark:text-green-200 font-medium">
                Green Test
              </p>
              <p className="text-green-600 dark:text-green-400 text-sm">
                This should be light green in light mode, dark green in dark
                mode
              </p>
            </div>
          </div>
        </div>

        {/* Tailwind Classes Test */}
        <div className="mt-8 theme-test-card">
          <h2 className="theme-test-text text-xl font-semibold mb-4">
            Tailwind Classes Test
          </h2>

          <div className="space-y-4">
            <div className="p-4 bg-card border border-border rounded">
              <p className="text-foreground font-medium">Standard Card</p>
              <p className="text-muted-foreground text-sm">
                Using bg-card and text-foreground
              </p>
            </div>

            <div className="p-4 bg-muted border border-border rounded">
              <p className="text-gray-800 dark:text-gray-200 font-medium">
                Alternative Card
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Using bg-muted and text-muted-foreground
              </p>
            </div>
          </div>
        </div>

        {/* Console Log */}
        <div className="mt-8 theme-test-card">
          <h2 className="theme-test-text text-xl font-semibold mb-4">
            Console Log
          </h2>
          <p className="text-muted-foreground text-sm">
            Check the browser console for detailed theme change logs.
          </p>
        </div>
      </div>
    </div>
  );
}
