import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

export default function NotificationsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterRead, setFilterRead] = useState<string>("all");

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
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
          message: 'Sarah uploaded "Contract Review" to case CASE-2024-001',
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
      ];

      setNotifications(mockNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Mock API call - replace with actual API call
      // await fetch(`/api/notifications/${notificationId}/read`, { method: 'PATCH' });

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
      // Mock API call - replace with actual API call
      // await fetch('/api/notifications/mark-all-read', { method: 'PATCH' });

      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true }))
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    Alert.alert(
      "Delete Notification",
      "Are you sure you want to delete this notification?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Mock API call - replace with actual API call
              // await fetch(`/api/notifications/${notificationId}`, { method: 'DELETE' });

              setNotifications((prev) =>
                prev.filter(
                  (notification) => notification.id !== notificationId
                )
              );
            } catch (error) {
              console.error("Error deleting notification:", error);
            }
          },
        },
      ]
    );
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
        return "checkmark-circle";
      case "EVENT_REMINDER":
        return "calendar";
      case "DOCUMENT_UPLOADED":
        return "document-text";
      case "BILL_OVERDUE":
        return "card";
      case "VIDEO_CALL_SCHEDULED":
        return "videocam";
      default:
        return "notifications";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "TASK_ASSIGNED":
        return "#3B82F6";
      case "EVENT_REMINDER":
        return "#10B981";
      case "DOCUMENT_UPLOADED":
        return "#8B5CF6";
      case "BILL_OVERDUE":
        return "#EF4444";
      case "VIDEO_CALL_SCHEDULED":
        return "#6366F1";
      default:
        return "#6B7280";
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    // Navigate based on actionUrl
    if (notification.actionUrl) {
      const route = notification.actionUrl.split("/")[1];
      const id = notification.actionUrl.split("/")[2];
      if (route && id) {
        navigation.navigate(route.charAt(0).toUpperCase() + route.slice(1), {
          id,
        });
      }
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    const matchesType =
      filterType === "all" || notification.type === filterType;
    const matchesRead =
      filterRead === "all" ||
      (filterRead === "read" && notification.isRead) ||
      (filterRead === "unread" && !notification.isRead);

    return matchesType && matchesRead;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        {
          backgroundColor: theme === "dark" ? "#1F2937" : "#FFFFFF",
          borderColor: theme === "dark" ? "#374151" : "#E5E7EB",
        },
        !item.isRead && {
          borderLeftColor: getNotificationColor(item.type),
          borderLeftWidth: 4,
        },
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.notificationIcon}>
          <Ionicons
            name={getNotificationIcon(item.type) as any}
            size={20}
            color={getNotificationColor(item.type)}
          />
        </View>
        <View style={styles.notificationContent}>
          <Text
            style={[
              styles.notificationTitle,
              {
                color: item.isRead
                  ? theme === "dark"
                    ? "#9CA3AF"
                    : "#6B7280"
                  : theme === "dark"
                    ? "#F9FAFB"
                    : "#111827",
              },
            ]}
          >
            {item.title}
          </Text>
          <Text
            style={[
              styles.notificationMessage,
              { color: theme === "dark" ? "#9CA3AF" : "#6B7280" },
            ]}
            numberOfLines={2}
          >
            {item.message}
          </Text>
          <Text
            style={[
              styles.notificationTime,
              { color: theme === "dark" ? "#6B7280" : "#9CA3AF" },
            ]}
          >
            {formatTime(item.createdAt)}
          </Text>
        </View>
        <View style={styles.notificationActions}>
          {!item.isRead && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => markAsRead(item.id)}
            >
              <Ionicons name="checkmark" size={16} color="#10B981" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => deleteNotification(item.id)}
          >
            <Ionicons name="trash" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFilterButton = (
    title: string,
    value: string,
    currentValue: string,
    onPress: (value: string) => void
  ) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        {
          backgroundColor:
            currentValue === value
              ? theme === "dark"
                ? "#3B82F6"
                : "#3B82F6"
              : theme === "dark"
                ? "#374151"
                : "#F3F4F6",
        },
      ]}
      onPress={() => onPress(value)}
    >
      <Text
        style={[
          styles.filterButtonText,
          {
            color:
              currentValue === value
                ? "#FFFFFF"
                : theme === "dark"
                  ? "#D1D5DB"
                  : "#374151",
          },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme === "dark" ? "#111827" : "#F9FAFB" },
        ]}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme === "dark" ? "#111827" : "#F9FAFB" },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[
            styles.headerTitle,
            { color: theme === "dark" ? "#F9FAFB" : "#111827" },
          ]}
        >
          Notifications
        </Text>
        <Text
          style={[
            styles.headerSubtitle,
            { color: theme === "dark" ? "#9CA3AF" : "#6B7280" },
          ]}
        >
          {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <Text
            style={[
              styles.filterLabel,
              { color: theme === "dark" ? "#D1D5DB" : "#374151" },
            ]}
          >
            Type:
          </Text>
          <View style={styles.filterButtons}>
            {renderFilterButton("All", "all", filterType, setFilterType)}
            {renderFilterButton(
              "Tasks",
              "TASK_ASSIGNED",
              filterType,
              setFilterType
            )}
            {renderFilterButton(
              "Events",
              "EVENT_REMINDER",
              filterType,
              setFilterType
            )}
            {renderFilterButton(
              "Documents",
              "DOCUMENT_UPLOADED",
              filterType,
              setFilterType
            )}
          </View>
        </View>
        <View style={styles.filterRow}>
          <Text
            style={[
              styles.filterLabel,
              { color: theme === "dark" ? "#D1D5DB" : "#374151" },
            ]}
          >
            Status:
          </Text>
          <View style={styles.filterButtons}>
            {renderFilterButton("All", "all", filterRead, setFilterRead)}
            {renderFilterButton("Unread", "unread", filterRead, setFilterRead)}
            {renderFilterButton("Read", "read", filterRead, setFilterRead)}
          </View>
        </View>
      </View>

      {/* Actions */}
      {unreadCount > 0 && (
        <TouchableOpacity
          style={[
            styles.markAllButton,
            { backgroundColor: theme === "dark" ? "#374151" : "#E5E7EB" },
          ]}
          onPress={markAllAsRead}
        >
          <Ionicons name="checkmark-done" size={16} color="#3B82F6" />
          <Text style={[styles.markAllText, { color: "#3B82F6" }]}>
            Mark all as read
          </Text>
        </TouchableOpacity>
      )}

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="notifications-off"
              size={48}
              color={theme === "dark" ? "#6B7280" : "#9CA3AF"}
            />
            <Text
              style={[
                styles.emptyTitle,
                { color: theme === "dark" ? "#F9FAFB" : "#111827" },
              ]}
            >
              No notifications found
            </Text>
            <Text
              style={[
                styles.emptySubtitle,
                { color: theme === "dark" ? "#9CA3AF" : "#6B7280" },
              ]}
            >
              {filterType !== "all" || filterRead !== "all"
                ? "Try adjusting your filters."
                : "You're all caught up!"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "500",
  },
  markAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    gap: 8,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: "500",
  },
  list: {
    flex: 1,
  },
  notificationItem: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
    marginRight: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
  },
  notificationActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
