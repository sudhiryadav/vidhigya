"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { apiClient } from "@/services/api";
import { Bell, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { getSetting } = useSettings();

  // Check if notifications are enabled based on user settings
  const pushNotificationsEnabled = getSetting("pushNotifications") ?? true;
  const emailNotificationsEnabled = getSetting("emailNotifications") ?? true;

  useEffect(() => {
    if (pushNotificationsEnabled && user) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [pushNotificationsEnabled, user]);

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
            title: "Event Reminder",
            message: "Reminder: Client Meeting starts in 1 hour",
            type: "EVENT_REMINDER",
            isRead: false,
            createdAt: "2024-02-15T09:30:00.000Z",
            actionUrl: "/calendar/1",
          },
          {
            id: "3",
            title: "Document Uploaded",
            message: "Sarah uploaded 'Contract Review' to case CASE-2024-001",
            type: "DOCUMENT_UPLOADED",
            isRead: true,
            createdAt: "2024-02-15T08:00:00.000Z",
            actionUrl: "/documents/1",
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
          title: "Event Reminder",
          message: "Reminder: Client Meeting starts in 1 hour",
          type: "EVENT_REMINDER",
          isRead: false,
          createdAt: "2024-02-15T09:30:00.000Z",
          actionUrl: "/calendar/1",
        },
        {
          id: "3",
          title: "Document Uploaded",
          message: "Sarah uploaded 'Contract Review' to case CASE-2024-001",
          type: "DOCUMENT_UPLOADED",
          isRead: true,
          createdAt: "2024-02-15T08:00:00.000Z",
          actionUrl: "/documents/1",
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
      // Replace with actual API call
      const response = await apiClient.getUnreadNotificationCount();
      if (response && typeof response === "object" && "count" in response) {
        setUnreadCount(response.count as number);
      }
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Replace with actual API call
      await apiClient.markNotificationAsRead(notificationId);

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // Replace with actual API call
      await apiClient.markAllNotificationsAsRead();

      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      // Replace with actual API call
      await apiClient.deleteNotification(notificationId);

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setUnreadCount((prev) => {
        const notification = notifications.find((n) => n.id === notificationId);
        return notification && !notification.isRead ? prev - 1 : prev;
      });
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "TASK_ASSIGNED":
        return "📋";
      case "EVENT_REMINDER":
        return "📅";
      case "DOCUMENT_UPLOADED":
        return "📄";
      case "CASE_UPDATE":
        return "⚖️";
      case "BILLING_ALERT":
        return "💰";
      default:
        return "🔔";
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
    setIsOpen(false);
  };

  // Don't render if notifications are disabled or user is not authenticated
  if (!pushNotificationsEnabled || !user) {
    return null;
  }

  return (
    <div className="relative" data-notification-bell>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
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
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Notifications
            </h3>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                    !notification.isRead ? "bg-blue-50 dark:bg-blue-900/20" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 text-2xl">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {notification.title}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(notification.createdAt)}
                          </span>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {notification.message}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                router.push("/notifications");
                setIsOpen(false);
              }}
              className="w-full text-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
