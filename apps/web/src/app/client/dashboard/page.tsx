"use client";

import { useSettings } from "@/contexts/SettingsContext";
import { formatCurrency, getCurrencySymbol } from "@/utils/currency";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Calendar,
  CreditCard,
  FileText,
  TrendingUp,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

export default function ClientDashboard() {
  const { getSetting } = useSettings();
  const router = useRouter();

  // Get user's currency preference
  const userCurrency = getSetting("currency") || "INR";
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [recentCases, setRecentCases] = useState<ClientCase[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<ClientDocument[]>([]);
  const [recentBills, setRecentBills] = useState<ClientBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard stats
      const statsResponse = await fetch("/api/client-portal/dashboard", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!statsResponse.ok) {
        throw new Error("Failed to fetch dashboard stats");
      }

      const statsData = await statsResponse.json();
      setStats(statsData);

      // Fetch recent cases
      const casesResponse = await fetch("/api/client-portal/cases", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (casesResponse.ok) {
        const casesData = await casesResponse.json();
        // Transform cases data to match interface
        const transformedCases = casesData.map((case_: any) => ({
          id: case_.id,
          caseNumber: case_.caseNumber,
          title: case_.title,
          status: case_.status,
          category: case_.category,
          assignedLawyer: {
            id: case_.assignedLawyer?.id || "",
            name: case_.assignedLawyer?.name || "Unassigned",
            email: case_.assignedLawyer?.email || "",
          },
          updatedAt: case_.updatedAt,
        }));
        setRecentCases(transformedCases.slice(0, 5)); // Show only 5 most recent
      }

      // Fetch recent documents
      const documentsResponse = await fetch("/api/client-portal/documents", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (documentsResponse.ok) {
        const documentsData = await documentsResponse.json();
        // Transform documents data to match interface
        const transformedDocuments = documentsData.map((doc: any) => ({
          id: doc.id,
          title: doc.title,
          description: doc.description || "",
          fileType: doc.fileType,
          category: doc.category,
          status: doc.status,
          createdAt: doc.createdAt,
          case: {
            id: doc.case?.id || "",
            caseNumber: doc.case?.caseNumber || "N/A",
            title: doc.case?.title || "N/A",
          },
        }));
        setRecentDocuments(transformedDocuments.slice(0, 5)); // Show only 5 most recent
      }

      // Fetch recent bills
      const billsResponse = await fetch("/api/client-portal/billing", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (billsResponse.ok) {
        const billsData = await billsResponse.json();
        // Transform bills data to match interface
        const transformedBills = billsData.map((bill: any) => ({
          id: bill.id,
          title: bill.description || "Billing Record",
          description: bill.description,
          amount: bill.amount,
          billType: bill.billType,
          status: bill.status,
          dueDate: bill.dueDate,
          createdAt: bill.createdAt,
          case: {
            id: bill.case?.id || "",
            caseNumber: bill.case?.caseNumber || "N/A",
            title: bill.case?.title || "N/A",
          },
        }));
        setRecentBills(transformedBills.slice(0, 5)); // Show only 5 most recent
      }
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load dashboard data"
      );
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
      case "active":
      case "pending":
        return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20";
      case "completed":
      case "closed":
      case "paid":
        return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20";
      case "overdue":
      case "cancelled":
        return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20";
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

  if (loading) {
    return (
      <div className="container-responsive py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"
              ></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"
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
    <div className="container-responsive py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Client Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Welcome back! Here's an overview of your legal matters.
        </p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Cases
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalCases}
                </p>
                {stats.newCasesThisMonth > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    +{stats.newCasesThisMonth} this month
                  </p>
                )}
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Active Cases
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.activeCases}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Documents
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalDocuments}
                </p>
                {stats.newDocumentsThisMonth > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    +{stats.newDocumentsThisMonth} this month
                  </p>
                )}
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Upcoming Events
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.upcomingEvents}
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => {
              console.log("View Documents clicked");
              router.push("/client/documents");
            }}
            className="flex items-center justify-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              View Documents
            </span>
          </button>
          <button
            onClick={() => {
              console.log("View Bills clicked");
              router.push("/client/billing");
            }}
            className="flex items-center justify-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              View Bills
            </span>
          </button>
          <button
            onClick={() => {
              console.log("View Calendar clicked");
              router.push("/client/events");
            }}
            className="flex items-center justify-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400 mr-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              View Calendar
            </span>
          </button>
          <button
            onClick={() => {
              console.log("Contact Lawyer clicked");
              router.push("/client/chat");
            }}
            className="flex items-center justify-center p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Users className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Contact Lawyer
            </span>
          </button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cases */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Cases
              </h2>
              <button
                onClick={() => router.push("/client/cases")}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                View All
              </button>
            </div>
          </div>
          <div className="p-6">
            {recentCases.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400">
                  No cases found
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentCases.map((case_) => (
                  <div
                    key={case_.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {case_.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {case_.caseNumber} • {case_.assignedLawyer.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Updated {formatDate(case_.updatedAt)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          case_.status
                        )}`}
                      >
                        {case_.status}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Documents */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Documents
              </h2>
              <button
                onClick={() => router.push("/client/documents")}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                View All
              </button>
            </div>
          </div>
          <div className="p-6">
            {recentDocuments.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400">
                  No documents found
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentDocuments.map((document) => (
                  <div
                    key={document.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {document.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {document.case.caseNumber} •{" "}
                        {document.fileType.toUpperCase()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Uploaded {formatDate(document.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          document.status
                        )}`}
                      >
                        {document.status}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Bills */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Bills
              </h2>
              <button
                onClick={() => router.push("/client/billing")}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                View All
              </button>
            </div>
          </div>
          <div className="p-6">
            {recentBills.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-4 text-gray-400 flex items-center justify-center text-2xl font-bold">
                  {getCurrencySymbol(userCurrency)}
                </div>
                <p className="text-gray-500 dark:text-gray-400">
                  No bills found
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {bill.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {bill.case.caseNumber} •{" "}
                        {formatCurrency(bill.amount, userCurrency)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Due {formatDate(bill.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          bill.status
                        )}`}
                      >
                        {bill.status}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Billing Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Billing Summary
            </h2>
          </div>
          <div className="p-6">
            {stats && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Total Bills
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {stats.totalBills}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Unpaid Bills
                  </span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {stats.unpaidBills}
                  </span>
                </div>
                {stats.newBillsThisMonth > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      New This Month
                    </span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {stats.newBillsThisMonth}
                    </span>
                  </div>
                )}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                  <button
                    onClick={() => router.push("/client/billing")}
                    className="w-full btn-primary"
                  >
                    View All Bills
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
