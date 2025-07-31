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

interface ClientEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  eventType: string;
  isAllDay: boolean;
  case: {
    id: string;
    caseNumber: string;
    title: string;
  };
  createdBy: {
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

export default function ClientEventsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();
  const [events, setEvents] = useState<ClientEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get("/client-portal/events");
      setEvents(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  const getEventTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "hearing":
        return theme.colors.error;
      case "client_meeting":
        return theme.colors.primary;
      case "court_appearance":
        return theme.colors.secondary;
      case "deadline":
        return theme.colors.warning;
      case "internal_meeting":
        return theme.colors.info;
      case "other":
        return theme.colors.text;
      default:
        return theme.colors.text;
    }
  };

  const getEventTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "hearing":
        return "gavel";
      case "client_meeting":
        return "people";
      case "court_appearance":
        return "business";
      case "deadline":
        return "time";
      case "internal_meeting":
        return "briefcase";
      case "other":
        return "calendar";
      default:
        return "calendar";
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
    const eventDate = new Date(startTime);
    return today.toDateString() === eventDate.toDateString();
  };

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.case.caseNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      selectedType === "all" ||
      event.eventType.toLowerCase() === selectedType.toLowerCase();

    return matchesSearch && matchesType;
  });

  const eventTypes = Array.from(
    new Set(events.map((event) => event.eventType))
  );

  const upcomingEvents = filteredEvents.filter((event) =>
    isUpcoming(event.startTime)
  );
  const pastEvents = filteredEvents.filter(
    (event) => !isUpcoming(event.startTime)
  );

  const EventCard = ({
    event,
    isPast = false,
  }: {
    event: ClientEvent;
    isPast?: boolean;
  }) => (
    <View style={[styles.eventCard, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.eventHeader}>
        <View style={styles.eventIcon}>
          <Ionicons
            name={getEventTypeIcon(event.eventType) as any}
            size={24}
            color={getEventTypeColor(event.eventType)}
          />
        </View>
        <View style={styles.eventInfo}>
          <Text style={[styles.eventTitle, { color: theme.colors.text }]}>
            {event.title}
          </Text>
          <View style={styles.eventMeta}>
            <View
              style={[
                styles.eventTypeTag,
                { backgroundColor: getEventTypeColor(event.eventType) + "20" },
              ]}
            >
              <Text
                style={[
                  styles.eventTypeText,
                  { color: getEventTypeColor(event.eventType) },
                ]}
              >
                {event.eventType
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </Text>
            </View>
            {isToday(event.startTime) && (
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

      {event.description && (
        <Text
          style={[
            styles.eventDescription,
            { color: theme.colors.textSecondary },
          ]}
        >
          {event.description}
        </Text>
      )}

      <View style={styles.eventDetails}>
        <View style={styles.detailRow}>
          <Ionicons
            name="calendar"
            size={16}
            color={theme.colors.textSecondary}
          />
          <Text
            style={[styles.detailText, { color: theme.colors.textSecondary }]}
          >
            {formatDate(event.startTime)}
          </Text>
        </View>

        {!event.isAllDay && (
          <View style={styles.detailRow}>
            <Ionicons
              name="time"
              size={16}
              color={theme.colors.textSecondary}
            />
            <Text
              style={[styles.detailText, { color: theme.colors.textSecondary }]}
            >
              {formatTime(event.startTime)} - {formatTime(event.endTime)}
            </Text>
          </View>
        )}

        {event.location && (
          <View style={styles.detailRow}>
            <Ionicons
              name="location"
              size={16}
              color={theme.colors.textSecondary}
            />
            <Text
              style={[styles.detailText, { color: theme.colors.textSecondary }]}
            >
              {event.location}
            </Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Text
            style={[styles.detailText, { color: theme.colors.textSecondary }]}
          >
            Case:{" "}
            <Text style={[styles.detailText, { color: theme.colors.text }]}>
              {event.case.caseNumber}
            </Text>
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text
            style={[styles.detailText, { color: theme.colors.textSecondary }]}
          >
            Created by:{" "}
            <Text style={[styles.detailText, { color: theme.colors.text }]}>
              {event.createdBy.name}
            </Text>
          </Text>
        </View>

        {event.participants.length > 0 && (
          <View style={styles.participantsContainer}>
            <Text
              style={[
                styles.participantsTitle,
                { color: theme.colors.textSecondary },
              ]}
            >
              Participants ({event.participants.length}):
            </Text>
            <View style={styles.participantsList}>
              {event.participants.slice(0, 3).map((participant) => (
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
              {event.participants.length > 3 && (
                <Text
                  style={[
                    styles.moreParticipants,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  +{event.participants.length - 3} more
                </Text>
              )}
            </View>
          </View>
        )}
      </View>

      <View style={styles.eventActions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.viewButton,
            { borderColor: theme.colors.border },
          ]}
          onPress={() =>
            Alert.alert("View Event", "View functionality will be implemented")
          }
        >
          <Ionicons name="eye" size={16} color={theme.colors.text} />
          <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>
            View
          </Text>
        </TouchableOpacity>

        {!isPast && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.joinButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={() =>
              Alert.alert(
                "Join Event",
                "Join functionality will be implemented"
              )
            }
          >
            <Ionicons name="videocam" size={16} color="white" />
            <Text style={[styles.actionButtonText, { color: "white" }]}>
              Join
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
            Events
          </Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[styles.loadingText, { color: theme.colors.textSecondary }]}
          >
            Loading events...
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
            Events
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
            onPress={fetchEvents}
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
          Events
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
              placeholder="Search events..."
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
              {eventTypes.map((type) => (
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

          <Text
            style={[styles.resultsCount, { color: theme.colors.textSecondary }]}
          >
            {filteredEvents.length} event
            {filteredEvents.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Events List */}
        {filteredEvents.length === 0 ? (
          <View
            style={[
              styles.emptyContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Ionicons
              name="calendar"
              size={64}
              color={theme.colors.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No events found
            </Text>
            <Text
              style={[
                styles.emptyMessage,
                { color: theme.colors.textSecondary },
              ]}
            >
              {searchTerm || selectedType !== "all"
                ? "Try adjusting your filters to see more results."
                : "Events will appear here once they are scheduled for your cases."}
            </Text>
          </View>
        ) : (
          <View style={styles.eventsList}>
            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.text }]}
                >
                  Upcoming Events ({upcomingEvents.length})
                </Text>
                {upcomingEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </View>
            )}

            {/* Past Events */}
            {pastEvents.length > 0 && (
              <View style={styles.sectionContainer}>
                <Text
                  style={[styles.sectionTitle, { color: theme.colors.text }]}
                >
                  Past Events ({pastEvents.length})
                </Text>
                {pastEvents.map((event) => (
                  <EventCard key={event.id} event={event} isPast={true} />
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
  eventsList: {
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
  eventCard: {
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
  eventHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  eventIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eventTypeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventTypeText: {
    fontSize: 12,
    fontWeight: "500",
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
  eventDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  eventDetails: {
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
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "500",
  },
  moreParticipants: {
    fontSize: 12,
    fontStyle: "italic",
  },
  eventActions: {
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
