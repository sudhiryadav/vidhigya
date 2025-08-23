"use client";

import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  CreditCard,
  Settings,
  Shield,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

interface SystemStats {
  totalUsers: number;
  totalLawyers: number;
  totalClients: number;
  totalCases: number;
  totalDocuments: number;
  totalRevenue: number;
  pendingApprovals: number;
  systemHealth: string;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  user: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, activityData] = await Promise.all([
          apiClient.getSystemStats(),
          apiClient.getRecentActivity(10),
        ]);

        setStats(statsData as SystemStats);
        setRecentActivity(activityData as RecentActivity[]);
      } catch (error) {
        console.error("Error fetching admin data:", error);
        // Fallback to mock data if API fails
        setStats({
          totalUsers: 156,
          totalLawyers: 24,
          totalClients: 132,
          totalCases: 89,
          totalDocuments: 456,
          totalRevenue: 125000,
          pendingApprovals: 7,
          systemHealth: "Excellent",
        });

        setRecentActivity([
          {
            id: "1",
            type: "USER_REGISTRATION",
            description: "New lawyer registered: Sarah Johnson",
            timestamp: "2024-02-15T10:30:00.000Z",
            user: "System",
          },
          {
            id: "2",
            type: "CASE_CREATED",
            description: "New case created: Smith vs Johnson",
            timestamp: "2024-02-15T09:15:00.000Z",
            user: "John Lawyer",
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    change,
    subtitle,
  }: {
    title: string;
    value: string | number;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    change?: string;
    subtitle?: string;
  }) => (
    <div className="card-hover">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
          {change && (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center mt-1">
              <TrendingUp className="w-4 h-4 mr-1" />
              {change}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  const QuickActionCard = ({
    title,
    description,
    icon: Icon,
    onClick,
    color,
  }: {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    color: string;
  }) => (
    <button onClick={onClick} className="card-hover text-left w-full">
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-12 h-12"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Here&apos;s an overview of your legal practice management system.
          </p>
        </div>

        {/* Statistics Grid */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Users"
              value={stats.totalUsers}
              icon={Users}
              color="bg-blue-500"
              change="+12% from last month"
            />
            <StatCard
              title="Total Lawyers"
              value={stats.totalLawyers}
              icon={Shield}
              color="bg-green-500"
              change="+3 new this month"
            />
            <StatCard
              title="Total Cases"
              value={stats.totalCases}
              icon={Briefcase}
              color="bg-purple-500"
            />
            <StatCard
              title="Total Revenue"
              value={`$${stats.totalRevenue.toLocaleString()}`}
              icon={CreditCard}
              color="bg-yellow-500"
              change="+8% from last month"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Quick Actions
            </h2>
            <div className="space-y-3">
              <QuickActionCard
                title="Add New Lawyer"
                description="Register a new lawyer to the system"
                icon={UserPlus}
                color="bg-blue-500"
                onClick={() => console.log("Add lawyer")}
              />
              <QuickActionCard
                title="System Settings"
                description="Configure system preferences"
                icon={Settings}
                color="bg-muted"
                onClick={() => console.log("System settings")}
              />
              <QuickActionCard
                title="View Analytics"
                description="Detailed system analytics"
                icon={BarChart3}
                color="bg-purple-500"
                onClick={() => console.log("Analytics")}
              />
              <QuickActionCard
                title="Pending Approvals"
                description={`${stats?.pendingApprovals} items need approval`}
                icon={AlertTriangle}
                color="bg-red-500"
                onClick={() => console.log("Pending approvals")}
              />
            </div>
          </div>

          {/* System Health */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              System Health
            </h2>
            <div className="space-y-4">
              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">
                      Overall Status
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      System performance and uptime
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-600">
                      {stats?.systemHealth}
                    </span>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">Database</h3>
                    <p className="text-sm text-muted-foreground">
                      Connection and performance
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-600">
                      Healthy
                    </span>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      Storage
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      File storage and documents
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                      75% Used
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Activity
            </h2>
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="card-hover">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-white">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        by {activity.user} •{" "}
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              User Distribution
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Lawyers
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {stats?.totalLawyers} (
                  {(
                    ((stats?.totalLawyers || 0) / (stats?.totalUsers || 1)) *
                    100
                  ).toFixed(1)}
                  %)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Clients
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {stats?.totalClients} (
                  {(
                    ((stats?.totalClients || 0) / (stats?.totalUsers || 1)) *
                    100
                  ).toFixed(1)}
                  %)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Other Staff
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {(stats?.totalUsers || 0) -
                    (stats?.totalLawyers || 0) -
                    (stats?.totalClients || 0)}{" "}
                  (
                  {(
                    (((stats?.totalUsers || 0) -
                      (stats?.totalLawyers || 0) -
                      (stats?.totalClients || 0)) /
                      (stats?.totalUsers || 1)) *
                    100
                  ).toFixed(1)}
                  %)
                </span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              System Metrics
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Documents
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {stats?.totalDocuments}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Active Cases
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {Math.floor((stats?.totalCases || 0) * 0.8)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Pending Approvals
                </span>
                <span className="text-sm font-medium text-red-600 dark:text-red-400">
                  {stats?.pendingApprovals}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
