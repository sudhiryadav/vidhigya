"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { MaintenanceMode } from "../components/MaintenanceMode";
import { apiClient } from "../services/api";
import { useAuth } from "./AuthContext";

interface SystemSettings {
  system: {
    maintenanceMode: boolean;
    debugMode: boolean;
    autoBackup: boolean;
    dataRetention: string;
  };
  security: {
    sessionTimeout: string;
    passwordPolicy: string;
    ipWhitelist: string;
    auditLogging: boolean;
  };
  notifications: {
    systemAlerts: boolean;
    userActivity: boolean;
    securityEvents: boolean;
    backupNotifications: boolean;
  };
  integrations: {
    emailProvider: string;
    smsProvider: string;
    storageProvider: string;
    analyticsEnabled: boolean;
  };
}

interface SystemSettingsContextType {
  settings: SystemSettings | null;
  loading: boolean;
  error: string | null;
  isMaintenanceMode: boolean;
  sessionTimeout: number;
  refreshSettings: () => Promise<void>;
}

const SystemSettingsContext = createContext<
  SystemSettingsContextType | undefined
>(undefined);

export function SystemSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState(30);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Only load full system settings for super admins
      if (user?.role === "SUPER_ADMIN") {
        const systemSettings = await apiClient.getSystemSettings();
        if (systemSettings && typeof systemSettings === "object") {
          setSettings(systemSettings as SystemSettings);
        }
      }

      // Check maintenance mode (needed for all users)
      const maintenanceStatus = await apiClient.getMaintenanceStatus();
      if (
        maintenanceStatus &&
        typeof maintenanceStatus === "object" &&
        "maintenanceMode" in maintenanceStatus
      ) {
        setIsMaintenanceMode(maintenanceStatus.maintenanceMode as boolean);
      }

      // Get session timeout (needed for all users)
      const timeoutResponse = await apiClient.getSessionTimeout();
      if (
        timeoutResponse &&
        typeof timeoutResponse === "object" &&
        "sessionTimeout" in timeoutResponse
      ) {
        setSessionTimeout(timeoutResponse.sessionTimeout as number);
      }
    } catch (err) {
      console.error("Error loading system settings:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load system settings"
      );

      // Set default values on error
      setIsMaintenanceMode(false);
      setSessionTimeout(30);
    } finally {
      setLoading(false);
    }
  };

  const refreshSettings = async () => {
    await loadSettings();
  };

  useEffect(() => {
    // Only load settings if user is authenticated
    if (user) {
      loadSettings();
    } else {
      setLoading(false);
    }

    // Refresh settings every 5 minutes (only if user is authenticated)
    const interval = setInterval(
      () => {
        if (user) {
          loadSettings();
        }
      },
      5 * 60 * 1000
    );

    return () => clearInterval(interval);
  }, [user]);

  // If in maintenance mode AND user is NOT super admin, show maintenance screen
  if (isMaintenanceMode && user?.role !== "SUPER_ADMIN") {
    return <MaintenanceMode />;
  }

  // If loading, show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">
            Loading system configuration...
          </p>
        </div>
      </div>
    );
  }

  // If error, show error state but allow app to continue
  if (error) {
    console.warn("System settings error:", error);
  }

  const value: SystemSettingsContextType = {
    settings,
    loading,
    error,
    isMaintenanceMode,
    sessionTimeout,
    refreshSettings,
  };

  return (
    <SystemSettingsContext.Provider value={value}>
      {children}
    </SystemSettingsContext.Provider>
  );
}

export function useSystemSettings() {
  const context = useContext(SystemSettingsContext);
  if (context === undefined) {
    throw new Error(
      "useSystemSettings must be used within a SystemSettingsProvider"
    );
  }
  return context;
}
