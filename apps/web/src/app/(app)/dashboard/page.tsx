"use client";

import { AccessDenied } from "@/components/AccessDenied";
import AddClientModal from "@/components/AddClientModal";
import CreateBillModal from "@/components/CreateBillModal";
import CreateCaseModal from "@/components/CreateCaseModal";
import CreateTaskModal from "@/components/CreateTaskModal";
import InstantCallModal from "@/components/InstantCallModal";
import LoadingOverlay from "@/components/LoadingOverlay";

import ScheduleEventModal from "@/components/ScheduleEventModal";
import UploadDocumentModal from "@/components/UploadDocumentModal";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useVideoCall } from "@/contexts/VideoCallContext";
import { apiClient } from "@/services/api";
import { formatCurrency } from "@/utils/currency";
import {
  AlertCircle,
  AlertTriangle,
  Briefcase,
  Calendar,
  CheckSquare,
  CreditCard,
  FileText,
  MessageSquare,
  Plus,
  Upload,
  User,
  Users,
  Video,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Lawyer Dashboard Interfaces
interface DashboardStats {
  totalCases: number;
  activeCases: number;
  pendingCases: number;
  closedCases: number;
  totalClients: number;
  totalDocuments: number;
  totalBills: number;
  overdueBills: number;
  caseChangePercent: number;
  newCasesThisMonth: number;
  newClientsThisMonth: number;
}

interface UpcomingHearing {
  id: string;
  caseNumber: string;
  title: string;
  nextHearingDate: string;
  client: {
    name: string;
  };
}

interface OverdueBill {
  id: string;
  amount: number;
  description: string;
  dueDate: string;
  case: {
    caseNumber: string;
    title: string;
  };
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  caseNumber?: string;
  userName?: string;
}

// Client Dashboard Interfaces
interface ClientStats {
  totalCases: number;
  activeCases: number;
  totalDocuments: number;
  totalBills: number;
  unpaidBills: number;
  upcomingEvents: number;
  newCasesThisMonth: number;
  newDocumentsThisMonth: number;
  newBillsThisMonth: number;
}

interface ClientCase {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  category: string;
  assignedLawyer: {
    id: string;
    name: string;
    email: string;
  };
  updatedAt: string;
}

interface ClientDocument {
  id: string;
  title: string;
  description: string;
  fileType: string;
  category: string;
  status: string;
  createdAt: string;
  case: {
    id: string;
    caseNumber: string;
    title: string;
  };
}

interface ClientBill {
  id: string;
  title: string;
  description: string;
  amount: number;
  billType: string;
  status: string;
  dueDate: string;
  createdAt: string;
  case: {
    id: string;
    caseNumber: string;
    title: string;
  };
}

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const { startVideoCall } = useVideoCall();
  const { getSetting } = useSettings();
  const router = useRouter();

  // Function to get role badge color
  const getRoleBadgeColor = (role: string) => {
    const roleColors: Record<string, string> = {
      SUPER_ADMIN:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      ADMIN: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      LAWYER: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      ASSOCIATE:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      PARALEGAL:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      CLIENT: "bg-muted text-muted-foreground",
    };
    return roleColors[role] || roleColors.CLIENT;
  };

  // Get user's currency preference
  const userCurrency = getSetting("currency") || "INR";

  // State for lawyer dashboard
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingHearings, setUpcomingHearings] = useState<UpcomingHearing[]>(
    []
  );
  const [overdueBills, setOverdueBills] = useState<OverdueBill[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  // State for client dashboard
  const [clientStats, setClientStats] = useState<ClientStats | null>(null);
  const [recentCases, setRecentCases] = useState<ClientCase[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<ClientDocument[]>([]);
  const [recentBills, setRecentBills] = useState<ClientBill[]>([]);

  // Common state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showInstantCallNotification, setShowInstantCallNotification] =
    useState(false);
  const [showCreateBillModal, setShowCreateBillModal] = useState(false);
  const [showCreateCaseModal, setShowCreateCaseModal] = useState(false);
  const [showUploadDocumentModal, setShowUploadDocumentModal] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showScheduleEventModal, setShowScheduleEventModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showInstantCallModal, setShowInstantCallModal] = useState(false);

  // Role-based flags
  const isLawyer =
    user?.role === "LAWYER" ||
    user?.role === "ASSOCIATE" ||
    user?.role === "PARALEGAL";
  const isClient = user?.role === "CLIENT";
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  useEffect(() => {
    fetchDashboardData();
    if (isClient) {
      fetchNotifications();
    }

    // Check for notifications every 30 seconds (client only)
    let notificationInterval: NodeJS.Timeout;
    if (isClient) {
      notificationInterval = setInterval(() => {
        fetchNotifications();
      }, 30000);
    }

    return () => {
      if (notificationInterval) {
        clearInterval(notificationInterval);
      }
    };
  }, [isClient]);

  // Listen for online status updates
  useEffect(() => {
    const handleUserStatusChange = (event: CustomEvent) => {
      const { userId, isOnline } = event.detail;
      // You can add logic here to update any chat-related data on the dashboard
    };

    // Add event listener for user status changes
    window.addEventListener(
      "userStatusChange",
      handleUserStatusChange as EventListener
    );

    // Cleanup
    return () => {
      window.removeEventListener(
        "userStatusChange",
        handleUserStatusChange as EventListener
      );
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await apiClient.getNotifications();
      if (response && Array.isArray(response)) {
        setNotifications(response);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check authentication first
      if (!isAuthenticated || !user) {
        setError("Please log in to view dashboard data");
        setLoading(false);
        return;
      }

      if (isLawyer) {
        // Fetch lawyer dashboard data
        const [
          statsResponse,
          hearingsResponse,
          billsResponse,
          activityResponse,
        ] = await Promise.all([
          // Use practice dashboard for firm owners/admins, personal dashboard for lawyers
          user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"
            ? apiClient.getPracticeDashboardStats()
            : apiClient.getDashboardStats(),
          apiClient.getUpcomingHearings(),
          apiClient.getOverdueBills(),
          apiClient.getUserRecentActivity(), // Use user-specific endpoint for lawyers
        ]);

        console.log("Dashboard API responses:", {
          stats: statsResponse,
          hearings: hearingsResponse,
          bills: billsResponse,
          activity: activityResponse,
          userRole: user?.role,
          isAdmin: user?.role === "ADMIN" || user?.role === "SUPER_ADMIN",
        });

        if (
          statsResponse &&
          typeof statsResponse === "object" &&
          "totalCases" in statsResponse
        ) {
          console.log("Setting stats:", statsResponse);
          setStats(statsResponse as DashboardStats);
        } else {
          console.warn("Invalid stats response:", statsResponse);
        }

        if (hearingsResponse && Array.isArray(hearingsResponse))
          setUpcomingHearings(hearingsResponse);
        if (billsResponse && Array.isArray(billsResponse))
          setOverdueBills(billsResponse);
        if (activityResponse && Array.isArray(activityResponse))
          setRecentActivity(activityResponse);
      } else if (isClient) {
        // Fetch client dashboard data
        const [statsResponse, casesResponse, documentsResponse, billsResponse] =
          await Promise.all([
            apiClient.getClientDashboardStats(),
            apiClient.getClientCases(),
            apiClient.getClientDocuments(),
            apiClient.getClientBills(),
          ]);

        if (
          statsResponse &&
          typeof statsResponse === "object" &&
          "totalCases" in statsResponse
        )
          setClientStats(statsResponse as ClientStats);
        if (casesResponse && Array.isArray(casesResponse))
          setRecentCases(casesResponse);
        if (documentsResponse && Array.isArray(documentsResponse))
          setRecentDocuments(documentsResponse);
        if (billsResponse && Array.isArray(billsResponse))
          setRecentBills(billsResponse);
      }
    } catch (error: any) {
      console.error("Dashboard data fetch error:", error);

      // Provide more specific error messages
      if (error.message?.includes("403")) {
        setError("Access denied. You don't have permission to view this data.");
      } else if (error.message?.includes("401")) {
        setError("Authentication failed. Please log in again.");
      } else if (error.message?.includes("HTTP error")) {
        setError(`Server error: ${error.message}`);
      } else if (error.message?.includes("Failed to fetch")) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError(
          `Failed to load dashboard data: ${error.message || "Unknown error"}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Lawyer Dashboard Components
  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    change,
    onClick,
  }: {
    title: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    change?: string;
    onClick?: () => void;
  }) => {
    const getChangeColor = (changeText: string) => {
      if (changeText.startsWith("+"))
        return "text-green-600 dark:text-green-400";
      if (changeText.startsWith("-")) return "text-red-600 dark:text-red-400";
      return "text-muted-foreground";
    };

    return (
      <button
        onClick={onClick}
        className={`bg-card border border-border overflow-hidden shadow-sm dark:shadow-md rounded-lg hover:shadow-md dark:hover:shadow-lg transition-all duration-200 ${
          onClick ? "cursor-pointer hover:scale-[1.02]" : "cursor-default"
        }`}
      >
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Icon
                className={`h-6 w-6 text-${color}-600 dark:text-${color}-400`}
              />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-muted-foreground truncate">
                  {title}
                </dt>
                <dd>
                  <div className="text-lg font-medium text-foreground">
                    {value.toLocaleString()}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
          {change && (
            <div className="mt-2">
              <span className={`text-sm font-medium ${getChangeColor(change)}`}>
                {change}
              </span>
            </div>
          )}
        </div>
      </button>
    );
  };

  const QuickActionCard = ({
    title,
    description,
    icon: Icon,
    onClick,
    color = "blue",
  }: {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    color?: string;
  }) => {
    return (
      <button
        onClick={onClick}
        className="flex flex-col items-center justify-center p-4 border border-border rounded-lg hover:bg-muted transition-all duration-200 hover:scale-[1.02] shadow-sm dark:shadow-md"
      >
        <Icon
          className={`h-8 w-8 text-${color}-600 dark:text-${color}-400 mb-2`}
        />
        <h3 className="font-medium text-foreground text-sm text-center">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground text-center mt-1">
          {description}
        </p>
      </button>
    );
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "create-case":
        setShowCreateCaseModal(true);
        break;
      case "upload-document":
        setShowUploadDocumentModal(true);
        break;
      case "create-bill":
        setShowCreateBillModal(true);
        break;
      case "add-client":
        setShowAddClientModal(true);
        break;
      case "schedule-event":
        setShowScheduleEventModal(true);
        break;
      case "create-task":
        setShowCreateTaskModal(true);
        break;
      case "video-call":
        setShowInstantCallModal(true);
        break;
      case "send-message":
        router.push("/chat");
        break;
      case "view-documents":
        router.push("/documents");
        break;
      case "view-bills":
        router.push("/billing");
        break;
      case "view-calendar":
        router.push("/calendar");
        break;
      case "contact-lawyer":
        router.push("/notifications");
        break;
      case "view-reports":
        if (isAdmin) {
          router.push("/admin/dashboard");
        } else {
          router.push("/dashboard");
        }
        break;
      case "settings":
        if (isAdmin) {
          router.push("/admin/settings");
        } else {
          router.push("/settings");
        }
        break;
    }
  };

  // Instant Call Functions
  const handleInstantCallCancel = () => {
    setShowInstantCallModal(false);
  };

  // Client Dashboard Components
  const ClientStatCard = ({
    title,
    value,
    icon: Icon,
    color,
    change,
    onClick,
  }: {
    title: string;
    value: number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    change?: string;
    onClick?: () => void;
  }) => {
    const getChangeColor = (changeText: string) => {
      if (changeText.startsWith("+"))
        return "text-green-600 dark:text-green-400";
      if (changeText.startsWith("-")) return "text-red-600 dark:text-red-400";
      return "text-muted-foreground";
    };

    return (
      <button
        onClick={onClick}
        className={`bg-card border border-border overflow-hidden shadow-sm dark:shadow-md rounded-lg hover:shadow-md dark:hover:shadow-lg transition-all duration-200 ${
          onClick ? "cursor-pointer hover:scale-[1.02]" : "cursor-default"
        }`}
      >
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Icon
                className={`h-6 w-6 text-${color}-600 dark:text-${color}-400`}
              />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-muted-foreground truncate">
                  {title}
                </dt>
                <dd>
                  <div className="text-lg font-medium text-foreground">
                    {value.toLocaleString()}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
          {change && (
            <div className="mt-2">
              <span className={`text-sm font-medium ${getChangeColor(change)}`}>
                {change}
              </span>
            </div>
          )}
        </div>
      </button>
    );
  };

  const ClientQuickActionCard = ({
    title,
    description,
    icon: Icon,
    onClick,
    color = "blue",
  }: {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    color?: string;
  }) => {
    return (
      <button
        onClick={onClick}
        className="flex flex-col items-center justify-center p-4 border border-border rounded-lg hover:bg-muted transition-all duration-200 hover:scale-[1.02] shadow-sm dark:shadow-md"
      >
        <Icon
          className={`h-8 w-8 text-${color}-600 dark:text-${color}-400 mb-2`}
        />
        <h3 className="font-medium text-foreground text-sm text-center">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground text-center mt-1">
          {description}
        </p>
      </button>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "text-green-600 bg-green-100 dark:bg-green-900/20";
      case "pending":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20";
      case "closed":
        return "text-muted-foreground bg-muted";
      case "overdue":
        return "text-red-600 bg-red-100 dark:bg-red-900/20";
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Error Loading Dashboard
          </h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button onClick={fetchDashboardData} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Render Lawyer Dashboard
  if (isLawyer) {
    return (
      <div className="min-h-screen bg-background">
        <LoadingOverlay
          isVisible={loading}
          title="Loading Dashboard"
          message="Please wait while we fetch your dashboard data..."
          absolute={true}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-muted-foreground mt-2">
              Here&apos;s what&apos;s happening with your practice today.
            </p>
            {user && (
              <div className="mt-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}
                >
                  {user.role.replace("_", " ")}
                </span>
              </div>
            )}
          </div>

          {/* Statistics Grid */}
          {stats && (
            <>
              {stats.totalCases === 0 && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-blue-600 dark:text-blue-400">
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        No data found
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"
                          ? "No cases, clients, or documents found in your practice yet. Start by creating your first case or adding a client."
                          : "No cases assigned to you yet. Contact your administrator to get assigned to cases."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                  title="Total Cases"
                  value={stats.totalCases}
                  icon={Briefcase}
                  color="blue"
                  change={`+${stats.caseChangePercent}%`}
                  onClick={() => router.push("/cases")}
                />
                <StatCard
                  title="Active Cases"
                  value={stats.activeCases}
                  icon={CheckSquare}
                  color="green"
                  onClick={() => router.push("/cases?status=ACTIVE")}
                />
                <StatCard
                  title="Total Clients"
                  value={stats.totalClients}
                  icon={Users}
                  color="purple"
                  change={`+${stats.newClientsThisMonth}`}
                  onClick={() => router.push("/clients")}
                />
                <StatCard
                  title="Overdue Bills"
                  value={stats.overdueBills}
                  icon={AlertTriangle}
                  color="red"
                  onClick={() => router.push("/billing?status=OVERDUE")}
                />
              </div>
            </>
          )}

          {/* Debug Information (Development Only) */}
          {process.env.NODE_ENV === "development" && stats && (
            <div className="mb-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-800 mb-2">
                Debug Info (Development)
              </h3>
              <div className="text-xs text-yellow-700 dark:text-yellow-700 space-y-1">
                <p>
                  <strong>User Role:</strong> {user?.role}
                </p>
                <p>
                  <strong>API Endpoint Used:</strong>{" "}
                  {user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"
                    ? "Practice Dashboard"
                    : "Personal Dashboard"}
                </p>
                <p>
                  <strong>Total Cases:</strong> {stats.totalCases}
                </p>
                <p>
                  <strong>Active Cases:</strong> {stats.activeCases}
                </p>
                <p>
                  <strong>Pending Cases:</strong> {stats.pendingCases}
                </p>
                <p>
                  <strong>Closed Cases:</strong> {stats.closedCases}
                </p>
                <p>
                  <strong>Total Clients:</strong> {stats.totalClients}
                </p>
                <p>
                  <strong>Total Documents:</strong> {stats.totalDocuments}
                </p>
                <p>
                  <strong>Total Bills:</strong> {stats.totalBills}
                </p>
                <p>
                  <strong>Overdue Bills:</strong> {stats.overdueBills}
                </p>
                <p>
                  <strong>Data Source:</strong>{" "}
                  {user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"
                    ? "Practice-wide"
                    : "Personal"}
                </p>
              </div>
            </div>
          )}

          {/* Admin Quick Access */}
          {(user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") && (
            <div className="mb-8">
              <h2 className="text-lg font-medium text-foreground mb-4">
                Admin Tools
              </h2>
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      User Management
                    </h3>
                    <p className="text-muted-foreground">
                      {user?.role === "SUPER_ADMIN"
                        ? "Manage all users across all practices"
                        : "Manage users within your practice"}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push("/admin/users")}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    Manage Users
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-foreground mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <QuickActionCard
                title="Create Case"
                description="Start a new case"
                icon={Plus}
                onClick={() => handleQuickAction("create-case")}
                color="blue"
              />
              <QuickActionCard
                title="Upload Document"
                description="Add new document"
                icon={Upload}
                onClick={() => handleQuickAction("upload-document")}
                color="green"
              />
              <QuickActionCard
                title="Create Bill"
                description="Generate invoice"
                icon={CreditCard}
                onClick={() => handleQuickAction("create-bill")}
                color="purple"
              />
              <QuickActionCard
                title="Add Client"
                description="Register new client"
                icon={User}
                onClick={() => handleQuickAction("add-client")}
                color="indigo"
              />
              <QuickActionCard
                title="Schedule Event"
                description="Book calendar"
                icon={Calendar}
                onClick={() => handleQuickAction("schedule-event")}
                color="yellow"
              />
              <QuickActionCard
                title="Create Task"
                description="Add new task"
                icon={CheckSquare}
                onClick={() => handleQuickAction("create-task")}
                color="pink"
              />
              {(user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") && (
                <QuickActionCard
                  title="Manage Users"
                  description="View and edit employees"
                  icon={Users}
                  onClick={() => router.push("/admin/users")}
                  color="orange"
                />
              )}
              {/* <QuickActionCard
                title="Video Call"
                description="Start instant call"
                icon={Video}
                onClick={() => handleQuickAction("video-call")}
                color="red"
              />
              <QuickActionCard
                title="Send Message"
                description="Contact client"
                icon={MessageSquare}
                onClick={() => handleQuickAction("send-message")}
                color="teal"
              /> */}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upcoming Hearings */}
            <div className="bg-card border border-border shadow-sm dark:shadow-md rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-foreground">
                  Upcoming Hearings
                </h3>
                <button
                  onClick={() => router.push("/calendar")}
                  className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  View All
                </button>
              </div>
              <div className="space-y-3">
                {upcomingHearings.slice(0, 5).map((hearing) => (
                  <div
                    key={hearing.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {hearing.caseNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {hearing.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Client: {hearing.client.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        {formatDate(hearing.nextHearingDate)}
                      </p>
                      <button
                        onClick={() => router.push(`/cases/${hearing.id}`)}
                        className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        View Case
                      </button>
                    </div>
                  </div>
                ))}
                {upcomingHearings.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming hearings scheduled.
                  </p>
                )}
              </div>
            </div>

            {/* Overdue Bills */}
            <div className="bg-card border border-border shadow-sm dark:shadow-md rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-foreground">
                  Overdue Bills
                </h3>
                <button
                  onClick={() => router.push("/billing")}
                  className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  View All
                </button>
              </div>
              <div className="space-y-3">
                {overdueBills.slice(0, 5).map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {bill.case.caseNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {bill.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Due: {formatDate(bill.dueDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(bill.amount, userCurrency)}
                      </p>
                      <button
                        onClick={() => router.push("/billing")}
                        className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        View Bill
                      </button>
                    </div>
                  </div>
                ))}
                {overdueBills.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No overdue bills.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-8 bg-card border border-border shadow-sm dark:shadow-md rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-foreground">
                Recent Activity
              </h3>
              <button
                onClick={() => router.push("/notifications")}
                className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                View All
              </button>
            </div>
            <div className="space-y-3">
              {recentActivity.slice(0, 10).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex-1">
                    <p className="text-sm text-foreground">
                      {activity.description}
                    </p>
                    {activity.caseNumber && (
                      <p className="text-xs text-muted-foreground">
                        Case: {activity.caseNumber}
                      </p>
                    )}
                    {activity.userName && (
                      <p className="text-xs text-muted-foreground">
                        By: {activity.userName}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {formatDate(activity.timestamp)}
                    </p>
                    {activity.caseNumber && (
                      <button
                        onClick={() =>
                          router.push(`/cases/${activity.caseNumber}`)
                        }
                        className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 ml-2"
                      >
                        View Case
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activity.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Modals */}
        {/* Create Bill Modal */}
        <CreateBillModal
          isOpen={showCreateBillModal}
          onClose={() => setShowCreateBillModal(false)}
          onSuccess={() => {
            // Refresh dashboard data after successful bill creation
            fetchDashboardData();
          }}
          userCurrency={userCurrency}
        />

        {/* Create Case Modal */}
        <CreateCaseModal
          isOpen={showCreateCaseModal}
          onClose={() => setShowCreateCaseModal(false)}
          onSuccess={() => {
            // Refresh dashboard data after successful case creation
            fetchDashboardData();
          }}
        />

        {/* Upload Document Modal */}
        <UploadDocumentModal
          isOpen={showUploadDocumentModal}
          onClose={() => setShowUploadDocumentModal(false)}
          onSuccess={() => {
            // Refresh dashboard data after successful document upload
            fetchDashboardData();
          }}
        />

        {/* Add Client Modal */}
        <AddClientModal
          isOpen={showAddClientModal}
          onClose={() => setShowAddClientModal(false)}
          onSuccess={() => {
            // Refresh dashboard data after successful client addition
            fetchDashboardData();
          }}
        />

        {/* Schedule Event Modal */}
        <ScheduleEventModal
          isOpen={showScheduleEventModal}
          onClose={() => setShowScheduleEventModal(false)}
          onSuccess={() => {
            // Refresh dashboard data after successful event scheduling
            fetchDashboardData();
          }}
        />

        {/* Create Task Modal */}
        <CreateTaskModal
          isOpen={showCreateTaskModal}
          onClose={() => setShowCreateTaskModal(false)}
          onSuccess={() => {
            // Refresh dashboard data after successful task creation
            fetchDashboardData();
          }}
        />

        {/* Start Instant Call Modal */}
        <InstantCallModal
          isOpen={showInstantCallModal}
          onClose={handleInstantCallCancel}
          onSuccess={(meetingId) => {
            // The modal now handles starting the call in the same window
            setShowInstantCallModal(false);
          }}
          autoJoin={false}
        />
      </div>
    );
  }

  // Render Client Dashboard
  if (isClient) {
    return (
      <div className="min-h-screen bg-background">
        <LoadingOverlay
          isVisible={loading}
          title="Loading Dashboard"
          message="Please wait while we fetch your dashboard data..."
          absolute={true}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-muted-foreground mt-2">
              Here&apos;s an overview of your legal matters and recent activity.
            </p>
            {user && (
              <div className="mt-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}
                >
                  {user.role.replace("_", " ")}
                </span>
              </div>
            )}
          </div>

          {/* Statistics Grid */}
          {clientStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <ClientStatCard
                title="Total Cases"
                value={clientStats.totalCases}
                icon={Briefcase}
                color="blue"
                change={`+${clientStats.newCasesThisMonth}`}
                onClick={() => router.push("/cases")}
              />
              <ClientStatCard
                title="Active Cases"
                value={clientStats.activeCases}
                icon={CheckSquare}
                color="green"
              />
              <ClientStatCard
                title="Total Documents"
                value={clientStats.totalDocuments}
                icon={FileText}
                color="purple"
                change={`+${clientStats.newDocumentsThisMonth}`}
                onClick={() => router.push("/documents")}
              />
              <ClientStatCard
                title="Unpaid Bills"
                value={clientStats.unpaidBills}
                icon={AlertCircle}
                color="red"
                onClick={() => router.push("/billing")}
              />
            </div>
          )}

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-lg font-medium text-foreground mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <ClientQuickActionCard
                title="View Documents"
                description="Access your files"
                icon={FileText}
                onClick={() => router.push("/documents")}
                color="blue"
              />
              <ClientQuickActionCard
                title="View Bills"
                description="Check payments"
                icon={CreditCard}
                onClick={() => router.push("/billing")}
                color="green"
              />
              <ClientQuickActionCard
                title="View Calendar"
                description="Check events"
                icon={Calendar}
                onClick={() => router.push("/calendar")}
                color="purple"
              />
              <ClientQuickActionCard
                title="Contact Lawyer"
                description="Send message"
                icon={MessageSquare}
                onClick={() => router.push("/chat")}
                color="indigo"
              />
              <ClientQuickActionCard
                title="Video Call"
                description="Start meeting"
                icon={Video}
                onClick={() => router.push("/video-calls")}
                color="red"
              />
              <ClientQuickActionCard
                title="Notifications"
                description="View updates"
                icon={AlertCircle}
                onClick={() => router.push("/notifications")}
                color="yellow"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Cases */}
            <div className="bg-card border border-border shadow-sm dark:shadow-md rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-foreground">
                  Recent Cases
                </h3>
                <button
                  onClick={() => router.push("/cases")}
                  className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  View All
                </button>
              </div>
              <div className="space-y-3">
                {recentCases.slice(0, 5).map((caseItem) => (
                  <div
                    key={caseItem.id}
                    className="p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => router.push(`/cases/${caseItem.id}`)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">
                        {caseItem.caseNumber}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          caseItem.status
                        )}`}
                      >
                        {caseItem.status}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mb-2">
                      {caseItem.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Lawyer: {caseItem.assignedLawyer.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Updated: {formatDate(caseItem.updatedAt)}
                    </p>
                  </div>
                ))}
                {recentCases.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No cases found.
                  </p>
                )}
              </div>
            </div>

            {/* Recent Documents */}
            <div className="bg-card border border-border shadow-sm dark:shadow-md rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-foreground">
                  Recent Documents
                </h3>
                <button
                  onClick={() => router.push("/documents")}
                  className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  View All
                </button>
              </div>
              <div className="space-y-3">
                {recentDocuments.slice(0, 5).map((document) => (
                  <div
                    key={document.id}
                    className="p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => router.push("/documents")}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">
                        {document.title}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          document.status
                        )}`}
                      >
                        {document.status}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mb-2">
                      {document.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Case: {document.case.caseNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Added: {formatDate(document.createdAt)}
                    </p>
                  </div>
                ))}
                {recentDocuments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No documents found.
                  </p>
                )}
              </div>
            </div>

            {/* Recent Bills */}
            <div className="bg-card border border-border shadow-sm dark:shadow-md rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-foreground">
                  Recent Bills
                </h3>
                <button
                  onClick={() => router.push("/billing")}
                  className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  View All
                </button>
              </div>
              <div className="space-y-3">
                {recentBills.slice(0, 5).map((bill) => (
                  <div
                    key={bill.id}
                    className="p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => router.push("/billing")}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">
                        {bill.title}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          bill.status
                        )}`}
                      >
                        {bill.status}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mb-2">
                      {bill.description}
                    </p>
                    <p className="text-sm font-medium text-foreground mb-1">
                      {formatCurrency(bill.amount, userCurrency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Case: {bill.case.caseNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Due: {formatDate(bill.dueDate)}
                    </p>
                  </div>
                ))}
                {recentBills.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No bills found.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default fallback
  return (
    <AccessDenied
      title="Access Denied"
      message="You don't have permission to access this dashboard."
    />
  );
}
