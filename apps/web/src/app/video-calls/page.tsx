"use client";

import InstantCallModal from "@/components/InstantCallModal";
import ModalDialog from "@/components/ui/ModalDialog";
import CustomSelect from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import {
  Calendar,
  CheckCircle,
  Clock,
  Copy,
  Edit,
  Mic,
  Phone,
  Plus,
  Search,
  User,
  Video,
  X,
  XCircle,
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
  } | null;
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
  clientId: string;
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
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => React.ReactNode;
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
  getStatusColor,
  getStatusIcon,
  formatDate,
  formatTime,
}: VideoCallCardProps) {
  const isUpcoming = (startTime: string) => {
    return new Date(startTime) > new Date();
  };

  const isLive = (startTime: string, endTime: string, status: string) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);

    // Check if the meeting is actually live based on status and time
    // Handle both uppercase (IN_PROGRESS) and lowercase (in_progress) status values
    const isStatusInProgress =
      status.toLowerCase() === "in_progress" || status === "IN_PROGRESS";
    const isWithinTimeRange = now >= start && now <= end;

    // Meeting is live only if status is in_progress AND we're within the time range
    return isStatusInProgress && isWithinTimeRange;
  };

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

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow">
      {/* Video Call Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="text-blue-600 dark:text-blue-400">
            <Video className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-medium text-foreground line-clamp-2">
              {videoCall.title}
            </h3>
            <div className="flex items-center mt-1">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(getDisplayStatus(videoCall.startTime, videoCall.endTime, videoCall.status))}`}
              >
                {getStatusIcon(
                  getDisplayStatus(
                    videoCall.startTime,
                    videoCall.endTime,
                    videoCall.status
                  )
                )}
                <span className="ml-1">
                  {getDisplayStatus(
                    videoCall.startTime,
                    videoCall.endTime,
                    videoCall.status
                  )
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
              </span>
              {isLive(
                videoCall.startTime,
                videoCall.endTime,
                videoCall.status
              ) && (
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
          <p className="text-sm text-muted-foreground line-clamp-2">
            {videoCall.description}
          </p>
        )}

        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(videoCall.startTime)}</span>
        </div>

        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            {formatTime(videoCall.startTime)} - {formatTime(videoCall.endTime)}
          </span>
        </div>

        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>Created by {videoCall.host.name}</span>
        </div>

        {/* Meeting ID */}
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-muted-foreground">Meeting ID:</span>
          <div className="flex items-center">
            <span className="font-mono font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
              {videoCall.meetingId}
            </span>
            <button
              onClick={() => onCopy(videoCall.meetingId, videoCall)}
              className="ml-2 p-1 text-muted-foreground hover:text-foreground rounded"
              title="Copy Meeting URL"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        {videoCall.case && (
          <div className="text-sm">
            <span className="text-muted-foreground">Case: </span>
            <span className="font-medium text-foreground">
              {videoCall.case.caseNumber}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex space-x-2">
        {/* Show Join button for:
            - Scheduled calls that are upcoming
            - Live calls (in progress within time range)
        */}
        {(isUpcoming(videoCall.startTime) &&
          videoCall.status === "SCHEDULED") ||
        isLive(videoCall.startTime, videoCall.endTime, videoCall.status) ? (
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
            className="flex-1 flex items-center justify-center px-3 py-2 border border-border rounded-md text-sm font-medium text-muted-foreground bg-background hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </button>
        )}

        <button
          onClick={() => onDelete(videoCall)}
          className="px-3 py-2 border border-red-300 dark:border-red-600 rounded-md text-sm font-medium text-red-700 dark:text-red-300 bg-background hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCase, setFilterCase] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showJoinWithMeetingIdModal, setShowJoinWithMeetingIdModal] =
    useState(false);
  const [showInstantCallModal, setShowInstantCallModal] = useState(false);
  const [videoCallToEdit, setVideoCallToEdit] = useState<VideoCall | null>(
    null
  );
  const [videoCallToDelete, setVideoCallToDelete] = useState<VideoCall | null>(
    null
  );
  const [videoCallToJoin, setVideoCallToJoin] = useState<VideoCall | null>(
    null
  );
  const [meetingIdToJoin, setMeetingIdToJoin] = useState("");
  const [cases, setCases] = useState<Case[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    status: "SCHEDULED",
    caseId: "",
    participantIds: [] as string[],
  });

  // Pre-call settings
  const [isLoading, setIsLoading] = useState(false);

  // Role-based access control
  const isLawyer =
    user?.role === "LAWYER" ||
    user?.role === "ASSOCIATE" ||
    user?.role === "PARALEGAL";
  const isClient = user?.role === "CLIENT";
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  // Only lawyers and admins can create/edit/delete video calls
  const canManageCalls = isLawyer || isAdmin;

  useEffect(() => {
    fetchVideoCalls();
    fetchCases();
    fetchUsers();
  }, []); // Only fetch on initial load

  const fetchVideoCalls = async () => {
    try {
      setLoading(true);
      const filters: { status?: string; caseId?: string } = {};

      if (filterStatus !== "all") {
        filters.status = filterStatus;
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
        title: formData.title || "Instant Video Call",
        description: formData.description,
        startTime: now.toISOString(),
        endTime: endTime.toISOString(),
        caseId: formData.caseId || undefined,
        participantIds: formData.participantIds,
      })) as VideoCall;

      // Reset form
      setFormData({
        title: "",
        description: "",
        startTime: "",
        endTime: "",
        status: "SCHEDULED",
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
        setVideoCallToJoin(newVideoCall);
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

  const handleEditClick = (videoCall: VideoCall) => {
    setVideoCallToEdit(videoCall);
    setFormData({
      title: videoCall.title,
      description: videoCall.description || "",
      startTime: videoCall.startTime,
      endTime: videoCall.endTime,
      status: videoCall.status,
      caseId: videoCall.case?.id || "",
      participantIds: videoCall.participants.map((p) => p.id),
    });
    setShowEditModal(true);
  };

  const handleEditVideoCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoCallToEdit) return;

    try {
      await apiClient.updateVideoCall(videoCallToEdit.id, {
        title: formData.title,
        description: formData.description || undefined,
        startTime: formData.startTime,
        endTime: formData.endTime,
        status: formData.status,
      });
      setShowEditModal(false);
      setVideoCallToEdit(null);
      fetchVideoCalls();
    } catch (error) {
      console.error("Error updating video call:", error);
    }
  };

  const handleViewClick = (videoCall: VideoCall) => {
    setVideoCallToJoin(videoCall);
    // Show meeting details in a simple alert for now
    alert(
      `Meeting ID: ${videoCall.meetingId}\nTitle: ${videoCall.title}\nDescription: ${videoCall.description || "No description"}\nStart Time: ${formatDate(videoCall.startTime)} ${formatTime(videoCall.startTime)}\nEnd Time: ${formatTime(videoCall.endTime)}`
    );
  };

  const handleDeleteClick = (videoCall: VideoCall) => {
    setVideoCallToDelete(videoCall);
    setShowDeleteModal(true);
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
      setShowDeleteModal(false);
      setVideoCallToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setVideoCallToDelete(null);
  };

  const handleJoinCall = async (videoCall: VideoCall) => {
    // Open pre-call settings modal
    setVideoCallToJoin(videoCall);
    setShowJoinModal(true);
  };

  const handleConfirmJoinCall = async () => {
    if (!videoCallToJoin) return;

    try {
      // Update call status to IN_PROGRESS if it's scheduled
      if (videoCallToJoin.status === "SCHEDULED") {
        await apiClient.updateVideoCall(videoCallToJoin.id, {
          status: "IN_PROGRESS",
        });
      }

      // Send notifications to participants that the call has started
      if (videoCallToJoin.participants.length > 0) {
        try {
          await apiClient.sendVideoCallStartedNotification(videoCallToJoin.id);
          console.log("Call started notifications sent to participants");
        } catch (error) {
          console.error("Failed to send call started notifications:", error);
          // Don't block the call start if notification fails
        }
      }

      // Store pre-call settings in localStorage
      // localStorage.setItem(
      //   "preCallAudioEnabled",
      //   preCallAudioEnabled.toString()
      // );
      // localStorage.setItem(
      //   "preCallVideoEnabled",
      //   preCallVideoEnabled.toString()
      // );

      // Navigate to the video call room
      if (videoCallToJoin.meetingId) {
        window.location.href = `/video-call-room/${videoCallToJoin.meetingId}`;
      }

      // Close modal and refresh the video calls list
      setShowJoinModal(false);
      setVideoCallToJoin(null);
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
    setShowJoinWithMeetingIdModal(true);
  };

  const handleJoinWithMeetingIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!meetingIdToJoin.trim()) {
      toast.error("Please enter a meeting ID");
      return;
    }

    // Save pre-call settings
    // localStorage.setItem("preCallAudioEnabled", preCallAudioEnabled.toString());
    // localStorage.setItem("preCallVideoEnabled", preCallVideoEnabled.toString());

    // Navigate to video call room
    window.open(`/video-call-room/${meetingIdToJoin.trim()}`, "_blank");

    // Close modal and reset
    setShowJoinWithMeetingIdModal(false);
    setMeetingIdToJoin("");
  };

  const handleJoinWithMeetingIdCancel = () => {
    setShowJoinWithMeetingIdModal(false);
    setMeetingIdToJoin("");
  };

  const handleStartInstantCall = () => {
    setShowInstantCallModal(true);
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
        return "bg-muted text-muted-foreground";
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "IN_PROGRESS":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "COMPLETED":
        return "bg-muted text-muted-foreground";
      case "CANCELLED":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
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
    const result = isStatusInProgress && isWithinTimeRange;

    // Debug time comparison
    console.log(
      `Time check: now=${now.toISOString()}, start=${start.toISOString()}, end=${end.toISOString()}, status=${status}, isStatusInProgress=${isStatusInProgress}, isWithinTimeRange=${isWithinTimeRange}, result=${result}`
    );

    return result;
  };

  const filteredVideoCalls = videoCalls.filter((videoCall) => {
    const matchesSearch =
      videoCall.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      videoCall.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || videoCall.status === filterStatus;
    const matchesCase =
      filterCase === "all" || videoCall.case?.caseNumber === filterCase;

    return matchesSearch && matchesStatus && matchesCase;
  });

  // Organize calls into sections
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
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-card rounded-lg shadow p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Video Calls
              </h1>
              <p className="text-muted-foreground">
                Manage video calls for your cases and clients
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {/* Filters */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search video calls..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
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
                        value: filterStatus,
                        label:
                          filterStatus === "all" ? "All Status" : filterStatus,
                      }}
                      onChange={(option) =>
                        setFilterStatus(option?.value || "all")
                      }
                      placeholder="Select status"
                    />
                  </div>

                  {/* Case Filter */}
                  <div className="relative">
                    <CustomSelect
                      options={[
                        { value: "all", label: "All Cases" },
                        ...cases.map((caseItem) => ({
                          value: caseItem.caseNumber,
                          label: `${caseItem.caseNumber} - ${caseItem.title}`,
                        })),
                      ]}
                      value={{
                        value: filterCase,
                        label: filterCase === "all" ? "All Cases" : filterCase,
                      }}
                      onChange={(option) =>
                        setFilterCase(option?.value || "all")
                      }
                      placeholder="Select case"
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
              {canManageCalls && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Video Calls List */}
        {filteredVideoCalls.length === 0 ? (
          <div className="bg-card rounded-lg shadow-sm border border-border p-12 text-center">
            <Video className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No video calls found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || filterStatus !== "all" || filterCase !== "all"
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
                      showEditButton={canManageCalls}
                      onEdit={handleEditClick}
                      onDelete={handleDeleteClick}
                      onJoin={handleJoinCall}
                      onCopy={handleCopyMeetingId}
                      getStatusBadge={getStatusBadge}
                      getStatusColor={getStatusColor}
                      getStatusIcon={getStatusIcon}
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
                      showEditButton={canManageCalls}
                      onEdit={handleEditClick}
                      onDelete={handleDeleteClick}
                      onJoin={handleJoinCall}
                      onCopy={handleCopyMeetingId}
                      getStatusBadge={getStatusBadge}
                      getStatusColor={getStatusColor}
                      getStatusIcon={getStatusIcon}
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
                      getStatusColor={getStatusColor}
                      getStatusIcon={getStatusIcon}
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
              className="flex-1 px-4 py-2 border border-border rounded-md text-sm font-medium text-muted-foreground bg-background hover:bg-muted"
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
              value={formData.title}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  title: e.target.value,
                })
              }
              placeholder="Instant Video Call"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                })
              }
              placeholder="Meeting description..."
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
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
                formData.caseId
                  ? {
                      value: formData.caseId,
                      label: cases.find((c) => c.id === formData.caseId)
                        ? `${cases.find((c) => c.id === formData.caseId)?.caseNumber} - ${cases.find((c) => c.id === formData.caseId)?.title}`
                        : "Select a case",
                    }
                  : { value: "", label: "Select a case" }
              }
              onChange={(option) =>
                setFormData({
                  ...formData,
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
              className="px-4 py-2 text-sm font-medium text-muted-foreground bg-muted rounded-md hover:bg-muted/80"
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
              value={formData.title}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  title: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
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
                value={formData.startTime}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    startTime: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Time
              </label>
              <input
                type="datetime-local"
                required
                value={formData.endTime}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    endTime: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground"
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
              value={{ value: formData.status, label: formData.status }}
              onChange={(option) =>
                setFormData({
                  ...formData,
                  status: option?.value || "SCHEDULED",
                })
              }
              placeholder="Select status"
            />
          </div>
          <div>
            <CustomSelect
              label="Case"
              options={[
                { value: "", label: "Select a case" },
                ...cases.map((caseItem) => ({
                  value: caseItem.id,
                  label: `${caseItem.caseNumber} - ${caseItem.title}`,
                })),
              ]}
              value={{
                value: formData.caseId,
                label: cases.find((c) => c.id === formData.caseId)
                  ? `${cases.find((c) => c.id === formData.caseId)?.caseNumber} - ${cases.find((c) => c.id === formData.caseId)?.title}`
                  : "Select a case",
              }}
              onChange={(option) =>
                setFormData({
                  ...formData,
                  caseId: option?.value || "",
                })
              }
              placeholder="Select a case"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Participants
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {users.map((user) => (
                <label key={user.id} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.participantIds.includes(user.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          participantIds: [...formData.participantIds, user.id],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          participantIds: formData.participantIds.filter(
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
        </form>
      </ModalDialog>

      {/* Delete Confirmation Modal */}
      <ModalDialog
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        header={
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Delete Video Call
          </h2>
        }
        footer={
          <div className="flex space-x-3">
            <button
              onClick={handleDeleteCancel}
              className="px-4 py-2 bg-muted text-muted-foreground text-base font-medium rounded-md shadow-sm hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-gray-300"
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
          setVideoCallToJoin(null);
        }}
        header="Join Video Call"
        footer={
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setShowJoinModal(false);
                setVideoCallToJoin(null);
              }}
              className="px-4 py-2 text-sm font-medium text-muted-foreground bg-muted rounded-md hover:bg-muted/80"
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
              {videoCallToJoin?.title}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Meeting ID:{" "}
              <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
                {videoCallToJoin?.meetingId}
              </span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatDate(videoCallToJoin?.startTime || "")} at{" "}
              {formatTime(videoCallToJoin?.startTime || "")}
            </p>
          </div>

          <div className="mb-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">
              {videoCallToJoin?.title}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Meeting ID:{" "}
              <span className="font-mono font-medium text-blue-600 dark:text-blue-400">
                {videoCallToJoin?.meetingId}
              </span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatDate(videoCallToJoin?.startTime || "")} at{" "}
              {formatTime(videoCallToJoin?.startTime || "")}
            </p>
          </div>

          {/* Pre-call Settings */}
          <div className="mb-6">
            <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              Before joining, you can:
            </h5>

            <div className="space-y-3">
              {/* Audio Setting */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  {/* preCallAudioEnabled is no longer managed here */}
                  <Mic className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Microphone
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {/* preCallAudioEnabled is no longer managed here */}
                      Will be enabled
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // setPreCallAudioEnabled(!preCallAudioEnabled); // This line is removed
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    /* preCallAudioEnabled is no longer managed here */
                    "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                  }`}
                >
                  {/* preCallAudioEnabled is no longer managed here */}
                  ON
                </button>
              </div>

              {/* Video Setting */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  {/* preCallVideoEnabled is no longer managed here */}
                  <Video className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Camera
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {/* preCallVideoEnabled is no longer managed here */}
                      Will be enabled
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // setPreCallVideoEnabled(!preCallVideoEnabled); // This line is removed
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    /* preCallVideoEnabled is no longer managed here */
                    "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                  }`}
                >
                  {/* preCallVideoEnabled is no longer managed here */}
                  ON
                </button>
              </div>
            </div>
          </div>
        </div>
      </ModalDialog>

      {/* Join with Meeting ID Modal */}
      <ModalDialog
        isOpen={showJoinWithMeetingIdModal}
        onClose={handleJoinWithMeetingIdCancel}
        header={
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Join Video Call
          </h2>
        }
        maxWidth="md"
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
                  value={meetingIdToJoin}
                  onChange={(e) => setMeetingIdToJoin(e.target.value)}
                  placeholder="Enter meeting ID (e.g., abc123)"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
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
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      {/* preCallAudioEnabled is no longer managed here */}
                      <Mic className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Microphone
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {/* preCallAudioEnabled is no longer managed here */}
                          Will be enabled
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        // setPreCallAudioEnabled(!preCallAudioEnabled); // This line is removed
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        /* preCallAudioEnabled is no longer managed here */
                        "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                      }`}
                    >
                      {/* preCallAudioEnabled is no longer managed here */}
                      ON
                    </button>
                  </div>

                  {/* Video Setting */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      {/* preCallVideoEnabled is no longer managed here */}
                      <Video className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Camera
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {/* preCallVideoEnabled is no longer managed here */}
                          Will be enabled
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        // setPreCallVideoEnabled(!preCallVideoEnabled); // This line is removed
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        /* preCallVideoEnabled is no longer managed here */
                        "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                      }`}
                    >
                      {/* preCallVideoEnabled is no longer managed here */}
                      ON
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={handleJoinWithMeetingIdCancel}
                  className="px-4 py-2 text-muted-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors"
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
      <InstantCallModal
        isOpen={showInstantCallModal}
        onClose={() => setShowInstantCallModal(false)}
        onSuccess={(meetingId) => {
          // Navigate to video call room
          window.open(`/video-call-room/${meetingId}`, "_blank");
          setShowInstantCallModal(false);
          // Refresh video calls list
          fetchVideoCalls();
        }}
        autoJoin={false}
      />
    </div>
  );
}
