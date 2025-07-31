"use client";

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

export default function AdminSettings() {
  const { user } = useAuth();
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

  useEffect(() => {
    loadAdminSettings();
  }, []);

  const loadAdminSettings = async () => {
    try {
      setIsLoading(true);
      // Load admin settings from database
      const dbSettings = (await apiClient.getUserSettings()) as any;
      if (dbSettings) {
        // Map database settings to admin settings structure
        // For now, we'll store admin settings as JSON in a custom field
        // This can be enhanced later with a dedicated admin settings table
        setSettings({
          system: {
            maintenanceMode: dbSettings.maintenanceMode ?? false,
            debugMode: dbSettings.debugMode ?? false,
            autoBackup: dbSettings.autoBackup ?? true,
            dataRetention: dbSettings.dataRetention ?? "90",
          },
          security: {
            sessionTimeout: dbSettings.sessionTimeout ?? "30",
            passwordPolicy: dbSettings.passwordPolicy ?? "strong",
            ipWhitelist: dbSettings.ipWhitelist ?? "",
            auditLogging: dbSettings.auditLogging ?? true,
          },
          notifications: {
            systemAlerts: dbSettings.systemAlerts ?? true,
            userActivity: dbSettings.userActivity ?? false,
            securityEvents: dbSettings.securityEvents ?? true,
            backupNotifications: dbSettings.backupNotifications ?? true,
          },
          integrations: {
            emailProvider: dbSettings.emailProvider ?? "smtp",
            smsProvider: dbSettings.smsProvider ?? "twilio",
            storageProvider: dbSettings.storageProvider ?? "local",
            analyticsEnabled: dbSettings.analyticsEnabled ?? true,
          },
        });
      }
    } catch (error) {
      console.error("Error loading admin settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Save admin settings to database
      await apiClient.updateUserSettings({
        // System settings
        maintenanceMode: settings.system.maintenanceMode,
        debugMode: settings.system.debugMode,
        autoBackup: settings.system.autoBackup,
        dataRetention: settings.system.dataRetention,

        // Security settings
        sessionTimeout: settings.security.sessionTimeout,
        passwordPolicy: settings.security.passwordPolicy,
        ipWhitelist: settings.security.ipWhitelist,
        auditLogging: settings.security.auditLogging,

        // Notification settings
        systemAlerts: settings.notifications.systemAlerts,
        userActivity: settings.notifications.userActivity,
        securityEvents: settings.notifications.securityEvents,
        backupNotifications: settings.notifications.backupNotifications,

        // Integration settings
        emailProvider: settings.integrations.emailProvider,
        smsProvider: settings.integrations.smsProvider,
        storageProvider: settings.integrations.storageProvider,
        analyticsEnabled: settings.integrations.analyticsEnabled,
      });

      toast.success("Admin settings saved successfully!");
    } catch (error) {
      console.error("Error saving admin settings:", error);
      toast.error("Failed to save admin settings");
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            System Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage system-wide settings and configurations
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab("system")}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === "system"
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
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
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <Globe className="w-5 h-5" />
                  <span>Integrations</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              {/* System Tab */}
              {activeTab === "system" && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                    System Configuration
                  </h2>
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        General
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-900 dark:text-white font-medium">
                              Maintenance Mode
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
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
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-900 dark:text-white font-medium">
                              Debug Mode
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
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
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-900 dark:text-white font-medium">
                              Auto Backup
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
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
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Data Management
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
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
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                    Security Settings
                  </h2>
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Authentication
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
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
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="15">15 minutes</option>
                            <option value="30">30 minutes</option>
                            <option value="60">1 hour</option>
                            <option value="120">2 hours</option>
                            <option value="480">8 hours</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
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
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="basic">Basic (8 characters)</option>
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
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Access Control
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
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
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={3}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-900 dark:text-white font-medium">
                              Audit Logging
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
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
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
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
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                    System Notifications
                  </h2>
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Alert Settings
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-900 dark:text-white font-medium">
                              System Alerts
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
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
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-900 dark:text-white font-medium">
                              User Activity
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
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
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-900 dark:text-white font-medium">
                              Security Events
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Security-related notifications
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.notifications.securityEvents}
                              onChange={(e) =>
                                updateNotificationSetting(
                                  "securityEvents",
                                  e.target.checked
                                )
                              }
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-900 dark:text-white font-medium">
                              Backup Notifications
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
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
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
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
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                    Third-Party Integrations
                  </h2>
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Communication
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
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
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="smtp">SMTP</option>
                            <option value="sendgrid">SendGrid</option>
                            <option value="mailgun">Mailgun</option>
                            <option value="aws-ses">AWS SES</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
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
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="twilio">Twilio</option>
                            <option value="aws-sns">AWS SNS</option>
                            <option value="nexmo">Nexmo</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Storage & Analytics
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
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
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="local">Local Storage</option>
                            <option value="aws-s3">AWS S3</option>
                            <option value="google-cloud">
                              Google Cloud Storage
                            </option>
                            <option value="azure">Azure Blob Storage</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-gray-900 dark:text-white font-medium">
                              Analytics
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Enable usage analytics
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.integrations.analyticsEnabled}
                              onChange={(e) =>
                                updateIntegrationSetting(
                                  "analyticsEnabled",
                                  e.target.checked
                                )
                              }
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
