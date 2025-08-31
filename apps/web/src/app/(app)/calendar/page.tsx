"use client";

import LoadingOverlay from "@/components/LoadingOverlay";
import ModalDialog from "@/components/ui/ModalDialog";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  Gavel,
  MapPin,
  Plus,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  eventType: string;
  isAllDay: boolean;
  isRecurring?: boolean;
  recurrenceRule?: string;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  case?: {
    id: string;
    caseNumber: string;
    title: string;
  };
  client?: {
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

interface Case {
  id: string;
  caseNumber: string;
  title: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isGoogleCalendarConnected, setIsGoogleCalendarConnected] =
    useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Role-based access control
  const isLawyer =
    user?.role === "LAWYER" ||
    user?.role === "ASSOCIATE" ||
    user?.role === "PARALEGAL";
  const isClient = user?.role === "CLIENT";
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  // Only lawyers and admins can create/edit/delete events
  const canManageEvents = isLawyer || isAdmin;

  // Select options
  const eventTypeOptions: { value: string; label: string }[] = [
    { value: "HEARING", label: "Court Hearing" },
    { value: "CLIENT_MEETING", label: "Client Meeting" },
    { value: "COURT_APPEARANCE", label: "Court Appearance" },
    { value: "DEADLINE", label: "Deadline" },
    { value: "INTERNAL_MEETING", label: "Internal Meeting" },
    { value: "OTHER", label: "Other" },
  ];

  const [createFormData, setCreateFormData] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    location: "",
    eventType: "CLIENT_MEETING",
    isAllDay: false,
    isRecurring: false,
    recurrenceRule: "",
    caseId: "",
    clientId: "",
    participants: [] as string[],
  });

  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    location: "",
    eventType: "CLIENT_MEETING",
    isAllDay: false,
    isRecurring: false,
    recurrenceRule: "",
    caseId: "",
    clientId: "",
    participants: [] as string[],
  });

  useEffect(() => {
    fetchEvents();
    if (canManageEvents) {
      fetchCases();
      fetchUsers();
    }
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      let response;

      if (isClient) {
        // For clients, fetch events from client portal API
        const apiResponse = await fetch("/api/client-portal/events", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (!apiResponse.ok) {
          throw new Error("Failed to fetch events");
        }
        response = await apiResponse.json();
      } else {
        // For lawyers and admins, fetch from main API
        response = await apiClient.getCalendarEvents();
      }

      if (response && Array.isArray(response)) {
        setEvents(response);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCases = async () => {
    try {
      const response = await apiClient.getCases();
      if (response && Array.isArray(response)) {
        setCases(response);
      } else {
        setCases([]);
      }
    } catch (error) {
      console.error("Error fetching cases:", error);
      setCases([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await apiClient.getClients();
      if (response && Array.isArray(response)) {
        setUsers(response);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    // Frontend date validation
    try {
      // Validate and format dates
      const startTime = validateAndFormatDate(
        createFormData.startTime,
        "start time"
      );
      const endTime = validateAndFormatDate(createFormData.endTime, "end time");

      // Validate that end time is after start time
      if (startTime >= endTime) {
        toast.error("End time must be after start time");
        return;
      }

      // Create validated form data
      const validatedFormData = {
        ...createFormData,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      };

      const response = await apiClient.createCalendarEvent(validatedFormData);
      if (response) {
        toast.success("Event created successfully");
        setShowCreateModal(false);
        setCreateFormData({
          title: "",
          description: "",
          startTime: "",
          endTime: "",
          location: "",
          eventType: "CLIENT_MEETING",
          isAllDay: false,
          isRecurring: false,
          recurrenceRule: "",
          caseId: "",
          clientId: "",
          participants: [],
        });
        fetchEvents();
      }
    } catch (error) {
      console.error("Error creating event:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to create event");
      }
    }
  };

  const handleEditClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setEditFormData({
      title: event.title,
      description: event.description || "",
      startTime: formatDateForInput(event.startTime),
      endTime: formatDateForInput(event.endTime),
      location: event.location || "",
      eventType: event.eventType,
      isAllDay: event.isAllDay,
      isRecurring: event.isRecurring || false,
      recurrenceRule: event.recurrenceRule || "",
      caseId: event.case?.id || "",
      clientId: event.client?.id || "",
      participants: event.participants.map((p) => p.user.id),
    });
    setShowEditModal(true);
  };

  const handleEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    try {
      // Frontend date validation
      const startTime = validateAndFormatDate(
        editFormData.startTime,
        "start time"
      );
      const endTime = validateAndFormatDate(editFormData.endTime, "end time");

      // Validate that end time is after start time
      if (startTime >= endTime) {
        toast.error("End time must be after start time");
        return;
      }

      // Create validated form data
      const validatedFormData = {
        ...editFormData,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      };

      const response = await apiClient.updateCalendarEvent(
        selectedEvent.id,
        validatedFormData
      );
      if (response) {
        toast.success("Event updated successfully");
        setShowEditModal(false);
        setSelectedEvent(null);
        fetchEvents();
      }
    } catch (error) {
      console.error("Error updating event:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to update event");
      }
    }
  };

  const handleViewClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowViewModal(true);
  };

  const handleDeleteClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowDeleteConfirm(true);
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    try {
      await apiClient.deleteCalendarEvent(selectedEvent.id);
      toast.success("Event deleted successfully");
      setShowDeleteConfirm(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
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

  // Helper function to format date for datetime-local input
  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);

    // Handle timezone conversion to local time
    const localDate = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    );

    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, "0");
    const day = String(localDate.getDate()).padStart(2, "0");
    const hours = String(localDate.getHours()).padStart(2, "0");
    const minutes = String(localDate.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case "HEARING":
        return <Gavel className="w-4 h-4" />;
      case "CLIENT_MEETING":
        return <Users className="w-4 h-4" />;
      case "COURT_APPEARANCE":
        return <Gavel className="w-4 h-4" />;
      case "DEADLINE":
        return <Clock className="w-4 h-4" />;
      case "INTERNAL_MEETING":
        return <Users className="w-4 h-4" />;
      default:
        return <CalendarIcon className="w-4 h-4" />;
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case "HEARING":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case "CLIENT_MEETING":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "COURT_APPEARANCE":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
      case "DEADLINE":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "INTERNAL_MEETING":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getParticipantStatusColor = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return "text-green-600";
      case "DECLINED":
        return "text-red-600";
      case "PENDING":
        return "text-yellow-600";
      default:
        return "text-muted-foreground";
    }
  };

  // Calendar navigation functions
  const goToPreviousPeriod = () => {
    if (viewMode === "month") {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
      );
    } else if (viewMode === "week") {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    } else if (viewMode === "day") {
      const newDate = new Date(selectedDate);
      newDate.setDate(selectedDate.getDate() - 1);
      setSelectedDate(newDate);
      setCurrentDate(newDate);
    }
  };

  const goToNextPeriod = () => {
    if (viewMode === "month") {
      setCurrentDate(
        new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
      );
    } else if (viewMode === "week") {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    } else if (viewMode === "day") {
      const newDate = new Date(selectedDate);
      newDate.setDate(selectedDate.getDate() + 1);
      setSelectedDate(newDate);
      setCurrentDate(newDate);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    if (viewMode === "day") {
      setCurrentDate(date);
    }
  };

  const handleDateDoubleClick = (date: Date) => {
    setSelectedDate(date);
    setCurrentDate(date);
    setViewMode("day");
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getEventsForDate = (date: Date) => {
    if (!date) return [];
    return events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const isToday = (date: Date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    if (!date) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  // Week and Day view helper functions
  const getWeekDays = (date: Date) => {
    const weekDays = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay()); // Start from Sunday

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }

    return weekDays;
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 22; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
    }
    return slots;
  };

  const getEventsForDateAndTime = (date: Date, timeSlot: string) => {
    if (!date) return [];
    const [hour] = timeSlot.split(":").map(Number);

    return events.filter((event) => {
      const eventDate = new Date(event.startTime);
      const eventHour = eventDate.getHours();

      return (
        eventDate.toDateString() === date.toDateString() && eventHour === hour
      );
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <LoadingOverlay
        isVisible={loading}
        title="Loading Calendar"
        message="Please wait while we fetch your calendar events..."
        absolute={false}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isClient
                  ? "View your upcoming events and deadlines"
                  : "Manage your calendar and schedule events"}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {canManageEvents && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Event
                </button>
              )}
              <button
                onClick={goToToday}
                className="inline-flex items-center px-3 py-2 border border-border text-sm font-medium rounded-md text-foreground bg-background hover:bg-muted"
              >
                Today
              </button>
              <button
                onClick={async () => {
                  try {
                    const response = await apiClient.getGoogleAuthUrl();
                    if (response && response.authUrl) {
                      window.open(response.authUrl, "_blank");
                    }
                  } catch (error) {
                    console.error("Failed to get Google auth URL:", error);
                  }
                }}
                className="inline-flex items-center px-3 py-2 border border-border text-sm font-medium rounded-md text-foreground bg-background hover:bg-muted"
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                Connect Google
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Navigation */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={goToPreviousPeriod}
                className="p-2 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold text-foreground">
                {viewMode === "month" &&
                  currentDate.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                {viewMode === "week" &&
                  `${getWeekDays(currentDate)[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${getWeekDays(currentDate)[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                {viewMode === "day" &&
                  selectedDate.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
              </h2>
              <button
                onClick={goToNextPeriod}
                className="p-2 text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode("month")}
                className={`px-3 py-1 text-sm font-medium rounded-md ${
                  viewMode === "month"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode("week")}
                className={`px-3 py-1 text-sm font-medium rounded-md ${
                  viewMode === "week"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode("day")}
                className={`px-3 py-1 text-sm font-medium rounded-md ${
                  viewMode === "day"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Day
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          {viewMode === "month" && (
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden p-1">
              {/* Day headers */}
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="bg-muted p-2 text-center text-sm font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {getDaysInMonth(currentDate).map((date, index) => (
                <div
                  key={index}
                  className={`min-h-[120px] bg-card p-3 cursor-pointer hover:bg-muted transition-colors ${
                    date && isToday(date)
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : ""
                  } ${date && isSelected(date) ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
                  onClick={() => date && handleDateClick(date)}
                  onDoubleClick={() => date && handleDateDoubleClick(date)}
                >
                  {date && (
                    <>
                      <div className="text-sm font-medium text-foreground mb-1 pl-1">
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {getEventsForDate(date)
                          .slice(0, 3)
                          .map((event) => (
                            <div
                              key={event.id}
                              className={`text-xs p-1 rounded cursor-pointer ${getEventTypeColor(
                                event.eventType
                              )}`}
                              onClick={() =>
                                canManageEvents
                                  ? handleEditClick(event)
                                  : handleViewClick(event)
                              }
                            >
                              <div className="font-medium truncate">
                                {event.title}
                              </div>
                              <div className="text-xs opacity-75">
                                {formatTime(event.startTime)}
                              </div>
                            </div>
                          ))}
                        {getEventsForDate(date).length > 3 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{getEventsForDate(date).length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Week View */}
          {viewMode === "week" && (
            <div className="grid grid-cols-8 gap-px bg-border rounded-lg overflow-hidden p-1">
              {/* Time column header */}
              <div className="bg-muted p-2 text-center text-sm font-medium text-muted-foreground">
                Time
              </div>

              {/* Day headers */}
              {getWeekDays(currentDate).map((date) => (
                <div
                  key={date.toISOString()}
                  className="bg-muted p-2 text-center text-sm font-medium text-muted-foreground"
                >
                  <div>
                    {date.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div className="text-xs">{date.getDate()}</div>
                </div>
              ))}

              {/* Time slots */}
              {getTimeSlots().map((timeSlot) => (
                <div key={timeSlot} className="contents">
                  {/* Time label */}
                  <div className="bg-card p-2 text-xs text-muted-foreground text-right pr-3 border-r border-border">
                    {timeSlot}
                  </div>

                  {/* Day columns */}
                  {getWeekDays(currentDate).map((date) => (
                    <div
                      key={date.toISOString()}
                      className={`bg-card p-1 border-r border-border min-h-[60px] ${
                        isToday(date) ? "bg-blue-50 dark:bg-blue-900/20" : ""
                      }`}
                    >
                      {getEventsForDateAndTime(date, timeSlot).map((event) => (
                        <div
                          key={event.id}
                          className={`text-xs p-1 rounded cursor-pointer mb-1 ${getEventTypeColor(
                            event.eventType
                          )}`}
                          onClick={() =>
                            canManageEvents
                              ? handleEditClick(event)
                              : handleViewClick(event)
                          }
                        >
                          <div className="font-medium truncate">
                            {event.title}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Day View */}
          {viewMode === "day" && (
            <div className="grid grid-cols-1 gap-px bg-border rounded-lg overflow-hidden p-1">
              {/* Day header */}
              <div className="bg-muted p-4 text-center">
                <div className="text-lg font-medium text-foreground">
                  {selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
              </div>

              {/* Time slots */}
              {getTimeSlots().map((timeSlot) => (
                <div
                  key={timeSlot}
                  className="bg-card p-3 border-b border-border min-h-[80px]"
                >
                  <div className="flex">
                    <div className="w-20 text-sm font-medium text-muted-foreground">
                      {timeSlot}
                    </div>
                    <div className="flex-1">
                      {getEventsForDateAndTime(selectedDate, timeSlot).map(
                        (event) => (
                          <div
                            key={event.id}
                            className={`p-2 rounded cursor-pointer mb-2 ${getEventTypeColor(
                              event.eventType
                            )}`}
                            onClick={() =>
                              canManageEvents
                                ? handleEditClick(event)
                                : handleViewClick(event)
                            }
                          >
                            <div className="font-medium">{event.title}</div>
                            {event.description && (
                              <div className="text-sm opacity-75 mt-1">
                                {event.description}
                              </div>
                            )}
                            {event.location && (
                              <div className="text-xs opacity-75 mt-1 flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                {event.location}
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Events List */}
        <div className="bg-card border border-border rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-lg font-medium text-foreground">
              Upcoming Events
            </h3>
          </div>
          <div className="divide-y divide-border">
            {events.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium text-foreground">
                  No events
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {canManageEvents
                    ? "Get started by creating a new event."
                    : "No upcoming events scheduled."}
                </p>
                {canManageEvents && (
                  <div className="mt-6">
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      New Event
                    </button>
                  </div>
                )}
              </div>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="px-6 py-4 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-3 h-3 rounded-full ${getEventTypeColor(
                            event.eventType
                          )}`}
                        ></div>
                        <h4 className="text-sm font-medium text-foreground">
                          {event.title}
                        </h4>
                      </div>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {event.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDate(event.startTime)} at{" "}
                          {formatTime(event.startTime)}
                        </span>
                        {event.location && (
                          <span className="flex items-center">
                            <MapPin className="w-3 h-3 mr-1" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewClick(event)}
                        className="p-1 text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {canManageEvents && (
                        <>
                          <button
                            onClick={() => handleEditClick(event)}
                            className="p-1 text-muted-foreground hover:text-foreground"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(event)}
                            className="p-1 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Create Event Modal */}
        {showCreateModal && (
          <ModalDialog
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            header="Create New Event"
          >
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={createFormData.title}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      title: e.target.value,
                    })
                  }
                  className="mt-1 block w-full border border-border rounded-md px-3 py-2 text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  value={createFormData.description}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className="mt-1 block w-full border border-border rounded-md px-3 py-2 text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={createFormData.startTime}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        startTime: e.target.value,
                      })
                    }
                    className="mt-1 block w-full border border-border rounded-md px-3 py-2 text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Select date and time
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={
                      createFormData.startTime && createFormData.endTime
                        ? createFormData.endTime
                        : ""
                    }
                    min={createFormData.startTime || undefined}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        endTime: e.target.value,
                      })
                    }
                    className="mt-1 block w-full border border-border rounded-md px-3 py-2 text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Must be after start time
                  </p>
                </div>
              </div>

              {/* Date Preview */}
              {(createFormData.startTime || createFormData.endTime) && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                    Date Preview:
                  </p>
                  <div className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
                    {createFormData.startTime && (
                      <p>Start: {getDatePreview(createFormData.startTime)}</p>
                    )}
                    {createFormData.endTime && (
                      <p>End: {getDatePreview(createFormData.endTime)}</p>
                    )}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Location
                </label>
                <input
                  type="text"
                  value={createFormData.location}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      location: e.target.value,
                    })
                  }
                  className="mt-1 block w-full border border-border rounded-md px-3 py-2 text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Event Type
                </label>
                <select
                  value={createFormData.eventType}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      eventType: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                >
                  <option value="">Select event type</option>
                  {eventTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {cases.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Related Case (Optional)
                  </label>
                  <select
                    value={createFormData.caseId}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        caseId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  >
                    <option value="">Select a case</option>
                    {cases.map((case_) => (
                      <option key={case_.id} value={case_.id}>
                        {case_.caseNumber} - {case_.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {users.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Related Client (Optional)
                  </label>
                  <select
                    value={createFormData.clientId}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        clientId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  >
                    <option value="">Select a client</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} - {user.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={createFormData.isRecurring}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      isRecurring: e.target.checked,
                    })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="isRecurring"
                  className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                >
                  Recurring event
                </label>
              </div>
              {createFormData.isRecurring && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Recurrence Rule
                  </label>
                  <input
                    type="text"
                    value={createFormData.recurrenceRule}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        recurrenceRule: e.target.value,
                      })
                    }
                    placeholder="e.g., FREQ=WEEKLY;INTERVAL=1"
                    className="mt-1 block w-full border border-border rounded-md px-3 py-2 text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isAllDay"
                  checked={createFormData.isAllDay}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      isAllDay: e.target.checked,
                    })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="isAllDay"
                  className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                >
                  All day event
                </label>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground bg-background border border-border rounded-md hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Create Event
                </button>
              </div>
            </form>
          </ModalDialog>
        )}

        {/* Edit Event Modal */}
        {showEditModal && selectedEvent && (
          <ModalDialog
            isOpen={showEditModal}
            onClose={() => setShowEditModal(false)}
            header="Edit Event"
          >
            <form onSubmit={handleEditEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.title}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, title: e.target.value })
                  }
                  className="mt-1 block w-full border border-border rounded-md px-3 py-2 text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className="mt-1 block w-full border border-border rounded-md px-3 py-2 text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={editFormData.startTime}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        startTime: e.target.value,
                      })
                    }
                    className="mt-1 block w-full border border-border rounded-md px-3 py-2 text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={editFormData.endTime}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        endTime: e.target.value,
                      })
                    }
                    className="mt-1 block w-full border border-border rounded-md px-3 py-2 text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Location
                </label>
                <input
                  type="text"
                  value={editFormData.location}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      location: e.target.value,
                    })
                  }
                  className="mt-1 block w-full border border-border rounded-md px-3 py-2 text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Event Type
                </label>
                <select
                  value={editFormData.eventType}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      eventType: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                >
                  <option value="">Select event type</option>
                  {eventTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {cases.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Related Case (Optional)
                  </label>
                  <select
                    value={editFormData.caseId}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        caseId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  >
                    <option value="">Select a case</option>
                    {cases.map((case_) => (
                      <option key={case_.id} value={case_.id}>
                        {case_.caseNumber} - {case_.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {users.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Related Client (Optional)
                  </label>
                  <select
                    value={editFormData.clientId}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        clientId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  >
                    <option value="">Select a client</option>
                    {users
                      .filter((user) => user.role === "CLIENT")
                      .map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} - {user.email}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="editIsRecurring"
                  checked={editFormData.isRecurring}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      isRecurring: e.target.checked,
                    })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="editIsRecurring"
                  className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                >
                  Recurring event
                </label>
              </div>
              {editFormData.isRecurring && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Recurrence Rule
                  </label>
                  <input
                    type="text"
                    value={editFormData.recurrenceRule}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        recurrenceRule: e.target.value,
                      })
                    }
                    placeholder="e.g., FREQ=WEEKLY;INTERVAL=1"
                    className="mt-1 block w-full border border-border rounded-md px-3 py-2 text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="editIsAllDay"
                  checked={editFormData.isAllDay}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      isAllDay: e.target.checked,
                    })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="editIsAllDay"
                  className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                >
                  All day event
                </label>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground bg-background border border-border rounded-md hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Update Event
                </button>
              </div>
            </form>
          </ModalDialog>
        )}

        {/* View Event Modal */}
        {showViewModal && selectedEvent && (
          <ModalDialog
            isOpen={showViewModal}
            onClose={() => setShowViewModal(false)}
            header={selectedEvent.title}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <p className="mt-1 text-sm text-foreground">
                  {selectedEvent.description || "No description provided"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Start Time
                  </label>
                  <p className="mt-1 text-sm text-foreground">
                    {formatDate(selectedEvent.startTime)} at{" "}
                    {formatTime(selectedEvent.startTime)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    End Time
                  </label>
                  <p className="mt-1 text-sm text-foreground">
                    {formatDate(selectedEvent.endTime)} at{" "}
                    {formatTime(selectedEvent.endTime)}
                  </p>
                </div>
              </div>
              {selectedEvent.location && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Location
                  </label>
                  <p className="mt-1 text-sm text-foreground">
                    {selectedEvent.location}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Event Type
                </label>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventTypeColor(selectedEvent.eventType)}`}
                  >
                    {getEventTypeIcon(selectedEvent.eventType)}
                    <span className="ml-1">
                      {eventTypeOptions.find(
                        (opt) => opt.value === selectedEvent.eventType
                      )?.label || selectedEvent.eventType}
                    </span>
                  </span>
                </div>
              </div>
              {selectedEvent.case && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Related Case
                  </label>
                  <p className="mt-1 text-sm text-foreground">
                    {selectedEvent.case.caseNumber} - {selectedEvent.case.title}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Created By
                </label>
                <p className="mt-1 text-sm text-foreground">
                  {selectedEvent.createdBy.name}
                </p>
              </div>
              {selectedEvent.participants.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Participants
                  </label>
                  <div className="mt-1 space-y-2">
                    {selectedEvent.participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-foreground">
                          {participant.user.name}
                        </span>
                        <span
                          className={`text-xs ${getParticipantStatusColor(participant.status)}`}
                        >
                          {participant.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground bg-background border border-border rounded-md hover:bg-muted"
                >
                  Close
                </button>
              </div>
            </div>
          </ModalDialog>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && selectedEvent && (
          <ModalDialog
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            header="Delete Event"
          >
            <div className="space-y-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Are you sure you want to delete "{selectedEvent.title}"? This
                action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground bg-background border border-border rounded-md hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteEvent}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          </ModalDialog>
        )}
      </div>
    </div>
  );
}

/**
 * Validate and format date for API submission
 * Ensures proper ISO-8601 format that Prisma expects
 */
const validateAndFormatDate = (dateString: string, fieldName: string): Date => {
  if (!dateString) {
    throw new Error(`${fieldName} is required`);
  }

  try {
    // Handle datetime-local input format (e.g., "2025-08-21T18:07")
    let formattedDate = dateString;

    // Add seconds if missing
    if (formattedDate.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
      formattedDate = formattedDate + ":00";
    }

    // Add timezone if missing (assume local timezone)
    if (
      !formattedDate.includes("Z") &&
      !formattedDate.includes("+") &&
      !formattedDate.includes("-")
    ) {
      formattedDate = formattedDate + "Z";
    }

    const date = new Date(formattedDate);

    // Validate the date is valid
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid ${fieldName} format`);
    }

    return date;
  } catch (error) {
    throw new Error(`Invalid ${fieldName} format: ${dateString}`);
  }
};

/**
 * Get formatted date preview for display
 */
const getDatePreview = (dateString: string): string => {
  if (!dateString) return "";
  try {
    const date = validateAndFormatDate(dateString, "date");
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return "Invalid date";
  }
};
