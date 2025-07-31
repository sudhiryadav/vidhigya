"use client";

import { useSettings } from "@/contexts/SettingsContext";
import { useEffect } from "react";

export function useSettingsEffect() {
  const { settings } = useSettings();

  useEffect(() => {
    if (!settings) return;

    // Apply theme settings
    applyThemeSettings(settings.theme);

    // Apply language settings
    applyLanguageSettings(settings.language);

    // Apply currency settings
    applyCurrencySettings(settings.currency);

    // Apply notification settings
    applyNotificationSettings(settings);

    // Apply privacy settings
    applyPrivacySettings(settings);
  }, [settings]);
}

function applyThemeSettings(theme: string) {
  const root = document.documentElement;

  // Remove existing theme classes
  root.classList.remove("light", "dark");

  if (theme === "system") {
    // Check system preference
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
      .matches
      ? "dark"
      : "light";
    root.classList.add(systemTheme);
  } else {
    root.classList.add(theme);
  }

  // Store in localStorage for persistence
  localStorage.setItem("theme", theme);
}

function applyLanguageSettings(language: string) {
  // Set document language
  document.documentElement.lang = language;

  // Store in localStorage
  localStorage.setItem("language", language);

  // You can add more language-specific logic here
  //比如加载语言包、更新文本等
}

function applyCurrencySettings(currency: string) {
  // Store currency preference
  localStorage.setItem("currency", currency);

  // Update any currency displays on the page
  updateCurrencyDisplays(currency);
}

function updateCurrencyDisplays(currency: string) {
  // Find all elements with currency data attributes and update them
  const currencyElements = document.querySelectorAll("[data-currency]");

  currencyElements.forEach((element) => {
    const amount = element.getAttribute("data-amount");
    if (amount) {
      const formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: currency,
      }).format(parseFloat(amount));

      element.textContent = formatted;
    }
  });
}

function applyNotificationSettings(settings: any) {
  // Store notification preferences
  localStorage.setItem(
    "notifications",
    JSON.stringify({
      email: settings.emailNotifications,
      push: settings.pushNotifications,
      sms: settings.smsNotifications,
      caseUpdates: settings.caseUpdates,
      billingAlerts: settings.billingAlerts,
      calendarReminders: settings.calendarReminders,
    })
  );

  // Update notification bell visibility
  updateNotificationVisibility(settings.pushNotifications);
}

function updateNotificationVisibility(enabled: boolean) {
  const notificationBell = document.querySelector("[data-notification-bell]");
  if (notificationBell) {
    if (enabled) {
      notificationBell.classList.remove("hidden");
    } else {
      notificationBell.classList.add("hidden");
    }
  }
}

function applyPrivacySettings(settings: any) {
  // Store privacy preferences
  localStorage.setItem(
    "privacy",
    JSON.stringify({
      profileVisibility: settings.profileVisibility,
      dataSharing: settings.dataSharing,
      twoFactorAuth: settings.twoFactorAuth,
    })
  );

  // Apply profile visibility
  updateProfileVisibility(settings.profileVisibility);

  // Apply data sharing settings
  updateDataSharing(settings.dataSharing);
}

function updateProfileVisibility(visibility: string) {
  // Update profile visibility based on setting
  const profileElements = document.querySelectorAll(
    "[data-profile-visibility]"
  );

  profileElements.forEach((element) => {
    const elementVisibility = element.getAttribute("data-profile-visibility");
    if (elementVisibility === visibility || visibility === "public") {
      element.classList.remove("hidden");
    } else {
      element.classList.add("hidden");
    }
  });
}

function updateDataSharing(enabled: boolean) {
  // Update data sharing UI elements
  const dataSharingElements = document.querySelectorAll("[data-sharing]");

  dataSharingElements.forEach((element) => {
    if (enabled) {
      element.classList.remove("disabled");
      element.removeAttribute("disabled");
    } else {
      element.classList.add("disabled");
      element.setAttribute("disabled", "true");
    }
  });
}
