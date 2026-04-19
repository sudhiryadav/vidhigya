"use client";

import LoadingOverlay from "@/components/LoadingOverlay";
import ModalDialog from "@/components/ui/ModalDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { apiClient } from "@/services/api";
import { formatCurrency, getCurrencySymbol } from "@/utils/currency";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  Edit,
  Eye,
  Filter,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface BillingRecord {
  id: string;
  amount: number;
  description: string;
  billType: string;
  status: string;
  dueDate: string;
  paidDate?: string;
  caseId?: string;
  caseNumber?: string;
  clientName?: string;
  createdAt: string;
}

interface Case {
  id: string;
  caseNumber: string;
  title: string;
  client: {
    id: string;
    name: string;
    email: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function BillingPage() {
  const { user } = useAuth();
  const { getSetting } = useSettings();
  const [bills, setBills] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCase, setFilterCase] = useState<string>("all");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<BillingRecord | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Form data state
  const [formData, setFormData] = useState({
    amount: "",
    billType: "CONSULTATION",
    dueDate: "",
    clientId: "",
    caseId: "",
    description: "",
  });

  // Role-based access control
  const isLawyer =
    user?.role === "LAWYER" ||
    user?.role === "ASSOCIATE" ||
    user?.role === "PARALEGAL";
  const isClient = user?.role === "CLIENT";
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  // Only lawyers and admins can create/edit/delete bills
  const canManageBills = isLawyer || isAdmin;

  // Get user's currency preference with fallback
  const userCurrency = getSetting("currency") || "INR";

  useEffect(() => {
    fetchBills();
    fetchCases();
    fetchOverdueBills();
  }, [searchTerm, filterStatus, filterCase]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getBills({
        status: filterStatus !== "all" ? filterStatus : undefined,
      });
      setBills(data as BillingRecord[]);
    } catch (error) {
      console.error("Error fetching bills:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCases = async () => {
    try {
      const data = await apiClient.getCases();
      setCases(data as Case[]);
    } catch (error) {
      console.error("Error fetching cases:", error);
    }
  };

  const fetchOverdueBills = async () => {
    try {
      // Try to fetch overdue bills from the specific endpoint first
      const overdueData = await apiClient.getOverdueBills();
      if (overdueData && Array.isArray(overdueData)) {
        // If we get overdue bills from the endpoint, merge them with regular bills
        // and mark them as overdue
        const overdueBills = overdueData.map((bill: any) => ({
          ...bill,
          status: "OVERDUE", // Ensure they're marked as overdue
        }));

        // Merge with existing bills, avoiding duplicates
        setBills((prevBills) => {
          const existingIds = new Set(prevBills.map((b) => b.id));
          const newOverdueBills = overdueBills.filter(
            (b) => !existingIds.has(b.id)
          );
          return [...prevBills, ...newOverdueBills];
        });
      }
    } catch (error) {
      console.error("Error fetching overdue bills:", error);
      // If the endpoint fails, we'll rely on local calculation
    }
  };

  const getStatusBadge = (status: string | undefined | null) => {
    const statusConfig = {
      PENDING: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
      PAID: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      OVERDUE: { color: "bg-red-100 text-red-800", icon: AlertTriangle },
      CANCELLED: { color: "bg-muted text-muted-foreground", icon: XCircle },
    };

    // Handle undefined/null status
    if (!status) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
          <Clock className="w-3 h-3 mr-1" />
          Unknown
        </span>
      );
    }

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    const Icon = config.icon;
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
      >
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </span>
    );
  };

  const getBillTypeBadge = (billType: string | undefined | null) => {
    const typeConfig = {
      CONSULTATION: "bg-blue-100 text-blue-800",
      COURT_FILING: "bg-purple-100 text-purple-800",
      DOCUMENT_PREPARATION: "bg-indigo-100 text-indigo-800",
      REPRESENTATION: "bg-teal-100 text-teal-800",
      OTHER: "bg-muted text-muted-foreground",
    };

    // Handle undefined/null billType
    if (!billType) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
          Unknown
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeConfig[billType as keyof typeof typeConfig] || typeConfig.OTHER}`}
      >
        {billType.replace("_", " ")}
      </span>
    );
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return "N/A";

    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "Invalid Date";
    }
  };

  const isOverdue = (
    dueDate: string | undefined | null,
    status: string | undefined | null
  ) => {
    if (!dueDate || !status) return false;

    try {
      return new Date(dueDate) < new Date() && status !== "PAID";
    } catch (error) {
      return false;
    }
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validate required fields
      if (!formData.amount || !formData.description || !formData.dueDate) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Prepare bill data
      const billData = {
        amount: parseFloat(formData.amount),
        description: formData.description,
        billType: formData.billType,
        dueDate: formData.dueDate,
        clientId: formData.clientId,
        caseId: formData.caseId || undefined,
        currency: userCurrency,
      };

      // Call API to create bill
      const response = await apiClient.createBill(billData);

      if (response) {
        setShowCreateModal(false);
        resetForm();

        // Refresh bills list
        await fetchBills();
        await fetchOverdueBills();

        // Show success message
        toast.success("Bill created successfully!");
      }
    } catch (error) {
      toast.error("Failed to create bill. Please try again.");
    }
  };

  const resetForm = () => {
    setFormData({
      amount: "",
      billType: "CONSULTATION",
      dueDate: "",
      clientId: "",
      caseId: "",
      description: "",
    });
  };

  const handleViewBill = (bill: BillingRecord) => {
    setSelectedBill(bill);
    setShowViewModal(true);
  };

  const handleEditBill = (bill: BillingRecord) => {
    setSelectedBill(bill);
    setFormData({
      amount: bill.amount.toString(),
      billType: bill.billType,
      dueDate: bill.dueDate.split("T")[0], // Convert ISO date to YYYY-MM-DD format
      clientId: "", // We'll need to get this from the case if available
      caseId: bill.caseId || "",
      description: bill.description,
    });
    setShowEditModal(true);
  };

  const handleDeleteBill = (bill: BillingRecord) => {
    setSelectedBill(bill);
    setShowDeleteModal(true);
  };

  const confirmDeleteBill = async () => {
    if (!selectedBill) return;

    try {
      // Call API to delete bill
      await apiClient.deleteBill(selectedBill.id);

      setShowDeleteModal(false);
      setSelectedBill(null);

      // Refresh bills list
      await fetchBills();
      await fetchOverdueBills();

      // Show success message
      toast.success("Bill deleted successfully!");
    } catch (error) {
      console.error("Error deleting bill:", error);
      toast.error("Failed to delete bill. Please try again.");
    }
  };

  const handleUpdateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;

    try {
      // Validate required fields
      if (!formData.amount || !formData.description || !formData.dueDate) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Prepare update data
      const updateData = {
        amount: parseFloat(formData.amount),
        description: formData.description,
        billType: formData.billType,
        dueDate: formData.dueDate,
        caseId: formData.caseId || undefined,
      };

      // Call API to update bill
      await apiClient.updateBill(selectedBill.id, updateData);

      setShowEditModal(false);
      setSelectedBill(null);
      resetForm();

      // Refresh bills list
      await fetchBills();
      await fetchOverdueBills();

      // Show success message
      toast.success("Bill updated successfully!");
    } catch (error) {
      toast.error("Failed to update bill. Please try again.");
    }
  };

  const filteredBills = bills.filter((bill) => {
    const matchesSearch =
      (bill.description?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      ) ||
      (bill.clientName?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      ) ||
      (bill.caseNumber &&
        bill.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    // Handle overdue filter first - this takes priority
    if (showOverdueOnly) {
      return matchesSearch && isOverdue(bill.dueDate, bill.status);
    }

    // Regular filtering when not showing overdue only
    const matchesStatus =
      filterStatus === "all" || bill.status === filterStatus;
    const matchesType = filterCase === "all" || bill.billType === filterCase;

    return matchesSearch && matchesStatus && matchesType;
  });

  const totalAmount = filteredBills.reduce(
    (sum, bill) => sum + (bill.amount || 0),
    0
  );
  const pendingAmount = filteredBills
    .filter((bill) => bill.status === "PENDING")
    .reduce((sum, bill) => sum + (bill.amount || 0), 0);
  const overdueAmount = filteredBills
    .filter((bill) => isOverdue(bill.dueDate, bill.status))
    .reduce((sum, bill) => sum + (bill.amount || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Billing Management
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage invoices and billing records
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  fetchBills();
                  fetchOverdueBills();
                }}
                className="btn-outline flex items-center"
                title="Refresh bills"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
              {/* Only show New Bill button for lawyers and admins */}
              {canManageBills && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn-primary flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Bill
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {getCurrencySymbol(userCurrency)}
                </span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Amount
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(totalAmount, userCurrency)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Pending Amount
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(pendingAmount, userCurrency)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <div className="flex items-center">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Overdue Amount
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(overdueAmount, userCurrency)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Overdue Bills
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {bills.filter((bill) => isOverdue(bill.dueDate, bill.status))
                    .length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-2 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search bills by description, client, or case number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                />
              </div>
            </div>

            {/* Overdue Toggle - Only for users who can manage bills */}
            {canManageBills && (
              <button
                onClick={() => setShowOverdueOnly(!showOverdueOnly)}
                className={`btn-outline flex items-center ${
                  showOverdueOnly
                    ? "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-600 text-red-700 dark:text-red-300"
                    : ""
                }`}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                {showOverdueOnly ? "Show All" : "Overdue Only"}
              </button>
            )}

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-outline flex items-center"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  >
                    <option value="all">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="PAID">Paid</option>
                    <option value="OVERDUE">Overdue</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Bill Type
                  </label>
                  <select
                    value={filterCase}
                    onChange={(e) => setFilterCase(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                  >
                    <option value="all">All Types</option>
                    <option value="CONSULTATION">Consultation</option>
                    <option value="COURT_FILING">Court Filing</option>
                    <option value="DOCUMENT_PREPARATION">
                      Document Preparation
                    </option>
                    <option value="REPRESENTATION">Representation</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Overdue Bills Section - Only for users who can manage bills */}
        {canManageBills && !showOverdueOnly && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 border-2 border-red-300 dark:border-red-700 rounded-lg p-6 mb-6 shadow-lg hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 dark:bg-red-800/50 rounded-full mr-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-red-800 dark:text-red-200">
                  ⚠️ Overdue Bills
                </h3>
              </div>
              <button
                onClick={() => setShowOverdueOnly(true)}
                className="px-4 py-2 bg-red-100 dark:bg-red-800/50 hover:bg-red-200 dark:hover:bg-red-800/70 text-red-700 dark:text-red-300 font-medium rounded-lg transition-colors"
              >
                View All Overdue
              </button>
            </div>

            {(() => {
              const overdueBills =
                bills.filter((bill) => isOverdue(bill.dueDate, bill.status)) ||
                [];
              if (overdueBills.length === 0) {
                return (
                  <div className="text-center py-4">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-green-700 dark:text-green-300">
                      No overdue bills!
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {overdueBills.slice(0, 3).map((bill) => (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between p-4 bg-white dark:bg-red-900/20 rounded-lg border-2 border-red-200 dark:border-red-600 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex-1">
                            <p className="font-semibold text-red-900 dark:text-red-100 text-base">
                              {bill.description || "No description"}
                            </p>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                              Due: {formatDate(bill.dueDate)} •{" "}
                              {bill.clientName || "N/A"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-red-900 dark:text-red-100 text-lg">
                              {formatCurrency(bill.amount || 0, userCurrency)}
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1 bg-red-100 dark:bg-red-800/30 px-2 py-1 rounded-full">
                              {Math.ceil(
                                (new Date(bill.dueDate).getTime() -
                                  new Date().getTime()) /
                                  (1000 * 60 * 60 * 24)
                              )}{" "}
                              days overdue
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {overdueBills.length > 3 && (
                    <div className="text-center pt-3">
                      <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                        +{overdueBills.length - 3} more overdue bills
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Bills List */}
        <div className="bg-card rounded-lg shadow-sm border border-border">
          <LoadingOverlay
            isVisible={loading}
            title="Loading Bills"
            message="Please wait while we fetch your billing information..."
            absolute={false}
          />

          {!loading && filteredBills.length === 0 ? (
            <div className="p-8 text-center">
              <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No bills found
              </h3>
              <p className="text-muted-foreground">
                {searchTerm || filterStatus !== "all" || filterCase !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by creating your first bill"}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Bill Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {filteredBills.map((bill) => (
                    <tr
                      key={bill.id}
                      className={`hover:bg-muted ${
                        isOverdue(bill.dueDate, bill.status)
                          ? "bg-red-50 dark:bg-red-900/20 border-l-4 border-l-red-500"
                          : ""
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {bill.description || "No description"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {getBillTypeBadge(bill.billType)}
                          </div>
                          {bill.caseNumber && (
                            <div className="text-xs text-muted-foreground">
                              Case: {bill.caseNumber}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground">
                          {bill.clientName || "N/A"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {bill.clientName ? bill.clientName : "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-foreground">
                          {formatCurrency(bill.amount || 0, userCurrency)}
                          {isOverdue(bill.dueDate, bill.status) && (
                            <div className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">
                              ⚠️ Overdue
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(bill.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        <div
                          className={
                            isOverdue(bill.dueDate, bill.status)
                              ? "text-red-600 dark:text-red-400"
                              : ""
                          }
                        >
                          {formatDate(bill.dueDate)}
                        </div>
                        {isOverdue(bill.dueDate, bill.status) && (
                          <div className="text-xs text-red-600 dark:text-red-400">
                            Overdue
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleViewBill(bill)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            title="View bill details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canManageBills && (
                            <button
                              onClick={() => handleEditBill(bill)}
                              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 p-1 rounded hover:bg-gray-50 dark:hover:bg-gray-900/20"
                              title="Edit bill"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {canManageBills && (
                            <button
                              onClick={() => handleDeleteBill(bill)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Delete bill"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Bill Modal - Only for Lawyers and Admins */}
      {canManageBills && (
        <ModalDialog
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            resetForm();
          }}
          header="Create New Bill"
          footer={
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-bill-form"
                className="btn-primary"
              >
                Create Bill
              </button>
            </div>
          }
          maxWidth="2xl"
          closeOnEscape={true}
          closeOnOverlayClick={true}
        >
          <form
            id="create-bill-form"
            className="space-y-4"
            onSubmit={handleCreateBill}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    {getCurrencySymbol(userCurrency)}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        amount: e.target.value,
                      })
                    }
                    className="w-full pl-8 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="create-bill-bill-type"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Bill type <span className="text-red-500">*</span>
                </label>
                <select
                  id="create-bill-bill-type"
                  value={formData.billType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      billType: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground min-h-[42px]"
                  required
                >
                  <option value="CONSULTATION">Consultation</option>
                  <option value="COURT_FILING">Court Filing</option>
                  <option value="DOCUMENT_PREPARATION">
                    Document Preparation
                  </option>
                  <option value="REPRESENTATION">Representation</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dueDate: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground min-h-[42px]"
                />
              </div>
              <div>
                <label
                  htmlFor="create-bill-client"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Client <span className="text-red-500">*</span>
                </label>
                <select
                  id="create-bill-client"
                  value={formData.clientId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      clientId: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground min-h-[42px]"
                  required
                >
                  <option value="">Select a client</option>
                  {cases.map((caseItem) => (
                    <option key={caseItem.client.id} value={caseItem.client.id}>
                      {caseItem.client.name} ({caseItem.client.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label
                  htmlFor="create-bill-case"
                  className="block text-sm font-medium text-foreground mb-1"
                >
                  Related case{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </label>
                <select
                  id="create-bill-case"
                  value={formData.caseId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      caseId: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground min-h-[42px]"
                >
                  <option value="">Select case (optional)</option>
                  {cases.map((caseItem) => (
                    <option key={caseItem.id} value={caseItem.id}>
                      {caseItem.caseNumber} - {caseItem.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Description *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                placeholder="Enter bill description"
              />
            </div>
          </form>
        </ModalDialog>
      )}

      {/* View Bill Modal */}
      <ModalDialog
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedBill(null);
        }}
        header="Bill Details"
        footer={
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setShowViewModal(false);
                setSelectedBill(null);
              }}
              className="btn-secondary"
            >
              Close
            </button>
          </div>
        }
        maxWidth="2xl"
        closeOnEscape={true}
        closeOnOverlayClick={true}
      >
        {selectedBill && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Amount
                </label>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(selectedBill.amount || 0, userCurrency)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Status
                </label>
                <div className="mt-1">
                  {getStatusBadge(selectedBill.status)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Bill Type
                </label>
                <div className="mt-1">
                  {getBillTypeBadge(selectedBill.billType)}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Due Date
                </label>
                <p className="text-foreground">
                  {formatDate(selectedBill.dueDate)}
                  {isOverdue(selectedBill.dueDate, selectedBill.status) && (
                    <span className="ml-2 text-red-600 dark:text-red-400 text-sm font-medium">
                      ⚠️ Overdue
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Description
              </label>
              <p className="text-foreground bg-muted p-3 rounded-lg">
                {selectedBill.description || "No description"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Client
                </label>
                <p className="text-foreground">
                  {selectedBill.clientName || "N/A"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Case Number
                </label>
                <p className="text-foreground">
                  {selectedBill.caseNumber || "N/A"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Created Date
                </label>
                <p className="text-foreground">
                  {formatDate(selectedBill.createdAt)}
                </p>
              </div>
              {selectedBill.paidDate && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">
                    Paid Date
                  </label>
                  <p className="text-foreground">
                    {formatDate(selectedBill.paidDate)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </ModalDialog>

      {/* Edit Bill Modal - Only for users who can manage bills */}
      {canManageBills && (
        <ModalDialog
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedBill(null);
            resetForm();
          }}
          header="Edit Bill"
          footer={
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedBill(null);
                  resetForm();
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-bill-form"
                className="btn-primary"
              >
                Update Bill
              </button>
            </div>
          }
          maxWidth="2xl"
          closeOnEscape={true}
          closeOnOverlayClick={true}
        >
          <form
            id="edit-bill-form"
            className="space-y-4"
            onSubmit={handleUpdateBill}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    {getCurrencySymbol(userCurrency)}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        amount: e.target.value,
                      })
                    }
                    className="w-full pl-8 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <select
                  value={formData.billType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      billType: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                >
                  <option value="CONSULTATION">Consultation</option>
                  <option value="COURT_FILING">Court Filing</option>
                  <option value="DOCUMENT_PREPARATION">
                    Document Preparation
                  </option>
                  <option value="REPRESENTATION">Representation</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dueDate: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                />
              </div>
              <div>
                <select
                  value={formData.caseId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      caseId: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                >
                  <option value="">Select case (optional)</option>
                  {cases.map((caseItem) => (
                    <option key={caseItem.id} value={caseItem.id}>
                      {caseItem.caseNumber} - {caseItem.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Description *
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
                placeholder="Enter bill description"
              />
            </div>
          </form>
        </ModalDialog>
      )}

      {/* Delete Confirmation Modal - Only for users who can manage bills */}
      {canManageBills && (
        <ModalDialog
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedBill(null);
          }}
          header="Delete Bill"
          footer={
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedBill(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteBill}
                className="btn-danger"
              >
                Delete Bill
              </button>
            </div>
          }
          maxWidth="md"
          closeOnEscape={true}
          closeOnOverlayClick={true}
        >
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Are you sure you want to delete this bill?
                </h3>
                <p className="text-muted-foreground mt-1">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            {selectedBill && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-medium text-foreground">
                  {selectedBill.description || "No description"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Amount:{" "}
                  {formatCurrency(selectedBill.amount || 0, userCurrency)} •
                  Due: {formatDate(selectedBill.dueDate)}
                </p>
              </div>
            )}
          </div>
        </ModalDialog>
      )}
    </div>
  );
}
