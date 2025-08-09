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

interface ClientVideoCall {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  meetingId: string;
  status: string;
  case?: {
    id: string;
    caseNumber: string;
    title: string;
  } | null;
  host: {
    id: string;
    name: string;
    email: string;
  };
  participants: Array<{
    id: string;
    status: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

export default function ClientVideoCallsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const [videoCalls, setVideoCalls] = useState<ClientVideoCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  useEffect(() => {
    fetchVideoCalls();
  }, []);

  const fetchVideoCalls = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get("/client-portal/video-calls");
      setVideoCalls(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVideoCalls();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled":
        return theme.colors.primary;
      case "in_progress":
        return theme.colors.warning;
      case "completed":
        return theme.colors.success;
      case "cancelled":
        return theme.colors.error;
      default:
        return theme.colors.text;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled":
        return "time";
      case "in_progress":
        return "videocam";
      case "completed":
        return "checkmark-circle";
      case "cancelled":
        return "close-circle";
      default:
        return "time";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isUpcoming = (startTime: string) => {
    return new Date(startTime) > new Date();
  };

  const isToday = (startTime: string) => {
    const today = new Date();
    const callDate = new Date(startTime);
    return today.toDateString() === callDate.toDateString();
  };

  const isInProgress = (startTime: string, endTime: string, status: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);

    // Check if the meeting is actually in progress based on status and time
    // Handle both uppercase (IN_PROGRESS) and lowercase (in_progress) status values
    const isStatusInProgress =
      status.toLowerCase() === "in_progress" || status === "IN_PROGRESS";
    const isWithinTimeRange = now >= start && now <= end;

    // Meeting is in progress only if status is in_progress AND we're within the time range
    return isStatusInProgress && isWithinTimeRange;
  };

  const filteredVideoCalls = videoCalls.filter((call) => {
    const matchesSearch =
      call.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (call.case &&
        call.case.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      selectedStatus === "all" ||
      call.status.toLowerCase() === selectedStatus.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const statuses = Array.from(new Set(videoCalls.map((call) => call.status)));

  const upcomingCalls = filteredVideoCalls.filter((call) =>
    isUpcoming(call.startTime)
  );
  const inProgressCalls = filteredVideoCalls.filter((call) =>
    isInProgress(call.startTime, call.endTime, call.status)
  );
  const pastCalls = filteredVideoCalls.filter(
    (call) =>
      !isUpcoming(call.startTime) &&
      !isInProgress(call.startTime, call.endTime, call.status)
  );

  const getDisplayStatus = (
    startTime: string,
    endTime: string,
    status: string
  ) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);

    // If the meeting hasn't started yet, show as "SCHEDULED"
    if (now < start) {
      return "SCHEDULED";
    }

    // If the meeting has ended, show as "COMPLETED" regardless of backend status
    if (now > end) {
      return "COMPLETED";
    }

    // If we're within the time range, show the backend status
    return status;
  };

  const VideoCallCard = ({
    call,
    isPast = false,
  }: {
    call: ClientVideoCall;
    isPast?: boolean;
  }) => (
    <View
      style={[styles.videoCallCard, { backgroundColor: theme.colors.surface }]}
    >
      <View style={styles.callHeader}>
        <View style={styles.callIcon}>
          <Ionicons
            name="videocam"
            size={24}
            color={getStatusColor(
              getDisplayStatus(call.startTime, call.endTime, call.status)
            )}
          />
        </View>
        <View style={styles.callInfo}>
          <Text style={[styles.callTitle, { color: theme.colors.text }]}>
            {call.title}
          </Text>
          <View style={styles.callMeta}>
            <View
              style={[
                styles.statusTag,
                {
                  backgroundColor:
                    getStatusColor(
                      getDisplayStatus(
                        call.startTime,
                        call.endTime,
                        call.status
                      )
                    ) + "20",
                },
              ]}
            >
              <Ionicons
                name={
                  getStatusIcon(
                    getDisplayStatus(call.startTime, call.endTime, call.status)
                  ) as any
                }
                size={12}
                color={getStatusColor(
                  getDisplayStatus(call.startTime, call.endTime, call.status)
                )}
              />
              <Text
                style={[
                  styles.statusText,
                  {
                    color: getStatusColor(
                      getDisplayStatus(
                        call.startTime,
                        call.endTime,
                        call.status
                      )
                    ),
                  },
                ]}
              >
                {getDisplayStatus(call.startTime, call.endTime, call.status)
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </Text>
            </View>
            {isToday(call.startTime) && (
              <View
                style={[
                  styles.todayTag,
                  { backgroundColor: theme.colors.primary + "20" },
                ]}
              >
                <Text
                  style={[styles.todayText, { color: theme.colors.primary }]}
                >
                  TODAY
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {call.description && (
        <Text
          style={[
            styles.callDescription,
            { color: theme.colors.textSecondary },
          ]}
        >
          {call.description}
        </Text>
      )}

      <View style={styles.callDetails}>
        <View style={styles.detailRow}>
          <Ionicons
            name="calendar"
            size={16}
            color={theme.colors.textSecondary}
          />
          <Text
            style={[styles.detailText, { color: theme.colors.textSecondary }]}
          >
            {formatDate(call.startTime)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="time" size={16} color={theme.colors.textSecondary} />
          <Text
            style={[styles.detailText, { color: theme.colors.textSecondary }]}
          >
            {formatTime(call.startTime)} - {formatTime(call.endTime)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="key" size={16} color={theme.colors.textSecondary} />
          <Text
            style={[styles.detailText, { color: theme.colors.textSecondary }]}
          >
            Meeting ID: {call.meetingId}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text
            style={[styles.detailText, { color: theme.colors.textSecondary }]}
          >
            Case:{" "}
            <Text style={[styles.detailText, { color: theme.colors.text }]}>
              {call.case ? call.case.caseNumber : "No case assigned"}
            </Text>
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text
            style={[styles.detailText, { color: theme.colors.textSecondary }]}
          >
            Host:{" "}
            <Text style={[styles.detailText, { color: theme.colors.text }]}>
              {call.host.name}
            </Text>
          </Text>
        </View>

        {call.participants.length > 0 && (
          <View style={styles.participantsContainer}>
            <Text
              style={[
                styles.participantsTitle,
                { color: theme.colors.textSecondary },
              ]}
            >
              Participants ({call.participants.length}):
            </Text>
            <View style={styles.participantsList}>
              {call.participants.slice(0, 3).map((participant) => (
                <View key={participant.id} style={styles.participantItem}>
                  <Text
                    style={[
                      styles.participantName,
                      { color: theme.colors.text },
                    ]}
                  >
                    {participant.user.name}
                  </Text>
                  <View
                    style={[
                      styles.statusTag,
                      { backgroundColor: theme.colors.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {participant.status.replace(/\b\w/g, (l) =>
                        l.toUpperCase()
                      )}
                    </Text>
                  </View>
                </View>
              ))}
              {call.participants.length > 3 && (
                <Text
                  style={[
                    styles.moreParticipants,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  +{call.participants.length - 3} more
                </Text>
              )}
            </View>
          </View>
        )}
      </View>

      <View style={styles.callActions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.viewButton,
            { borderColor: theme.colors.border },
          ]}
          onPress={() =>
            Alert.alert("View Call", "View functionality will be implemented")
          }
        >
          <Ionicons name="eye" size={16} color={theme.colors.text} />
          <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>
            View
          </Text>
        </TouchableOpacity>

        {!isPast && call.status.toLowerCase() === "scheduled" && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.joinButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() =>
              Alert.alert("Join Call", "Join functionality will be implemented")
            }
          >
            <Ionicons name="videocam" size={16} color="white" />
            <Text style={[styles.actionButtonText, { color: "white" }]}>
              Join
            </Text>
          </TouchableOpacity>
        )}

        {isInProgress(call.startTime, call.endTime, call.status) && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.joinButton,
              { backgroundColor: theme.colors.warning },
            ]}
            onPress={() =>
              Alert.alert(
                "Join Active Call",
                "Join functionality will be implemented"
              )
            }
          >
            <Ionicons name="videocam" size={16} color="white" />
            <Text style={[styles.actionButtonText, { color: "white" }]}>
              Join Now
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
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
            Video Calls
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[styles.loadingText, { color: theme.colors.textSecondary }]}
          >
            Loading video calls...
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
            Video Calls
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
            onPress={fetchVideoCalls}
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
          Video Calls
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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
              placeholder="Search video calls..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
          </View>

          <View style={styles.filtersContainer}>
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
                        selectedStatus === "all" ? "white" : theme.colors.text,
                    },
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>
              {statuses.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterChip,
                    selectedStatus === status && {
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                  onPress={() => setSelectedStatus(status)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color:
                          selectedStatus === status
                            ? "white"
                            : theme.colors.text,
                      },
                    ]}
                  >
                    {status
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Text
            style={[styles.resultsCount, { color: theme.colors.textSecondary }]}
          >
            {filteredVideoCalls.length} call
            {filteredVideoCalls.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Video Calls List */}
        {filteredVideoCalls.length === 0 ? (
          <View
            style={[
              styles.emptyContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Ionicons
              name="videocam"
              size={64}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No video calls found
            </Text>
            <Text
              style={[
                styles.emptyMessage,
                { color: theme.colors.textSecondary },
              ]}
            >
              {searchTerm || selectedStatus !== "all"
                ? "Try adjusting your filters to see more results."
                : "Video calls will appear here once they are scheduled for your cases."}
            </Text>
          </View>
        ) : (
          <View style={styles.callsList}>
            {/* In Progress Calls */}
            {inProgressCalls.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.text }]}
                >
                  In Progress ({inProgressCalls.length})
                </Text>
                {inProgressCalls.map((call) => (
                  <VideoCallCard key={call.id} call={call} />
                ))}
              </View>
            )}

            {/* Upcoming Calls */}
            {upcomingCalls.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.text }]}
                >
                  Upcoming ({upcomingCalls.length})
                </Text>
                {upcomingCalls.map((call) => (
                  <VideoCallCard key={call.id} call={call} />
                ))}
              </View>
            )}

            {/* Past Calls */}
            {pastCalls.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.text }]}
                >
                  Past ({pastCalls.length})
                </Text>
                {pastCalls.map((call) => (
                  <VideoCallCard key={call.id} call={call} isPast={true} />
                ))}
              </View>
            )}
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
  filterLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
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
  callsList: {
    padding: 16,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  videoCallCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  callHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  callIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  callInfo: {
    flex: 1,
  },
  callTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  callMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  todayTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  todayText: {
    fontSize: 10,
    fontWeight: "700",
  },
  callDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  callDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 8,
  },
  participantsContainer: {
    marginTop: 8,
  },
  participantsTitle: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  participantsList: {
    gap: 4,
  },
  participantItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  participantName: {
    fontSize: 14,
  },
  moreParticipants: {
    fontSize: 12,
    fontStyle: "italic",
  },
  callActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  viewButton: {
    backgroundColor: "transparent",
  },
  joinButton: {
    borderColor: "transparent",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
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
