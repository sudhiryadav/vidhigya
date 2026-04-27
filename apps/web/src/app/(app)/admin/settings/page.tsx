"use client";

import LoadingOverlay from "@/components/LoadingOverlay";

import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import { Bell, Globe, Save, Settings, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface AdminSettings {
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

interface PracticeSubscriptionSettings {
  plan: "SOLO" | "FIRM_STARTER" | "FIRM_GROWTH" | "FIRM_SCALE";
  seatLimit: number;
  activeMembers: number;
  availableSeats: number;
}

export default function AdminSettings() {
  const { user: currentUser } = useAuth();
  const [settings, setSettings] = useState<AdminSettings>({
    system: {
      maintenanceMode: false,
      debugMode: false,
      autoBackup: true,
      dataRetention: "90",
    },
    security: {
      sessionTimeout: "30",
      passwordPolicy: "strong",
      ipWhitelist: "",
      auditLogging: true,
    },
    notifications: {
      systemAlerts: true,
      userActivity: false,
      securityEvents: true,
      backupNotifications: true,
    },
    integrations: {
      emailProvider: "smtp",
      smsProvider: "twilio",
      storageProvider: "local",
      analyticsEnabled: true,
    },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("system");
  const [subscriptionSettings, setSubscriptionSettings] =
    useState<PracticeSubscriptionSettings>({
      plan: "FIRM_STARTER",
      seatLimit: 5,
      activeMembers: 0,
      availableSeats: 5,
    });
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);
  const hasPracticeSubscriptionAccess =
    currentUser?.role === "ADMIN" || currentUser?.role === "LAWYER";

  useEffect(() => {
    loadAdminSettings();
    if (hasPracticeSubscriptionAccess) {
      loadPracticeSubscriptionSettings();
    }
  }, [hasPracticeSubscriptionAccess]);

  const loadAdminSettings = async () => {
    try {
      setIsLoading(true);
      // Load admin settings from the system settings API
      const dbSettings = await apiClient.getSystemSettings();
      if (dbSettings && typeof dbSettings === "object") {
        // Cast the response to AdminSettings type
        setSettings(dbSettings as AdminSettings);
      } else {
        console.warn("No system settings returned from API, using defaults");
      }
    } catch (error) {
      console.error("Error loading admin settings:", error);
      toast.error("Failed to load system settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Prepare updates for system settings
      const updates = [
        // System settings
        {
          key: "maintenanceMode",
          value: settings.system.maintenanceMode.toString(),
        },
        { key: "debugMode", value: settings.system.debugMode.toString() },
        { key: "autoBackup", value: settings.system.autoBackup.toString() },
        { key: "dataRetention", value: settings.system.dataRetention },

        // Security settings
        { key: "sessionTimeout", value: settings.security.sessionTimeout },
        { key: "passwordPolicy", value: settings.security.passwordPolicy },
        { key: "ipWhitelist", value: settings.security.ipWhitelist },
        {
          key: "auditLogging",
          value: settings.security.auditLogging.toString(),
        },

        // Notification settings
        {
          key: "systemAlerts",
          value: settings.notifications.systemAlerts.toString(),
        },
        {
          key: "userActivity",
          value: settings.notifications.userActivity.toString(),
        },
        {
          key: "securityEvents",
          value: settings.notifications.securityEvents.toString(),
        },
        {
          key: "backupNotifications",
          value: settings.notifications.backupNotifications.toString(),
        },

        // Integration settings
        { key: "emailProvider", value: settings.integrations.emailProvider },
        { key: "smsProvider", value: settings.integrations.smsProvider },
        {
          key: "storageProvider",
          value: settings.integrations.storageProvider,
        },
        {
          key: "analyticsEnabled",
          value: settings.integrations.analyticsEnabled.toString(),
        },
      ];

      // Save admin settings to the system settings API
      await apiClient.updateMultipleSystemSettings(updates);

      toast.success("System settings saved successfully!");
    } catch (error) {
      console.error("Error saving admin settings:", error);
      toast.error("Failed to save system settings");
    } finally {
      setIsSaving(false);
    }
  };

  const loadPracticeSubscriptionSettings = async () => {
    try {
      setIsSubscriptionLoading(true);
      const response = (await apiClient.getPracticeSubscriptionSettings()) as
        | PracticeSubscriptionSettings
        | null;
      if (response && typeof response === "object") {
        setSubscriptionSettings(response);
      }
    } catch (error) {
      // This page can be visited by users who do not own a practice.
    } finally {
      setIsSubscriptionLoading(false);
    }
  };

  const handleSaveSubscription = async () => {
    try {
      if (!hasPracticeSubscriptionAccess) {
        return;
      }

      setIsSaving(true);

      await apiClient.updatePracticeSubscriptionSettings({
        plan: subscriptionSettings.plan,
        seatLimit: Number(subscriptionSettings.seatLimit),
      });

      await loadPracticeSubscriptionSettings();
      toast.success("Subscription settings updated successfully!");
    } catch (error) {
      console.error("Error updating subscription settings:", error);
      toast.error("Failed to update subscription settings");
    } finally {
      setIsSaving(false);
    }
  };

  const updateSystemSetting = (
    key: keyof AdminSettings["system"],
    value: boolean | string
  ) => {
    setSettings((prev) => ({
      ...prev,
      system: {
        ...prev.system,
        [key]: value,
      },
    }));
  };

  const updateSecuritySetting = (
    key: keyof AdminSettings["security"],
    value: boolean | string
  ) => {
    setSettings((prev) => ({
      ...prev,
      security: {
        ...prev.security,
        [key]: value,
      },
    }));
  };

  const updateNotificationSetting = (
    key: keyof AdminSettings["notifications"],
    value: boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value,
      },
    }));
  };

  const updateIntegrationSetting = (
    key: keyof AdminSettings["integrations"],
    value: boolean | string
  ) => {
    setSettings((prev) => ({
      ...prev,
      integrations: {
        ...prev.integrations,
        [key]: value,
      },
    }));
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <LoadingOverlay
        isVisible={isLoading}
        title="Loading Settings"
        message="Please wait while we fetch your system settings..."
        absolute={false}
      />

      {!isLoading && (
        <>
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                System Settings
              </h1>
              <p className="text-muted-foreground">
                Manage system-wide settings and configurations
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-card rounded-lg shadow-sm border border-border p-4">
                  <nav className="space-y-2">
                    <button
                      onClick={() => setActiveTab("system")}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === "system"
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Settings className="w-5 h-5" />
                      <span>System</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("security")}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === "security"
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Shield className="w-5 h-5" />
                      <span>Security</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("notifications")}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === "notifications"
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Bell className="w-5 h-5" />
                      <span>Notifications</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("integrations")}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === "integrations"
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Globe className="w-5 h-5" />
                      <span>Integrations</span>
                    </button>
                    {hasPracticeSubscriptionAccess && (
                      <button
                        onClick={() => setActiveTab("subscription")}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                          activeTab === "subscription"
                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <Settings className="w-5 h-5" />
                        <span>Subscription</span>
                      </button>
                    )}
                  </nav>
                </div>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-3">
                <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                  {/* System Tab */}
                  {activeTab === "system" && (
                    <div>
                      <h2 className="text-xl font-semibold text-foreground mb-6">
                        System Configuration
                      </h2>
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium text-foreground">
                            General
                          </h3>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-foreground font-medium">
                                  Maintenance Mode
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Put the system in maintenance mode
                                </p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={settings.system.maintenanceMode}
                                  onChange={(e) =>
                                    updateSystemSetting(
                                      "maintenanceMode",
                                      e.target.checked
                                    )
                                  }
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-foreground font-medium">
                                  Debug Mode
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Enable debug logging
                                </p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={settings.system.debugMode}
                                  onChange={(e) =>
                                    updateSystemSetting(
                                      "debugMode",
                                      e.target.checked
                                    )
                                  }
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-foreground font-medium">
                                  Auto Backup
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Automatically backup data
                                </p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={settings.system.autoBackup}
                                  onChange={(e) =>
                                    updateSystemSetting(
                                      "autoBackup",
                                      e.target.checked
                                    )
                                  }
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-lg font-medium text-foreground">
                            Data Management
                          </h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">
                                Data Retention (days)
                              </label>
                              <select
                                value={settings.system.dataRetention}
                                onChange={(e) =>
                                  updateSystemSetting(
                                    "dataRetention",
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                              >
                                <option value="30">30 days</option>
                                <option value="90">90 days</option>
                                <option value="180">180 days</option>
                                <option value="365">1 year</option>
                                <option value="730">2 years</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Security Tab */}
                  {activeTab === "security" && (
                    <div>
                      <h2 className="text-xl font-semibold text-foreground mb-6">
                        Security Settings
                      </h2>
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium text-foreground">
                            Authentication
                          </h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">
                                Session Timeout (minutes)
                              </label>
                              <select
                                value={settings.security.sessionTimeout}
                                onChange={(e) =>
                                  updateSecuritySetting(
                                    "sessionTimeout",
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                              >
                                <option value="15">15 minutes</option>
                                <option value="30">30 minutes</option>
                                <option value="60">1 hour</option>
                                <option value="120">2 hours</option>
                                <option value="480">8 hours</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">
                                Password Policy
                              </label>
                              <select
                                value={settings.security.passwordPolicy}
                                onChange={(e) =>
                                  updateSecuritySetting(
                                    "passwordPolicy",
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                              >
                                <option value="basic">
                                  Basic (8 characters)
                                </option>
                                <option value="strong">
                                  Strong (12 characters, special chars)
                                </option>
                                <option value="very-strong">
                                  Very Strong (16 characters, complex)
                                </option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-lg font-medium text-foreground">
                            Access Control
                          </h3>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">
                                IP Whitelist
                              </label>
                              <textarea
                                value={settings.security.ipWhitelist}
                                onChange={(e) =>
                                  updateSecuritySetting(
                                    "ipWhitelist",
                                    e.target.value
                                  )
                                }
                                placeholder="Enter IP addresses (one per line)"
                                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={3}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-foreground font-medium">
                                  Audit Logging
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Log all system activities
                                </p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={settings.security.auditLogging}
                                  onChange={(e) =>
                                    updateSecuritySetting(
                                      "auditLogging",
                                      e.target.checked
                                    )
                                  }
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notifications Tab */}
                  {activeTab === "notifications" && (
                    <div>
                      <h2 className="text-xl font-semibold text-foreground mb-6">
                        System Notifications
                      </h2>
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium text-foreground">
                            Alert Settings
                          </h3>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-foreground font-medium">
                                  System Alerts
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Critical system notifications
                                </p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={settings.notifications.systemAlerts}
                                  onChange={(e) =>
                                    updateNotificationSetting(
                                      "systemAlerts",
                                      e.target.checked
                                    )
                                  }
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-foreground font-medium">
                                  User Activity
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Monitor user actions
                                </p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={settings.notifications.userActivity}
                                  onChange={(e) =>
                                    updateNotificationSetting(
                                      "userActivity",
                                      e.target.checked
                                    )
                                  }
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-foreground font-medium">
                                  Security Events
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Security-related notifications
                                </p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={
                                    settings.notifications.securityEvents
                                  }
                                  onChange={(e) =>
                                    updateNotificationSetting(
                                      "securityEvents",
                                      e.target.checked
                                    )
                                  }
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-foreground font-medium">
                                  Backup Notifications
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Backup status updates
                                </p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={
                                    settings.notifications.backupNotifications
                                  }
                                  onChange={(e) =>
                                    updateNotificationSetting(
                                      "backupNotifications",
                                      e.target.checked
                                    )
                                  }
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Integrations Tab */}
                  {activeTab === "integrations" && (
                    <div>
                      <h2 className="text-xl font-semibold text-foreground mb-6">
                        Third-Party Integrations
                      </h2>
                      <div className="space-y-6">
                        <div className="space-y-4">
                          <h3 className="text-lg font-medium text-foreground">
                            Communication
                          </h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">
                                Email Provider
                              </label>
                              <select
                                value={settings.integrations.emailProvider}
                                onChange={(e) =>
                                  updateIntegrationSetting(
                                    "emailProvider",
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                              >
                                <option value="smtp">SMTP</option>
                                <option value="sendgrid">SendGrid</option>
                                <option value="mailgun">Mailgun</option>
                                <option value="aws-ses">AWS SES</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">
                                SMS Provider
                              </label>
                              <select
                                value={settings.integrations.smsProvider}
                                onChange={(e) =>
                                  updateIntegrationSetting(
                                    "smsProvider",
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                              >
                                <option value="twilio">Twilio</option>
                                <option value="aws-sns">AWS SNS</option>
                                <option value="nexmo">Nexmo</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-lg font-medium text-foreground">
                            Storage & Analytics
                          </h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-2">
                                Storage Provider
                              </label>
                              <select
                                value={settings.integrations.storageProvider}
                                onChange={(e) =>
                                  updateIntegrationSetting(
                                    "storageProvider",
                                    e.target.value
                                  )
                                }
                                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                              >
                                <option value="local">Local Storage</option>
                                <option value="aws-s3">AWS S3</option>
                                <option value="google-cloud">
                                  Google Cloud Storage
                                </option>
                                <option value="azure">
                                  Azure Blob Storage
                                </option>
                              </select>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-foreground font-medium">
                                  Analytics
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Enable usage analytics
                                </p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={
                                    settings.integrations.analyticsEnabled
                                  }
                                  onChange={(e) =>
                                    updateIntegrationSetting(
                                      "analyticsEnabled",
                                      e.target.checked
                                    )
                                  }
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Subscription Tab */}
                  {activeTab === "subscription" &&
                    hasPracticeSubscriptionAccess && (
                    <div>
                      <h2 className="text-xl font-semibold text-foreground mb-6">
                        Practice Subscription
                      </h2>
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Plan
                          </label>
                          <select
                            value={subscriptionSettings.plan}
                            onChange={(e) =>
                              setSubscriptionSettings((prev) => ({
                                ...prev,
                                plan: e.target.value as PracticeSubscriptionSettings["plan"],
                              }))
                            }
                            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                            disabled={isSubscriptionLoading}
                          >
                            <option value="SOLO">Solo</option>
                            <option value="FIRM_STARTER">Firm Starter</option>
                            <option value="FIRM_GROWTH">Firm Growth</option>
                            <option value="FIRM_SCALE">Firm Scale</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Seat Limit
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={subscriptionSettings.seatLimit}
                            onChange={(e) =>
                              setSubscriptionSettings((prev) => ({
                                ...prev,
                                seatLimit: Number(e.target.value || 1),
                              }))
                            }
                            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                            disabled={isSubscriptionLoading}
                          />
                        </div>

                        <div className="rounded-lg border border-border p-4 bg-muted/30">
                          <p className="text-sm text-foreground">
                            Active Members:{" "}
                            <strong>{subscriptionSettings.activeMembers}</strong>
                          </p>
                          <p className="text-sm text-foreground">
                            Available Seats:{" "}
                            <strong>{subscriptionSettings.availableSeats}</strong>
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Seat limits are enforced whenever practice admins add
                            new users.
                          </p>
                        </div>

                        <div className="flex justify-end">
                          <button
                            onClick={handleSaveSubscription}
                            disabled={isSaving || isSubscriptionLoading}
                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Save className="w-4 h-4" />
                            <span>Save Subscription</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Save Button */}
                  {activeTab !== "subscription" && (
                    <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Save Changes</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
