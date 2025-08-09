"use client";

import ModalDialog from "@/components/ui/ModalDialog";
import CustomSelect from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import {
  Calendar,
  Clock,
  Copy,
  Edit,
  Mic,
  MicOff,
  Phone,
  Plus,
  Search,
  User,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface VideoCall {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: string;
  meetingId: string;
  meetingUrl?: string;
  createdAt: string;
  host: {
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

// VideoCallCard Component
interface VideoCallCardProps {
  videoCall: VideoCall;
  showEditButton: boolean;
  onEdit: (videoCall: VideoCall) => void;
  onDelete: (videoCall: VideoCall) => void;
  onJoin: (videoCall: VideoCall) => void;
  onCopy: (meetingId: string, videoCall?: VideoCall) => void;
  getStatusBadge: (status: string) => string;
  formatDate: (dateString: string) => string;
  formatTime: (dateString: string) => string;
}

function VideoCallCard({
  videoCall,
  showEditButton,
  onEdit,
  onDelete,
  onJoin,
  onCopy,
  getStatusBadge,
  formatDate,
  formatTime,
}: VideoCallCardProps) {
  const isUpcoming = (startTime: string) => {
    return new Date(startTime) > new Date();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      {/* Video Call Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-blue-600 dark:text-blue-400">
            <Video className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2">
              {videoCall.title}
            </h3>
            <div className="flex items-center mt-1">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(videoCall.status)}`}
              >
                {videoCall.status.replace(/_/g, " ")}
              </span>
              {(videoCall.status === "IN_PROGRESS" ||
                videoCall.status === "IN PROGRESS") && (
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  Live Now
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Video Call Details */}
      <div className="space-y-3 mb-4">
        {videoCall.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {videoCall.description}
          </p>
        )}

        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(videoCall.startTime)}</span>
        </div>

        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <Clock className="h-4 w-4" />
          <span>
            {formatTime(videoCall.startTime)} - {formatTime(videoCall.endTime)}
          </span>
        </div>

        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <User className="h-4 w-4" />
          <span>Created by {videoCall.host.name}</span>
        </div>

        {/* Meeting ID */}
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">Meeting ID:</span>
          <div className="flex items-center">
            <span className="font-mono font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
              {videoCall.meetingId}
            </span>
            <button
              onClick={() => onCopy(videoCall.meetingId, videoCall)}
              className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              title="Copy Meeting URL"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        {videoCall.case && (
          <div className="text-sm">
            <span className="text-gray-500 dark:text-gray-400">Case: </span>
            <span className="font-medium text-gray-900 dark:text-white">
              {videoCall.case.caseNumber}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex space-x-2">
        {/* Show Join button for:
            - Scheduled calls that are upcoming
            - In-progress calls
        */}
        {(isUpcoming(videoCall.startTime) &&
          videoCall.status === "SCHEDULED") ||
        videoCall.status === "IN_PROGRESS" ||
        videoCall.status === "IN PROGRESS" ? (
          <button
            onClick={() => onJoin(videoCall)}
            className="flex-1 flex items-center justify-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Phone className="h-4 w-4 mr-2" />
            Join
          </button>
        ) : null}

        {showEditButton && videoCall.status === "SCHEDULED" && (
          <button
            onClick={() => onEdit(videoCall)}
            className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </button>
        )}

        <button
          onClick={() => onDelete(videoCall)}
          className="px-3 py-2 border border-red-300 dark:border-red-600 rounded-md text-sm font-medium text-red-700 dark:text-red-300 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function VideoCallsPage() {
  const { user } = useAuth();
  const [videoCalls, setVideoCalls] = useState<VideoCall[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showJoinWithIdModal, setShowJoinWithIdModal] = useState(false);
  const [showInstantCallModal, setShowInstantCallModal] = useState(false);
  const [selectedVideoCall, setSelectedVideoCall] = useState<VideoCall | null>(
    null
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [videoCallToDelete, setVideoCallToDelete] = useState<VideoCall | null>(
    null
  );
  const [joinMeetingId, setJoinMeetingId] = useState("");
  const [instantCallData, setInstantCallData] = useState({
    title: "",
    description: "",
    caseId: "",
    participantIds: [] as string[],
  });
  // Form data
  const [createFormData, setCreateFormData] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    caseId: "",
    participantIds: [] as string[],
  });
  const [scheduleFormData, setScheduleFormData] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    caseId: "",
    participantIds: [] as string[],
    status: "SCHEDULED",
  });
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    status: "SCHEDULED",
  });

  // Pre-call settings
  const [preCallAudioEnabled, setPreCallAudioEnabled] = useState(true);
  const [preCallVideoEnabled, setPreCallVideoEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchVideoCalls();
    fetchCases();
    fetchUsers();
  }, []); // Only fetch on initial load

  const fetchVideoCalls = async () => {
    try {
      setLoading(true);
      const filters: { status?: string; caseId?: string } = {};

      if (statusFilter !== "all") {
        filters.status = statusFilter;
      }

      // Get all video calls without date restrictions
      const data = await apiClient.getVideoCalls(filters);
      setVideoCalls(data as VideoCall[]);
    } catch (error) {
      console.error("Error fetching video calls:", error);
      toast.error("Failed to fetch video calls");
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
      const data = await apiClient.getClients();
      setUsers(data as User[]);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleCreateVideoCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create instant meeting (starts now)
      const now = new Date();
      const endTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

      const newVideoCall = (await apiClient.createVideoCall({
        title: createFormData.title || "Instant Video Call",
        description: createFormData.description,
        startTime: now.toISOString(),
        endTime: endTime.toISOString(),
        caseId: createFormData.caseId || undefined,
        participantIds: createFormData.participantIds,
      })) as VideoCall;

      // Reset form
      setCreateFormData({
        title: "",
        description: "",
        startTime: "",
        endTime: "",
        caseId: "",
        participantIds: [],
      });
      setShowCreateModal(false);

      // Show success message with meeting details
      toast.success(
        `Instant meeting created! Meeting ID: ${newVideoCall.meetingId}`
      );

      // Optionally auto-join the meeting
      if (confirm("Would you like to join this meeting now?")) {
        setSelectedVideoCall(newVideoCall);
        setShowJoinModal(true);
      }

      fetchVideoCalls();
    } catch (error) {
      console.error("Error creating video call:", error);
      toast.error("Failed to create video call");
    } finally {
      setIsLoading(false);
    }
  };

  const handleScheduleVideoCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check for time overlap with existing scheduled calls
      const startTime = new Date(scheduleFormData.startTime);
      const endTime = new Date(scheduleFormData.endTime);

      const hasOverlap = videoCalls.some((call) => {
        if (call.status !== "SCHEDULED") return false;

        const existingStart = new Date(call.startTime);
        const existingEnd = new Date(call.endTime);

        // Check if the new meeting overlaps with existing meeting
        return startTime < existingEnd && endTime > existingStart;
      });

      if (hasOverlap) {
        toast.error(
          "This time slot conflicts with an existing scheduled meeting. Please choose a different time."
        );
        setIsLoading(false);
        return;
      }

      const newVideoCall = (await apiClient.createVideoCall({
        title: scheduleFormData.title,
        description: scheduleFormData.description,
        startTime: scheduleFormData.startTime,
        endTime: scheduleFormData.endTime,
        caseId: scheduleFormData.caseId || undefined,
        participantIds: scheduleFormData.participantIds,
      })) as VideoCall;

      // Reset form
      setScheduleFormData({
        title: "",
        description: "",
        startTime: "",
        endTime: "",
        caseId: "",
        participantIds: [],
        status: "SCHEDULED",
      });
      setShowScheduleModal(false);

      toast.success(
        `Video call scheduled! Meeting ID: ${newVideoCall.meetingId}`
      );
      fetchVideoCalls();
    } catch (error) {
      console.error("Error scheduling video call:", error);
      toast.error("Failed to schedule video call");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (videoCall: VideoCall) => {
    setSelectedVideoCall(videoCall);
    setEditFormData({
      title: videoCall.title,
      description: videoCall.description || "",
      startTime: videoCall.startTime,
      endTime: videoCall.endTime,
      status: videoCall.status,
    });
    setShowEditModal(true);
  };

  const handleEditVideoCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVideoCall) return;

    try {
      await apiClient.updateVideoCall(selectedVideoCall.id, {
        title: editFormData.title,
        description: editFormData.description || undefined,
        startTime: editFormData.startTime,
        endTime: editFormData.endTime,
        status: editFormData.status,
      });
      setShowEditModal(false);
      setSelectedVideoCall(null);
      fetchVideoCalls();
    } catch (error) {
      console.error("Error updating video call:", error);
    }
  };

  const handleViewClick = (videoCall: VideoCall) => {
    setSelectedVideoCall(videoCall);
    // Show meeting details in a simple alert for now
    alert(
      `Meeting ID: ${videoCall.meetingId}\nTitle: ${videoCall.title}\nDescription: ${videoCall.description || "No description"}\nStart Time: ${formatDate(videoCall.startTime)} ${formatTime(videoCall.startTime)}\nEnd Time: ${formatTime(videoCall.endTime)}`
    );
  };

  const handleDeleteClick = (videoCall: VideoCall) => {
    setVideoCallToDelete(videoCall);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!videoCallToDelete) return;

    try {
      await apiClient.deleteVideoCall(videoCallToDelete.id);
      toast.success("Video call deleted successfully");
      fetchVideoCalls();
    } catch (error) {
      console.error("Error deleting video call:", error);
      toast.error("Failed to delete video call");
    } finally {
      setShowDeleteConfirm(false);
      setVideoCallToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setVideoCallToDelete(null);
  };

  const handleJoinCall = async (videoCall: VideoCall) => {
    // Open pre-call settings modal
    setSelectedVideoCall(videoCall);
    setShowJoinModal(true);
  };

  const handleConfirmJoinCall = async () => {
    if (!selectedVideoCall) return;

    try {
      // Update call status to IN_PROGRESS if it's scheduled
      if (selectedVideoCall.status === "SCHEDULED") {
        await apiClient.updateVideoCall(selectedVideoCall.id, {
          status: "IN_PROGRESS",
        });
      }

      // Store pre-call settings in localStorage
      localStorage.setItem(
        "preCallAudioEnabled",
        preCallAudioEnabled.toString()
      );
      localStorage.setItem(
        "preCallVideoEnabled",
        preCallVideoEnabled.toString()
      );

      // Navigate to the video call room
      if (selectedVideoCall.meetingId) {
        window.location.href = `/video-call-room/${selectedVideoCall.meetingId}`;
      }

      // Close modal and refresh the video calls list
      setShowJoinModal(false);
      setSelectedVideoCall(null);
      fetchVideoCalls();
    } catch (error) {
      console.error("Error joining call:", error);
      toast.error("Failed to join the call");
    }
  };

  const handleCopyMeetingId = async (
    meetingId: string,
    videoCall?: VideoCall
  ) => {
    try {
      const meetingUrl = `https://meet.vidhigya.com/${meetingId}`;
      await navigator.clipboard.writeText(meetingUrl);
      toast.success("Meeting URL copied to clipboard!");

      // Ask if user wants to notify participants
      if (videoCall && videoCall.participants.length > 0) {
        const shouldNotify = confirm(
          `Would you like to send a notification to ${videoCall.participants.length} participant(s) with the meeting details?`
        );

        if (shouldNotify) {
          // Send notification to participants
          try {
            await apiClient.sendVideoCallNotification(videoCall.id);
            toast.success("Notification sent to participants!");
          } catch (error) {
            console.error("Failed to send notification:", error);
            toast.error("Failed to send notification to participants");
          }
        }
      }
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

  const handleStartInstantCall = () => {
    setShowInstantCallModal(true);
  };

  const handleInstantCallSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await apiClient.startInstantCall(instantCallData);

      // Save pre-call settings
      localStorage.setItem(
        "preCallAudioEnabled",
        preCallAudioEnabled.toString()
      );
      localStorage.setItem(
        "preCallVideoEnabled",
        preCallVideoEnabled.toString()
      );

      // Navigate to video call room
      window.open(`/video-call-room/${response.meetingId}`, "_blank");

      // Close modal and reset
      setShowInstantCallModal(false);
      setInstantCallData({
        title: "",
        description: "",
        caseId: "",
        participantIds: [],
      });

      // Refresh video calls list
      await fetchVideoCalls();

      toast.success("Instant call started! Participants have been notified.");
    } catch (error) {
      console.error("Error starting instant call:", error);
      toast.error("Failed to start instant call");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstantCallCancel = () => {
    setShowInstantCallModal(false);
    setInstantCallData({
      title: "",
      description: "",
      caseId: "",
      participantIds: [],
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "IN_PROGRESS":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "COMPLETED":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      case "CANCELLED":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isUpcoming = (startTime: string) => {
    return new Date(startTime) > new Date();
  };

  const isInProgress = (startTime: string, endTime: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);
    const result = now >= start && now <= end;

    // Debug time comparison
    console.log(
      `Time check: now=${now.toISOString()}, start=${start.toISOString()}, end=${end.toISOString()}, result=${result}`
    );

    return result;
  };

  const filteredVideoCalls = videoCalls.filter((videoCall) => {
    const matchesSearch =
      videoCall.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      videoCall.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || videoCall.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Organize calls into sections
  const upcomingCalls = filteredVideoCalls.filter((call) =>
    isUpcoming(call.startTime)
  );
  const inProgressCalls = filteredVideoCalls.filter((call) =>
    isInProgress(call.startTime, call.endTime)
  );
  const pastCalls = filteredVideoCalls.filter(
    (call) =>
      !isUpcoming(call.startTime) && !isInProgress(call.startTime, call.endTime)
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
                Manage video calls for your cases and clients
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Filters */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      options={[
                        { value: "all", label: "All Status" },
                        { value: "SCHEDULED", label: "Scheduled" },
                        { value: "IN_PROGRESS", label: "In Progress" },
                        { value: "COMPLETED", label: "Completed" },
                        { value: "CANCELLED", label: "Cancelled" },
                      ]}
                      value={{
                        value: statusFilter,
                        label:
                          statusFilter === "all" ? "All Status" : statusFilter,
                      }}
                      onChange={(option) =>
                        setStatusFilter(option?.value || "all")
                      }
                      placeholder="Select status"
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={handleStartInstantCall}
                className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
              >
                <Phone className="w-4 h-4 mr-2" />
                Start Instant Call
              </button>
              <button
                onClick={handleJoinWithMeetingId}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors"
              >
                <Phone className="w-4 h-4 mr-2" />
                Join with ID
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create
              </button>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule
              </button>
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
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your filters to see more results."
                : "Video calls will appear here once they are scheduled."}
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
                  {inProgressCalls.map((videoCall) => (
                    <VideoCallCard
                      key={videoCall.id}
                      videoCall={videoCall}
                      showEditButton={true}
                      onEdit={handleEditClick}
                      onDelete={handleDeleteClick}
                      onJoin={handleJoinCall}
                      onCopy={handleCopyMeetingId}
                      getStatusBadge={getStatusBadge}
                      formatDate={formatDate}
                      formatTime={formatTime}
                    />
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
                  {upcomingCalls.map((videoCall) => (
                    <VideoCallCard
                      key={videoCall.id}
                      videoCall={videoCall}
                      showEditButton={true}
                      onEdit={handleEditClick}
                      onDelete={handleDeleteClick}
                      onJoin={handleJoinCall}
                      onCopy={handleCopyMeetingId}
                      getStatusBadge={getStatusBadge}
                      formatDate={formatDate}
                      formatTime={formatTime}
                    />
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
                  {pastCalls.map((videoCall) => (
                    <VideoCallCard
                      key={videoCall.id}
                      videoCall={videoCall}
                      showEditButton={false}
                      onEdit={handleEditClick}
                      onDelete={handleDeleteClick}
                      onJoin={handleJoinCall}
                      onCopy={handleCopyMeetingId}
                      getStatusBadge={getStatusBadge}
                      formatDate={formatDate}
                      formatTime={formatTime}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Modal (Instant Meeting) */}
      <ModalDialog
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        header="Create Instant Video Call"
        footer={
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-video-call-form"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? "Creating..." : "Create & Join"}
            </button>
          </div>
        }
        maxWidth="md"
        closeOnEscape={true}
        closeOnOverlayClick={true}
      >
        <form
          id="create-video-call-form"
          onSubmit={handleCreateVideoCall}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title (Optional)
            </label>
            <input
              type="text"
              value={createFormData.title}
              onChange={(e) =>
                setCreateFormData({
                  ...createFormData,
                  title: e.target.value,
                })
              }
              placeholder="Instant Video Call"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={createFormData.description}
              onChange={(e) =>
                setCreateFormData({
                  ...createFormData,
                  description: e.target.value,
                })
              }
              placeholder="Meeting description..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <CustomSelect
              label="Case (Optional)"
              options={[
                { value: "", label: "Select a case" },
                ...cases.map((caseItem) => ({
                  value: caseItem.id,
                  label: `${caseItem.caseNumber} - ${caseItem.title}`,
                })),
              ]}
              value={
                createFormData.caseId
                  ? {
                      value: createFormData.caseId,
                      label: cases.find((c) => c.id === createFormData.caseId)
                        ? `${cases.find((c) => c.id === createFormData.caseId)?.caseNumber} - ${cases.find((c) => c.id === createFormData.caseId)?.title}`
                        : "Select a case",
                    }
                  : { value: "", label: "Select a case" }
              }
              onChange={(option) =>
                setCreateFormData({
                  ...createFormData,
                  caseId: option?.value || "",
                })
              }
              placeholder="Select a case"
            />
          </div>
        </form>
      </ModalDialog>

      {/* Schedule Modal (Future Meeting) */}
      <ModalDialog
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        header="Schedule Video Call"
        footer={
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => setShowScheduleModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="schedule-video-call-form"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Scheduling..." : "Schedule Call"}
            </button>
          </div>
        }
        maxWidth="md"
        closeOnEscape={true}
        closeOnOverlayClick={true}
      >
        <form
          id="schedule-video-call-form"
          onSubmit={handleScheduleVideoCall}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={scheduleFormData.title}
              onChange={(e) =>
                setScheduleFormData({
                  ...scheduleFormData,
                  title: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={scheduleFormData.description}
              onChange={(e) =>
                setScheduleFormData({
                  ...scheduleFormData,
                  description: e.target.value,
                })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Time *
            </label>
            <input
              type="datetime-local"
              required
              value={scheduleFormData.startTime}
              onChange={(e) =>
                setScheduleFormData({
                  ...scheduleFormData,
                  startTime: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Time *
            </label>
            <input
              type="datetime-local"
              required
              value={scheduleFormData.endTime}
              onChange={(e) =>
                setScheduleFormData({
                  ...scheduleFormData,
                  endTime: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <CustomSelect
              label="Case (Optional)"
              options={[
                { value: "", label: "Select a case" },
                ...cases.map((caseItem) => ({
                  value: caseItem.id,
                  label: `${caseItem.caseNumber} - ${caseItem.title}`,
                })),
              ]}
              value={
                scheduleFormData.caseId
                  ? {
                      value: scheduleFormData.caseId,
                      label: cases.find((c) => c.id === scheduleFormData.caseId)
                        ? `${cases.find((c) => c.id === scheduleFormData.caseId)?.caseNumber} - ${cases.find((c) => c.id === scheduleFormData.caseId)?.title}`
                        : "Select a case",
                    }
                  : { value: "", label: "Select a case" }
              }
              onChange={(option) =>
                setScheduleFormData({
                  ...scheduleFormData,
                  caseId: option?.value || "",
                })
              }
              placeholder="Select a case"
            />
          </div>
        </form>
      </ModalDialog>

      {/* Edit Modal */}
      <ModalDialog
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        header="Edit Video Call"
        footer={
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-video-call-form"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        }
        maxWidth="md"
        closeOnEscape={true}
        closeOnOverlayClick={true}
      >
        <form
          id="edit-video-call-form"
          onSubmit={handleEditVideoCall}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div>
            <CustomSelect
              label="Status"
              options={[
                { value: "SCHEDULED", label: "Scheduled" },
                { value: "IN_PROGRESS", label: "In Progress" },
                { value: "COMPLETED", label: "Completed" },
                { value: "CANCELLED", label: "Cancelled" },
              ]}
              value={{ value: editFormData.status, label: editFormData.status }}
              onChange={(option) =>
                setEditFormData({
                  ...editFormData,
                  status: option?.value || "SCHEDULED",
                })
              }
              placeholder="Select status"
            />
          </div>
        </form>
      </ModalDialog>

      {/* View Modal */}
      {/* This modal is no longer used for viewing details, but kept for consistency */}
      {/* The handleViewClick now shows details in an alert */}
      {/* {showViewModal && selectedVideoCall && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Video Call Details
                </h3>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {selectedVideoCall.title}
                  </h4>
                  {selectedVideoCall.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {selectedVideoCall.description}
                    </p>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">
                      Date:
                    </span>
                    <span className="text-gray-900 dark:text-white">
                      {formatDate(selectedVideoCall.startTime)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">
                      Time:
                    </span>
                    <span className="text-gray-900 dark:text-white">
                      {formatTime(selectedVideoCall.startTime)} -{" "}
                      {formatTime(selectedVideoCall.endTime)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">
                      Status:
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedVideoCall.status)}`}
                    >
                      {selectedVideoCall.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">
                      Meeting ID:
                    </span>
                    <span className="text-gray-900 dark:text-white">
                      {selectedVideoCall.meetingId}
                    </span>
                  </div>
                  {selectedVideoCall.case && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">
                        Case:
                      </span>
                      <span className="text-gray-900 dark:text-white">
                        {selectedVideoCall.case.caseNumber}
                      </span>
                    </div>
                  )}
                </div>
                <div className="pt-4">
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )} */}

      {/* Delete Confirmation Modal */}
      <ModalDialog
        isOpen={showDeleteConfirm}
        onClose={handleDeleteCancel}
        header="Delete Video Call"
        footer={
          <div className="flex space-x-3">
            <button
              onClick={handleDeleteCancel}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-base font-medium rounded-md shadow-sm hover:bg-gray-200 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              Delete
            </button>
          </div>
        }
        maxWidth="md"
        closeOnEscape={true}
        closeOnOverlayClick={true}
      >
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
            <X className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Are you sure you want to delete the video call{" "}
            <span className="font-medium text-gray-900 dark:text-white">
              "{videoCallToDelete?.title}"
            </span>
            ? This action cannot be undone.
          </p>
        </div>
      </ModalDialog>

      {/* Join Modal with Pre-call Settings */}
      <ModalDialog
        isOpen={showJoinModal}
        onClose={() => {
          setShowJoinModal(false);
          setSelectedVideoCall(null);
        }}
        header="Join Video Call"
        footer={
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setShowJoinModal(false);
                setSelectedVideoCall(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmJoinCall}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? "Joining..." : "Join Call"}
            </button>
          </div>
        }
        maxWidth="md"
        closeOnEscape={true}
        closeOnOverlayClick={true}
      >
        <div>
          <div className="mb-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              {selectedVideoCall?.title}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Meeting ID:{" "}
              <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
                {selectedVideoCall?.meetingId}
              </span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatDate(selectedVideoCall?.startTime || "")} at{" "}
              {formatTime(selectedVideoCall?.startTime || "")}
            </p>
          </div>

          <div className="mb-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              {selectedVideoCall?.title}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Meeting ID:{" "}
              <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
                {selectedVideoCall?.meetingId}
              </span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatDate(selectedVideoCall?.startTime || "")} at{" "}
              {formatTime(selectedVideoCall?.startTime || "")}
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
                  onClick={() => setPreCallAudioEnabled(!preCallAudioEnabled)}
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
                  onClick={() => setPreCallVideoEnabled(!preCallVideoEnabled)}
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
        </div>
      </ModalDialog>

      {/* Join with Meeting ID Modal */}
      <ModalDialog
        isOpen={showJoinWithIdModal}
        onClose={handleJoinWithMeetingIdCancel}
        title="Join Video Call"
        size="md"
      >
        <div className="p-6">
          <div className="mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Enter the meeting ID to join an existing video call.
            </p>

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
      </ModalDialog>

      {/* Start Instant Call Modal */}
      <ModalDialog
        isOpen={showInstantCallModal}
        onClose={handleInstantCallCancel}
        title="Start Instant Video Call"
        size="lg"
      >
        <div className="p-6">
          <div className="mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Start a video call immediately and notify participants. The call
              will begin right away.
            </p>

            <form onSubmit={handleInstantCallSubmit}>
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label
                    htmlFor="instantTitle"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Call Title *
                  </label>
                  <input
                    type="text"
                    id="instantTitle"
                    value={instantCallData.title}
                    onChange={(e) =>
                      setInstantCallData({
                        ...instantCallData,
                        title: e.target.value,
                      })
                    }
                    placeholder="Enter call title"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="instantDescription"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Description
                  </label>
                  <textarea
                    id="instantDescription"
                    value={instantCallData.description}
                    onChange={(e) =>
                      setInstantCallData({
                        ...instantCallData,
                        description: e.target.value,
                      })
                    }
                    placeholder="Enter call description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {/* Case Selection */}
                <div>
                  <label
                    htmlFor="instantCase"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Related Case
                  </label>
                  <CustomSelect
                    options={[
                      { value: "", label: "No case selected" },
                      ...cases.map((caseItem) => ({
                        value: caseItem.id,
                        label: `${caseItem.caseNumber} - ${caseItem.title}`,
                      })),
                    ]}
                    value={{
                      value: instantCallData.caseId,
                      label: instantCallData.caseId
                        ? cases.find((c) => c.id === instantCallData.caseId)
                            ?.caseNumber +
                          " - " +
                          cases.find((c) => c.id === instantCallData.caseId)
                            ?.title
                        : "No case selected",
                    }}
                    onChange={(option) =>
                      setInstantCallData({
                        ...instantCallData,
                        caseId: option?.value || "",
                      })
                    }
                    placeholder="Select a case"
                  />
                </div>

                {/* Participants */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Participants
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {users.map((user) => (
                      <label
                        key={user.id}
                        className="flex items-center space-x-3"
                      >
                        <input
                          type="checkbox"
                          checked={instantCallData.participantIds.includes(
                            user.id
                          )}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setInstantCallData({
                                ...instantCallData,
                                participantIds: [
                                  ...instantCallData.participantIds,
                                  user.id,
                                ],
                              });
                            } else {
                              setInstantCallData({
                                ...instantCallData,
                                participantIds:
                                  instantCallData.participantIds.filter(
                                    (id) => id !== user.id
                                  ),
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {user.name} ({user.email})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Pre-call Settings */}
                <div className="border-t pt-4">
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
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={handleInstantCallCancel}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !instantCallData.title.trim()}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Starting..." : "Start Instant Call"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </ModalDialog>
    </div>
  );
}
