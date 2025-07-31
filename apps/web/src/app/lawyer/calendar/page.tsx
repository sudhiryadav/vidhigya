"use client";

import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import {
  AlertTriangle,
  Briefcase,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  MapPin,
  Plus,
  RefreshCw,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  eventType: string;
  isAllDay: boolean;
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
  const [createFormData, setCreateFormData] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    location: "",
    eventType: "CLIENT_MEETING",
    isAllDay: false,
    caseId: "",
    participantIds: [] as string[],
  });
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    location: "",
    eventType: "CLIENT_MEETING",
    isAllDay: false,
    caseId: "",
    participantIds: [] as string[],
  });

  useEffect(() => {
    fetchEvents();
    fetchCases();
    fetchUsers();
  }, [currentDate]);

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showDatePicker && !target.closest(".date-picker-container")) {
        setShowDatePicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDatePicker]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const startDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );
      const endDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      );

      const data = await apiClient.getCalendarEvents({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      setEvents(data as CalendarEvent[]);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCases = async () => {
    try {
      const data = await apiClient.getCases();
      setCases(data as Case[]);
    } catch (error) {
      console.error("Error fetching cases:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      // For now, we'll extract users from events since we don't have a dedicated users endpoint
      const data = await apiClient.getCalendarEvents();
      const userMap = new Map();
      (data as any[]).forEach((event) => {
        if (!userMap.has(event.createdBy.id)) {
          userMap.set(event.createdBy.id, event.createdBy);
        }
        event.participants.forEach((participant: any) => {
          if (!userMap.has(participant.user.id)) {
            userMap.set(participant.user.id, participant.user);
          }
        });
      });
      setUsers(Array.from(userMap.values()));
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.createCalendarEvent({
        title: createFormData.title,
        description: createFormData.description,
        startTime: createFormData.startTime,
        endTime: createFormData.endTime,
        location: createFormData.location || undefined,
        eventType: createFormData.eventType,
        isAllDay: createFormData.isAllDay,
        participantIds: createFormData.participantIds,
      });
      setShowCreateModal(false);
      setCreateFormData({
        title: "",
        description: "",
        startTime: "",
        endTime: "",
        location: "",
        eventType: "CLIENT_MEETING",
        isAllDay: false,
        caseId: "",
        participantIds: [],
      });
      fetchEvents();
    } catch (error) {
      console.error("Error creating event:", error);
    }
  };

  const handleEditClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setEditFormData({
      title: event.title,
      description: event.description || "",
      startTime: event.startTime.slice(0, 16),
      endTime: event.endTime.slice(0, 16),
      location: event.location || "",
      eventType: event.eventType,
      isAllDay: event.isAllDay,
      caseId: event.case?.id || "",
      participantIds: event.participants.map((p) => p.user.id),
    });
    setShowEditModal(true);
  };

  const handleEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    try {
      await apiClient.updateCalendarEvent(selectedEvent.id, {
        title: editFormData.title,
        description: editFormData.description,
        startTime: editFormData.startTime,
        endTime: editFormData.endTime,
        location: editFormData.location || undefined,
        eventType: editFormData.eventType,
        isAllDay: editFormData.isAllDay,
      });
      setShowEditModal(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (error) {
      console.error("Error updating event:", error);
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
      setShowDeleteConfirm(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
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

  const getEventTypeIcon = (eventType: string) => {
    const iconMap = {
      HEARING: AlertTriangle,
      CLIENT_MEETING: Users,
      COURT_APPEARANCE: Briefcase,
      DEADLINE: Clock,
      INTERNAL_MEETING: User,
      OTHER: CalendarIcon,
    };
    const Icon = iconMap[eventType as keyof typeof iconMap] || CalendarIcon;
    return <Icon className="w-4 h-4" />;
  };

  const getEventTypeColor = (eventType: string) => {
    const colorMap = {
      HEARING: "bg-red-100 text-red-800 border-red-200",
      CLIENT_MEETING: "bg-blue-100 text-blue-800 border-blue-200",
      COURT_APPEARANCE: "bg-purple-100 text-purple-800 border-purple-200",
      DEADLINE: "bg-orange-100 text-orange-800 border-orange-200",
      INTERNAL_MEETING: "bg-green-100 text-green-800 border-green-200",
      OTHER: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return (
      colorMap[eventType as keyof typeof colorMap] ||
      "bg-gray-100 text-gray-800 border-gray-200"
    );
  };

  const getParticipantStatusColor = (status: string) => {
    const statusMap = {
      PENDING: "bg-gray-100 text-gray-800",
      ACCEPTED: "bg-green-100 text-green-800",
      DECLINED: "bg-red-100 text-red-800",
      TENTATIVE: "bg-yellow-100 text-yellow-800",
    };
    return (
      statusMap[status as keyof typeof statusMap] || "bg-gray-100 text-gray-800"
    );
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

  const getDaysInWeek = (date: Date) => {
    const days = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay()); // Start from Sunday

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }

    return days;
  };

  const getHoursInDay = () => {
    const hours = [];
    for (let i = 0; i < 24; i++) {
      hours.push(i);
    }
    return hours;
  };

  const getEventsForDate = (date: Date) => {
    if (!date) return [];
    return events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const getEventsForHour = (date: Date, hour: number) => {
    if (!date) return [];
    return events.filter((event) => {
      const eventDate = new Date(event.startTime);
      const eventHour = eventDate.getHours();
      return (
        eventDate.toDateString() === date.toDateString() && eventHour === hour
      );
    });
  };

  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const handleDatePickerChange = (date: Date) => {
    setCurrentDate(date);
    setSelectedDate(date);
    setShowDatePicker(false);
  };

  const handleGoogleCalendarConnect = async () => {
    setIsSyncing(true);
    try {
      // Get Google Calendar auth URL
      const authUrl = await apiClient.getGoogleAuthUrl();

      // Open Google Calendar auth in a new window
      const authWindow = window.open(
        authUrl as string,
        "google-auth",
        "width=500,height=600"
      );

      // Listen for the auth code from Google
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data.type === "GOOGLE_AUTH_SUCCESS") {
          const { code } = event.data;

          // Exchange code for tokens
          await apiClient.connectGoogleCalendar(code);
          setIsGoogleCalendarConnected(true);

          // Close the auth window
          if (authWindow) authWindow.close();

          // Remove the event listener
          window.removeEventListener("message", handleMessage);
        }
      };

      window.addEventListener("message", handleMessage);

      // For demo purposes, simulate success after 2 seconds
      setTimeout(() => {
        setIsGoogleCalendarConnected(true);
        if (authWindow) authWindow.close();
      }, 2000);
    } catch (error) {
      console.error("Error connecting to Google Calendar:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleCalendarSync = async () => {
    setIsSyncing(true);
    try {
      // Sync events with Google Calendar
      await apiClient.syncGoogleCalendar();
      // Refresh events after sync
      await fetchEvents();
    } catch (error) {
      console.error("Error syncing with Google Calendar:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Calendar
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage your schedule and appointments
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center"
            >
              <Plus className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>New Event</span>
            </button>
          </div>
        </div>

        {/* Calendar Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  if (viewMode === "month") {
                    newDate.setMonth(newDate.getMonth() - 1);
                  } else if (viewMode === "week") {
                    newDate.setDate(newDate.getDate() - 7);
                  } else if (viewMode === "day") {
                    newDate.setDate(newDate.getDate() - 1);
                  }
                  setCurrentDate(newDate);
                  setSelectedDate(newDate);
                }}
                className="btn-outline flex items-center"
              >
                <ChevronLeft className="w-4 h-4 flex-shrink-0" />
              </button>

              {/* Date Picker Button */}
              <div className="relative date-picker-container">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className="flex items-center space-x-2 px-4 py-2 text-lg font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  <span>
                    {viewMode === "month" &&
                      currentDate.toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    {viewMode === "week" &&
                      `${getDaysInWeek(selectedDate)[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${getDaysInWeek(selectedDate)[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                    {viewMode === "day" &&
                      selectedDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                  </span>
                  <ChevronDown className="w-4 h-4 flex-shrink-0" />
                </button>

                {/* Date Picker Dropdown */}
                {showDatePicker && (
                  <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 p-4 min-w-[280px]">
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {/* Month Picker */}
                      <select
                        value={currentDate.getMonth()}
                        onChange={(e) => {
                          const newDate = new Date(currentDate);
                          newDate.setMonth(parseInt(e.target.value));
                          setCurrentDate(newDate);
                          setSelectedDate(newDate);
                        }}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i} value={i}>
                            {new Date(2024, i).toLocaleDateString("en-US", {
                              month: "long",
                            })}
                          </option>
                        ))}
                      </select>

                      {/* Day Picker */}
                      <select
                        value={currentDate.getDate()}
                        onChange={(e) => {
                          const newDate = new Date(currentDate);
                          newDate.setDate(parseInt(e.target.value));
                          setCurrentDate(newDate);
                          setSelectedDate(newDate);
                        }}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        {Array.from({ length: 31 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1}
                          </option>
                        ))}
                      </select>

                      {/* Year Picker */}
                      <select
                        value={currentDate.getFullYear()}
                        onChange={(e) => {
                          const newDate = new Date(currentDate);
                          newDate.setFullYear(parseInt(e.target.value));
                          setCurrentDate(newDate);
                          setSelectedDate(newDate);
                        }}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        {Array.from({ length: 10 }, (_, i) => {
                          const year = new Date().getFullYear() - 5 + i;
                          return (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Quick Navigation Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          const today = new Date();
                          setCurrentDate(today);
                          setSelectedDate(today);
                          setShowDatePicker(false);
                        }}
                        className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
                      >
                        Today
                      </button>
                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600 whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  if (viewMode === "month") {
                    newDate.setMonth(newDate.getMonth() + 1);
                  } else if (viewMode === "week") {
                    newDate.setDate(newDate.getDate() + 7);
                  } else if (viewMode === "day") {
                    newDate.setDate(newDate.getDate() + 1);
                  }
                  setCurrentDate(newDate);
                  setSelectedDate(newDate);
                }}
                className="btn-outline flex items-center"
              >
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              </button>
            </div>

            <div className="flex items-center space-x-2 lg:space-x-4">
              {/* View Mode Buttons */}
              <div className="flex items-center space-x-1 lg:space-x-2">
                <button
                  onClick={() => setViewMode("month")}
                  className={`px-3 py-1 rounded-md text-sm font-medium whitespace-nowrap ${
                    viewMode === "month"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setViewMode("week")}
                  className={`px-3 py-1 rounded-md text-sm font-medium whitespace-nowrap ${
                    viewMode === "week"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setViewMode("day")}
                  className={`px-3 py-1 rounded-md text-sm font-medium whitespace-nowrap ${
                    viewMode === "day"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  Day
                </button>
              </div>

              {/* Google Calendar Sync */}
              <div className="hidden md:flex items-center space-x-2">
                {!isGoogleCalendarConnected ? (
                  <button
                    onClick={handleGoogleCalendarConnect}
                    disabled={isSyncing}
                    className="flex items-center space-x-2 px-3 py-1 text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 border border-green-300 dark:border-green-600 rounded-md hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50 whitespace-nowrap"
                  >
                    {isSyncing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 flex-shrink-0"></div>
                    ) : (
                      <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>Connect Google Calendar</span>
                  </button>
                ) : (
                  <button
                    onClick={handleGoogleCalendarSync}
                    disabled={isSyncing}
                    className="flex items-center space-x-2 px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 whitespace-nowrap"
                  >
                    {isSyncing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 flex-shrink-0"></div>
                    ) : (
                      <RefreshCw className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>Sync with Google</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Views */}
        {viewMode === "month" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Calendar Header */}
            <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-700">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7">
              {days.map((day, index) => (
                <div
                  key={index}
                  className={`min-h-[120px] p-2 border-r border-b border-gray-200 dark:border-gray-700 ${
                    !day
                      ? "bg-gray-50 dark:bg-gray-800"
                      : "bg-white dark:bg-gray-800"
                  }`}
                >
                  {day && (
                    <>
                      <div
                        className={`text-sm font-medium mb-1 ${
                          isToday(day)
                            ? "bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center"
                            : isSelected(day)
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-gray-900 dark:text-white"
                        }`}
                        onClick={() => setSelectedDate(day)}
                      >
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
                        {getEventsForDate(day)
                          .slice(0, 2)
                          .map((event) => (
                            <div
                              key={event.id}
                              className={`text-xs p-1 rounded border ${getEventTypeColor(event.eventType)} cursor-pointer hover:opacity-80`}
                              title={event.title}
                              onClick={() => handleViewClick(event)}
                            >
                              <div className="flex items-center space-x-1">
                                {getEventTypeIcon(event.eventType)}
                                <span className="truncate">{event.title}</span>
                              </div>
                            </div>
                          ))}
                        {getEventsForDate(day).length > 2 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                            +{getEventsForDate(day).length - 2} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === "week" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Week Header */}
            <div className="grid grid-cols-8 bg-gray-50 dark:bg-gray-700">
              <div className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                Time
              </div>
              {getDaysInWeek(selectedDate).map((day) => (
                <div
                  key={day.toISOString()}
                  className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  <div className="font-medium">
                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div
                    className={`text-xs ${
                      isToday(day)
                        ? "text-blue-600 font-semibold"
                        : "text-gray-500"
                    }`}
                  >
                    {day.getDate()}
                  </div>
                </div>
              ))}
            </div>

            {/* Week Grid */}
            <div className="grid grid-cols-8">
              {/* Time column */}
              <div className="border-r border-gray-200 dark:border-gray-700">
                {getHoursInDay().map((hour) => (
                  <div
                    key={hour}
                    className="h-16 border-b border-gray-200 dark:border-gray-700 px-2 py-1 text-xs text-gray-500"
                  >
                    {hour === 0
                      ? "12 AM"
                      : hour < 12
                        ? `${hour} AM`
                        : hour === 12
                          ? "12 PM"
                          : `${hour - 12} PM`}
                  </div>
                ))}
              </div>

              {/* Days columns */}
              {getDaysInWeek(selectedDate).map((day) => (
                <div
                  key={day.toISOString()}
                  className="border-r border-gray-200 dark:border-gray-700 last:border-r-0"
                >
                  {getHoursInDay().map((hour) => (
                    <div
                      key={hour}
                      className="h-16 border-b border-gray-200 dark:border-gray-700 p-1 relative"
                      onClick={() => setSelectedDate(day)}
                    >
                      {getEventsForHour(day, hour).map((event) => (
                        <div
                          key={event.id}
                          className={`text-xs p-1 rounded border ${getEventTypeColor(event.eventType)} cursor-pointer hover:opacity-80 mb-1`}
                          title={event.title}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewClick(event);
                          }}
                        >
                          <div className="flex items-center space-x-1">
                            {getEventTypeIcon(event.eventType)}
                            <span className="truncate">{event.title}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {viewMode === "day" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Day Header */}
            <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
            </div>

            {/* Day Timeline */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {getHoursInDay().map((hour) => (
                <div
                  key={hour}
                  className="flex min-h-[80px] hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {/* Time column */}
                  <div className="w-20 px-4 py-2 text-sm text-gray-500 border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
                    {hour === 0
                      ? "12 AM"
                      : hour < 12
                        ? `${hour} AM`
                        : hour === 12
                          ? "12 PM"
                          : `${hour - 12} PM`}
                  </div>

                  {/* Events column */}
                  <div className="flex-1 p-2">
                    {getEventsForHour(selectedDate, hour).map((event) => (
                      <div
                        key={event.id}
                        className={`p-2 rounded border ${getEventTypeColor(event.eventType)} cursor-pointer hover:opacity-80 mb-2`}
                        onClick={() => handleViewClick(event)}
                      >
                        <div className="flex items-center space-x-2">
                          {getEventTypeIcon(event.eventType)}
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {event.title}
                            </div>
                            <div className="text-xs text-gray-600">
                              {formatTime(event.startTime)} -{" "}
                              {formatTime(event.endTime)}
                            </div>
                            {event.location && (
                              <div className="text-xs text-gray-500 flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                {event.location}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Date Events - Only for Month View */}
        {viewMode === "month" && selectedDate && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Events for {formatDate(selectedDate.toISOString())}
            </h3>
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : getEventsForDate(selectedDate).length === 0 ? (
              <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No events scheduled for this date
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {getEventsForDate(selectedDate).map((event) => (
                  <div
                    key={event.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => handleViewClick(event)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <div
                            className={`p-1 rounded ${getEventTypeColor(event.eventType)}`}
                          >
                            {getEventTypeIcon(event.eventType)}
                          </div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {event.title}
                          </h4>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getEventTypeColor(event.eventType)}`}
                          >
                            {event.eventType.replace("_", " ")}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {event.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {formatTime(event.startTime)} -{" "}
                            {formatTime(event.endTime)}
                          </div>
                          {event.location && (
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              {event.location}
                            </div>
                          )}
                          {event.case && (
                            <div className="flex items-center">
                              <Briefcase className="w-4 h-4 mr-1" />
                              {event.case.caseNumber}
                            </div>
                          )}
                        </div>
                        {event.participants.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Participants:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {event.participants.map((participant) => (
                                <span
                                  key={participant.id}
                                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getParticipantStatusColor(participant.status)}`}
                                >
                                  {participant.user.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div
                        className="flex items-center space-x-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => handleViewClick(event)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditClick(event)}
                          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(event)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Create New Event
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Event Title *
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter event title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Event Type *
                  </label>
                  <select
                    required
                    value={createFormData.eventType}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        eventType: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="CLIENT_MEETING">Client Meeting</option>
                    <option value="HEARING">Court Hearing</option>
                    <option value="COURT_APPEARANCE">Court Appearance</option>
                    <option value="DEADLINE">Deadline</option>
                    <option value="INTERNAL_MEETING">Internal Meeting</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Time *
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={createFormData.endTime}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        endTime: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter location"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Related Case
                  </label>
                  <select
                    value={createFormData.caseId}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        caseId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select case (optional)</option>
                    {cases.map((caseItem) => (
                      <option key={caseItem.id} value={caseItem.id}>
                        {caseItem.caseNumber} - {caseItem.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Enter event description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Participants
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {users.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center space-x-2"
                    >
                      <input
                        type="checkbox"
                        checked={createFormData.participantIds.includes(
                          user.id
                        )}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCreateFormData({
                              ...createFormData,
                              participantIds: [
                                ...createFormData.participantIds,
                                user.id,
                              ],
                            });
                          } else {
                            setCreateFormData({
                              ...createFormData,
                              participantIds:
                                createFormData.participantIds.filter(
                                  (id) => id !== user.id
                                ),
                            });
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {user.name} ({user.email})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary flex items-center"
                >
                  <span>Cancel</span>
                </button>
                <button type="submit" className="btn-primary flex items-center">
                  <span>Create Event</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {showEditModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Edit Event
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleEditEvent} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.title}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        title: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Event Type *
                  </label>
                  <select
                    required
                    value={editFormData.eventType}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        eventType: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="CLIENT_MEETING">Client Meeting</option>
                    <option value="HEARING">Court Hearing</option>
                    <option value="COURT_APPEARANCE">Court Appearance</option>
                    <option value="DEADLINE">Deadline</option>
                    <option value="INTERNAL_MEETING">Internal Meeting</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Time *
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Time *
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter location"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Related Case
                  </label>
                  <select
                    value={editFormData.caseId}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        caseId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select case (optional)</option>
                    {cases.map((caseItem) => (
                      <option key={caseItem.id} value={caseItem.id}>
                        {caseItem.caseNumber} - {caseItem.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Enter event description"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary flex items-center"
                >
                  <span>Cancel</span>
                </button>
                <button type="submit" className="btn-primary flex items-center">
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Event Details Modal */}
      {showViewModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Event Details
              </h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {selectedEvent.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedEvent.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Start Time
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {formatDate(selectedEvent.startTime)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    End Time
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {formatDate(selectedEvent.endTime)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Event Type
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {selectedEvent.eventType.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Location
                  </label>
                  <p className="text-gray-900 dark:text-white">
                    {selectedEvent.location || "Not specified"}
                  </p>
                </div>
              </div>

              {selectedEvent.case && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Related Case
                  </label>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {selectedEvent.case.caseNumber}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedEvent.case.title}
                    </div>
                  </div>
                </div>
              )}

              {selectedEvent.participants.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Participants
                  </label>
                  <div className="space-y-2">
                    {selectedEvent.participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                      >
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {participant.user.name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {participant.user.email}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            participant.status === "ACCEPTED"
                              ? "bg-green-100 text-green-800"
                              : participant.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {participant.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="btn-secondary flex items-center"
                >
                  <span>Close</span>
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleEditClick(selectedEvent);
                  }}
                  className="btn-primary flex items-center"
                >
                  <span>Edit Event</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Delete Event
              </h2>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                Are you sure you want to delete the event{" "}
                <span className="font-bold">{selectedEvent.title}</span>? This
                action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-secondary flex items-center"
                >
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleDeleteEvent}
                  className="btn-danger flex items-center"
                >
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
