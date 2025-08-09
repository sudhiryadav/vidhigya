"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { apiClient } from "@/services/api";
import { formatCurrency, getCurrencySymbol } from "@/utils/currency";
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  CheckSquare,
  Clock,
  CreditCard,
  FileText,
  MessageSquare,
  Plus,
  Settings,
  TrendingUp,
  Upload,
  User,
  Users,
  Video,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

export default function Dashboard() {
  const { user } = useAuth();
  const { getSetting } = useSettings();
  const router = useRouter();

  // Get user's currency preference
  const userCurrency = getSetting("currency") || "INR";

  // Debug: Log currency settings
  console.log("User currency:", userCurrency);
  console.log("Settings available:", getSetting);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingHearings, setUpcomingHearings] = useState<UpcomingHearing[]>(
    []
  );
  const [overdueBills, setOverdueBills] = useState<OverdueBill[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch real data from APIs
      const [
        statsData,
        upcomingEventsData,
        overdueBillsData,
        recentActivityData,
      ] = await Promise.all([
        apiClient.getDashboardStats(),
        apiClient.getCalendarEvents({
          startDate: new Date().toISOString(),
          endDate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        }),
        apiClient.getBills({ status: "OVERDUE" }),
        apiClient.getUserRecentActivity(5),
      ]);

      // Transform dashboard stats
      const transformedStats: DashboardStats = {
        totalCases: (statsData as any).totalCases || 0,
        activeCases: (statsData as any).activeCases || 0,
        pendingCases: (statsData as any).pendingCases || 0,
        closedCases: (statsData as any).closedCases || 0,
        totalClients: (statsData as any).totalClients || 0,
        totalDocuments: (statsData as any).totalDocuments || 0,
        totalBills: (statsData as any).totalBills || 0,
        overdueBills: (statsData as any).overdueBills?.length || 0,
        caseChangePercent: (statsData as any).caseChangePercent || 0,
        newCasesThisMonth: (statsData as any).newCasesThisMonth || 0,
        newClientsThisMonth: (statsData as any).newClientsThisMonth || 0,
      };

      setStats(transformedStats);

      // Transform calendar events to upcoming hearings
      const hearings = (upcomingEventsData as any[])
        .filter(
          (event: any) =>
            event.eventType === "HEARING" ||
            event.eventType === "COURT_APPEARANCE"
        )
        .map((event: any) => ({
          id: event.id,
          caseNumber: event.case?.caseNumber || "N/A",
          title: event.title,
          nextHearingDate: event.startTime,
          client: { name: event.case?.client?.name || "N/A" },
        }))
        .slice(0, 5);

      setUpcomingHearings(hearings);

      // Transform bills to overdue bills format
      const overdueBills = (overdueBillsData as any[]).map((bill: any) => ({
        id: bill.id,
        amount: Number(bill.amount) || 0,
        description: bill.description,
        dueDate: bill.dueDate,
        case: {
          caseNumber: bill.case?.caseNumber || "N/A",
          title: bill.case?.title || "N/A",
        },
      }));

      setOverdueBills(overdueBills);

      // Transform recent activity
      const activity = (recentActivityData as any[]).map((activity: any) => ({
        id: activity.id,
        type: activity.type,
        description: activity.description,
        timestamp: activity.timestamp || activity.createdAt,
        caseNumber: activity.case?.caseNumber,
        userName: activity.user?.name || activity.userName,
      }));

      setRecentActivity(activity);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
      if (changeText.includes("+") || changeText.includes("new case")) {
        return "text-green-600 dark:text-green-400";
      } else if (changeText.includes("-") || changeText.includes("No new")) {
        return "text-gray-600 dark:text-gray-400";
      }
      return "text-green-600 dark:text-green-400";
    };

    return (
      <div
        className={`card ${onClick ? "cursor-pointer hover:shadow-lg transition-shadow" : ""}`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {title}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {value}
            </p>
            {change && (
              <p className={`text-xs ${getChangeColor(change)}`}>{change}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
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
    const colorClasses = {
      blue: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400",
      green:
        "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400",
      purple:
        "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400",
      orange:
        "bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400",
      red: "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400",
    };

    return (
      <button
        onClick={onClick}
        className="card-hover text-left w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200"
        style={{ zIndex: 10, position: "relative", pointerEvents: "auto" }}
      >
        <div className="flex items-center space-x-3">
          <div
            className={`p-2 rounded-lg flex-shrink-0 ${colorClasses[color as keyof typeof colorClasses]}`}
          >
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
              {title}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {description}
            </p>
          </div>
        </div>
      </button>
    );
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "create-case":
        router.push("/lawyer/cases");
        break;
      case "upload-document":
        router.push("/lawyer/documents");
        break;
      case "create-bill":
        router.push("/lawyer/billing");
        break;
      case "add-client":
        router.push("/lawyer/clients");
        break;
      case "schedule-event":
        router.push("/lawyer/calendar");
        break;
      case "create-task":
        router.push("/lawyer/tasks");
        break;
      case "video-call":
        router.push("/lawyer/video-calls");
        break;
      case "send-message":
        router.push("/lawyer/notifications");
        break;
      case "view-documents":
        router.push("/lawyer/documents");
        break;
      case "view-bills":
        router.push("/lawyer/billing");
        break;
      case "view-calendar":
        router.push("/lawyer/calendar");
        break;
      case "contact-lawyer":
        router.push("/lawyer/notifications");
        break;
      case "view-reports":
        if (user?.role === "SUPER_ADMIN" || user?.role === "ADMIN") {
          router.push("/admin/dashboard");
        } else {
          router.push("/lawyer/dashboard");
        }
        break;
      case "settings":
        if (user?.role === "SUPER_ADMIN" || user?.role === "ADMIN") {
          router.push("/admin/settings");
        } else {
          router.push("/lawyer/settings");
        }
        break;
      default:
        console.log(`Action: ${action}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Error Loading Dashboard
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button onClick={fetchDashboardData} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Here&apos;s what&apos;s happening with your practice today.
          </p>
        </div>

        {/* Statistics Grid */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Cases"
              value={stats.totalCases}
              icon={Briefcase}
              color="bg-blue-500"
              change={
                stats.newCasesThisMonth > 0
                  ? `+${stats.newCasesThisMonth} new case${stats.newCasesThisMonth > 1 ? "s" : ""} this month`
                  : "No new cases this month"
              }
              onClick={() => router.push("/lawyer/cases")}
            />
            <StatCard
              title="Active Cases"
              value={stats.activeCases}
              icon={TrendingUp}
              color="bg-green-500"
              onClick={() => router.push("/lawyer/cases?status=ACTIVE")}
            />
            <StatCard
              title="Total Clients"
              value={stats.totalClients}
              icon={Users}
              color="bg-purple-500"
              change={
                stats.newClientsThisMonth > 0
                  ? `+${stats.newClientsThisMonth} new this month`
                  : "No new clients this month"
              }
              onClick={() => router.push("/lawyer/clients")}
            />
            <StatCard
              title="Overdue Bills"
              value={stats.overdueBills}
              icon={AlertTriangle}
              color="bg-red-500"
              onClick={() => router.push("/lawyer/billing?status=OVERDUE")}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <QuickActionCard
                title="Create New Case"
                description="Start a new legal case"
                icon={Plus}
                onClick={() => handleQuickAction("create-case")}
                color="blue"
              />
              <QuickActionCard
                title="Upload Document"
                description="Add documents to cases"
                icon={Upload}
                onClick={() => handleQuickAction("upload-document")}
                color="green"
              />
              <QuickActionCard
                title="Create Bill"
                description="Generate new invoice"
                icon={CreditCard}
                onClick={() => handleQuickAction("create-bill")}
                color="purple"
              />
              <QuickActionCard
                title="Add Client"
                description="Register new client"
                icon={Users}
                onClick={() => handleQuickAction("add-client")}
                color="orange"
              />
              <QuickActionCard
                title="Schedule Event"
                description="Book calendar appointment"
                icon={Calendar}
                onClick={() => handleQuickAction("schedule-event")}
                color="blue"
              />
              <QuickActionCard
                title="Create Task"
                description="Assign new task"
                icon={CheckSquare}
                onClick={() => handleQuickAction("create-task")}
                color="green"
              />
              <QuickActionCard
                title="Video Call"
                description="Start video consultation"
                icon={Video}
                onClick={() => handleQuickAction("video-call")}
                color="purple"
              />
              <QuickActionCard
                title="Send Message"
                description="Contact client or team"
                icon={MessageSquare}
                onClick={() => handleQuickAction("send-message")}
                color="orange"
              />
              <QuickActionCard
                title="View Documents"
                description="Browse all documents"
                icon={FileText}
                onClick={() => handleQuickAction("view-documents")}
                color="blue"
              />
              <QuickActionCard
                title="View Bills"
                description="Check billing status"
                icon={CreditCard}
                onClick={() => handleQuickAction("view-bills")}
                color="purple"
              />
              <QuickActionCard
                title="View Calendar"
                description="See all events"
                icon={Calendar}
                onClick={() => handleQuickAction("view-calendar")}
                color="green"
              />
              <QuickActionCard
                title="Contact Lawyer"
                description="Get in touch with team"
                icon={User}
                onClick={() => handleQuickAction("contact-lawyer")}
                color="orange"
              />
              {user?.role === "SUPER_ADMIN" && (
                <>
                  <QuickActionCard
                    title="View Reports"
                    description="System analytics & reports"
                    icon={TrendingUp}
                    onClick={() => handleQuickAction("view-reports")}
                    color="red"
                  />
                  <QuickActionCard
                    title="System Settings"
                    description="Configure application"
                    icon={Settings}
                    onClick={() => handleQuickAction("settings")}
                    color="red"
                  />
                </>
              )}
            </div>
          </div>

          {/* Upcoming Hearings */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Upcoming Hearings
              </h2>
              <button
                onClick={() => router.push("/lawyer/calendar")}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                style={{
                  zIndex: 10,
                  position: "relative",
                  pointerEvents: "auto",
                }}
              >
                View All
              </button>
            </div>
            <div className="space-y-3">
              {upcomingHearings.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No upcoming hearings
                  </p>
                </div>
              ) : (
                upcomingHearings.map((hearing) => (
                  <div
                    key={hearing.id}
                    className="card-hover cursor-pointer"
                    onClick={() => router.push(`/lawyer/cases/${hearing.id}`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {hearing.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Case: {hearing.caseNumber}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Client: {hearing.client.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {new Date(
                            hearing.nextHearingDate
                          ).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(
                            hearing.nextHearingDate
                          ).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Overdue Bills */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Overdue Bills
              </h2>
              <button
                onClick={() => router.push("/lawyer/billing")}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
              >
                View All
              </button>
            </div>
            <div className="space-y-3">
              {overdueBills.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 text-gray-400 mx-auto mb-4 flex items-center justify-center text-2xl font-bold">
                    {getCurrencySymbol(userCurrency)}
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">
                    No overdue bills
                  </p>
                </div>
              ) : (
                overdueBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="card-hover border-l-4 border-red-500 cursor-pointer"
                    onClick={() => router.push(`/lawyer/billing`)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {bill.description}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Case: {bill.case.caseNumber}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Due: {new Date(bill.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">
                          {(() => {
                            const formatted = formatCurrency(
                              bill.amount,
                              userCurrency
                            );
                            console.log("Formatting currency:", {
                              amount: bill.amount,
                              currency: userCurrency,
                              result: formatted,
                            });
                            return formatted;
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Cases */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Cases
            </h2>
            <button
              onClick={() => router.push("/lawyer/cases")}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              View All
            </button>
          </div>
          <div className="card">
            <div className="space-y-4">
              {upcomingHearings.slice(0, 3).map((hearing) => (
                <div
                  key={hearing.id}
                  className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded"
                  onClick={() => router.push(`/lawyer/cases/${hearing.id}`)}
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {hearing.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Case: {hearing.caseNumber} • Client: {hearing.client.name}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(hearing.nextHearingDate).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Documents */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Documents
            </h2>
            <button
              onClick={() => router.push("/lawyer/documents")}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              View All
            </button>
          </div>
          <div className="card">
            <div className="space-y-4">
              {recentActivity
                .filter((activity) => activity.type === "DOCUMENT_UPLOADED")
                .slice(0, 3)
                .map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded"
                    onClick={() => router.push("/lawyer/documents")}
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {activity.caseNumber && `Case: ${activity.caseNumber}`}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Recent Bills */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Bills
            </h2>
            <button
              onClick={() => router.push("/lawyer/billing")}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              View All
            </button>
          </div>
          <div className="card">
            <div className="space-y-4">
              {overdueBills.slice(0, 3).map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded"
                  onClick={() => router.push("/lawyer/billing")}
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {bill.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Case: {bill.case.caseNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(bill.amount, userCurrency)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(bill.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Activity
            </h2>
            <button
              onClick={() => router.push("/lawyer/notifications")}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
            >
              View All
            </button>
          </div>
          <div className="card">
            {recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No recent activity
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded"
                    onClick={() => {
                      if (activity.caseNumber) {
                        router.push(`/lawyer/cases/${activity.caseNumber}`);
                      }
                    }}
                  >
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {activity.description}
                      </span>
                      {activity.caseNumber && (
                        <span className="text-blue-600 dark:text-blue-400">
                          {" "}
                          ({activity.caseNumber})
                        </span>
                      )}
                    </p>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
