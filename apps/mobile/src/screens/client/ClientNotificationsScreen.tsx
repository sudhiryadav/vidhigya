import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { apiClient } from "../../utils/apiClient";

interface ClientNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  case?: {
    id: string;
    caseNumber: string;
    title: string;
  };
}

export default function ClientNotificationsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get("/client-portal/notifications");
      setNotifications(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
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
      await apiClient.patch(
        `/client-portal/notifications/${notificationId}/read`
      );
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (err) {
      Alert.alert("Error", "Failed to mark notification as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.patch("/client-portal/notifications/mark-all-read");
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true }))
      );
    } catch (err) {
      Alert.alert("Error", "Failed to mark all notifications as read");
    }
  };

  const getNotificationTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "case_update":
        return theme.colors.primary;
      case "hearing_reminder":
        return theme.colors.warning;
      case "document_upload":
        return theme.colors.info;
      case "billing":
        return theme.colors.success;
      case "system":
        return theme.colors.text;
      default:
        return theme.colors.text;
    }
  };

  const getNotificationTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "case_update":
        return "document-text";
      case "hearing_reminder":
        return "calendar";
      case "document_upload":
        return "cloud-upload";
      case "billing":
        return "card";
      case "system":
        return "settings";
      default:
        return "notifications";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    const matchesSearch =
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.case?.caseNumber
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      false;

    const matchesType =
      selectedType === "all" ||
      notification.type.toLowerCase() === selectedType.toLowerCase();
    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "read" && notification.isRead) ||
      (selectedStatus === "unread" && !notification.isRead);

    return matchesSearch && matchesType && matchesStatus;
  });

  const notificationTypes = Array.from(
    new Set(notifications.map((notification) => notification.type))
  );

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;
  const readCount = notifications.filter(
    (notification) => notification.isRead
  ).length;

  const NotificationCard = ({
    notification,
  }: {
    notification: ClientNotification;
  }) => (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        {
          backgroundColor: theme.colors.surface,
          borderLeftColor: getNotificationTypeColor(notification.type),
          borderLeftWidth: notification.isRead ? 0 : 3,
        },
      ]}
      onPress={() => markAsRead(notification.id)}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.notificationIcon}>
          <Ionicons
            name={getNotificationTypeIcon(notification.type) as any}
            size={20}
            color={getNotificationTypeColor(notification.type)}
          />
        </View>
        <View style={styles.notificationInfo}>
          <Text
            style={[
              styles.notificationTitle,
              {
                color: theme.colors.text,
                fontWeight: notification.isRead ? "400" : "600",
              },
            ]}
          >
            {notification.title}
          </Text>
          <View style={styles.notificationMeta}>
            <View
              style={[
                styles.typeTag,
                {
                  backgroundColor:
                    getNotificationTypeColor(notification.type) + "20",
                },
              ]}
            >
              <Text
                style={[
                  styles.typeText,
                  { color: getNotificationTypeColor(notification.type) },
                ]}
              >
                {notification.type
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </Text>
            </View>
            <Text
              style={[styles.timeText, { color: theme.colors.textSecondary }]}
            >
              {formatDate(notification.createdAt)}
            </Text>
          </View>
        </View>
        {!notification.isRead && (
          <View
            style={[
              styles.unreadDot,
              { backgroundColor: theme.colors.primary },
            ]}
          />
        )}
      </View>

      <Text
        style={[
          styles.notificationMessage,
          { color: theme.colors.textSecondary },
        ]}
      >
        {notification.message}
      </Text>

      {notification.case && (
        <View style={styles.caseInfo}>
          <Text
            style={[styles.caseText, { color: theme.colors.textSecondary }]}
          >
            Case:{" "}
            <Text style={[styles.caseText, { color: theme.colors.text }]}>
              {notification.case.caseNumber}
            </Text>
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Notifications
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[styles.loadingText, { color: theme.colors.textSecondary }]}
          >
            Loading notifications...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Notifications
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
          <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
            Error
          </Text>
          <Text
            style={[styles.errorMessage, { color: theme.colors.textSecondary }]}
          >
            {error}
          </Text>
          <TouchableOpacity
            style={[
              styles.retryButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={fetchNotifications}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Notifications
        </Text>
        <TouchableOpacity onPress={markAllAsRead}>
          <Ionicons
            name="checkmark-done"
            size={24}
            color={theme.colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text
              style={[styles.summaryNumber, { color: theme.colors.primary }]}
            >
              {unreadCount}
            </Text>
            <Text
              style={[
                styles.summaryLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Unread
            </Text>
          </View>
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text style={[styles.summaryNumber, { color: theme.colors.text }]}>
              {readCount}
            </Text>
            <Text
              style={[
                styles.summaryLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Read
            </Text>
          </View>
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Text style={[styles.summaryNumber, { color: theme.colors.text }]}>
              {notifications.length}
            </Text>
            <Text
              style={[
                styles.summaryLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Total
            </Text>
          </View>
        </View>

        {/* Search and Filters */}
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <View style={styles.searchInputContainer}>
            <Ionicons
              name="search"
              size={20}
              color={theme.colors.textSecondary}
            />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Search notifications..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>

          <View style={styles.filtersContainer}>
            <View style={styles.filterRow}>
              <Text
                style={[
                  styles.filterLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Type:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedType === "all" && {
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                  onPress={() => setSelectedType("all")}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color:
                          selectedType === "all" ? "white" : theme.colors.text,
                      },
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {notificationTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterChip,
                      selectedType === type && {
                        backgroundColor: theme.colors.primary,
                      },
                    ]}
                    onPress={() => setSelectedType(type)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        {
                          color:
                            selectedType === type ? "white" : theme.colors.text,
                        },
                      ]}
                    >
                      {type
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterRow}>
              <Text
                style={[
                  styles.filterLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Status:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedStatus === "all" && {
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                  onPress={() => setSelectedStatus("all")}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color:
                          selectedStatus === "all"
                            ? "white"
                            : theme.colors.text,
                      },
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedStatus === "unread" && {
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                  onPress={() => setSelectedStatus("unread")}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color:
                          selectedStatus === "unread"
                            ? "white"
                            : theme.colors.text,
                      },
                    ]}
                  >
                    Unread
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedStatus === "read" && {
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                  onPress={() => setSelectedStatus("read")}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color:
                          selectedStatus === "read"
                            ? "white"
                            : theme.colors.text,
                      },
                    ]}
                  >
                    Read
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>

          <Text
            style={[styles.resultsCount, { color: theme.colors.textSecondary }]}
          >
            {filteredNotifications.length} notification
            {filteredNotifications.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <View
            style={[
              styles.emptyContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Ionicons
              name="notifications"
              size={64}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No notifications found
            </Text>
            <Text
              style={[
                styles.emptyMessage,
                { color: theme.colors.textSecondary },
              ]}
            >
              {searchTerm || selectedType !== "all" || selectedStatus !== "all"
                ? "Try adjusting your filters to see more results."
                : "Notifications will appear here when there are updates to your cases."}
            </Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {filteredNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  summaryContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
  },
  filtersContainer: {
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginRight: 8,
    minWidth: 50,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: "#f3f4f6",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  resultsCount: {
    fontSize: 14,
    textAlign: "right",
  },
  notificationsList: {
    padding: 16,
  },
  notificationCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  notificationMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  typeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 10,
    fontWeight: "500",
  },
  timeText: {
    fontSize: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 4,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  caseInfo: {
    marginTop: 4,
  },
  caseText: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    marginTop: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
});
