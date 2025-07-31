"use client";

import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Calendar,
  CreditCard,
  FileText,
  Search,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";

interface ClientCase {
  id: string;
  caseNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  court?: string;
  judge?: string;
  opposingParty?: string;
  filingDate?: string;
  nextHearingDate?: string;
  estimatedCompletionDate?: string;
  assignedLawyer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  documents: Array<{
    id: string;
    title: string;
    fileType: string;
    status: string;
    createdAt: string;
  }>;
  billingRecords: Array<{
    id: string;
    title: string;
    amount: number;
    status: string;
    dueDate: string;
  }>;
  updatedAt: string;
  createdAt: string;
}

export default function ClientCasesPage() {
  const [cases, setCases] = useState<ClientCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/client-portal/cases", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch cases");
      }

      const data = await response.json();
      setCases(data);
    } catch (err) {
      console.error("Error fetching cases:", err);
      setError(err instanceof Error ? err.message : "Failed to load cases");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20";
      case "in_progress":
      case "pending":
        return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20";
      case "completed":
      case "closed":
        return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20";
      case "cancelled":
        return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20";
      default:
        return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20";
      case "medium":
        return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20";
      case "low":
        return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20";
      default:
        return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const filteredCases = cases.filter((case_) => {
    const matchesSearch =
      case_.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      case_.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      case_.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      case_.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesCategory =
      categoryFilter === "all" ||
      case_.category.toLowerCase() === categoryFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesCategory;
  });

  if (loading) {
    return (
      <div className="container-responsive py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-responsive py-6">
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Error Loading Cases
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button onClick={fetchCases} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-responsive py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Cases
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {filteredCases.length} case{filteredCases.length !== 1 ? "s" : ""}{" "}
            found
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search cases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            <option value="civil">Civil</option>
            <option value="criminal">Criminal</option>
            <option value="family">Family</option>
            <option value="corporate">Corporate</option>
            <option value="property">Property</option>
            <option value="employment">Employment</option>
            <option value="intellectual_property">Intellectual Property</option>
            <option value="tax">Tax</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Cases List */}
      <div className="space-y-6">
        {filteredCases.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No cases found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || statusFilter !== "all" || categoryFilter !== "all"
                ? "Try adjusting your filters or search terms."
                : "You don't have any cases yet."}
            </p>
          </div>
        ) : (
          filteredCases.map((case_) => (
            <div
              key={case_.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Case Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {case_.title}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          case_.status
                        )}`}
                      >
                        {case_.status.replace("_", " ")}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(
                          case_.priority
                        )}`}
                      >
                        {case_.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {case_.description}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center">
                        <Briefcase className="w-4 h-4 mr-1" />
                        {case_.caseNumber}
                      </span>
                      <span className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        {case_.assignedLawyer.name}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Updated {formatDate(case_.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Case Details */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Case Information */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      Case Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">
                          Category:
                        </span>
                        <span className="text-gray-900 dark:text-white capitalize">
                          {case_.category.replace("_", " ")}
                        </span>
                      </div>
                      {case_.court && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            Court:
                          </span>
                          <span className="text-gray-900 dark:text-white">
                            {case_.court}
                          </span>
                        </div>
                      )}
                      {case_.judge && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            Judge:
                          </span>
                          <span className="text-gray-900 dark:text-white">
                            {case_.judge}
                          </span>
                        </div>
                      )}
                      {case_.opposingParty && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            Opposing Party:
                          </span>
                          <span className="text-gray-900 dark:text-white">
                            {case_.opposingParty}
                          </span>
                        </div>
                      )}
                      {case_.filingDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            Filing Date:
                          </span>
                          <span className="text-gray-900 dark:text-white">
                            {formatDate(case_.filingDate)}
                          </span>
                        </div>
                      )}
                      {case_.nextHearingDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            Next Hearing:
                          </span>
                          <span className="text-gray-900 dark:text-white">
                            {formatDate(case_.nextHearingDate)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Documents */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      Recent Documents ({case_.documents.length})
                    </h4>
                    {case_.documents.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No documents
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {case_.documents.slice(0, 3).map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                          >
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900 dark:text-white truncate">
                                {doc.title}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {doc.fileType.toUpperCase()}
                            </span>
                          </div>
                        ))}
                        {case_.documents.length > 3 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            +{case_.documents.length - 3} more documents
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Billing */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      Recent Bills ({case_.billingRecords.length})
                    </h4>
                    {case_.billingRecords.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No bills
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {case_.billingRecords.slice(0, 3).map((bill) => (
                          <div
                            key={bill.id}
                            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded"
                          >
                            <div className="flex items-center space-x-2">
                              <CreditCard className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900 dark:text-white truncate">
                                {bill.title}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatCurrency(bill.amount)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDate(bill.dueDate)}
                              </div>
                            </div>
                          </div>
                        ))}
                        {case_.billingRecords.length > 3 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            +{case_.billingRecords.length - 3} more bills
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
