"use client";

import CustomSelect from "@/components/ui/select";

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
      const dbSettings = (await apiClient.getUserSettings()) as Record<
        string,
        unknown
      >;
      if (dbSettings) {
        // Map database settings to admin settings structure
        // For now, we'll store admin settings as JSON in a custom field
        // This can be enhanced later with a dedicated admin settings table
        setSettings({
          system: {
            maintenanceMode: (dbSettings.maintenanceMode as boolean) ?? false,
            debugMode: (dbSettings.debugMode as boolean) ?? false,
            autoBackup: (dbSettings.autoBackup as boolean) ?? true,
            dataRetention: (dbSettings.dataRetention as string) ?? "90",
          },
          security: {
            sessionTimeout: (dbSettings.sessionTimeout as string) ?? "30",
            passwordPolicy: (dbSettings.passwordPolicy as string) ?? "strong",
            ipWhitelist: (dbSettings.ipWhitelist as string) ?? "",
            auditLogging: (dbSettings.auditLogging as boolean) ?? true,
          },
          notifications: {
            systemAlerts: (dbSettings.systemAlerts as boolean) ?? true,
            userActivity: (dbSettings.userActivity as boolean) ?? false,
            securityEvents: (dbSettings.securityEvents as boolean) ?? true,
            backupNotifications:
              (dbSettings.backupNotifications as boolean) ?? true,
          },
          integrations: {
            emailProvider: (dbSettings.emailProvider as string) ?? "smtp",
            smsProvider: (dbSettings.smsProvider as string) ?? "twilio",
            storageProvider: (dbSettings.storageProvider as string) ?? "local",
            analyticsEnabled: (dbSettings.analyticsEnabled as boolean) ?? true,
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
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
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
                          <CustomSelect
                            value={{
                              value: settings.system.dataRetention,
                              label:
                                settings.system.dataRetention === "30"
                                  ? "30 days"
                                  : settings.system.dataRetention === "90"
                                    ? "90 days"
                                    : settings.system.dataRetention === "180"
                                      ? "180 days"
                                      : settings.system.dataRetention === "365"
                                        ? "1 year"
                                        : "2 years",
                            }}
                            onChange={(option) =>
                              updateSystemSetting(
                                "dataRetention",
                                option?.value || "90"
                              )
                            }
                            options={[
                              { value: "30", label: "30 days" },
                              { value: "90", label: "90 days" },
                              { value: "180", label: "180 days" },
                              { value: "365", label: "1 year" },
                              { value: "730", label: "2 years" },
                            ]}
                            placeholder="Select retention period..."
                            className="w-full"
                          />
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
                          <CustomSelect
                            value={{
                              value: settings.security.sessionTimeout,
                              label:
                                settings.security.sessionTimeout === "15"
                                  ? "15 minutes"
                                  : settings.security.sessionTimeout === "30"
                                    ? "30 minutes"
                                    : settings.security.sessionTimeout === "60"
                                      ? "1 hour"
                                      : settings.security.sessionTimeout ===
                                          "120"
                                        ? "2 hours"
                                        : "8 hours",
                            }}
                            onChange={(option) =>
                              updateSecuritySetting(
                                "sessionTimeout",
                                option?.value || "30"
                              )
                            }
                            options={[
                              { value: "15", label: "15 minutes" },
                              { value: "30", label: "30 minutes" },
                              { value: "60", label: "1 hour" },
                              { value: "120", label: "2 hours" },
                              { value: "480", label: "8 hours" },
                            ]}
                            placeholder="Select session timeout..."
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Password Policy
                          </label>
                          <CustomSelect
                            value={{
                              value: settings.security.passwordPolicy,
                              label:
                                settings.security.passwordPolicy === "basic"
                                  ? "Basic (8 characters)"
                                  : settings.security.passwordPolicy ===
                                      "strong"
                                    ? "Strong (12 characters, special chars)"
                                    : "Very Strong (16 characters, complex)",
                            }}
                            onChange={(option) =>
                              updateSecuritySetting(
                                "passwordPolicy",
                                option?.value || "strong"
                              )
                            }
                            options={[
                              { value: "basic", label: "Basic (8 characters)" },
                              {
                                value: "strong",
                                label: "Strong (12 characters, special chars)",
                              },
                              {
                                value: "very-strong",
                                label: "Very Strong (16 characters, complex)",
                              },
                            ]}
                            placeholder="Select password policy..."
                            className="w-full"
                          />
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
                              checked={settings.notifications.securityEvents}
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
                          <CustomSelect
                            value={{
                              value: settings.integrations.emailProvider,
                              label:
                                settings.integrations.emailProvider === "smtp"
                                  ? "SMTP"
                                  : settings.integrations.emailProvider ===
                                      "sendgrid"
                                    ? "SendGrid"
                                    : settings.integrations.emailProvider ===
                                        "mailgun"
                                      ? "Mailgun"
                                      : "AWS SES",
                            }}
                            onChange={(option) =>
                              updateIntegrationSetting(
                                "emailProvider",
                                option?.value || "smtp"
                              )
                            }
                            options={[
                              { value: "smtp", label: "SMTP" },
                              { value: "sendgrid", label: "SendGrid" },
                              { value: "mailgun", label: "Mailgun" },
                              { value: "aws-ses", label: "AWS SES" },
                            ]}
                            placeholder="Select email provider..."
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            SMS Provider
                          </label>
                          <CustomSelect
                            value={{
                              value: settings.integrations.smsProvider,
                              label:
                                settings.integrations.smsProvider === "twilio"
                                  ? "Twilio"
                                  : settings.integrations.smsProvider ===
                                      "aws-sns"
                                    ? "AWS SNS"
                                    : "Nexmo",
                            }}
                            onChange={(option) =>
                              updateIntegrationSetting(
                                "smsProvider",
                                option?.value || "twilio"
                              )
                            }
                            options={[
                              { value: "twilio", label: "Twilio" },
                              { value: "aws-sns", label: "AWS SNS" },
                              { value: "nexmo", label: "Nexmo" },
                            ]}
                            placeholder="Select SMS provider..."
                            className="w-full"
                          />
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
                          <CustomSelect
                            value={{
                              value: settings.integrations.storageProvider,
                              label:
                                settings.integrations.storageProvider ===
                                "local"
                                  ? "Local Storage"
                                  : settings.integrations.storageProvider ===
                                      "aws-s3"
                                    ? "AWS S3"
                                    : settings.integrations.storageProvider ===
                                        "google-cloud"
                                      ? "Google Cloud Storage"
                                      : "Azure Blob Storage",
                            }}
                            onChange={(option) =>
                              updateIntegrationSetting(
                                "storageProvider",
                                option?.value || "local"
                              )
                            }
                            options={[
                              { value: "local", label: "Local Storage" },
                              { value: "aws-s3", label: "AWS S3" },
                              {
                                value: "google-cloud",
                                label: "Google Cloud Storage",
                              },
                              { value: "azure", label: "Azure Blob Storage" },
                            ]}
                            placeholder="Select storage provider..."
                            className="w-full"
                          />
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
                              checked={settings.integrations.analyticsEnabled}
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
