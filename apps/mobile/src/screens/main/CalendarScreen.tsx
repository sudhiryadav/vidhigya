import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  FlatList,
} from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";
import { api, endpoints } from "../../services/api";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  eventType: string;
  isAllDay: boolean;
  case?: {
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
    user: {
      id: string;
      name: string;
      email: string;
    };
    status: string;
  }>;
}

interface VideoCall {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  meetingUrl: string;
  meetingId: string;
  status: string;
  case?: {
    id: string;
    caseNumber: string;
    title: string;
  };
  host: {
    id: string;
    name: string;
    email: string;
  };
  participants: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

const CalendarScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [videoCalls, setVideoCalls] = useState<VideoCall[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"upcoming" | "calendar">("upcoming");

  const fetchCalendarData = async () => {
    try {
      // Mock data - replace with actual API calls
      const mockEvents: CalendarEvent[] = [
        {
          id: "1",
          title: "Client Meeting - Smith Case",
          description: "Discuss settlement options",
          startTime: "2024-02-15T10:00:00.000Z",
          endTime: "2024-02-15T11:00:00.000Z",
          location: "Conference Room A",
          eventType: "CLIENT_MEETING",
          isAllDay: false,
          case: {
            id: "1",
            caseNumber: "CASE-2024-001",
            title: "Smith vs Johnson",
          },
          createdBy: {
            id: "1",
            name: "John Lawyer",
            email: "lawyer@vidhigya.com",
          },
          participants: [
            {
              id: "1",
              user: {
                id: "2",
                name: "John Smith",
                email: "john@example.com",
              },
              status: "ACCEPTED",
            },
          ],
        },
        {
          id: "2",
          title: "Court Hearing - Property Dispute",
          description: "Final hearing for property boundary case",
          startTime: "2024-02-18T14:30:00.000Z",
          endTime: "2024-02-18T16:00:00.000Z",
          location: "District Court Room 3",
          eventType: "COURT_APPEARANCE",
          isAllDay: false,
          case: {
            id: "2",
            caseNumber: "CASE-2024-002",
            title: "Property Boundary Dispute",
          },
          createdBy: {
            id: "1",
            name: "John Lawyer",
            email: "lawyer@vidhigya.com",
          },
          participants: [],
        },
      ];

      const mockVideoCalls: VideoCall[] = [
        {
          id: "1",
          title: "Video Consultation - Employment Case",
          description: "Initial consultation with client",
          startTime: "2024-02-16T15:00:00.000Z",
          endTime: "2024-02-16T16:00:00.000Z",
          meetingUrl: "https://meet.vidhigya.com/abc123",
          meetingId: "abc123",
          status: "SCHEDULED",
          case: {
            id: "3",
            caseNumber: "CASE-2024-003",
            title: "Employment Discrimination",
          },
          host: {
            id: "1",
            name: "John Lawyer",
            email: "lawyer@vidhigya.com",
          },
          participants: [
            {
              id: "1",
              user: {
                id: "3",
                name: "Jane Doe",
                email: "jane@example.com",
              },
            },
          ],
        },
      ];

      setEvents(mockEvents);
      setVideoCalls(mockVideoCalls);
    } catch (error) {
      console.error("Error fetching calendar data:", error);
      Alert.alert("Error", "Failed to load calendar data");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCalendarData();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case "HEARING":
        return theme.colors.error;
      case "CLIENT_MEETING":
        return theme.colors.primary;
      case "COURT_APPEARANCE":
        return theme.colors.warning;
      case "DEADLINE":
        return theme.colors.info;
      default:
        return theme.colors.secondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return theme.colors.primary;
      case "IN_PROGRESS":
        return theme.colors.success;
      case "COMPLETED":
        return theme.colors.secondary;
      default:
        return theme.colors.secondary;
    }
  };

  const renderEventItem = ({ item }: { item: CalendarEvent }) => (
    <TouchableOpacity
      style={[styles.eventCard, { backgroundColor: theme.colors.surface }]}
      onPress={() => Alert.alert("Event Details", item.title)}
    >
      <View style={styles.eventHeader}>
        <View
          style={[
            styles.eventTypeIndicator,
            { backgroundColor: getEventTypeColor(item.eventType) },
          ]}
        />
        <View style={styles.eventInfo}>
          <Text style={[styles.eventTitle, { color: theme.colors.text }]}>
            {item.title}
          </Text>
          <Text
            style={[styles.eventTime, { color: theme.colors.textSecondary }]}
          >
            {formatDate(item.startTime)} at {formatTime(item.startTime)}
          </Text>
          {item.location && (
            <Text
              style={[
                styles.eventLocation,
                { color: theme.colors.textSecondary },
              ]}
            >
              📍 {item.location}
            </Text>
          )}
          {item.case && (
            <Text style={[styles.eventCase, { color: theme.colors.primary }]}>
              📋 {item.case.caseNumber}
            </Text>
          )}
        </View>
      </View>
      {item.description && (
        <Text
          style={[
            styles.eventDescription,
            { color: theme.colors.textSecondary },
          ]}
        >
          {item.description}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderVideoCallItem = ({ item }: { item: VideoCall }) => (
    <TouchableOpacity
      style={[styles.videoCallCard, { backgroundColor: theme.colors.surface }]}
      onPress={() => Alert.alert("Video Call", `Join: ${item.meetingUrl}`)}
    >
      <View style={styles.videoCallHeader}>
        <View
          style={[
            styles.videoCallIcon,
            { backgroundColor: theme.colors.success },
          ]}
        >
          <Text style={styles.videoCallIconText}>📹</Text>
        </View>
        <View style={styles.videoCallInfo}>
          <Text style={[styles.videoCallTitle, { color: theme.colors.text }]}>
            {item.title}
          </Text>
          <Text
            style={[
              styles.videoCallTime,
              { color: theme.colors.textSecondary },
            ]}
          >
            {formatDate(item.startTime)} at {formatTime(item.startTime)}
          </Text>
          <View style={styles.videoCallStatus}>
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {item.status}
            </Text>
          </View>
          {item.case && (
            <Text
              style={[styles.videoCallCase, { color: theme.colors.primary }]}
            >
              📋 {item.case.caseNumber}
            </Text>
          )}
        </View>
      </View>
      {item.description && (
        <Text
          style={[
            styles.videoCallDescription,
            { color: theme.colors.textSecondary },
          ]}
        >
          {item.description}
        </Text>
      )}
    </TouchableOpacity>
  );

  const allItems = [
    ...events.map((event) => ({ ...event, type: "event" as const })),
    ...videoCalls.map((call) => ({ ...call, type: "videoCall" as const })),
  ].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const renderItem = ({ item }: { item: any }) => {
    if (item.type === "event") {
      return renderEventItem({ item });
    } else {
      return renderVideoCallItem({ item });
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Calendar
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Manage your schedule and appointments
        </Text>
      </View>

      {/* View Mode Toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === "upcoming" && {
              backgroundColor: theme.colors.primary,
            },
          ]}
          onPress={() => setViewMode("upcoming")}
        >
          <Text
            style={[
              styles.toggleText,
              { color: viewMode === "upcoming" ? "white" : theme.colors.text },
            ]}
          >
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === "calendar" && {
              backgroundColor: theme.colors.primary,
            },
          ]}
          onPress={() => setViewMode("calendar")}
        >
          <Text
            style={[
              styles.toggleText,
              { color: viewMode === "calendar" ? "white" : theme.colors.text },
            ]}
          >
            Calendar
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={() =>
            Alert.alert("Add Event", "Event creation form would appear here")
          }
        >
          <Text style={styles.actionButtonText}>Add Event</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: theme.colors.success },
          ]}
          onPress={() =>
            Alert.alert(
              "Schedule Call",
              "Video call scheduling form would appear here"
            )
          }
        >
          <Text style={styles.actionButtonText}>Schedule Call</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {viewMode === "upcoming" ? (
        <View style={styles.content}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Upcoming Events & Calls
          </Text>
          <FlatList
            data={allItems}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Calendar View
          </Text>
          <Text
            style={[
              styles.calendarPlaceholder,
              { color: theme.colors.textSecondary },
            ]}
          >
            Calendar grid view would be implemented here with month navigation
            and event indicators.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  viewToggle: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  actionButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  content: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },
  calendarPlaceholder: {
    textAlign: "center",
    paddingVertical: 40,
    fontSize: 16,
  },
  eventCard: {
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
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
  },
  eventTypeIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 14,
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 14,
    marginBottom: 2,
  },
  eventCase: {
    fontSize: 14,
    fontWeight: "500",
  },
  eventDescription: {
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  videoCallCard: {
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  videoCallHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  videoCallIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  videoCallIconText: {
    fontSize: 20,
  },
  videoCallInfo: {
    flex: 1,
  },
  videoCallTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  videoCallTime: {
    fontSize: 14,
    marginBottom: 4,
  },
  videoCallStatus: {
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
  },
  videoCallCase: {
    fontSize: 14,
    fontWeight: "500",
  },
  videoCallDescription: {
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
});

export default CalendarScreen;
