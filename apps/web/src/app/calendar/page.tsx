"use client";

import ModalDialog from "@/components/ui/ModalDialog";
import CustomSelect, { SelectOption } from "@/components/ui/select";
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
  const eventTypeOptions: SelectOption[] = [
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
    caseId: "",
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
    caseId: "",
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
      const response = await apiClient.getLawyers();
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
          caseId: "",
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
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location || "",
      eventType: event.eventType,
      isAllDay: event.isAllDay,
      caseId: event.case?.id || "",
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
  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
                onClick={goToPreviousMonth}
                className="p-2 text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold text-foreground">
                {currentDate.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <button
                onClick={goToNextMonth}
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
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
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
                className={`min-h-[120px] bg-card p-3 ${
                  date && isToday(date) ? "bg-blue-50 dark:bg-blue-900/20" : ""
                } ${date && isSelected(date) ? "ring-2 ring-blue-500" : ""}`}
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
                            onClick={() => handleViewClick(event)}
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
                <CustomSelect
                  options={eventTypeOptions}
                  value={eventTypeOptions.find(
                    (opt) => opt.value === createFormData.eventType
                  )}
                  onChange={(value) =>
                    setCreateFormData({
                      ...createFormData,
                      eventType: value?.value || "",
                    })
                  }
                  placeholder="Select event type"
                />
              </div>
              {cases.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Related Case (Optional)
                  </label>
                  <CustomSelect
                    options={cases.map((case_) => ({
                      value: case_.id,
                      label: `${case_.caseNumber} - ${case_.title}`,
                    }))}
                    value={
                      cases.find((c) => c.id === createFormData.caseId)
                        ? {
                            value: createFormData.caseId,
                            label: cases.find(
                              (c) => c.id === createFormData.caseId
                            )
                              ? `${cases.find((c) => c.id === createFormData.caseId)?.caseNumber} - ${cases.find((c) => c.id === createFormData.caseId)?.title}`
                              : "",
                          }
                        : undefined
                    }
                    onChange={(value) =>
                      setCreateFormData({
                        ...createFormData,
                        caseId: value?.value || "",
                      })
                    }
                    placeholder="Select a case"
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
                <CustomSelect
                  options={eventTypeOptions}
                  value={eventTypeOptions.find(
                    (opt) => opt.value === editFormData.eventType
                  )}
                  onChange={(value) =>
                    setEditFormData({
                      ...editFormData,
                      eventType: value?.value || "",
                    })
                  }
                  placeholder="Select event type"
                />
              </div>
              {cases.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Related Case (Optional)
                  </label>
                  <CustomSelect
                    options={cases.map((case_) => ({
                      value: case_.id,
                      label: `${case_.caseNumber} - ${case_.title}`,
                    }))}
                    value={
                      cases.find((c) => c.id === editFormData.caseId)
                        ? {
                            value: editFormData.caseId,
                            label: cases.find(
                              (c) => c.id === editFormData.caseId
                            )
                              ? `${cases.find((c) => c.id === editFormData.caseId)?.caseNumber} - ${cases.find((c) => c.id === editFormData.caseId)?.title}`
                              : "",
                          }
                        : undefined
                    }
                    onChange={(value) =>
                      setEditFormData({
                        ...editFormData,
                        caseId: value?.value || "",
                      })
                    }
                    placeholder="Select a case"
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
                <p className="mt-1 text-sm text-gray-900 dark:text-white">
                  {selectedEvent.description || "No description provided"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Start Time
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {formatDate(selectedEvent.startTime)} at{" "}
                    {formatTime(selectedEvent.startTime)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    End Time
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
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
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
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
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {selectedEvent.case.caseNumber} - {selectedEvent.case.title}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Created By
                </label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">
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
                        <span className="text-sm text-gray-900 dark:text-white">
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
