"use client";

import ConfirmDialog from "@/components/ConfirmDialog";
import ProfilePictureUpload from "@/components/ProfilePictureUpload";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import {
  Bell,
  Calendar,
  Edit,
  FileText,
  HelpCircle,
  LogOut,
  Mail,
  Phone,
  Save,
  Shield,
  User,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import LoadingOverlay from "./LoadingOverlay";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  specialization?: string;
  experience?: string; // Changed from number to string to match form data
  barNumber?: string;
  address?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProfilePageProps {
  userType: "lawyer" | "client";
  title: string;
  subtitle: string;
}

export default function ProfilePage({
  userType,
  title,
  subtitle,
}: ProfilePageProps) {
  const { user, logout, updateAvatar, removeAvatar } = useAuth();
  const router = useRouter();

  // Function to get role badge color
  const getRoleBadgeColor = (role: string) => {
    const roleColors: Record<string, string> = {
      SUPER_ADMIN:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      ADMIN: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      LAWYER: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      ASSOCIATE:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      PARALEGAL:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      CLIENT: "bg-muted text-muted-foreground",
    };
    return roleColors[role] || roleColors.CLIENT;
  };
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] =
    useState(false);
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const [showHelpSupport, setShowHelpSupport] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    specialization: "",
    experience: "",
    barNumber: "",
    address: "",
    bio: "",
  });

  // Settings states
  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    sms: false,
    caseUpdates: true,
    documentUploads: true,
  });

  const [privacySettings, setPrivacySettings] = useState({
    twoFactorEnabled: false,
    dataSharing: true,
    analytics: true,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);

      // For now, use mock data since we don't have profile endpoints
      const mockProfile: ProfileData = {
        id: user?.id || "",
        name: user?.name || "User Name",
        email: user?.email || "user@vidhigya.com",
        phone: "+1 (555) 123-4567",
        role: user?.role || "USER",
        specialization: userType === "lawyer" ? "Corporate Law" : undefined,
        experience: userType === "lawyer" ? "8" : undefined, // Mock experience as string
        barNumber: userType === "lawyer" ? "BAR123456" : undefined,
        address: "123 Main Street, City, State 12345",
        bio:
          userType === "lawyer"
            ? "Experienced corporate lawyer with expertise in mergers and acquisitions, contract law, and regulatory compliance."
            : "Client profile with focus on legal matters and case management.",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      setProfile(mockProfile);
      setFormData({
        name: mockProfile.name,
        email: mockProfile.email,
        phone: mockProfile.phone,
        specialization: mockProfile.specialization || "",
        experience: mockProfile.experience || "",
        barNumber: mockProfile.barNumber || "",
        address: mockProfile.address || "",
        bio: mockProfile.bio || "",
      });
    } catch (error) {
      toast.error("Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      await apiClient.uploadAvatar(file);
      toast.success("Profile picture updated successfully");
    } catch (error) {
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes("Failed to fetch")) {
          toast.error(
            "Cannot connect to server. Please check if the backend is running."
          );
        } else if (
          error.message.includes("401") ||
          error.message.includes("403")
        ) {
          toast.error("Authentication failed. Please log in again.");
        } else if (error.message.includes("413")) {
          toast.error("File too large. Please try a smaller image.");
        } else {
          toast.error(`Upload failed: ${error.message}`);
        }
      } else {
        toast.error("Failed to update profile picture. Please try again.");
      }

      throw error;
    }
  };

  const handleAvatarRemove = async () => {
    try {
      await removeAvatar();
      // Refresh the profile to get updated data
      fetchProfile();
    } catch (error) {
      console.error("Error removing avatar:", error);
      throw error;
    }
  };

  const handleSaveProfile = async () => {
    try {
      // For now, just update local state since we don't have profile update endpoints
      setProfile((prev) => (prev ? { ...prev, ...formData } : null));
      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    router.push("/login");
    setShowLogoutConfirm(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingOverlay
          isVisible={loading}
          title="Loading Profile"
          message="Please wait while we fetch your profile information..."
          absolute={false}
        />

        {!loading && (
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 mb-4">
              Profile not found
            </p>
            <button
              onClick={fetchProfile}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LoadingOverlay
        isVisible={loading}
        title="Loading Profile"
        message="Please wait while we fetch your profile information..."
        absolute={false}
      />

      {!loading && (
        <>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">
                    {title}
                  </h1>
                  <p className="text-muted-foreground mt-2">{subtitle}</p>
                  {user && (
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}
                      >
                        {user.role.replace("_", " ")}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-4 py-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors duration-200"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile Information */}
              <div className="lg:col-span-2">
                <div className="card">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-foreground">
                      Profile Information
                    </h2>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="flex items-center space-x-2 px-3 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200"
                    >
                      {isEditing ? (
                        <X className="w-4 h-4" />
                      ) : (
                        <Edit className="w-4 h-4" />
                      )}
                      <span>{isEditing ? "Cancel" : "Edit"}</span>
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Profile Picture Section */}
                    <div className="flex flex-col items-center">
                      <ProfilePictureUpload
                        currentAvatar={user?.avatarBase64}
                        name={profile.name}
                        onUpload={handleAvatarUpload}
                        onRemove={handleAvatarRemove}
                        size="xl"
                        showUploadArea={true}
                        showRemoveButton={true}
                      />
                    </div>

                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Full Name
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <div className="flex items-center space-x-3">
                            <User className="w-5 h-5 text-muted-foreground" />
                            <span className="text-foreground">
                              {profile.name}
                            </span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Email Address
                        </label>
                        {isEditing ? (
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                email: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <div className="flex items-center space-x-3">
                            <Mail className="w-5 h-5 text-muted-foreground" />
                            <span className="text-foreground">
                              {profile.email}
                            </span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Phone Number
                        </label>
                        {isEditing ? (
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                phone: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <div className="flex items-center space-x-3">
                            <Phone className="w-5 h-5 text-muted-foreground" />
                            <span className="text-foreground">
                              {profile.phone}
                            </span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Member Since
                        </label>
                        <div className="flex items-center space-x-3">
                          <Calendar className="w-5 h-5 text-muted-foreground" />
                          <span className="text-foreground">
                            {formatDate(profile.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Lawyer-specific fields */}
                      {userType === "lawyer" && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Specialization
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={formData.specialization}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    specialization: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            ) : (
                              <span className="text-foreground">
                                {profile.specialization}
                              </span>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Years of Experience
                            </label>
                            {isEditing ? (
                              <input
                                type="number"
                                value={formData.experience}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    experience: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            ) : (
                              <span className="text-foreground">
                                {profile.experience} years
                              </span>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Bar Number
                            </label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={formData.barNumber}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    barNumber: e.target.value,
                                  })
                                }
                                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            ) : (
                              <span className="text-foreground">
                                {profile.barNumber}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Address
                      </label>
                      {isEditing ? (
                        <textarea
                          value={formData.address}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              address: e.target.value,
                            })
                          }
                          rows={2}
                          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-foreground">{profile.address}</p>
                      )}
                    </div>

                    {/* Bio */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Bio
                      </label>
                      {isEditing ? (
                        <textarea
                          value={formData.bio}
                          onChange={(e) =>
                            setFormData({ ...formData, bio: e.target.value })
                          }
                          rows={4}
                          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="text-foreground">{profile.bio}</p>
                      )}
                    </div>

                    {/* Save/Cancel Buttons */}
                    {isEditing && (
                      <div className="flex justify-end space-x-3 pt-4 border-t border-border">
                        <button
                          onClick={() => setIsEditing(false)}
                          className="px-4 py-2 text-muted-foreground hover:text-foreground"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveProfile}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          <Save className="w-4 h-4" />
                          <span>Save Changes</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Settings & Actions */}
              <div className="lg:col-span-1">
                <div className="card">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Settings & Actions
                  </h3>
                  <div className="space-y-3">
                    {/* Test API Connection Button - Development Only */}
                    {process.env.NODE_ENV === "development" && (
                      <button
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem("token");

                            if (!token) {
                              toast.error("No authentication token found");
                              return;
                            }

                            // Test basic API connectivity
                            const response = await fetch(
                              `${process.env.NEXT_PUBLIC_API_URL}/auth/profile`,
                              {
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                },
                              }
                            );

                            if (response.ok) {
                              toast.success("API connection working!");
                            } else {
                              toast.error(
                                `API test failed: ${response.status} ${response.statusText}`
                              );
                            }
                          } catch (error) {
                            toast.error("API connection failed");
                          }
                        }}
                        className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-muted transition-colors bg-blue-50 dark:bg-blue-900/20"
                      >
                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">T</span>
                        </div>
                        <span className="text-foreground">
                          Test API Connection
                        </span>
                      </button>
                    )}

                    <button
                      onClick={() => setShowNotificationSettings(true)}
                      className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-muted transition-colors"
                    >
                      <Bell className="w-5 h-5 text-blue-600" />
                      <span className="text-foreground">
                        Notification Settings
                      </span>
                    </button>

                    <button
                      onClick={() => setShowPrivacySettings(true)}
                      className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-muted transition-colors"
                    >
                      <Shield className="w-5 h-5 text-green-600" />
                      <span className="text-foreground">
                        Privacy & Security
                      </span>
                    </button>

                    <button
                      onClick={() => setShowHelpSupport(true)}
                      className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-muted transition-colors"
                    >
                      <HelpCircle className="w-5 h-5 text-orange-600" />
                      <span className="text-foreground">Help & Support</span>
                    </button>

                    <button
                      onClick={() => setShowTermsOfService(true)}
                      className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-muted transition-colors"
                    >
                      <FileText className="w-5 h-5 text-purple-600" />
                      <span className="text-foreground">Terms of Service</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modals */}
            {/* Notification Settings Modal */}
            {showNotificationSettings && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-card rounded-lg p-6 w-full max-w-md mx-4">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Notification Settings
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">
                        Email Notifications
                      </span>
                      <button
                        onClick={() =>
                          setNotificationSettings({
                            ...notificationSettings,
                            email: !notificationSettings.email,
                          })
                        }
                        className={`w-12 h-6 rounded-full transition-colors ${
                          notificationSettings.email
                            ? "bg-blue-600"
                            : "bg-muted"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 bg-white rounded-full transition-transform ${
                            notificationSettings.email
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">SMS Notifications</span>
                      <button
                        onClick={() =>
                          setNotificationSettings({
                            ...notificationSettings,
                            sms: !notificationSettings.sms,
                          })
                        }
                        className={`w-12 h-6 rounded-full transition-colors ${
                          notificationSettings.sms ? "bg-blue-600" : "bg-muted"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 bg-white rounded-full transition-transform ${
                            notificationSettings.sms
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={() => {
                        toast.success("Notification settings saved!");
                        setShowNotificationSettings(false);
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowNotificationSettings(false)}
                      className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy & Security Modal */}
            {showPrivacySettings && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-card rounded-lg p-6 w-full max-w-md mx-4">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Privacy & Security
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">
                        Two-Factor Authentication
                      </span>
                      <button
                        onClick={() =>
                          setPrivacySettings({
                            ...privacySettings,
                            twoFactorEnabled: !privacySettings.twoFactorEnabled,
                          })
                        }
                        className={`w-12 h-6 rounded-full transition-colors ${
                          privacySettings.twoFactorEnabled
                            ? "bg-blue-600"
                            : "bg-muted"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 bg-white rounded-full transition-transform ${
                            privacySettings.twoFactorEnabled
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">Data Sharing</span>
                      <button
                        onClick={() =>
                          setPrivacySettings({
                            ...privacySettings,
                            dataSharing: !privacySettings.dataSharing,
                          })
                        }
                        className={`w-12 h-6 rounded-full transition-colors ${
                          privacySettings.dataSharing
                            ? "bg-blue-600"
                            : "bg-muted"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 bg-white rounded-full transition-transform ${
                            privacySettings.dataSharing
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={() => {
                        toast.success("Privacy settings saved!");
                        setShowPrivacySettings(false);
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowPrivacySettings(false)}
                      className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Help & Support Modal */}
            {showHelpSupport && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-card rounded-lg p-6 w-full max-w-md mx-4">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Help & Support
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Need help? Contact our support team or check our
                    documentation.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <span className="text-foreground">
                        support@vidhigya.com
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-green-600" />
                      <span className="text-foreground">+1 (555) 123-4567</span>
                    </div>
                  </div>
                  <div className="mt-6">
                    <button
                      onClick={() => setShowHelpSupport(false)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Terms of Service Modal */}
            {showTermsOfService && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-card rounded-lg p-6 w-full max-w-md mx-4 max-h-96 overflow-y-auto">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Terms of Service
                  </h3>
                  <div className="text-sm text-muted-foreground space-y-3">
                    <p>
                      By using Vidhigya, you agree to these terms and
                      conditions.
                    </p>
                    <p>
                      1. You will use the platform responsibly and in compliance
                      with all applicable laws.
                    </p>
                    <p>
                      2. You are responsible for maintaining the confidentiality
                      of your account.
                    </p>
                    <p>
                      3. We reserve the right to modify these terms at any time.
                    </p>
                    <p>
                      4. Your continued use of the platform constitutes
                      acceptance of any changes.
                    </p>
                  </div>
                  <div className="mt-6">
                    <button
                      onClick={() => setShowTermsOfService(false)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      I Understand
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Logout Confirmation */}
            <ConfirmDialog
              isOpen={showLogoutConfirm}
              onClose={() => setShowLogoutConfirm(false)}
              onConfirm={confirmLogout}
              title="Confirm Logout"
              message="Are you sure you want to logout? You will need to log in again to access your account."
              confirmText="Logout"
              cancelText="Cancel"
              type="danger"
            />
          </div>
        </>
      )}
    </div>
  );
}
