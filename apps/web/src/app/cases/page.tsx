"use client";

import ModalDialog from "@/components/ui/ModalDialog";
import CustomSelect from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  Calendar,
  Edit,
  FileText,
  Filter,
  Plus,
  Search,
  Trash2,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";

// Lawyer Case Interface
interface LawyerCase {
  id: string;
  caseNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  client: {
    id: string;
    name: string;
    email: string;
  };
  assignedLawyer: {
    id: string;
    name: string;
    email: string;
  };
  nextHearingDate?: string;
  filingDate?: string;
  createdAt: string;
  court?: {
    id: string;
    name: string;
  };
  judge?: string;
  opposingParty?: string;
  opposingLawyer?: string;
  documents: Array<{
    id: string;
    title: string;
    category: string;
  }>;
}

// Client Case Interface
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

interface Client {
  id: string;
  name: string;
  email: string;
}

export default function CasesPage() {
  const { user } = useAuth();
  const [lawyerCases, setLawyerCases] = useState<LawyerCase[]>([]);
  const [clientCases, setClientCases] = useState<ClientCase[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<{
    value: string;
    label: string;
  }>({ value: "all", label: "All Statuses" });
  const [priorityFilter, setPriorityFilter] = useState<{
    value: string;
    label: string;
  }>({ value: "all", label: "All Priorities" });
  const [categoryFilter, setCategoryFilter] = useState<{
    value: string;
    label: string;
  }>({ value: "all", label: "All Categories" });
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    caseNumber: "",
    title: "",
    description: "",
    clientId: "",
    category: "CIVIL",
    priority: "MEDIUM",
    courtId: "",
    judge: "",
    opposingParty: "",
    opposingLawyer: "",
    filingDate: "",
    nextHearingDate: "",
    assignedLawyerId: "",
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<LawyerCase>>({
    title: "",
    description: "",
    category: "CIVIL",
    priority: "MEDIUM",
    judge: "",
    opposingParty: "",
    opposingLawyer: "",
    filingDate: "",
    nextHearingDate: "",
  });
  const [caseToEdit, setCaseToEdit] = useState<LawyerCase | null>(null);
  const [caseToDelete, setCaseToDelete] = useState<LawyerCase | null>(null);

  // Role-based flags
  const isLawyer =
    user?.role === "LAWYER" ||
    user?.role === "ASSOCIATE" ||
    user?.role === "PARALEGAL";
  const isClient = user?.role === "CLIENT";
  const canManageCases = isLawyer;

  useEffect(() => {
    if (isLawyer) {
      fetchCases();
      fetchClients();
    } else if (isClient) {
      fetchClientCases();
    }
  }, [isLawyer, isClient]);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getCases();
      if (response && Array.isArray(response)) {
        setLawyerCases(response);
      }
    } catch (error) {
      console.error("Error fetching cases:", error);
      setError("Failed to load cases");
    } finally {
      setLoading(false);
    }
  };

  const fetchClientCases = async () => {
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
      setClientCases(data);
    } catch (err) {
      console.error("Error fetching cases:", err);
      setError(err instanceof Error ? err.message : "Failed to load cases");
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await apiClient.getClients();
      if (response && Array.isArray(response)) {
        setClients(response);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Generate a case number (you can implement your own logic here)
      const timestamp = new Date().getTime();
      const caseNumber = `CASE-${timestamp}`;

      // Set the assigned lawyer ID to the current user
      const assignedLawyerId = user?.id || "";

      const caseData = {
        ...createFormData,
        caseNumber,
        assignedLawyerId,
      };

      const response = await apiClient.createCase(caseData);
      if (response) {
        setShowCreateModal(false);
        setCreateFormData({
          caseNumber: "",
          title: "",
          description: "",
          clientId: "",
          category: "CIVIL",
          priority: "MEDIUM",
          courtId: "",
          judge: "",
          opposingParty: "",
          opposingLawyer: "",
          filingDate: "",
          nextHearingDate: "",
          assignedLawyerId: "",
        });
        fetchCases();
      }
    } catch (error) {
      console.error("Error creating case:", error);
    }
  };

  const openEditModal = (caseItem: LawyerCase) => {
    setCaseToEdit(caseItem);
    setEditFormData({
      title: caseItem.title,
      description: caseItem.description,
      category: caseItem.category,
      priority: caseItem.priority,
      judge: caseItem.judge || "",
      opposingParty: caseItem.opposingParty || "",
      opposingLawyer: caseItem.opposingLawyer || "",
      filingDate: caseItem.filingDate || "",
      nextHearingDate: caseItem.nextHearingDate || "",
    });
    setShowEditModal(true);
  };

  const handleEditCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseToEdit) return;

    try {
      const response = await apiClient.updateCase(caseToEdit.id, editFormData);
      if (response) {
        setShowEditModal(false);
        setCaseToEdit(null);
        setEditFormData({
          title: "",
          description: "",
          category: "CIVIL",
          priority: "MEDIUM",
          judge: "",
          opposingParty: "",
          opposingLawyer: "",
          filingDate: "",
          nextHearingDate: "",
        });
        fetchCases();
      }
    } catch (error) {
      console.error("Error updating case:", error);
    }
  };

  const handleDeleteClick = (caseItem: LawyerCase) => {
    setCaseToDelete(caseItem);
  };

  const handleDeleteCase = async () => {
    if (!caseToDelete) return;

    try {
      await apiClient.deleteCase(caseToDelete.id);
      setCaseToDelete(null);
      fetchCases();
    } catch (error) {
      console.error("Error deleting case:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { color: string; label: string } } = {
      OPEN: {
        color:
          "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
        label: "Open",
      },
      IN_PROGRESS: {
        color:
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
        label: "In Progress",
      },
      PENDING: {
        color:
          "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
        label: "Pending",
      },
      COMPLETED: {
        color:
          "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
        label: "Completed",
      },
      CLOSED: {
        color: "bg-muted text-muted-foreground",
        label: "Closed",
      },
      ON_HOLD: {
        color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
        label: "On Hold",
      },
    };

    const config = statusConfig[status] || statusConfig.OPEN;
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: { [key: string]: { color: string; label: string } } =
      {
        HIGH: {
          color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
          label: "High",
        },
        MEDIUM: {
          color:
            "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
          label: "Medium",
        },
        LOW: {
          color:
            "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
          label: "Low",
        },
      };

    const config = priorityConfig[priority] || priorityConfig.MEDIUM;
    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}
      >
        {config.label}
      </span>
    );
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
      case "on_hold":
        return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20";
      default:
        return "text-muted-foreground bg-muted";
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
        return "text-muted-foreground bg-muted";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const filteredLawyerCases = lawyerCases.filter((caseItem) => {
    const matchesSearch =
      caseItem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caseItem.caseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caseItem.client.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter.value === "all" || caseItem.status === statusFilter.value;
    const matchesPriority =
      priorityFilter.value === "all" ||
      caseItem.priority === priorityFilter.value;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const filteredClientCases = clientCases.filter((caseItem) => {
    const matchesSearch =
      caseItem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caseItem.caseNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter.value === "all" || caseItem.status === statusFilter.value;
    const matchesCategory =
      categoryFilter.value === "all" ||
      caseItem.category === categoryFilter.value;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Error Loading Cases
          </h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => (isLawyer ? fetchCases() : fetchClientCases())}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Render Lawyer Cases
  if (isLawyer) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Cases</h1>
              <p className="mt-2 text-muted-foreground">
                Manage your legal cases and track their progress
              </p>
            </div>
            {canManageCases && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Case
              </button>
            )}
          </div>

          {/* Search and Filters */}
          <div className="bg-card border border-border shadow-sm dark:shadow-md rounded-lg p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search cases by title, case number, or client..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-md text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-4 py-2 border border-border rounded-md text-sm font-medium text-muted-foreground bg-background hover:bg-muted"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </button>
            </div>

            {showFilters && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <CustomSelect
                  label="Status"
                  value={statusFilter}
                  onChange={(value) =>
                    setStatusFilter(
                      value || { value: "all", label: "All Statuses" }
                    )
                  }
                  options={[
                    { value: "all", label: "All Statuses" },
                    { value: "OPEN", label: "Open" },
                    { value: "IN_PROGRESS", label: "In Progress" },
                    { value: "PENDING", label: "Pending" },
                    { value: "COMPLETED", label: "Completed" },
                    { value: "CLOSED", label: "Closed" },
                    { value: "ON_HOLD", label: "On Hold" },
                  ]}
                />
                <CustomSelect
                  label="Priority"
                  value={priorityFilter}
                  onChange={(value) =>
                    setPriorityFilter(
                      value || { value: "all", label: "All Priorities" }
                    )
                  }
                  options={[
                    { value: "all", label: "All Priorities" },
                    { value: "HIGH", label: "High" },
                    { value: "MEDIUM", label: "Medium" },
                    { value: "LOW", label: "Low" },
                  ]}
                />
              </div>
            )}
          </div>

          {/* Cases Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredLawyerCases.map((caseItem) => (
              <div
                key={caseItem.id}
                className="bg-card border border-border rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-foreground mb-1">
                      {caseItem.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Case #{caseItem.caseNumber}
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {getStatusBadge(caseItem.status)}
                      {getPriorityBadge(caseItem.priority)}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openEditModal(caseItem)}
                      className="p-2 text-muted-foreground hover:text-foreground"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(caseItem)}
                      className="p-2 text-muted-foreground hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {caseItem.description}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <User className="h-4 w-4 mr-2" />
                    <span>Client: {caseItem.client.name}</span>
                  </div>
                  {caseItem.nextHearingDate && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>
                        Next Hearing: {formatDate(caseItem.nextHearingDate)}
                      </span>
                    </div>
                  )}
                  {caseItem.filingDate && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <FileText className="h-4 w-4 mr-2" />
                      <span>
                        Filing Date: {formatDate(caseItem.filingDate)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Created: {formatDate(caseItem.createdAt)}
                  </span>
                  <button className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredLawyerCases.length === 0 && (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No cases found
              </h3>
              <p className="text-muted-foreground">
                {searchTerm ||
                statusFilter.value !== "all" ||
                priorityFilter.value !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by creating your first case"}
              </p>
            </div>
          )}
        </div>

        {/* Create Case Modal */}
        <ModalDialog
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          header="Create New Case"
        >
          <form onSubmit={handleCreateCase} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Title
              </label>
              <input
                type="text"
                required
                value={createFormData.title}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    title: e.target.value,
                  })
                }
                className="w-full border border-border rounded-md px-3 py-2 text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Description
              </label>
              <textarea
                required
                value={createFormData.description}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    description: e.target.value,
                  })
                }
                rows={3}
                className="w-full border border-border rounded-md px-3 py-2 text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Client
              </label>
              <CustomSelect
                value={{
                  value: createFormData.clientId,
                  label: createFormData.clientId
                    ? clients.find((c) => c.id === createFormData.clientId)
                        ?.name || "Select a client"
                    : "Select a client",
                }}
                onChange={(option) =>
                  setCreateFormData({
                    ...createFormData,
                    clientId: option?.value || "",
                  })
                }
                options={[
                  { value: "", label: "Select a client" },
                  ...clients.map((client) => ({
                    value: client.id,
                    label: client.name,
                  })),
                ]}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Category
                </label>
                <CustomSelect
                  value={{
                    value: createFormData.category,
                    label: createFormData.category || "Select category",
                  }}
                  onChange={(option) =>
                    setCreateFormData({
                      ...createFormData,
                      category: option?.value || "",
                    })
                  }
                  options={[
                    { value: "CIVIL", label: "Civil" },
                    { value: "CRIMINAL", label: "Criminal" },
                    { value: "FAMILY", label: "Family" },
                    { value: "CORPORATE", label: "Corporate" },
                    { value: "PROPERTY", label: "Property" },
                    { value: "OTHER", label: "Other" },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Priority
                </label>
                <CustomSelect
                  value={{
                    value: createFormData.priority,
                    label: createFormData.priority || "Select priority",
                  }}
                  onChange={(option) =>
                    setCreateFormData({
                      ...createFormData,
                      priority: option?.value || "",
                    })
                  }
                  options={[
                    { value: "HIGH", label: "High" },
                    { value: "MEDIUM", label: "Medium" },
                    { value: "LOW", label: "Low" },
                  ]}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-border rounded-md text-sm font-medium text-muted-foreground bg-background hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Case
              </button>
            </div>
          </form>
        </ModalDialog>

        {/* Edit Case Modal */}
        <ModalDialog
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          header="Edit Case"
        >
          <form onSubmit={handleEditCase} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Title
              </label>
              <input
                type="text"
                required
                value={editFormData.title}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, title: e.target.value })
                }
                className="w-full border border-border rounded-md px-3 py-2 text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Description
              </label>
              <textarea
                required
                value={editFormData.description}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    description: e.target.value,
                  })
                }
                rows={3}
                className="w-full border border-border rounded-md px-3 py-2 text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Category
                </label>
                <CustomSelect
                  value={
                    editFormData.category
                      ? {
                          value: editFormData.category,
                          label: editFormData.category,
                        }
                      : null
                  }
                  onChange={(option) =>
                    setEditFormData({
                      ...editFormData,
                      category: option?.value || "",
                    })
                  }
                  options={[
                    { value: "CIVIL", label: "Civil" },
                    { value: "CRIMINAL", label: "Criminal" },
                    { value: "FAMILY", label: "Family" },
                    { value: "CORPORATE", label: "Corporate" },
                    { value: "PROPERTY", label: "Property" },
                    { value: "OTHER", label: "Other" },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Priority
                </label>
                <CustomSelect
                  value={
                    editFormData.priority
                      ? {
                          value: editFormData.priority,
                          label: editFormData.priority,
                        }
                      : null
                  }
                  onChange={(option) =>
                    setEditFormData({
                      ...editFormData,
                      priority: option?.value || "",
                    })
                  }
                  options={[
                    { value: "HIGH", label: "High" },
                    { value: "MEDIUM", label: "Medium" },
                    { value: "LOW", label: "Low" },
                  ]}
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-border rounded-md text-sm font-medium text-muted-foreground bg-background hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Update Case
              </button>
            </div>
          </form>
        </ModalDialog>

        {/* Delete Confirmation Modal */}
        <ModalDialog
          isOpen={!!caseToDelete}
          onClose={() => setCaseToDelete(null)}
          header="Delete Case"
        >
          <div className="space-y-4">
            <p className="text-foreground">
              Are you sure you want to delete "{caseToDelete?.title}"? This
              action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setCaseToDelete(null)}
                className="px-4 py-2 border border-border rounded-md text-sm font-medium text-muted-foreground bg-background hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCase}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </ModalDialog>
      </div>
    );
  }

  // Render Client Cases
  if (isClient) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">My Cases</h1>
            <p className="mt-2 text-muted-foreground">
              Track the progress of your legal matters
            </p>
          </div>

          {/* Search and Filters */}
          <div className="bg-card shadow rounded-lg p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search cases by title or case number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-md text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-4 py-2 border border-border rounded-md text-sm font-medium text-muted-foreground bg-background hover:bg-muted"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </button>
            </div>

            {showFilters && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CustomSelect
                  label="Status"
                  value={statusFilter}
                  onChange={(option) =>
                    setStatusFilter(
                      option || { value: "all", label: "All Statuses" }
                    )
                  }
                  options={[
                    { value: "all", label: "All Statuses" },
                    { value: "OPEN", label: "Open" },
                    { value: "IN_PROGRESS", label: "In Progress" },
                    { value: "PENDING", label: "Pending" },
                    { value: "COMPLETED", label: "Completed" },
                    { value: "CLOSED", label: "Closed" },
                    { value: "ON_HOLD", label: "On Hold" },
                  ]}
                />
                <CustomSelect
                  label="Category"
                  value={categoryFilter}
                  onChange={(option) =>
                    setCategoryFilter(
                      option || { value: "all", label: "All Categories" }
                    )
                  }
                  options={[
                    { value: "all", label: "All Categories" },
                    { value: "CIVIL", label: "Civil" },
                    { value: "CRIMINAL", label: "Criminal" },
                    { value: "FAMILY", label: "Family" },
                    { value: "CORPORATE", label: "Corporate" },
                    { value: "PROPERTY", label: "Property" },
                    { value: "OTHER", label: "Other" },
                  ]}
                />
              </div>
            )}
          </div>

          {/* Cases Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredClientCases.map((caseItem) => (
              <div
                key={caseItem.id}
                className="bg-card border border-border rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-foreground mb-1">
                    {caseItem.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Case #{caseItem.caseNumber}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(caseItem.status)}`}
                    >
                      {caseItem.status.replace("_", " ")}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(caseItem.priority)}`}
                    >
                      {caseItem.priority}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {caseItem.description}
                </p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <User className="h-4 w-4 mr-2" />
                    <span>Lawyer: {caseItem.assignedLawyer.name}</span>
                  </div>
                  {caseItem.nextHearingDate && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>
                        Next Hearing: {formatDate(caseItem.nextHearingDate)}
                      </span>
                    </div>
                  )}
                  {caseItem.filingDate && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <FileText className="h-4 w-4 mr-2" />
                      <span>
                        Filing Date: {formatDate(caseItem.filingDate)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-foreground">
                      Documents
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {caseItem.documents.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-foreground">
                      Bills
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {caseItem.billingRecords.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Updated: {formatDate(caseItem.updatedAt)}
                    </span>
                    <button className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 flex items-center">
                      View Details
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredClientCases.length === 0 && (
            <div className="text-center py-12">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No cases found
              </h3>
              <p className="text-muted-foreground">
                {searchTerm ||
                statusFilter.value !== "all" ||
                categoryFilter.value !== "all"
                  ? "Try adjusting your search or filters"
                  : "You don't have any cases yet"}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-500" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          Access Denied
        </h3>
        <p className="text-muted-foreground mb-4">
          You don&apos;t have permission to access this page.
        </p>
      </div>
    </div>
  );
}
