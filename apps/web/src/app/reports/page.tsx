"use client";

import LoadingOverlay from "@/components/LoadingOverlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import CustomSelect, { SelectOption } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import {
  AlertTriangle,
  Brain,
  Clock,
  ThumbsDown,
  ThumbsUp,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

interface DashboardReport {
  period: string;
  startDate: string;
  endDate: string;
  aiUsage: {
    totalQueries: number;
    queriesByType: Array<{ type: string; count: number }>;
    dailyUsage: Array<{ date: string; count: number }>;
    avgResponseTime: number;
  };
  feedback: {
    totalFeedback: number;
    positiveFeedback: number;
    negativeFeedback: number;
    satisfactionRate: number;
    feedbackTrend: Array<{ date: string; type: string; count: number }>;
  };
  productivity: {
    totalQueries: number;
    avgQueriesPerDay: number;
    peakUsageHour: number;
    mostUsedFeatures: Array<{ feature: string; usageCount: number }>;
  };
  recentActivity: Array<{
    id: string;
    question: string;
    answer: string;
    createdAt: string;
    case?: { id: string; title: string; caseNumber: string };
  }>;
  summary: {
    totalQueries: number;
    satisfactionRate: number;
    avgResponseTime: number;
    avgQueriesPerDay: number;
  };
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("month");

  // Role-based access control
  const isLawyer =
    user?.role === "LAWYER" ||
    user?.role === "ASSOCIATE" ||
    user?.role === "PARALEGAL";
  const isClient = user?.role === "CLIENT";
  const canAccessReports = isLawyer || isClient;

  const periodOptions: SelectOption[] = [
    { value: "week", label: "Last Week" },
    { value: "month", label: "Last Month" },
    { value: "quarter", label: "Last Quarter" },
  ];

  useEffect(() => {
    if (canAccessReports) {
      loadReport();
    }
  }, [period, canAccessReports]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getDashboardReport(period);
      setReport(data);
    } catch (error) {
      console.error("Failed to load report:", error);
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (hour: number) => {
    return `${hour}:00`;
  };

  const getQueryTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      GENERAL: "General",
      CASE_SPECIFIC: "Case Specific",
      DOCUMENT_ANALYSIS: "Document Analysis",
      LEGAL_RESEARCH: "Legal Research",
      DRAFT_GENERATION: "Draft Generation",
      SUMMARY_REQUEST: "Summary Request",
    };
    return labels[type] || type;
  };

  // If user doesn't have access to reports, show access denied
  if (!canAccessReports) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Access Denied
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              You don't have permission to access the reports page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p className="text-gray-500">No report data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <LoadingOverlay
        isVisible={loading}
        title="Loading Reports"
        message="Please wait while we fetch your report data..."
        absolute
      />
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI Analytics & Reports</h1>
          <p className="text-gray-600">
            Comprehensive insights into your AI usage and productivity
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <CustomSelect
            options={periodOptions}
            value={periodOptions.find((option) => option.value === period)}
            onChange={(selectedOption) =>
              setPeriod(selectedOption?.value as "week" | "month" | "quarter")
            }
            placeholder="Select period"
            className="w-32"
          />
          <Button onClick={loadReport} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Queries</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {report.summary.totalQueries}
            </div>
            <p className="text-xs text-muted-foreground">
              {report.summary.avgQueriesPerDay} per day average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Satisfaction Rate
            </CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {report.summary.satisfactionRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {report.feedback.positiveFeedback} positive feedback
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {report.summary.avgResponseTime}s
            </div>
            <p className="text-xs text-muted-foreground">
              Fast and efficient responses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Peak Usage Hour
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(report.productivity.peakUsageHour)}
            </div>
            <p className="text-xs text-muted-foreground">
              Most active time of day
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <Tabs defaultValue="ai-usage" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ai-usage">AI Usage</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        {/* AI Usage Tab */}
        <TabsContent value="ai-usage" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Query Types Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Query Types Distribution</CardTitle>
                <CardDescription>
                  Breakdown of AI queries by category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.aiUsage.queriesByType.map((item) => (
                    <div
                      key={item.type}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm font-medium">
                        {getQueryTypeLabel(item.type)}
                      </span>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Daily Usage Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Usage Trend</CardTitle>
                <CardDescription>
                  AI queries over the selected period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.aiUsage.dailyUsage.slice(-7).map((item) => (
                    <div
                      key={item.date}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm font-medium">
                        {formatDate(item.date)}
                      </span>
                      <Badge variant="outline">{item.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feedback Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Feedback Summary</CardTitle>
                <CardDescription>
                  Overall user satisfaction and feedback
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Positive</span>
                    <div className="flex items-center space-x-2">
                      <ThumbsUp className="h-4 w-4 text-green-600" />
                      <span className="font-bold">
                        {report.feedback.positiveFeedback}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Negative</span>
                    <div className="flex items-center space-x-2">
                      <ThumbsDown className="h-4 w-4 text-red-600" />
                      <span className="font-bold">
                        {report.feedback.negativeFeedback}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Satisfaction Rate
                      </span>
                      <span className="text-lg font-bold text-green-600">
                        {report.feedback.satisfactionRate}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feedback Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Feedback Trend</CardTitle>
                <CardDescription>Feedback patterns over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.feedback.feedbackTrend.slice(-7).map((item) => (
                    <div
                      key={item.date}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm font-medium">
                        {formatDate(item.date)}
                      </span>
                      <div className="flex items-center space-x-2">
                        {item.type === "POSITIVE" ? (
                          <ThumbsUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <ThumbsDown className="h-4 w-4 text-red-600" />
                        )}
                        <Badge variant="outline">{item.count}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Productivity Tab */}
        <TabsContent value="productivity" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Most Used Features */}
            <Card>
              <CardHeader>
                <CardTitle>Most Used Features</CardTitle>
                <CardDescription>Popular AI features and tools</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.productivity.mostUsedFeatures.map((feature) => (
                    <div
                      key={feature.feature}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm font-medium">
                        {feature.feature}
                      </span>
                      <Badge variant="secondary">{feature.usageCount}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Productivity Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Productivity Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Queries</span>
                    <span className="font-bold">
                      {report.productivity.totalQueries}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Avg Queries/Day</span>
                    <span className="font-bold">
                      {report.productivity.avgQueriesPerDay}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Peak Hour</span>
                    <span className="font-bold">
                      {formatTime(report.productivity.peakUsageHour)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Recent Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent AI Activity</CardTitle>
              <CardDescription>
                Latest AI interactions and queries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.recentActivity.map((activity) => (
                  <div key={activity.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-2">
                          {activity.question}
                        </p>
                        <p className="text-sm text-gray-600 mb-2">
                          {activity.answer}
                        </p>
                        {activity.case && (
                          <div className="text-xs text-gray-500">
                            Related to: {activity.case.caseNumber} -{" "}
                            {activity.case.title}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 ml-4">
                        {formatDate(activity.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
