"use client";

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
import { apiClient } from "@/services/api";
import {
  Activity,
  BarChart3,
  Brain,
  Calendar,
  Clock,
  Target,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
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
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("month");

  const periodOptions: SelectOption[] = [
    { value: "week", label: "Last Week" },
    { value: "month", label: "Last Month" },
    { value: "quarter", label: "Last Quarter" },
  ];

  useEffect(() => {
    loadReport();
  }, [period]);

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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
              {report.summary.avgResponseTime}ms
            </div>
            <p className="text-xs text-muted-foreground">
              AI response performance
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
            <p className="text-xs text-muted-foreground">Most active time</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
          <TabsTrigger value="feedback">Feedback Analysis</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Query Types */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Query Types Distribution
                </CardTitle>
                <CardDescription>
                  Breakdown of AI query types used
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

            {/* Most Used Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Most Used Features
                </CardTitle>
                <CardDescription>
                  Your most frequently used AI features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.productivity.mostUsedFeatures.map((feature) => (
                    <div
                      key={feature.feature}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm font-medium">
                        {getQueryTypeLabel(feature.feature)}
                      </span>
                      <Badge variant="outline">
                        {feature.usageCount} times
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Daily Usage Pattern
              </CardTitle>
              <CardDescription>AI queries over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.aiUsage.dailyUsage.map((day) => (
                  <div
                    key={day.date}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm font-medium">
                      {formatDate(day.date)}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${Math.min((day.count / Math.max(...report.aiUsage.dailyUsage.map((d) => d.count))) * 100, 100)}%`,
                          }}
                        ></div>
                      </div>
                      <Badge variant="secondary">{day.count}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Feedback Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ThumbsUp className="h-5 w-5" />
                  Feedback Summary
                </CardTitle>
                <CardDescription>
                  User satisfaction with AI responses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Positive Feedback
                    </span>
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4 text-green-600" />
                      <Badge
                        variant="default"
                        className="bg-green-100 text-green-800"
                      >
                        {report.feedback.positiveFeedback}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Negative Feedback
                    </span>
                    <div className="flex items-center gap-2">
                      <ThumbsDown className="h-4 w-4 text-red-600" />
                      <Badge variant="destructive">
                        {report.feedback.negativeFeedback}
                      </Badge>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Overall Satisfaction
                      </span>
                      <Badge variant="outline" className="text-lg">
                        {report.feedback.satisfactionRate}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feedback Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Feedback Trend
                </CardTitle>
                <CardDescription>Recent feedback patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {report.feedback.feedbackTrend.slice(-5).map((feedback) => (
                    <div
                      key={`${feedback.date}-${feedback.type}`}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm font-medium">
                        {formatDate(feedback.date)}
                      </span>
                      <div className="flex items-center gap-2">
                        {feedback.type === "POSITIVE" ? (
                          <ThumbsUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <ThumbsDown className="h-4 w-4 text-red-600" />
                        )}
                        <Badge variant="secondary">{feedback.count}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="productivity" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Productivity Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Productivity Metrics
                </CardTitle>
                <CardDescription>Your AI usage efficiency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Average Queries/Day
                    </span>
                    <Badge variant="outline">
                      {report.productivity.avgQueriesPerDay}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Peak Usage Hour</span>
                    <Badge variant="outline">
                      {formatTime(report.productivity.peakUsageHour)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Queries</span>
                    <Badge variant="outline">
                      {report.productivity.totalQueries}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Usage Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Usage Insights
                </CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Response Time</span>
                    <Badge variant="outline">
                      {report.aiUsage.avgResponseTime}ms
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Satisfaction Rate
                    </span>
                    <Badge variant="outline">
                      {report.feedback.satisfactionRate}%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active Period</span>
                    <Badge variant="outline">
                      {formatDate(report.startDate)} -{" "}
                      {formatDate(report.endDate)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent AI Activity
              </CardTitle>
              <CardDescription>Your latest AI interactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {report.recentActivity.map((activity) => (
                  <div key={activity.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-1">
                          {activity.question.length > 100
                            ? `${activity.question.substring(0, 100)}...`
                            : activity.question}
                        </p>
                        {activity.case && (
                          <Badge variant="outline" className="text-xs">
                            {activity.case.caseNumber}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 ml-2">
                        {formatDate(activity.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {activity.answer.length > 150
                        ? `${activity.answer.substring(0, 150)}...`
                        : activity.answer}
                    </p>
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
