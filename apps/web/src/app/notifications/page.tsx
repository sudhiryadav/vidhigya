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

export default function NotificationsPage() {
  const { user } = useAuth();
  const { getSetting } = useSettings();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterRead, setFilterRead] = useState<string>("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<
    string | null
  >(null);

  // Get user's currency preference with fallback
  const userCurrency = getSetting("currency") || "INR";

  useEffect(() => {
    fetchNotifications();
  }, [filterType, filterRead]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const filters: { isRead?: boolean; type?: string } = {};

      if (filterRead !== "all") {
        filters.isRead = filterRead === "read";
      }
      if (filterType !== "all") {
        filters.type = filterType;
      }

      const data = await apiClient.getNotifications(filters);
      setNotifications(data as Notification[]);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      // Fallback to mock data if API fails
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
        {
          id: "4",
          title: "Payment Overdue",
          message: `Your payment of ${formatCurrency(5000, userCurrency as any)} for case CASE-2024-002 is overdue`,
          type: "BILL_OVERDUE",
          isRead: false,
          createdAt: "2024-02-15T07:00:00.000Z",
          actionUrl: "/billing/1",
        },
        {
          id: "5",
          title: "Video Call Started",
          message: "John Lawyer has started a video call. Click to join.",
          type: "VIDEO_CALL_STARTED",
          isRead: false,
          createdAt: "2024-02-15T06:00:00.000Z",
          actionUrl: "/video-calls/1",
        },
        {
          id: "6",
          title: "Instant Video Call Created",
          message:
            "John Lawyer created an instant video call: Case Review\n\nMeeting ID: ABC-123-XYZ\nMeeting URL: https://meet.example.com/abc-123-xyz\n\nClick the link above to join immediately!",
          type: "SYSTEM",
          isRead: false,
          createdAt: "2024-02-15T05:00:00.000Z",
          actionUrl: "/video-calls/1",
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
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await apiClient.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const handleConfirmDelete = async () => {
    if (notificationToDelete) {
      await deleteNotification(notificationToDelete);
      setNotificationToDelete(null);
      setShowDeleteConfirm(false);
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

  const getNotificationIcon = (type: string, title?: string) => {
    // Check if it's a video call notification by title (since backend uses SYSTEM type)
    if (
      title &&
      (title.includes("Instant Video Call Created") ||
        title.includes("Video Call Started") ||
        title.includes("Video Call Scheduled"))
    ) {
      return <Video className="h-5 w-5 text-red-600 dark:text-red-400" />;
    }

    switch (type) {
      case "TASK_ASSIGNED":
        return <CheckSquare className="h-5 w-5 text-blue-500" />;
      case "EVENT_REMINDER":
        return <Calendar className="h-5 w-5 text-green-500" />;
      case "DOCUMENT_UPLOADED":
        return <FileText className="h-5 w-5 text-purple-500" />;
      case "BILL_OVERDUE":
      case "BILL_DUE":
        return <DollarSign className="h-5 w-5 text-red-500" />;
      case "VIDEO_CALL_STARTED":
      case "VIDEO_CALL_INSTANT":
        return <Video className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case "CASE_UPDATE":
        return <Bell className="h-5 w-5 text-indigo-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getNotificationTypeLabel = (type: string, title?: string) => {
    // Check if it's a video call notification by title (since backend uses SYSTEM type)
    if (
      title &&
      (title.includes("Instant Video Call Created") ||
        title.includes("Video Call Started") ||
        title.includes("Video Call Scheduled"))
    ) {
      return "Video Call";
    }

    switch (type) {
      case "TASK_ASSIGNED":
        return "Task";
      case "EVENT_REMINDER":
        return "Event";
      case "DOCUMENT_UPLOADED":
        return "Document";
      case "BILL_OVERDUE":
        return "Payment";
      case "BILL_DUE":
        return "Payment";
      case "VIDEO_CALL_STARTED":
        return "Video Call";
      case "VIDEO_CALL_INSTANT":
        return "Video Call";
      case "CASE_UPDATE":
        return "Case Update";
      default:
        return "Notification";
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      // Handle role-specific navigation
      if (user?.role === "CLIENT" && notification.actionUrl.startsWith("/")) {
        // For client, prefix with /client if not already present
        const url = notification.actionUrl.startsWith("/client")
          ? notification.actionUrl
          : `/client${notification.actionUrl}`;
        window.location.href = url;
      } else if (
        (user?.role === "LAWYER" ||
          user?.role === "ASSOCIATE" ||
          user?.role === "PARALEGAL") &&
        notification.actionUrl.startsWith("/")
      ) {
        // For lawyer, prefix with /lawyer if not already present
        const url = notification.actionUrl.startsWith("/lawyer")
          ? notification.actionUrl
          : `/lawyer${notification.actionUrl}`;
        window.location.href = url;
      } else {
        window.location.href = notification.actionUrl;
      }
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    const matchesSearch =
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      filterType === "all" || notification.type === filterType;
    const matchesRead =
      filterRead === "all" ||
      (filterRead === "read" && notification.isRead) ||
      (filterRead === "unread" && !notification.isRead);

    return matchesSearch && matchesType && matchesRead;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-card rounded-lg shadow p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Notifications
              </h1>
              <p className="text-muted-foreground">
                Manage and view all your notifications
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Mark All Read
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
              />
            </div>

            {/* Type Filter */}
            <CustomSelect
              options={[
                { value: "all", label: "All Types" },
                { value: "TASK_ASSIGNED", label: "Tasks" },
                { value: "EVENT_REMINDER", label: "Events" },
                { value: "DOCUMENT_UPLOADED", label: "Documents" },
                { value: "BILL_OVERDUE", label: "Payments" },
                { value: "VIDEO_CALL_STARTED", label: "Video Calls" },
                { value: "CASE_UPDATE", label: "Case Updates" },
              ]}
              value={{
                value: filterType,
                label:
                  filterType === "all"
                    ? "All Types"
                    : getNotificationTypeLabel(filterType),
              }}
              onChange={(option) => setFilterType(option?.value || "all")}
            />

            {/* Read Status Filter */}
            <CustomSelect
              options={[
                { value: "all", label: "All Status" },
                { value: "unread", label: "Unread" },
                { value: "read", label: "Read" },
              ]}
              value={{
                value: filterRead,
                label:
                  filterRead === "all"
                    ? "All Status"
                    : filterRead === "read"
                      ? "Read"
                      : "Unread",
              }}
              onChange={(option) => setFilterRead(option?.value || "all")}
            />

            {/* Results Count */}
            <div className="flex items-center justify-end text-sm text-gray-500 dark:text-gray-400">
              {filteredNotifications.length} of {notifications.length}{" "}
              notifications
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="bg-card rounded-lg shadow-sm border border-border p-12 text-center">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No notifications found
              </h3>
              <p className="text-muted-foreground">
                {searchTerm || filterType !== "all" || filterRead !== "all"
                  ? "Try adjusting your filters or search terms."
                  : "You're all caught up! No new notifications."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-card rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow ${
                  !notification.isRead ? "border-l-4 border-l-blue-500" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(
                        notification.type,
                        notification.title
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {notification.title}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-muted-foreground">
                            {formatTime(notification.createdAt)}
                          </span>
                          {!notification.isRead && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                              New
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-muted-foreground mb-3">
                        {notification.message}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                            {getNotificationTypeLabel(
                              notification.type,
                              notification.title
                            )}
                          </span>
                          {!notification.isRead && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {notification.actionUrl && (
                            <button
                              onClick={() =>
                                handleNotificationClick(notification)
                              }
                              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                            >
                              View Details
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setNotificationToDelete(notification.id);
                              setShowDeleteConfirm(true);
                            }}
                            className="text-muted-foreground hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
