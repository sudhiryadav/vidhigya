"use client";

import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import React, { createContext, useContext, useEffect, useState } from "react";

interface UserSettings {
  // Notification settings
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  caseUpdates: boolean;
  billingAlerts: boolean;
  calendarReminders: boolean;

  // Privacy settings
  profileVisibility: string;
  dataSharing: boolean;
  twoFactorAuth: boolean;

  // Preference settings
  language: string;
  timezone: string;
  dateFormat: string;
  theme: string;
  currency: string;

  // Admin settings
  maintenanceMode?: boolean;
  debugMode?: boolean;
  autoBackup?: boolean;
  dataRetention?: string;
  sessionTimeout?: string;
  passwordPolicy?: string;
  ipWhitelist?: string;
  auditLogging?: boolean;
  systemAlerts?: boolean;
  userActivity?: boolean;
  securityEvents?: boolean;
  backupNotifications?: boolean;
  emailProvider?: string;
  smsProvider?: string;
  storageProvider?: string;
  analyticsEnabled?: boolean;
}

interface SettingsContextType {
  settings: UserSettings | null;
  loading: boolean;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
  getSetting: <K extends keyof UserSettings>(key: K) => UserSettings[K] | null;
}

const defaultSettings: UserSettings = {
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
  caseUpdates: true,
  billingAlerts: true,
  calendarReminders: true,
  profileVisibility: "public",
  dataSharing: true,
  twoFactorAuth: false,
  language: "en",
  timezone: "UTC",
  dateFormat: "MM/DD/YYYY",
  theme: "system",
  currency: "INR",
};

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  const loadSettings = async () => {
    if (!isAuthenticated) {
      setSettings(defaultSettings);
      setLoading(false);
      return;
    }

    // Prevent multiple simultaneous calls
    if (loading) return;

    try {
      setLoading(true);
      const userSettings = (await apiClient.getUserSettings()) as any;
      if (userSettings) {
        setSettings({ ...defaultSettings, ...userSettings });
      } else {
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    if (!isAuthenticated) {
      throw new Error("User not authenticated");
    }
    try {
      await apiClient.updateUserSettings(newSettings);
      setSettings((prev) => (prev ? { ...prev, ...newSettings } : null));
    } catch (error) {
      console.error("Error updating settings:", error);
      throw error;
    }
  };

  const refreshSettings = async () => {
    await loadSettings();
  };

  const getSetting = <K extends keyof UserSettings>(
    key: K
  ): UserSettings[K] | null => {
    return settings ? settings[key] : null;
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadSettings();
    } else {
      // Reset settings when user logs out
      setSettings(null);
      setLoading(false);
    }
  }, [isAuthenticated]); // Add isAuthenticated to dependency array

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        updateSettings,
        refreshSettings,
        getSetting,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
