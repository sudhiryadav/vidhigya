"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useVideoCall } from "@/contexts/VideoCallContext";
import { apiClient } from "@/services/api";
import {
  AlertCircle,
  Bell,
  Brain,
  Building,
  Calendar,
  CheckCircle,
  CreditCard,
  FileCheck,
  FileText,
  Gavel,
  MessageSquare,
  Mic,
  MicOff,
  Trash2,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ModalDialog from "./ui/ModalDialog";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const { startVideoCall } = useVideoCall();
  const { getSetting } = useSettings();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Pre-call settings state
  const [showPreCallModal, setShowPreCallModal] = useState(false);
  const [preCallAudioEnabled, setPreCallAudioEnabled] = useState(true);
  const [preCallVideoEnabled, setPreCallVideoEnabled] = useState(true);
  const [selectedVideoCallNotification, setSelectedVideoCallNotification] =
    useState<Notification | null>(null);

  // Check if notifications are enabled based on user settings
  const pushNotificationsEnabled = getSetting("pushNotifications") ?? true;
  const emailNotificationsEnabled = getSetting("emailNotifications") ?? true;

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Replace with actual API call
      const response = await apiClient.getNotifications();
      if (response && Array.isArray(response)) {
        setNotifications(response);
        setUnreadCount(response.filter((n: Notification) => !n.isRead).length);
      } else {
        // Fallback to mock data
        const mockNotifications: Notification[] = [
          {
            id: "1",
            title: "New Task Assigned",
            message:
              "John Lawyer assigned you a task: Review Smith case documents",
            type: "TASK_ASSIGNED",
            isRead: false,
            createdAt: "2024-02-15T10:00:00.000Z",
            actionUrl: "/tasks/1",
          },
          {
            id: "2",
            title: "Hearing Reminder",
            message: "Reminder: Client Meeting starts in 1 hour",
            type: "HEARING_REMINDER",
            isRead: false,
            createdAt: "2024-02-15T09:30:00.000Z",
            actionUrl: "/calendar/1",
          },
          {
            id: "3",
            title: "Document Uploaded",
            message: "Sarah uploaded 'Contract Review' to case CASE-2024-001",
            type: "DOCUMENT_UPLOAD",
            isRead: true,
            createdAt: "2024-02-15T08:00:00.000Z",
            actionUrl: "/documents/1",
          },
          {
            id: "4",
            title: "Case Update",
            message: "Case Smith vs. Johnson status updated to 'In Progress'",
            type: "CASE_UPDATE",
            isRead: false,
            createdAt: "2024-02-15T07:00:00.000Z",
            actionUrl: "/cases/1",
          },
          {
            id: "5",
            title: "Billing Notification",
            message:
              "Invoice #INV-2024-001 has been generated for Case ABC-123",
            type: "BILLING",
            isRead: true,
            createdAt: "2024-02-15T06:00:00.000Z",
            actionUrl: "/billing/1",
          },
        ];
        setNotifications(mockNotifications);
        setUnreadCount(mockNotifications.filter((n) => !n.isRead).length);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      // Fallback to mock data
      const mockNotifications: Notification[] = [
        {
          id: "1",
          title: "New Task Assigned",
          message:
            "John Lawyer assigned you a task: Review Smith case documents",
          type: "TASK_ASSIGNED",
          isRead: false,
          createdAt: "2024-02-15T10:00:00.000Z",
          actionUrl: "/tasks/1",
        },
        {
          id: "2",
          title: "Hearing Reminder",
          message: "Reminder: Client Meeting starts in 1 hour",
          type: "HEARING_REMINDER",
          isRead: false,
          createdAt: "2024-02-15T09:30:00.000Z",
          actionUrl: "/calendar/1",
        },
        {
          id: "3",
          title: "Document Uploaded",
          message: "Sarah uploaded 'Contract Review' to case CASE-2024-001",
          type: "DOCUMENT_UPLOAD",
          isRead: true,
          createdAt: "2024-02-15T08:00:00.000Z",
          actionUrl: "/documents/1",
        },
        {
          id: "4",
          title: "Case Update",
          message: "Case Smith vs. Johnson status updated to 'In Progress'",
          type: "CASE_UPDATE",
          isRead: false,
          createdAt: "2024-02-15T07:00:00.000Z",
          actionUrl: "/cases/1",
        },
        {
          id: "5",
          title: "Billing Notification",
          message: "Invoice #INV-2024-001 has been generated for Case ABC-123",
          type: "BILLING",
          isRead: true,
          createdAt: "2024-02-15T06:00:00.000Z",
          actionUrl: "/billing/1",
        },
      ];
      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter((n) => !n.isRead).length);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!user) return;

    try {
      const response = await apiClient.getUnreadNotificationCount();
      if (typeof response === "number") {
        setUnreadCount(response);
      } else {
        // Fallback: calculate from notifications
        setUnreadCount(notifications.filter((n) => !n.isRead).length);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
      // Fallback: calculate from notifications
      setUnreadCount(notifications.filter((n) => !n.isRead).length);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await apiClient.deleteNotification(notificationId);
      const notification = notifications.find((n) => n.id === notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (notification && !notification.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const isVideoCallNotification = (notification: Notification): boolean => {
    return !!(
      notification.title &&
      (notification.title.includes("Instant Video Call Created") ||
        notification.title.includes("Video Call Started") ||
        notification.title.includes("Video Call Scheduled"))
    );
  };

  const getNotificationIcon = (type: string, title?: string) => {
    // Check if it's a video call notification by title (since backend uses SYSTEM type)
    if (
      title &&
      (title.includes("Instant Video Call Created") ||
        title.includes("Video Call Started") ||
        title.includes("Video Call Scheduled"))
    ) {
      return <Video className="w-6 h-6 text-red-600 dark:text-red-400" />;
    }

    switch (type) {
      case "TASK_ASSIGNED":
        return (
          <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        );
      case "EVENT_REMINDER":
        return (
          <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        );
      case "DOCUMENT_UPLOADED":
        return (
          <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
        );
      case "CASE_UPDATE":
        return (
          <Gavel className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        );
      case "HEARING_REMINDER":
        return (
          <Building className="w-6 h-6 text-orange-600 dark:text-orange-400" />
        );
      case "DOCUMENT_UPLOAD":
        return (
          <FileCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
        );
      case "AI_ANALYSIS":
        return <Brain className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />;
      case "BILLING":
        return (
          <CreditCard className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        );
      case "MESSAGE":
        return (
          <MessageSquare className="w-6 h-6 text-sky-600 dark:text-sky-400" />
        );
      case "VIDEO_CALL_INSTANT":
      case "VIDEO_CALL_STARTED":
        return <Video className="w-6 h-6 text-red-600 dark:text-red-400" />;
      case "SYSTEM":
        return (
          <AlertCircle className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        );
      default:
        return <Bell className="w-6 h-6 text-gray-600 dark:text-gray-400" />;
    }
  };

  const formatNotificationMessage = (notification: Notification) => {
    // Check if it's a video call notification
    if (isVideoCallNotification(notification)) {
      // Extract meeting ID from the message
      const meetingIdMatch = notification.message.match(
        /Meeting ID: ([A-Z0-9-]+)/
      );
      if (meetingIdMatch) {
        const meetingId = meetingIdMatch[1];
        const videoCallRoomUrl = `/video-call-room/${meetingId}`;

        // Format the message with clickable link
        const formattedMessage = notification.message
          .replace(/Meeting URL: .*/, "") // Remove the old meeting URL
          .replace(/Meeting ID: [A-Z0-9-]+/, "") // Remove the first meeting ID occurrence
          .replace(/Click the link above to join.*/, "")
          .trim(); // Remove extra whitespace

        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{formattedMessage}</p>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">Meeting ID:</span>
              <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                {meetingId}
              </span>
            </div>
            <a
              href={videoCallRoomUrl}
              onClick={async (e) => {
                e.stopPropagation();
                // Mark notification as read when joining
                await markAsRead(notification.id);
                // Navigate to video call room
                router.push(videoCallRoomUrl);
              }}
              className="inline-flex items-center text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
            >
              <Video className="w-3 h-3 mr-1" />
              Join Video Call →
            </a>
          </div>
        );
      }
    }

    // Default message display
    return (
      <p className="text-sm text-muted-foreground">{notification.message}</p>
    );
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [user]);

  // Don't render if notifications are disabled or user is not authenticated
  // Allow rendering if settings are still loading (pushNotificationsEnabled is null)
  if (pushNotificationsEnabled === false || !user) {
    return null;
  }

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);

    // Check if this is a video call notification by title
    if (isVideoCallNotification(notification)) {
      // Show pre-call settings modal for video call notifications
      setSelectedVideoCallNotification(notification);
      setShowPreCallModal(true);
      setIsOpen(false); // Close the notification dropdown
    } else if (notification.actionUrl) {
      // For other notifications, navigate directly
      router.push(notification.actionUrl);
    }
  };

  const handleJoinVideoCall = async () => {
    if (!selectedVideoCallNotification) return;

    // Store pre-call settings in localStorage
    localStorage.setItem("preCallAudioEnabled", preCallAudioEnabled.toString());
    localStorage.setItem("preCallVideoEnabled", preCallVideoEnabled.toString());

    // Extract meeting ID from the notification message
    let meetingId = "";
    const message = selectedVideoCallNotification.message;
    const meetingIdMatch = message.match(/Meeting ID: ([A-Z0-9-]+)/);

    if (meetingIdMatch) {
      meetingId = meetingIdMatch[1];
    } else if (selectedVideoCallNotification.actionUrl) {
      // Fallback: try to extract from actionUrl
      const urlParts = selectedVideoCallNotification.actionUrl.split("/");
      meetingId = urlParts[urlParts.length - 1];
    }

    if (meetingId) {
      // Start video call using context (same window)
      await startVideoCall(
        meetingId,
        selectedVideoCallNotification.title || "Video Call"
      );
    } else {
      // Fallback: navigate to video calls page
      router.push("/video-calls");
    }

    // Close modal and reset
    setShowPreCallModal(false);
    setSelectedVideoCallNotification(null);
  };

  return (
    <div className="relative overflow-visible" data-notification-bell>
      {/* Notification Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        className="relative p-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-background rounded-lg shadow-sm border border-border z-[99999] transform -translate-x-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-card">
            <h3 className="text-lg font-semibold text-foreground">
              Notifications
            </h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto bg-background">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted cursor-pointer border-b border-border last:border-b-0 transition-colors ${
                    !notification.isRead
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : "bg-background"
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 text-2xl">
                      {getNotificationIcon(
                        notification.type,
                        notification.title
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-foreground">
                          {notification.title}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-muted-foreground">
                            {formatTime(notification.createdAt)}
                          </span>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                      {formatNotificationMessage(notification)}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="flex-shrink-0 text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-card">
            <button
              onClick={() => {
                // Navigate to shared notifications page
                router.push("/notifications");
                setIsOpen(false);
              }}
              className="w-full text-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}

      {/* Pre-call Settings Modal for Video Call Notifications */}
      <ModalDialog
        isOpen={showPreCallModal}
        onClose={() => {
          setShowPreCallModal(false);
          setSelectedVideoCallNotification(null);
        }}
        header={
          <h2 className="text-lg font-semibold text-foreground">
            Join Video Call
          </h2>
        }
        maxWidth="md"
      >
        <div className="p-6 bg-background">
          <div className="mb-6">
            <h5 className="text-sm font-medium text-foreground mb-3">
              Before joining the video call, you can:
            </h5>

            <div className="space-y-3">
              {/* Audio Setting */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  {preCallAudioEnabled ? (
                    <Mic className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <MicOff className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Microphone
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {preCallAudioEnabled
                        ? "Will be enabled"
                        : "Will be muted"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreCallAudioEnabled(!preCallAudioEnabled)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    preCallAudioEnabled
                      ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                      : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                  }`}
                >
                  {preCallAudioEnabled ? "ON" : "OFF"}
                </button>
              </div>

              {/* Video Setting */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  {preCallVideoEnabled ? (
                    <Video className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <VideoOff className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Camera
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {preCallVideoEnabled
                        ? "Will be enabled"
                        : "Will be turned off"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreCallVideoEnabled(!preCallVideoEnabled)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    preCallVideoEnabled
                      ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                      : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                  }`}
                >
                  {preCallVideoEnabled ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setShowPreCallModal(false);
                setSelectedVideoCallNotification(null);
              }}
              className="flex-1 px-4 py-2 border border-border rounded-md text-sm font-medium text-muted-foreground bg-background hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleJoinVideoCall}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Join Call
            </button>
          </div>
        </div>
      </ModalDialog>
    </div>
  );
}
