"use client";

import ModalDialog from "@/components/ui/ModalDialog";
import CustomSelect from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { apiClient } from "@/services/api";
import { formatCurrency } from "@/utils/currency";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Edit,
  Eye,
  Filter,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<BillingRecord | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<User[]>([]);
  const [showFilters, setShowFilters] = useState(false);

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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
      PAID: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      OVERDUE: { color: "bg-red-100 text-red-800", icon: AlertTriangle },
      CANCELLED: { color: "bg-muted text-muted-foreground", icon: XCircle },
    };
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

  const getBillTypeBadge = (billType: string) => {
    const typeConfig = {
      CONSULTATION: "bg-blue-100 text-blue-800",
      COURT_FILING: "bg-purple-100 text-purple-800",
      DOCUMENT_PREPARATION: "bg-indigo-100 text-indigo-800",
      REPRESENTATION: "bg-teal-100 text-teal-800",
      OTHER: "bg-muted text-muted-foreground",
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeConfig[billType as keyof typeof typeConfig] || typeConfig.OTHER}`}
      >
        {billType.replace("_", " ")}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isOverdue = (dueDate: string, status: string) => {
    return new Date(dueDate) < new Date() && status !== "PAID";
  };

  const filteredBills = bills.filter((bill) => {
    const matchesSearch =
      bill.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bill.caseNumber &&
        bill.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus =
      filterStatus === "all" || bill.status === filterStatus;
    const matchesType = filterCase === "all" || bill.billType === filterCase;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalAmount = filteredBills.reduce((sum, bill) => sum + bill.amount, 0);
  const pendingAmount = filteredBills
    .filter((bill) => bill.status === "PENDING")
    .reduce((sum, bill) => sum + bill.amount, 0);
  const overdueAmount = filteredBills
    .filter((bill) => isOverdue(bill.dueDate, bill.status))
    .reduce((sum, bill) => sum + bill.amount, 0);

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
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Bill
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
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
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
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
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <CustomSelect
                    label="Status"
                    options={[
                      { value: "all", label: "All Status" },
                      { value: "PENDING", label: "Pending" },
                      { value: "PAID", label: "Paid" },
                      { value: "OVERDUE", label: "Overdue" },
                      { value: "CANCELLED", label: "Cancelled" },
                    ]}
                    value={{
                      value: filterStatus,
                      label:
                        filterStatus === "all" ? "All Status" : filterStatus,
                    }}
                    onChange={(option) =>
                      setFilterStatus(option?.value || "all")
                    }
                    placeholder="Select status"
                  />
                </div>
                <div>
                  <CustomSelect
                    label="Bill Type"
                    options={[
                      { value: "all", label: "All Types" },
                      { value: "CONSULTATION", label: "Consultation" },
                      { value: "COURT_FILING", label: "Court Filing" },
                      {
                        value: "DOCUMENT_PREPARATION",
                        label: "Document Preparation",
                      },
                      { value: "REPRESENTATION", label: "Representation" },
                      { value: "OTHER", label: "Other" },
                    ]}
                    value={{
                      value: filterCase,
                      label: filterCase === "all" ? "All Types" : filterCase,
                    }}
                    onChange={(option) => setFilterCase(option?.value || "all")}
                    placeholder="Select bill type"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bills List */}
        <div className="bg-card rounded-lg shadow-sm border border-border">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Loading bills...
              </p>
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="p-8 text-center">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No bills found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Bill Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {filteredBills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-muted">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {bill.description}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {getBillTypeBadge(bill.billType)}
                          </div>
                          {bill.caseNumber && (
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              Case: {bill.caseNumber}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {bill.clientName || "N/A"}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {bill.clientName ? bill.clientName : "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {formatCurrency(bill.amount, userCurrency)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(bill.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div
                          className={
                            isOverdue(bill.dueDate, bill.status)
                              ? "text-red-600"
                              : ""
                          }
                        >
                          {formatDate(bill.dueDate)}
                        </div>
                        {isOverdue(bill.dueDate, bill.status) && (
                          <div className="text-xs text-red-600">Overdue</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300">
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Create Bill Modal */}
      <ModalDialog
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        header="Create New Bill"
        footer={
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
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
        <form id="create-bill-form" className="space-y-4">
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
              <CustomSelect
                label="Bill Type"
                required
                options={[
                  { value: "CONSULTATION", label: "Consultation" },
                  { value: "COURT_FILING", label: "Court Filing" },
                  {
                    value: "DOCUMENT_PREPARATION",
                    label: "Document Preparation",
                  },
                  { value: "REPRESENTATION", label: "Representation" },
                  { value: "OTHER", label: "Other" },
                ]}
                value={{
                  value: formData.billType,
                  label: formData.billType,
                }}
                onChange={(option) =>
                  setFormData({
                    ...formData,
                    billType: option?.value || "CONSULTATION",
                  })
                }
                placeholder="Select bill type"
              />
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
              <CustomSelect
                label="Client"
                required
                options={[
                  { value: "", label: "Select a client" },
                  ...cases.map((caseItem) => ({
                    value: caseItem.client.id,
                    label: `${caseItem.client.name} (${caseItem.client.email})`,
                  })),
                ]}
                value={
                  formData.clientId
                    ? {
                        value: formData.clientId,
                        label: cases.find(
                          (c) => c.client.id === formData.clientId
                        )
                          ? `${cases.find((c) => c.client.id === formData.clientId)?.client.name} (${cases.find((c) => c.client.id === formData.clientId)?.client.email})`
                          : "Select a client",
                      }
                    : { value: "", label: "Select a client" }
                }
                onChange={(option) =>
                  setFormData({
                    ...formData,
                    clientId: option?.value || "",
                  })
                }
                placeholder="Select a client"
              />
            </div>
            <div>
              <CustomSelect
                label="Related Case"
                options={[
                  { value: "", label: "Select case (optional)" },
                  ...cases.map((caseItem) => ({
                    value: caseItem.id,
                    label: `${caseItem.caseNumber} - ${caseItem.title}`,
                  })),
                ]}
                value={
                  formData.caseId
                    ? {
                        value: formData.caseId,
                        label: cases.find((c) => c.id === formData.caseId)
                          ? `${cases.find((c) => c.id === formData.caseId)?.caseNumber} - ${cases.find((c) => c.id === formData.caseId)?.title}`
                          : "Select case (optional)",
                      }
                    : { value: "", label: "Select case (optional)" }
                }
                onChange={(option) =>
                  setFormData({
                    ...formData,
                    caseId: option?.value || "",
                  })
                }
                placeholder="Select case (optional)"
              />
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
    </div>
  );
}
