"use client";

import ConfirmDialog from "@/components/ConfirmDialog";
import CustomSelect from "@/components/ui/select";
import { apiClient } from "@/services/api";
import {
  Bell,
  Calendar,
  Check,
  CheckSquare,
  DollarSign,
  FileText,
  MoreVertical,
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterRead, setFilterRead] = useState<string>("all");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<
    string | null
  >(null);

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
          message: "Your payment of $500 for case CASE-2024-002 is overdue",
          type: "BILL_OVERDUE",
          isRead: false,
          createdAt: "2024-02-15T07:00:00.000Z",
          actionUrl: "/billing/1",
        },
        {
          id: "5",
          title: "Video Call Scheduled",
          message: "John scheduled a video call: Client Consultation",
          type: "VIDEO_CALL_SCHEDULED",
          isRead: true,
          createdAt: "2024-02-15T06:00:00.000Z",
          actionUrl: "/video-calls/1",
        },
        {
          id: "6",
          title: "Case Update",
          message: "Case CASE-2024-003 status updated to 'In Progress'",
          type: "CASE_UPDATE",
          isRead: true,
          createdAt: "2024-02-14T15:00:00.000Z",
          actionUrl: "/cases/1",
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
        prev.filter((notification) => notification.id !== notificationToDelete)
      );
      setShowDeleteConfirm(false);
      setNotificationToDelete(null);
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "TASK_ASSIGNED":
        return <CheckSquare className="w-5 h-5 text-blue-600" />;
      case "EVENT_REMINDER":
        return <Calendar className="w-5 h-5 text-green-600" />;
      case "DOCUMENT_UPLOADED":
        return <FileText className="w-5 h-5 text-purple-600" />;
      case "BILL_OVERDUE":
        return <DollarSign className="w-5 h-5 text-red-600" />;
      case "VIDEO_CALL_SCHEDULED":
        return <Video className="w-5 h-5 text-indigo-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case "TASK_ASSIGNED":
        return "Task";
      case "EVENT_REMINDER":
        return "Event";
      case "DOCUMENT_UPLOADED":
        return "Document";
      case "BILL_OVERDUE":
        return "Billing";
      case "VIDEO_CALL_SCHEDULED":
        return "Video Call";
      case "CASE_UPDATE":
        return "Case";
      default:
        return "System";
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
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
      <div className="container-responsive py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-gray-200 dark:bg-gray-700 rounded"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-responsive py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Notifications
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
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
              <span>Mark all read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Type Filter */}
          <CustomSelect
            options={[
              { value: "all", label: "All Types" },
              { value: "TASK_ASSIGNED", label: "Tasks" },
              { value: "EVENT_REMINDER", label: "Events" },
              { value: "DOCUMENT_UPLOADED", label: "Documents" },
              { value: "BILL_OVERDUE", label: "Billing" },
              { value: "VIDEO_CALL_SCHEDULED", label: "Video Calls" },
              { value: "CASE_UPDATE", label: "Cases" },
            ]}
            value={{
              value: filterType,
              label:
                filterType === "all"
                  ? "All Types"
                  : filterType
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase()),
            }}
            onChange={(option) => setFilterType(option?.value || "all")}
            placeholder="Select type"
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
                  : filterRead === "unread"
                    ? "Unread"
                    : "Read",
            }}
            onChange={(option) => setFilterRead(option?.value || "all")}
            placeholder="Select status"
          />
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <Bell className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No notifications found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || filterType !== "all" || filterRead !== "all"
                ? "Try adjusting your filters or search terms."
                : "You're all caught up!"}
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors ${
                !notification.isRead
                  ? "ring-2 ring-blue-500 ring-opacity-50"
                  : ""
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <p
                          className={`text-lg font-semibold ${
                            notification.isRead
                              ? "text-gray-600 dark:text-gray-400"
                              : "text-gray-900 dark:text-white"
                          }`}
                        >
                          {notification.title}
                        </p>
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                          {getNotificationTypeLabel(notification.type)}
                        </span>
                        {!notification.isRead && (
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {notification.message}
                      </p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setNotificationToDelete(null);
        }}
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
