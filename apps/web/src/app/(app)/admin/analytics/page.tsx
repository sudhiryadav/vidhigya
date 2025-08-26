"use client";

import { AccessDenied } from "@/components/AccessDenied";
import LoadingOverlay from "@/components/LoadingOverlay";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/ToastContainer";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import {
  Activity,
  AlertCircle,
  BarChart3,
  DollarSign,
  FileText,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
interface AnalyticsData {
  overview: {
    totalUsers: number;
    totalCases: number;
    totalDocuments: number;
    totalBilling: number;
  };
  trends: {
    users: Array<{ month: string; count: number }>;
    cases: Array<{ month: string; count: number }>;
    documents: Array<{ month: string; count: number }>;
    revenue: Array<{ month: string; count: number }>;
  };
  performance: {
    systemUptime: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { showSuccess, showError } = useToast();

  // Check if user has permission to access analytics
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  useEffect(() => {
    if (!isAdmin) {
      setError("You don't have permission to access this page");
      setLoading(false);
      return;
    }
    loadAnalytics();
  }, [isAdmin]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Request timeout")), 10000)
      );

      const analyticsPromise = apiClient.getAdminAnalytics();
      const response = await Promise.race([analyticsPromise, timeoutPromise]);

      setAnalyticsData(response as AnalyticsData);
    } catch (error) {
      console.error("Failed to load analytics:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to load analytics data";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const getPerformanceColor = (
    value: number,
    type: "uptime" | "response" | "error"
  ) => {
    switch (type) {
      case "uptime":
        if (value >= 99.5) return "text-green-600";
        if (value >= 99.0) return "text-yellow-600";
        return "text-red-600";
      case "response":
        if (value <= 100) return "text-green-600";
        if (value <= 200) return "text-yellow-600";
        return "text-red-600";
      case "error":
        if (value <= 0.1) return "text-green-600";
        if (value <= 0.5) return "text-yellow-600";
        return "text-red-600";
      default:
        return "text-foreground";
    }
  };

  const getPerformanceIcon = (
    value: number,
    type: "uptime" | "response" | "error"
  ) => {
    switch (type) {
      case "uptime":
        if (value >= 99.5)
          return <TrendingUp className="h-4 w-4 text-green-600" />;
        if (value >= 99.0)
          return <Activity className="h-4 w-4 text-yellow-600" />;
        return <Activity className="h-4 w-4 text-red-600" />;
      case "response":
        if (value <= 100)
          return <TrendingUp className="h-4 w-4 text-green-600" />;
        if (value <= 200)
          return <Activity className="h-4 w-4 text-yellow-600" />;
        return <Activity className="h-4 w-4 text-red-600" />;
      case "error":
        if (value <= 0.1)
          return <TrendingUp className="h-4 w-4 text-green-600" />;
        if (value <= 0.5)
          return <Activity className="h-4 w-4 text-yellow-600" />;
        return <Activity className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Error Loading Analytics
          </h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.history.back()}
            className="btn-secondary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Analytics Dashboard
          </h2>
          <p className="text-muted-foreground mb-4">
            {error
              ? "Failed to load analytics data"
              : "No analytics data available"}
          </p>
          {error && (
            <button onClick={loadAnalytics} className="btn-primary">
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // Final permission check before rendering
  if (!isAdmin) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You don't have permission to access the analytics page. This page is only available to administrators."
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <LoadingOverlay
        isVisible={loading}
        title="Loading Analytics"
        message="Please wait while we fetch your analytics data..."
        absolute
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            System Analytics
          </h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive insights into system performance and usage patterns
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-sm">
            Last updated: {new Date().toLocaleTimeString()}
          </Badge>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-foreground">
                  {analyticsData.overview.totalUsers}
                </p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cases</p>
                <p className="text-2xl font-bold text-foreground">
                  {analyticsData.overview.totalCases}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold text-foreground">
                  {analyticsData.overview.totalDocuments}
                </p>
              </div>
              <FileText className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Billing</p>
                <p className="text-2xl font-bold text-foreground">
                  {analyticsData.overview.totalBilling}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              System Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-foreground">
                {analyticsData.performance.systemUptime}%
              </div>
              {getPerformanceIcon(
                analyticsData.performance.systemUptime,
                "uptime"
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">Target: 99.9%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-foreground">
                {analyticsData.performance.averageResponseTime}ms
              </div>
              {getPerformanceIcon(
                analyticsData.performance.averageResponseTime,
                "response"
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Target: &lt;100ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Error Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-foreground">
                {analyticsData.performance.errorRate}%
              </div>
              {getPerformanceIcon(analyticsData.performance.errorRate, "error")}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Target: &lt;0.1%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Users Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">User Growth Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.trends.users.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {item.month}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${Math.min((item.count / Math.max(...analyticsData.trends.users.map((u) => u.count))) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {item.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cases Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Case Creation Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.trends.cases.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {item.month}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-muted rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min((item.count / Math.max(...analyticsData.trends.cases.map((c) => c.count))) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {item.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents and Revenue Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documents Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Document Upload Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.trends.documents.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {item.month}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-muted rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min((item.count / Math.max(...analyticsData.trends.documents.map((d) => d.count))) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {item.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analyticsData.trends.revenue.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {item.month}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-muted rounded-full h-2">
                      <div
                        className="bg-yellow-600 h-2 rounded-full"
                        style={{
                          width: `${Math.min((item.count / Math.max(...analyticsData.trends.revenue.map((r) => r.count))) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {formatCurrency(item.count)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health Summary */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">System Health Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div
                className={`text-2xl font-bold ${getPerformanceColor(analyticsData.performance.systemUptime, "uptime")}`}
              >
                {analyticsData.performance.systemUptime}%
              </div>
              <p className="text-sm text-muted-foreground">Uptime</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div
                className={`text-2xl font-bold ${getPerformanceColor(analyticsData.performance.averageResponseTime, "response")}`}
              >
                {analyticsData.performance.averageResponseTime}ms
              </div>
              <p className="text-sm text-muted-foreground">Avg Response</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div
                className={`text-2xl font-bold ${getPerformanceColor(analyticsData.performance.errorRate, "error")}`}
              >
                {analyticsData.performance.errorRate}%
              </div>
              <p className="text-sm text-muted-foreground">Error Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
