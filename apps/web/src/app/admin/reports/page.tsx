"use client";

import LoadingOverlay from "@/components/LoadingOverlay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CustomSelect from "@/components/ui/select";
import { useToast } from "@/components/ui/ToastContainer";
import { apiClient } from "@/services/api";
import {
  BarChart3,
  Calendar,
  Download,
  FileCheck,
  FileText,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  parameters: string[];
}

interface GeneratedReport {
  id: string;
  name: string;
  type: string;
  generatedAt: string;
  status: string;
  downloadUrl?: string;
}

interface ReportsData {
  templates: ReportTemplate[];
  generatedReports: GeneratedReport[];
}

export default function AdminReportsPage() {
  const [reportsData, setReportsData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [reportParameters, setReportParameters] = useState<
    Record<string, string>
  >({});
  const [generatingReport, setGeneratingReport] = useState(false);

  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAdminReports();
      setReportsData(response as ReportsData);
    } catch (error) {
      console.error("Failed to load reports:", error);
      showError("Failed to load reports data");
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = reportsData?.templates.find((t) => t.id === templateId);
    if (template) {
      const initialParams: Record<string, string> = {};
      template.parameters.forEach((param) => {
        initialParams[param] = "";
      });
      setReportParameters(initialParams);
    }
  };

  const handleParameterChange = (param: string, value: string) => {
    setReportParameters((prev) => ({
      ...prev,
      [param]: value,
    }));
  };

  const generateReport = async () => {
    if (!selectedTemplate) {
      showError("Please select a report template");
      return;
    }

    const template = reportsData?.templates.find(
      (t) => t.id === selectedTemplate
    );
    if (!template) return;

    // Check if all required parameters are filled
    const missingParams = template.parameters.filter(
      (param) => !reportParameters[param]
    );
    if (missingParams.length > 0) {
      showError(`Missing required parameters: ${missingParams.join(", ")}`);
      return;
    }

    try {
      setGeneratingReport(true);
      // TODO: Implement actual report generation API call
      // const response = await apiClient.generateReport(selectedTemplate, reportParameters);

      // Simulate report generation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      showSuccess("Report generated successfully!");

      // Reset form
      setSelectedTemplate("");
      setReportParameters({});

      // Refresh reports list
      await loadReports();
    } catch (error) {
      console.error("Failed to generate report:", error);
      showError("Failed to generate report");
    } finally {
      setGeneratingReport(false);
    }
  };

  const downloadReport = async (reportId: string) => {
    try {
      // TODO: Implement actual download API call
      // const response = await apiClient.downloadReport(reportId);
      showSuccess("Report download started");
    } catch (error) {
      console.error("Failed to download report:", error);
      showError("Failed to download report");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "PROCESSING":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "FAILED":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!reportsData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <LoadingOverlay
          isVisible={loading}
          title="Loading Reports"
          message="Please wait while we fetch your reports data..."
          absolute={false}
        />

        {!loading && (
          <div className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No reports data available</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <LoadingOverlay
        isVisible={loading}
        title="Loading Reports"
        message="Please wait while we fetch your reports data..."
        absolute={false}
      />

      {!loading && (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Reports & Analytics
              </h1>
              <p className="text-muted-foreground mt-2">
                Generate comprehensive reports and analyze system data
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-sm">
                {reportsData.templates.length} Templates Available
              </Badge>
            </div>
          </div>

          {/* Report Generation Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Generate New Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Template Selection */}
                <div>
                  <Label htmlFor="template">Report Template</Label>
                  <CustomSelect
                    value={
                      selectedTemplate
                        ? {
                            value: selectedTemplate,
                            label:
                              reportsData.templates.find(
                                (t) => t.id === selectedTemplate
                              )?.name || "",
                          }
                        : null
                    }
                    onChange={(option) =>
                      option && handleTemplateSelect(option.value)
                    }
                    options={reportsData.templates.map((template) => ({
                      value: template.id,
                      label: template.name,
                    }))}
                    placeholder="Select a report template"
                  />
                  {selectedTemplate && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {
                        reportsData.templates.find(
                          (t) => t.id === selectedTemplate
                        )?.description
                      }
                    </p>
                  )}
                </div>

                {/* Parameters */}
                {selectedTemplate && (
                  <div>
                    <Label>Report Parameters</Label>
                    <div className="space-y-3 mt-2">
                      {reportsData.templates
                        .find((t) => t.id === selectedTemplate)
                        ?.parameters.map((param) => (
                          <div key={param}>
                            <Label
                              htmlFor={param}
                              className="text-sm capitalize"
                            >
                              {param.replace(/([A-Z])/g, " $1").toLowerCase()}
                            </Label>
                            <Input
                              id={param}
                              type={
                                param.toLowerCase().includes("date")
                                  ? "date"
                                  : "text"
                              }
                              value={reportParameters[param] || ""}
                              onChange={(e) =>
                                handleParameterChange(param, e.target.value)
                              }
                              placeholder={`Enter ${param.toLowerCase().replace(/([A-Z])/g, " $1")}`}
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedTemplate && (
                <div className="mt-6">
                  <Button
                    onClick={generateReport}
                    disabled={generatingReport}
                    className="w-full md:w-auto"
                  >
                    {generatingReport ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating Report...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Report
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Report Templates */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Available Report Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportsData.templates.map((template) => (
                  <Card
                    key={template.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground mb-1">
                            {template.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {template.description}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {template.parameters.length} params
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">
                          <strong>Parameters:</strong>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {template.parameters.map((param) => (
                            <Badge
                              key={param}
                              variant="secondary"
                              className="text-xs"
                            >
                              {param}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-3"
                        onClick={() => handleTemplateSelect(template.id)}
                      >
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Generated Reports History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Download className="h-5 w-5" />
                Generated Reports History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reportsData.generatedReports.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No reports generated yet
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Generate your first report using the templates above
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-foreground">
                          Report Name
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-foreground">
                          Type
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-foreground">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-foreground">
                          Generated At
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportsData.generatedReports.map((report) => (
                        <tr
                          key={report.id}
                          className="border-b border-border hover:bg-accent/50"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-foreground">
                                {report.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-xs">
                              {report.type}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              className={`text-xs ${getStatusColor(report.status)}`}
                            >
                              {report.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {formatDate(report.generatedAt)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              {report.status === "COMPLETED" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => downloadReport(report.id)}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  Download
                                </Button>
                              )}
                              {report.status === "PROCESSING" && (
                                <Badge variant="outline" className="text-xs">
                                  Processing...
                                </Badge>
                              )}
                              {report.status === "FAILED" && (
                                <Badge
                                  variant="outline"
                                  className="text-xs text-destructive"
                                >
                                  Failed
                                </Badge>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Templates
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {reportsData.templates.length}
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Generated Reports
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {reportsData.generatedReports.length}
                    </p>
                  </div>
                  <Download className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {
                        reportsData.generatedReports.filter(
                          (r) => r.status === "COMPLETED"
                        ).length
                      }
                    </p>
                  </div>
                  <FileCheck className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Failed</p>
                    <p className="text-2xl font-bold text-red-600">
                      {
                        reportsData.generatedReports.filter(
                          (r) => r.status === "FAILED"
                        ).length
                      }
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
