"use client";

import ConfirmDialog from "@/components/ConfirmDialog";
import CustomSelect from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { apiClient } from "@/services/api";
import { formatCurrency } from "@/utils/currency";
import {
  Bell,
  Calendar,
  Check,
  CheckSquare,
  DollarSign,
  FileText,
  Search,
  Trash2,
  Video,
} from "lucide-react";
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

export default function ClientNotificationsPage() {
  const { user } = useAuth();
  const { getSetting } = useSettings();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [readStatusFilter, setReadStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<
    string | null
  >(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Get user's currency preference with fallback
  const userCurrency = getSetting("currency") || "INR";

  useEffect(() => {
    fetchNotifications();
  }, [typeFilter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const filters: { isRead?: boolean; type?: string } = {};

      if (typeFilter !== "all") {
        filters.type = typeFilter;
      }

      const data = await apiClient.getNotifications(filters);
      setNotifications(data as Notification[]);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      // Fallback to mock data if API fails
      const mockNotifications: Notification[] = [
        {
          id: "1",
          title: "Case Update",
          message:
            "Your case CASE-2024-001 has been updated with new documents",
          type: "CASE_UPDATE",
          isRead: false,
          createdAt: "2024-02-15T10:00:00.000Z",
          actionUrl: "/client/cases/1",
        },
        {
          id: "2",
          title: "Meeting Reminder",
          message: "Reminder: Your meeting with your lawyer starts in 1 hour",
          type: "EVENT_REMINDER",
          isRead: false,
          createdAt: "2024-02-15T09:30:00.000Z",
          actionUrl: "/client/events/1",
        },
        {
          id: "3",
          title: "Document Available",
          message: "New document 'Contract Review' is available for your case",
          type: "DOCUMENT_UPLOADED",
          isRead: true,
          createdAt: "2024-02-15T08:00:00.000Z",
          actionUrl: "/client/documents/1",
        },
        {
          id: "4",
          title: "Payment Due",
          message: `Your payment of ${formatCurrency(5000, userCurrency as any)} for case CASE-2024-002 is due`,
          type: "BILL_DUE",
          isRead: false,
          createdAt: "2024-02-15T07:00:00.000Z",
          actionUrl: "/client/billing/1",
        },
        {
          id: "5",
          title: "Video Call Scheduled",
          message:
            "Your lawyer has scheduled a video call for tomorrow at 2 PM",
          type: "VIDEO_CALL",
          isRead: true,
          createdAt: "2024-02-15T06:00:00.000Z",
          actionUrl: "/client/video-calls/1",
        },
      ];
      setNotifications(mockNotifications);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true }))
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    setNotificationToDelete(notificationId);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!notificationToDelete) return;

    try {
      await apiClient.deleteNotification(notificationToDelete);
      setNotifications((prev) =>
        prev.filter((n) => n.id !== notificationToDelete)
      );
    } catch (error) {
      console.error("Error deleting notification:", error);
    } finally {
      setShowDeleteConfirm(false);
      setNotificationToDelete(null);
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
      case "CASE_UPDATE":
        return <FileText className="w-5 h-5" />;
      case "EVENT_REMINDER":
        return <Calendar className="w-5 h-5" />;
      case "DOCUMENT_UPLOADED":
        return <FileText className="w-5 h-5" />;
      case "BILL_DUE":
      case "BILL_OVERDUE":
        return <DollarSign className="w-5 h-5" />;
      case "VIDEO_CALL":
        return <Video className="w-5 h-5" />;
      case "TASK_ASSIGNED":
        return <CheckSquare className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case "CASE_UPDATE":
        return "Case Update";
      case "EVENT_REMINDER":
        return "Event Reminder";
      case "DOCUMENT_UPLOADED":
        return "Document";
      case "BILL_DUE":
        return "Payment Due";
      case "BILL_OVERDUE":
        return "Payment Overdue";
      case "VIDEO_CALL":
        return "Video Call";
      case "TASK_ASSIGNED":
        return "Task";
      default:
        return "Notification";
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    const matchesSearch =
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType =
      typeFilter === "all" || notification.type === typeFilter;
    const matchesRead =
      typeFilter === "all" ||
      (typeFilter === "read" && notification.isRead) ||
      (typeFilter === "unread" && !notification.isRead);

    return matchesSearch && matchesType && matchesRead;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container-responsive py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm"
                >
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container-responsive py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Notifications
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="btn-secondary flex items-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-2 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-4">
              <CustomSelect
                value={{
                  value: typeFilter,
                  label:
                    typeFilter === "all"
                      ? "All Types"
                      : typeFilter
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase()),
                }}
                onChange={(option) => setTypeFilter(option?.value || "all")}
                options={[
                  { value: "all", label: "All Types" },
                  { value: "CASE_UPDATE", label: "Case Updates" },
                  { value: "EVENT_REMINDER", label: "Event Reminders" },
                  { value: "DOCUMENT_UPLOADED", label: "Documents" },
                  { value: "BILL_DUE", label: "Payment Due" },
                  { value: "BILL_OVERDUE", label: "Payment Overdue" },
                  { value: "VIDEO_CALL", label: "Video Calls" },
                ]}
                placeholder="Select type..."
                className="w-48"
              />

              <CustomSelect
                value={{
                  value: readStatusFilter,
                  label:
                    readStatusFilter === "all"
                      ? "All"
                      : readStatusFilter === "unread"
                        ? "Unread"
                        : "Read",
                }}
                onChange={(option) =>
                  setReadStatusFilter(option?.value || "all")
                }
                options={[
                  { value: "all", label: "All" },
                  { value: "unread", label: "Unread" },
                  { value: "read", label: "Read" },
                ]}
                placeholder="Select status..."
                className="w-32"
              />
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No notifications found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || typeFilter !== "all" || typeFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "You're all caught up! No notifications at the moment."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-l-4 transition-all duration-200 hover:shadow-md ${
                  notification.isRead
                    ? "border-gray-200 dark:border-gray-700"
                    : "border-blue-500"
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div
                        className={`p-2 rounded-lg ${
                          notification.isRead
                            ? "bg-gray-100 dark:bg-gray-700"
                            : "bg-blue-100 dark:bg-blue-900/20"
                        }`}
                      >
                        {getNotificationIcon(notification.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3
                            className={`text-lg font-semibold ${
                              notification.isRead
                                ? "text-gray-700 dark:text-gray-300"
                                : "text-gray-900 dark:text-white"
                            }`}
                          >
                            {notification.title}
                          </h3>
                          {!notification.isRead && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                              New
                            </span>
                          )}
                        </div>

                        <p className="text-gray-600 dark:text-gray-400 mb-3">
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                            <span>
                              {getNotificationTypeLabel(notification.type)}
                            </span>
                            <span>•</span>
                            <span>{formatTime(notification.createdAt)}</span>
                          </div>

                          <div className="flex items-center space-x-2">
                            {notification.actionUrl && (
                              <button
                                onClick={() =>
                                  handleNotificationClick(notification)
                                }
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                              >
                                View
                              </button>
                            )}
                            <button
                              onClick={() =>
                                deleteNotification(notification.id)
                              }
                              className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Notification"
        message="Are you sure you want to delete this notification? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
