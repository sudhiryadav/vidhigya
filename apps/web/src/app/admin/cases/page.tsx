"use client";

import SuperAdminContextSelector from "@/components/admin/SuperAdminContextSelector";
import LoadingOverlay from "@/components/LoadingOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperAdminContext } from "@/contexts/SuperAdminContext";
import { apiClient } from "@/services/api";
import {
  Briefcase,
  Building2,
  Calendar,
  Clock,
  FileText,
  Globe,
  Plus,
  Search,
  User,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Case {
  id: string;
  title: string;
  caseNumber: string;
  status: "ACTIVE" | "PENDING" | "CLOSED" | "ON_HOLD";
  clientName: string;
  lawyerName: string;
  practiceId: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  nextHearingDate?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminCases() {
  const { user } = useAuth();
  const { context, isSuperAdmin } = useSuperAdminContext();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("Cases page useEffect triggered, context:", context);
    fetchCases();
  }, []);

  // Debug loading state changes
  useEffect(() => {
    console.log("Loading state changed to:", loading);
  }, [loading]);

  // Debug cases state changes
  useEffect(() => {
    console.log("Cases state changed to:", cases.length, "cases");
  }, [cases]);

  const fetchCases = async () => {
    console.log("fetchCases called, setting loading to true");
    setLoading(true);
    setError(null);

    try {
      // Fetch real cases from the backend API
      const response = await apiClient.getCases();
      if (response && Array.isArray(response)) {
        setCases(response);
      } else {
        setCases([]);
      }
    } catch (error) {
      console.error("Error fetching cases:", error);
      setError("Failed to load cases. Please try again later.");
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "CLOSED":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
      case "ON_HOLD":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "LOW":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
      case "HIGH":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400";
      case "URGENT":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const filteredCases = cases.filter((case_) => {
    const matchesSearch =
      case_.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      case_.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      case_.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      case_.lawyerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || case_.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || case_.priority === priorityFilter;

    const result = matchesSearch && matchesStatus && matchesPriority;
    return result;
  });

  console.log("Cases state:", cases);
  console.log("Filtered cases:", filteredCases);
  console.log("Search term:", searchTerm);
  console.log("Status filter:", statusFilter);
  console.log("Priority filter:", priorityFilter);

  const getContextIcon = () => {
    if (!context) return <Globe className="h-5 w-5" />;

    switch (context.type) {
      case "practice":
        return <Building2 className="h-5 w-5" />;
      case "firm":
        return <Users className="h-5 w-5" />;
      case "individual":
        return <User className="h-5 w-5" />;
      default:
        return <Globe className="h-5 w-5" />;
    }
  };

  const getContextLabel = () => {
    if (!context) return "All Cases";

    switch (context.type) {
      case "all":
        return "All Cases";
      case "practice":
        return `Cases in ${context.name}`;
      case "firm":
        return `Cases in Firm: ${context.name}`;
      case "individual":
        return `Cases for Individual: ${context.name}`;
      default:
        return "All Cases";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            {getContextIcon()}
            {getContextLabel()}
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage and monitor all cases across the system
            {context &&
              context.type !== "all" &&
              ` - Currently viewing: ${context.name}`}
          </p>
        </div>

        {/* Super Admin Context Selector */}
        {isSuperAdmin && (
          <div className="flex items-center gap-3">
            <SuperAdminContextSelector />
            <button className="btn-primary">
              <Plus className="h-4 w-4 mr-2" />
              New Case
            </button>
          </div>
        )}

        {!isSuperAdmin && (
          <button className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            New Case
          </button>
        )}

        {/* Debug button for testing */}
        <button
          onClick={() => {
            console.log("Current loading state:", loading);
            console.log("Current cases count:", cases.length);
            setLoading(true);
            setTimeout(() => setLoading(false), 2000);
          }}
          className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          Test Loading
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-card border border-border rounded-lg p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search cases by title, case number, client, or lawyer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="CLOSED">Closed</option>
              <option value="ON_HOLD">On Hold</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Debug Info:</strong> Loading: {loading.toString()}, Cases:{" "}
          {cases.length}, Filtered: {filteredCases.length}
        </p>
      </div>

      {/* Cases Table */}
      <LoadingOverlay
        isVisible={loading}
        title="Loading Cases"
        message="Please wait while we fetch your cases..."
        absolute={false}
      />

      {!loading && (
        <>
          {filteredCases.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No cases found
              </h3>
              <p className="text-muted-foreground">
                {searchTerm ||
                statusFilter !== "all" ||
                priorityFilter !== "all"
                  ? "Try adjusting your search criteria or filters"
                  : "Get started by creating your first case"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Case Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Lawyer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Next Hearing
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {filteredCases.map((case_) => (
                    <tr key={case_.id} className="hover:bg-muted">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {case_.title}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {case_.caseNumber}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-foreground">
                          {case_.clientName}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-foreground">
                          {case_.lawyerName}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(case_.status)}`}
                        >
                          {case_.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(case_.priority)}`}
                        >
                          {case_.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {case_.nextHearingDate ? (
                          <div className="flex items-center text-sm text-foreground">
                            <Calendar className="h-4 w-4 mr-1 text-muted-foreground" />
                            {formatDate(case_.nextHearingDate)}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            No hearing scheduled
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-muted-foreground">
                          {formatDate(case_.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                            <FileText className="h-4 w-4" />
                          </button>
                          <button className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300">
                            <Briefcase className="h-4 w-4" />
                          </button>
                          <button className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300">
                            <User className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200">{error}</p>
          <button
            onClick={fetchCases}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                Total Cases
              </p>
              <p className="text-2xl font-bold text-foreground">
                {filteredCases.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Briefcase className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                Active Cases
              </p>
              <p className="text-2xl font-bold text-foreground">
                {filteredCases.filter((c) => c.status === "ACTIVE").length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                Pending Cases
              </p>
              <p className="text-2xl font-bold text-foreground">
                {filteredCases.filter((c) => c.status === "PENDING").length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <Calendar className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                Urgent Cases
              </p>
              <p className="text-2xl font-bold text-foreground">
                {filteredCases.filter((c) => c.priority === "URGENT").length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
