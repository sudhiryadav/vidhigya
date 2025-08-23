"use client";

import { useAuth } from "@/contexts/AuthContext";
import {
  Briefcase,
  Calendar,
  Clock,
  FileText,
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
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      setLoading(true);
      // For now, we'll use mock data since the backend might not have this endpoint yet
      const mockCases: Case[] = [
        {
          id: "1",
          title: "Smith vs. Johnson - Contract Dispute",
          caseNumber: "CIV-2024-001",
          status: "ACTIVE",
          clientName: "John Smith",
          lawyerName: "Sarah Johnson",
          practiceId: "practice-1",
          priority: "HIGH",
          nextHearingDate: "2024-03-15T10:00:00.000Z",
          createdAt: "2024-01-15T10:00:00.000Z",
          updatedAt: "2024-01-15T10:00:00.000Z",
        },
        {
          id: "2",
          title: "Brown Estate Planning",
          caseNumber: "EST-2024-002",
          status: "PENDING",
          clientName: "Michael Brown",
          lawyerName: "David Wilson",
          practiceId: "practice-1",
          priority: "MEDIUM",
          createdAt: "2024-01-20T14:30:00.000Z",
          updatedAt: "2024-01-20T14:30:00.000Z",
        },
        {
          id: "3",
          title: "Corporate Merger - Tech Solutions Inc.",
          caseNumber: "CORP-2024-003",
          status: "ACTIVE",
          clientName: "Tech Solutions Inc.",
          lawyerName: "Emily Davis",
          practiceId: "practice-2",
          priority: "URGENT",
          nextHearingDate: "2024-03-10T14:00:00.000Z",
          createdAt: "2024-02-01T09:15:00.000Z",
          updatedAt: "2024-02-01T09:15:00.000Z",
        },
        {
          id: "4",
          title: "Real Estate Transaction - Downtown Property",
          caseNumber: "RE-2024-004",
          status: "CLOSED",
          clientName: "Downtown Properties LLC",
          lawyerName: "Robert Chen",
          practiceId: "practice-1",
          priority: "LOW",
          createdAt: "2024-01-10T11:00:00.000Z",
          updatedAt: "2024-02-15T16:30:00.000Z",
        },
        {
          id: "5",
          title: "Employment Discrimination Case",
          caseNumber: "EMP-2024-005",
          status: "ON_HOLD",
          clientName: "Lisa Rodriguez",
          lawyerName: "Jennifer Lee",
          practiceId: "practice-2",
          priority: "HIGH",
          createdAt: "2024-01-25T13:45:00.000Z",
          updatedAt: "2024-02-20T10:15:00.000Z",
        },
      ];
      setCases(mockCases);
    } catch (error) {
      console.error("Error fetching cases:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "CLOSED":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      case "ON_HOLD":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "HIGH":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "LOW":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const filteredCases = cases.filter((caseItem) => {
    const matchesSearch =
      caseItem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caseItem.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caseItem.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caseItem.lawyerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || caseItem.status === statusFilter;
    const matchesPriority =
      priorityFilter === "all" || caseItem.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleSearch = () => {
    // Search is handled by filtering the existing cases
  };

  const handleAddCase = () => {
    // TODO: Implement add case functionality
    console.log("Add case clicked");
  };

  const handleEditCase = (caseId: string) => {
    // TODO: Implement edit case functionality
    console.log("Edit case clicked:", caseId);
  };

  const handleViewCase = (caseId: string) => {
    // TODO: Implement view case functionality
    console.log("View case clicked:", caseId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Admin Cases
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage and monitor all cases across practices
              </p>
            </div>
            <button
              onClick={handleAddCase}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <Plus className="w-5 h-5" />
              <span>Add Case</span>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search cases by title, case number, client, or lawyer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cases Table */}
        <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
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
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {filteredCases.map((caseItem) => (
                  <tr key={caseItem.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {caseItem.title}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {caseItem.caseNumber}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created: {formatDate(caseItem.createdAt)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-muted-foreground mr-2" />
                        <span className="text-sm text-foreground">
                          {caseItem.clientName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 text-muted-foreground mr-2" />
                        <span className="text-sm text-foreground">
                          {caseItem.lawyerName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          caseItem.status
                        )}`}
                      >
                        {caseItem.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                          caseItem.priority
                        )}`}
                      >
                        {caseItem.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {caseItem.nextHearingDate ? (
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-muted-foreground mr-2" />
                          <span className="text-sm text-foreground">
                            {formatDate(caseItem.nextHearingDate)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No hearing scheduled
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewCase(caseItem.id)}
                          className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleEditCase(caseItem.id)}
                          className="text-green-600 hover:text-green-900 dark:hover:text-green-400"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty State */}
        {filteredCases.length === 0 && (
          <div className="text-center py-12">
            <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">
              No cases found
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                ? "Try adjusting your search or filters."
                : "Get started by creating a new case."}
            </p>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-card p-6 rounded-lg border border-border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/20">
                <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Cases
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {cases.length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card p-6 rounded-lg border border-border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900/20">
                <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Active Cases
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {cases.filter((c) => c.status === "ACTIVE").length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card p-6 rounded-lg border border-border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg dark:bg-yellow-900/20">
                <FileText className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Pending Cases
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {cases.filter((c) => c.status === "PENDING").length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card p-6 rounded-lg border border-border">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg dark:bg-red-900/20">
                <Calendar className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  High Priority
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {
                    cases.filter(
                      (c) => c.priority === "HIGH" || c.priority === "URGENT"
                    ).length
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
