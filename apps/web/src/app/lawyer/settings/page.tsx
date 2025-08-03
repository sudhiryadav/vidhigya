"use client";

import FontSizeSelector from "@/components/FontSizeSelector";
import ProfilePictureUpload from "@/components/ProfilePictureUpload";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import { Bell, Save, Settings, Shield, User } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function LawyerSettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(false);

  // Profile settings
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [caseUpdates, setCaseUpdates] = useState(true);
  const [billingAlerts, setBillingAlerts] = useState(true);
  const [calendarReminders, setCalendarReminders] = useState(true);

  // Privacy settings
  const [profileVisibility, setProfileVisibility] = useState("public");
  const [dataSharing, setDataSharing] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);

  // Preferences settings
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("UTC");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [theme, setTheme] = useState("system");
  const [currency, setCurrency] = useState("INR");

  useEffect(() => {
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      const settings = (await apiClient.getUserSettings()) as any;
      if (settings) {
        // Load all settings from database
        setCurrentAvatar(user?.avatarBase64 || null);
        setEmailNotifications(settings.emailNotifications ?? true);
        setPushNotifications(settings.pushNotifications ?? true);
        setSmsNotifications(settings.smsNotifications ?? false);
        setCaseUpdates(settings.caseUpdates ?? true);
        setBillingAlerts(settings.billingAlerts ?? true);
        setCalendarReminders(settings.calendarReminders ?? true);
        setProfileVisibility(settings.profileVisibility ?? "public");
        setDataSharing(settings.dataSharing ?? true);
        setTwoFactorAuth(settings.twoFactorAuth ?? false);
        setLanguage(settings.language ?? "en");
        setTimezone(settings.timezone ?? "UTC");
        setDateFormat(settings.dateFormat ?? "MM/DD/YYYY");
        setTheme(settings.theme ?? "system");
        setCurrency(settings.currency ?? "INR");
      }
    } catch (error) {
      console.error("Error loading user settings:", error);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      const response = await apiClient.uploadAvatar(file);
      setCurrentAvatar(response.avatar);
      // Update user context if needed
      if (user) {
        // You might want to update the user context here
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      throw error;
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      await apiClient.updateUserSettings({
        // Include all settings
        emailNotifications,
        pushNotifications,
        smsNotifications,
        caseUpdates,
        billingAlerts,
        calendarReminders,
        profileVisibility,
        dataSharing,
        twoFactorAuth,
        language,
        timezone,
        dateFormat,
        theme,
        currency,
      });
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    {
      id: "profile",
      name: "Profile",
      icon: User,
      description: "Manage your profile and avatar",
    },
    {
      id: "notifications",
      name: "Notifications",
      icon: Bell,
      description: "Manage your notification preferences",
    },
    {
      id: "privacy",
      name: "Privacy & Security",
      icon: Shield,
      description: "Control your privacy and security settings",
    },
    {
      id: "preferences",
      name: "Preferences",
      icon: Settings,
      description: "Customize your experience",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="card">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                          : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{tab.name}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="card">
              {/* Tab Header */}
              <div className="mb-6">
                {(() => {
                  const activeTabData = tabs.find(
                    (tab) => tab.id === activeTab
                  );
                  const Icon = activeTabData?.icon;
                  return (
                    <div className="flex items-center space-x-3">
                      {Icon && <Icon className="w-6 h-6 text-blue-600" />}
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                          {activeTabData?.name}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                          {activeTabData?.description}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Tab Content */}
              {activeTab === "profile" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Profile Picture
                    </h3>
                    <ProfilePictureUpload
                      currentAvatar={currentAvatar}
                      name={user?.name || "User"}
                      onUpload={handleAvatarUpload}
                    />
                  </div>
                </div>
              )}

              {activeTab === "notifications" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Notification Channels
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Email Notifications
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Receive notifications via email
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            setEmailNotifications(!emailNotifications)
                          }
                          className={`w-12 h-6 rounded-full transition-colors ${
                            emailNotifications
                              ? "bg-blue-600"
                              : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 bg-white rounded-full transition-transform ${
                              emailNotifications
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            SMS Notifications
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Receive notifications via SMS
                          </p>
                        </div>
                        <button
                          onClick={() => setSmsNotifications(!smsNotifications)}
                          className={`w-12 h-6 rounded-full transition-colors ${
                            smsNotifications
                              ? "bg-blue-600"
                              : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 bg-white rounded-full transition-transform ${
                              smsNotifications
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Push Notifications
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Receive notifications in the browser
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            setPushNotifications(!pushNotifications)
                          }
                          className={`w-12 h-6 rounded-full transition-colors ${
                            pushNotifications
                              ? "bg-blue-600"
                              : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 bg-white rounded-full transition-transform ${
                              pushNotifications
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Notification Types
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Case Updates
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Notifications about case status changes
                          </p>
                        </div>
                        <button
                          onClick={() => setCaseUpdates(!caseUpdates)}
                          className={`w-12 h-6 rounded-full transition-colors ${
                            caseUpdates
                              ? "bg-blue-600"
                              : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 bg-white rounded-full transition-transform ${
                              caseUpdates ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Billing Alerts
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Notifications about billing and payments
                          </p>
                        </div>
                        <button
                          onClick={() => setBillingAlerts(!billingAlerts)}
                          className={`w-12 h-6 rounded-full transition-colors ${
                            billingAlerts
                              ? "bg-blue-600"
                              : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 bg-white rounded-full transition-transform ${
                              billingAlerts ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Calendar Reminders
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Reminders for upcoming events and deadlines
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            setCalendarReminders(!calendarReminders)
                          }
                          className={`w-12 h-6 rounded-full transition-colors ${
                            calendarReminders
                              ? "bg-blue-600"
                              : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 bg-white rounded-full transition-transform ${
                              calendarReminders
                                ? "translate-x-6"
                                : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "privacy" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Security Settings
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Two-Factor Authentication
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <button
                          onClick={() => setTwoFactorAuth(!twoFactorAuth)}
                          className={`w-12 h-6 rounded-full transition-colors ${
                            twoFactorAuth
                              ? "bg-blue-600"
                              : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 bg-white rounded-full transition-transform ${
                              twoFactorAuth ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Data Sharing
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Allow data sharing for improved services
                          </p>
                        </div>
                        <button
                          onClick={() => setDataSharing(!dataSharing)}
                          className={`w-12 h-6 rounded-full transition-colors ${
                            dataSharing
                              ? "bg-blue-600"
                              : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 bg-white rounded-full transition-transform ${
                              dataSharing ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "preferences" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Display Settings
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Language
                        </label>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                          <option value="en">English</option>
                          <option value="es">Spanish</option>
                          <option value="fr">French</option>
                          <option value="de">German</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Timezone
                        </label>
                        <select
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                          <option value="UTC">UTC</option>
                          <option value="EST">Eastern Time</option>
                          <option value="CST">Central Time</option>
                          <option value="MST">Mountain Time</option>
                          <option value="PST">Pacific Time</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Date Format
                        </label>
                        <select
                          value={dateFormat}
                          onChange={(e) => setDateFormat(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Default Currency
                        </label>
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                          <option value="INR">INR (₹)</option>
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="JPY">JPY (¥)</option>
                          <option value="AUD">AUD (A$)</option>
                          <option value="CAD">CAD (C$)</option>
                          <option value="CHF">CHF (CHF)</option>
                          <option value="CNY">CNY (¥)</option>
                          <option value="HKD">HKD (HK$)</option>
                          <option value="NZD">NZD (NZ$)</option>
                          <option value="SEK">SEK (kr)</option>
                          <option value="SGD">SGD (S$)</option>
                          <option value="THB">THB (฿)</option>
                          <option value="TRY">TRY (₺)</option>
                          <option value="ZAR">ZAR (R)</option>
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          This will be the default currency for new billing
                          records. Clients can have different currencies per
                          case.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Theme
                        </label>
                        <select
                          value={theme}
                          onChange={(e) => setTheme(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        >
                          <option value="system">System</option>
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Font Size Settings */}
                  <div className="mt-8">
                    <FontSizeSelector />
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleSaveSettings}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Settings</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
