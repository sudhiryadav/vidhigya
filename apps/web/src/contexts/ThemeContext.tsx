"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");

  const applyTheme = (themeToApply: "light" | "dark") => {
    const root = document.documentElement;

    // Remove all existing theme classes and attributes
    root.classList.remove("light", "dark");
    root.removeAttribute("data-theme");

    // Apply new theme
    root.setAttribute("data-theme", themeToApply);

    // For Tailwind v4, we also add the dark class for compatibility
    if (themeToApply === "dark") {
      root.classList.add("dark");
    }

    // Force CSS recalculation
    root.style.display = "none";
    root.offsetHeight; // Trigger reflow
    root.style.display = "";

    // Force multiple re-renders
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("storage"));
    document.dispatchEvent(new Event("themechange"));

    // Additional force re-render
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 10);

    console.log(
      "Direct theme applied:",
      themeToApply,
      "data-theme:",
      root.getAttribute("data-theme")
    );
  };

  useEffect(() => {
    // Load theme from localStorage on mount
    const savedTheme = localStorage.getItem("theme") as Theme;
    if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
      setTheme(savedTheme);
    } else {
      // Set initial theme to system if none saved
      setTheme("system");
    }

    // Apply theme immediately on mount to prevent flash
    const initialTheme = savedTheme || "system";
    let themeToApply: "light" | "dark";

    if (initialTheme === "system") {
      themeToApply = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    } else {
      themeToApply = initialTheme as "light" | "dark";
    }

    applyTheme(themeToApply);
    setResolvedTheme(themeToApply);
    console.log("Initial theme applied:", themeToApply);
  }, []);

  useEffect(() => {
    // Save theme to localStorage
    localStorage.setItem("theme", theme);
    console.log("Theme changed to:", theme);

    let themeToApply: "light" | "dark";

    if (theme === "system") {
      themeToApply = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      setResolvedTheme(themeToApply);
    } else {
      themeToApply = theme as "light" | "dark";
      setResolvedTheme(themeToApply);
    }

    applyTheme(themeToApply);
    console.log("Theme applied:", themeToApply);
  }, [theme]);

  useEffect(() => {
    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      if (theme === "system") {
        const systemTheme = mediaQuery.matches ? "dark" : "light";
        setResolvedTheme(systemTheme);
        applyTheme(systemTheme);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
