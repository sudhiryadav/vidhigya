"use client";

import CustomSelect from "@/components/ui/select";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Mic,
  MicOff,
  Play,
  Plus,
  Search,
  Users,
  Video,
  VideoOff,
  X,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface ClientVideoCall {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  meetingId: string;
  status: string;
  case: {
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
    status: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

export default function ClientVideoCalls() {
  const router = useRouter();
  const [videoCalls, setVideoCalls] = useState<ClientVideoCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedVideoCall, setSelectedVideoCall] =
    useState<ClientVideoCall | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showJoinWithIdModal, setShowJoinWithIdModal] = useState(false);
  const [joinMeetingId, setJoinMeetingId] = useState("");

  // Pre-call settings
  const [preCallAudioEnabled, setPreCallAudioEnabled] = useState(true);
  const [preCallVideoEnabled, setPreCallVideoEnabled] = useState(true);

  useEffect(() => {
    fetchVideoCalls();
  }, []);

  const fetchVideoCalls = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/client-portal/video-calls", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch video calls");
      }

      const data = await response.json();
      setVideoCalls(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "in_progress":
        return <Video className="h-4 w-4 text-yellow-600" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
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
    const now = new Date();
    const start = new Date(startTime);
    const result = start > now;

    return result;
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

  const handleScheduleCall = () => {
    router.push("/client/events?action=schedule-video-call");
  };

  const handleCopyMeetingId = async (
    meetingId: string,
    videoCall?: ClientVideoCall
  ) => {
    try {
      const meetingUrl = `https://meet.vidhigya.com/${meetingId}`;
      await navigator.clipboard.writeText(meetingUrl);
      toast.success("Meeting URL copied to clipboard!");

      // Note: Clients can't send notifications, only lawyers can
      // This is just for copying the URL
    } catch (error) {
      console.error("Failed to copy meeting ID:", error);
      toast.error("Failed to copy meeting URL");
    }
  };

  const handleJoinWithMeetingId = () => {
    setShowJoinWithIdModal(true);
  };

  const handleJoinWithMeetingIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!joinMeetingId.trim()) {
      toast.error("Please enter a meeting ID");
      return;
    }

    // Save pre-call settings
    localStorage.setItem("preCallAudioEnabled", preCallAudioEnabled.toString());
    localStorage.setItem("preCallVideoEnabled", preCallVideoEnabled.toString());

    // Navigate to video call room
    window.open(`/video-call-room/${joinMeetingId.trim()}`, "_blank");

    // Close modal and reset
    setShowJoinWithIdModal(false);
    setJoinMeetingId("");
  };

  const handleJoinWithMeetingIdCancel = () => {
    setShowJoinWithIdModal(false);
    setJoinMeetingId("");
  };

  const getDisplayStatus = (
    startTime: string,
    endTime: string,
    status: string
  ) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);

    // If the meeting hasn't started yet, show as "Scheduled"
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

  const formatParticipantStatus = (status: string | undefined) => {
    if (!status) return "Invited";
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const filteredVideoCalls = videoCalls.filter((call) => {
    const matchesSearch =
      call.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.case.caseNumber.toLowerCase().includes(searchTerm.toLowerCase());

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
                >
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-400">
                  Error
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Video Calls
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                View and manage all video calls related to your cases
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleJoinWithMeetingId}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
              >
                <Play className="w-4 h-4 mr-2" />
                Join with ID
              </button>
              <button
                onClick={handleScheduleCall}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Schedule Video Call
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search video calls..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <CustomSelect
                value={{
                  value: selectedStatus,
                  label:
                    selectedStatus === "all"
                      ? "All Statuses"
                      : selectedStatus
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase()),
                }}
                onChange={(option) => setSelectedStatus(option?.value || "all")}
                options={[
                  { value: "all", label: "All Statuses" },
                  ...statuses.map((status) => ({
                    value: status,
                    label: status
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase()),
                  })),
                ]}
                placeholder="Select status..."
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Video Calls List */}
        {filteredVideoCalls.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Video className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No video calls found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || selectedStatus !== "all"
                ? "Try adjusting your filters to see more results."
                : "Video calls will appear here once they are scheduled for your cases."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* In Progress Calls */}
            {inProgressCalls.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  In Progress ({inProgressCalls.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {inProgressCalls.map((call) => (
                    <div
                      key={call.id}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                    >
                      {/* Call Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="text-yellow-600 dark:text-yellow-400">
                            <Video className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2">
                              {call.title}
                            </h3>
                            <div className="flex items-center mt-1">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(getDisplayStatus(call.startTime, call.endTime, call.status))}`}
                              >
                                {getStatusIcon(
                                  getDisplayStatus(
                                    call.startTime,
                                    call.endTime,
                                    call.status
                                  )
                                )}
                                <span className="ml-1">
                                  {getDisplayStatus(
                                    call.startTime,
                                    call.endTime,
                                    call.status
                                  )
                                    .replace(/_/g, " ")
                                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Call Details */}
                      <div className="space-y-3 mb-4">
                        {call.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {call.description}
                          </p>
                        )}

                        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(call.startTime)}</span>
                        </div>

                        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                          <Clock className="h-4 w-4" />
                          <span>
                            {formatTime(call.startTime)} -{" "}
                            {formatTime(call.endTime)}
                          </span>
                        </div>

                        <div className="text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            Case:{" "}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {call.case.caseNumber}
                          </span>
                        </div>

                        <div className="text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            Host:{" "}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {call.host.name}
                          </span>
                        </div>

                        {/* Meeting ID */}
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            Meeting ID:
                          </span>
                          <span className="font-mono font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                            {call.meetingId}
                          </span>
                        </div>

                        {call.participants.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                              <Users className="h-4 w-4" />
                              <span>
                                Participants ({call.participants.length})
                              </span>
                            </div>
                            <div className="space-y-1">
                              {call.participants
                                .slice(0, 3)
                                .map((participant) => (
                                  <div
                                    key={participant.id}
                                    className="flex items-center justify-between text-sm"
                                  >
                                    <span className="text-gray-700 dark:text-gray-300">
                                      {participant.user.name}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                                      {formatParticipantStatus(
                                        participant.status
                                      )}
                                    </span>
                                  </div>
                                ))}
                              {call.participants.length > 3 && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  +{call.participants.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedVideoCall(call);
                            setShowJoinModal(true);
                          }}
                          className="flex-1 flex items-center justify-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Join
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Calls */}
            {upcomingCalls.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Upcoming ({upcomingCalls.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {upcomingCalls.map((call) => (
                    <div
                      key={call.id}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                    >
                      {/* Call Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="text-blue-600 dark:text-blue-400">
                            <Video className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2">
                              {call.title}
                            </h3>
                            <div className="flex items-center mt-1">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(getDisplayStatus(call.startTime, call.endTime, call.status))}`}
                              >
                                {getStatusIcon(
                                  getDisplayStatus(
                                    call.startTime,
                                    call.endTime,
                                    call.status
                                  )
                                )}
                                <span className="ml-1">
                                  {getDisplayStatus(
                                    call.startTime,
                                    call.endTime,
                                    call.status
                                  )
                                    .replace(/_/g, " ")
                                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                                </span>
                              </span>
                              {isToday(call.startTime) && (
                                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                  Today
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Call Details */}
                      <div className="space-y-3 mb-4">
                        {call.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {call.description}
                          </p>
                        )}

                        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(call.startTime)}</span>
                        </div>

                        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                          <Clock className="h-4 w-4" />
                          <span>
                            {formatTime(call.startTime)} -{" "}
                            {formatTime(call.endTime)}
                          </span>
                        </div>

                        <div className="text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            Case:{" "}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {call.case.caseNumber}
                          </span>
                        </div>

                        <div className="text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            Host:{" "}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {call.host.name}
                          </span>
                        </div>

                        {/* Meeting ID */}
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            Meeting ID:
                          </span>
                          <span className="font-mono font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                            {call.meetingId}
                          </span>
                        </div>

                        {call.participants.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                              <Users className="h-4 w-4" />
                              <span>
                                Participants ({call.participants.length})
                              </span>
                            </div>
                            <div className="space-y-1">
                              {call.participants
                                .slice(0, 3)
                                .map((participant) => (
                                  <div
                                    key={participant.id}
                                    className="flex items-center justify-between text-sm"
                                  >
                                    <span className="text-gray-700 dark:text-gray-300">
                                      {participant.user.name}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                                      {formatParticipantStatus(
                                        participant.status
                                      )}
                                    </span>
                                  </div>
                                ))}
                              {call.participants.length > 3 && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  +{call.participants.length - 3} more
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedVideoCall(call);
                            setShowJoinModal(true);
                          }}
                          className="flex-1 flex items-center justify-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Join
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past Calls */}
            {pastCalls.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Past ({pastCalls.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pastCalls.map((call) => (
                    <div
                      key={call.id}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow opacity-75"
                    >
                      {/* Call Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="text-gray-400">
                            <Video className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2">
                              {call.title}
                            </h3>
                            <div className="flex items-center mt-1">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(getDisplayStatus(call.startTime, call.endTime, call.status))}`}
                              >
                                {getStatusIcon(
                                  getDisplayStatus(
                                    call.startTime,
                                    call.endTime,
                                    call.status
                                  )
                                )}
                                <span className="ml-1">
                                  {getDisplayStatus(
                                    call.startTime,
                                    call.endTime,
                                    call.status
                                  )
                                    .replace(/_/g, " ")
                                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Call Details */}
                      <div className="space-y-3 mb-4">
                        {call.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {call.description}
                          </p>
                        )}

                        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(call.startTime)}</span>
                        </div>

                        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                          <Clock className="h-4 w-4" />
                          <span>
                            {formatTime(call.startTime)} -{" "}
                            {formatTime(call.endTime)}
                          </span>
                        </div>

                        <div className="text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            Case:{" "}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {call.case.caseNumber}
                          </span>
                        </div>

                        <div className="text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            Host:{" "}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {call.host.name}
                          </span>
                        </div>

                        {/* Meeting ID */}
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="text-gray-500 dark:text-gray-400">
                            Meeting ID:
                          </span>
                          <span className="font-mono font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                            {call.meetingId}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Join Modal with Pre-call Settings */}
      {showJoinModal && selectedVideoCall && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Join Video Call
                </h3>
                <button
                  onClick={() => {
                    setShowJoinModal(false);
                    setSelectedVideoCall(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  {selectedVideoCall.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Meeting ID:{" "}
                  <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
                    {selectedVideoCall.meetingId}
                  </span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formatDate(selectedVideoCall.startTime)} at{" "}
                  {formatTime(selectedVideoCall.startTime)}
                </p>
              </div>

              {/* Pre-call Settings */}
              <div className="mb-6">
                <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Before joining, you can:
                </h5>

                <div className="space-y-3">
                  {/* Audio Setting */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {preCallAudioEnabled ? (
                        <Mic className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <MicOff className="h-5 w-5 text-red-600 dark:text-red-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Microphone
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {preCallAudioEnabled
                            ? "Will be enabled"
                            : "Will be muted"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setPreCallAudioEnabled(!preCallAudioEnabled)
                      }
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        preCallAudioEnabled
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                      }`}
                    >
                      {preCallAudioEnabled ? "ON" : "OFF"}
                    </button>
                  </div>

                  {/* Video Setting */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {preCallVideoEnabled ? (
                        <Video className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <VideoOff className="h-5 w-5 text-red-600 dark:text-red-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Camera
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {preCallVideoEnabled
                            ? "Will be enabled"
                            : "Will be turned off"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setPreCallVideoEnabled(!preCallVideoEnabled)
                      }
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        preCallVideoEnabled
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                      }`}
                    >
                      {preCallVideoEnabled ? "ON" : "OFF"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowJoinModal(false);
                    setSelectedVideoCall(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Store pre-call settings in localStorage
                    localStorage.setItem(
                      "preCallAudioEnabled",
                      preCallAudioEnabled.toString()
                    );
                    localStorage.setItem(
                      "preCallVideoEnabled",
                      preCallVideoEnabled.toString()
                    );

                    // Navigate to video call room
                    window.location.href = `/video-call-room/${selectedVideoCall.meetingId}`;
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Join Call
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join with Meeting ID Modal */}
      {showJoinWithIdModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Join Video Call
                </h3>
                <button
                  onClick={handleJoinWithMeetingIdCancel}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleJoinWithMeetingIdSubmit}>
                <div className="mb-4">
                  <label
                    htmlFor="meetingId"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Meeting ID
                  </label>
                  <input
                    type="text"
                    id="meetingId"
                    value={joinMeetingId}
                    onChange={(e) => setJoinMeetingId(e.target.value)}
                    placeholder="Enter meeting ID (e.g., abc123)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    autoFocus
                  />
                </div>

                {/* Pre-call Settings */}
                <div className="mb-6">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Pre-call settings:
                  </h5>

                  <div className="space-y-3">
                    {/* Audio Setting */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {preCallAudioEnabled ? (
                          <Mic className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <MicOff className="h-5 w-5 text-red-600 dark:text-red-400" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Microphone
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {preCallAudioEnabled
                              ? "Will be enabled"
                              : "Will be muted"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setPreCallAudioEnabled(!preCallAudioEnabled)
                        }
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          preCallAudioEnabled
                            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                        }`}
                      >
                        {preCallAudioEnabled ? "ON" : "OFF"}
                      </button>
                    </div>

                    {/* Video Setting */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {preCallVideoEnabled ? (
                          <Video className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <VideoOff className="h-5 w-5 text-red-600 dark:text-red-400" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Camera
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {preCallVideoEnabled
                              ? "Will be enabled"
                              : "Will be turned off"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setPreCallVideoEnabled(!preCallVideoEnabled)
                        }
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          preCallVideoEnabled
                            ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                        }`}
                      >
                        {preCallVideoEnabled ? "ON" : "OFF"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleJoinWithMeetingIdCancel}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Join Call
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
