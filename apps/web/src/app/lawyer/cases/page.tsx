"use client";

import CourtSelector from "@/components/CourtSelector";
import ModalDialog from "@/components/ui/ModalDialog";
import CustomSelect, { SelectOption } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit,
  Eye,
  FileText,
  Filter,
  Plus,
  Search,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Case {
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

interface Client {
  id: string;
  name: string;
  email: string;
}

export default function CasesPage() {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
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
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<Case>>({
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
  const [caseToEdit, setCaseToEdit] = useState<Case | null>(null);
  const [caseToDelete, setCaseToDelete] = useState<Case | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Select options
  const statusOptions: SelectOption[] = [
    { value: "all", label: "All Status" },
    { value: "OPEN", label: "Open" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "ON_HOLD", label: "On Hold" },
    { value: "CLOSED", label: "Closed" },
  ];

  const priorityOptions: SelectOption[] = [
    { value: "all", label: "All Priorities" },
    { value: "LOW", label: "Low" },
    { value: "MEDIUM", label: "Medium" },
    { value: "HIGH", label: "High" },
    { value: "URGENT", label: "Urgent" },
  ];

  const categoryOptions: SelectOption[] = [
    { value: "CIVIL", label: "Civil" },
    { value: "CRIMINAL", label: "Criminal" },
    { value: "FAMILY", label: "Family" },
    { value: "CORPORATE", label: "Corporate" },
    { value: "PROPERTY", label: "Property" },
    { value: "EMPLOYMENT", label: "Employment" },
    { value: "INTELLECTUAL_PROPERTY", label: "Intellectual Property" },
    { value: "TAX", label: "Tax" },
    { value: "OTHER", label: "Other" },
  ];

  const casePriorityOptions: SelectOption[] = [
    { value: "LOW", label: "Low" },
    { value: "MEDIUM", label: "Medium" },
    { value: "HIGH", label: "High" },
    { value: "URGENT", label: "Urgent" },
  ];

  const caseStatusOptions: SelectOption[] = [
    { value: "OPEN", label: "Open" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "ON_HOLD", label: "On Hold" },
    { value: "CLOSED", label: "Closed" },
  ];

  useEffect(() => {
    fetchCases();
    fetchClients();
  }, [searchTerm, statusFilter, priorityFilter]);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getCases({
        status: statusFilter !== "all" ? statusFilter : undefined,
        priority: priorityFilter !== "all" ? priorityFilter : undefined,
        search: searchTerm || undefined,
      });
      setCases(data as Case[]);
    } catch (error) {
      console.error("Error fetching cases:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      // For now, we'll extract clients from cases since we don't have a dedicated clients endpoint
      const data = await apiClient.getCases();
      const clientMap = new Map();
      (data as Case[]).forEach((caseItem) => {
        if (!clientMap.has(caseItem.client.id)) {
          clientMap.set(caseItem.client.id, caseItem.client);
        }
      });
      setClients(Array.from(clientMap.values()));
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const caseNumber = `CASE-${Date.now()}`;
      await apiClient.createCase({
        caseNumber,
        title: createFormData.title,
        description: createFormData.description,
        clientId: createFormData.clientId,
        category: createFormData.category as string,
        priority: createFormData.priority as string,
        courtId: createFormData.courtId || undefined,
        judge: createFormData.judge || undefined,
        opposingParty: createFormData.opposingParty || undefined,
        opposingLawyer: createFormData.opposingLawyer || undefined,
        filingDate: createFormData.filingDate || undefined,
        nextHearingDate: createFormData.nextHearingDate || undefined,
        assignedLawyerId: user?.id || "",
      });
      setShowCreateModal(false);
      setCreateFormData({
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
      });
      fetchCases();
    } catch (error) {
      console.error("Error creating case:", error);
    }
  };

  const openEditModal = (caseItem: Case) => {
    setCaseToEdit(caseItem);
    setEditFormData({
      title: caseItem.title,
      description: caseItem.description,
      status: caseItem.status,
      priority: caseItem.priority,
      category: caseItem.category,

      judge: caseItem.judge || "",
      opposingParty: caseItem.opposingParty || "",
      opposingLawyer: caseItem.opposingLawyer || "",
      filingDate: caseItem.filingDate
        ? new Date(caseItem.filingDate).toISOString().split("T")[0]
        : "",
      nextHearingDate: caseItem.nextHearingDate
        ? new Date(caseItem.nextHearingDate).toISOString().split("T")[0]
        : "",
    });
    setShowEditModal(true);
  };

  const handleEditCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.updateCase(caseToEdit!.id, {
        title: editFormData.title,
        description: editFormData.description,
        status: editFormData.status,
        priority: editFormData.priority,
        category: editFormData.category,

        judge: editFormData.judge || undefined,
        opposingParty: editFormData.opposingParty || undefined,
        opposingLawyer: editFormData.opposingLawyer || undefined,
        filingDate: editFormData.filingDate || undefined,
        nextHearingDate: editFormData.nextHearingDate || undefined,
      });
      setShowEditModal(false);
      setCaseToEdit(null);
      fetchCases();
    } catch (error) {
      console.error("Error updating case:", error);
    }
  };

  const handleDeleteClick = (caseItem: Case) => {
    setCaseToDelete(caseItem);
    setShowDeleteConfirm(true);
  };

  const handleDeleteCase = async () => {
    if (!caseToDelete) return;
    try {
      await apiClient.deleteCase(caseToDelete.id);
      setShowDeleteConfirm(false);
      setCaseToDelete(null);
      fetchCases();
    } catch (error) {
      console.error("Error deleting case:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      OPEN: { color: "bg-blue-100 text-blue-800", icon: Clock },
      IN_PROGRESS: {
        color: "bg-yellow-100 text-yellow-800",
        icon: AlertTriangle,
      },
      CLOSED: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      ON_HOLD: { color: "bg-gray-100 text-gray-800", icon: XCircle },
    };
    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.OPEN;
    const Icon = config.icon;
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
      >
        <Icon className="w-3 h-3 mr-1" />
        {status.replace("_", " ")}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      LOW: "bg-gray-100 text-gray-800",
      MEDIUM: "bg-yellow-100 text-yellow-800",
      HIGH: "bg-red-100 text-red-800",
      URGENT: "bg-purple-100 text-purple-800",
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityConfig[priority as keyof typeof priorityConfig]}`}
      >
        {priority}
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Cases Management
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage and track all legal cases
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Case
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search cases by title, case number, or client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <CustomSelect
                    options={statusOptions}
                    value={statusOptions.find(
                      (option) => option.value === statusFilter
                    )}
                    onChange={(selectedOption) =>
                      setStatusFilter(selectedOption?.value || "all")
                    }
                    placeholder="Select status"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <CustomSelect
                    options={priorityOptions}
                    value={priorityOptions.find(
                      (option) => option.value === priorityFilter
                    )}
                    onChange={(selectedOption) =>
                      setPriorityFilter(selectedOption?.value || "all")
                    }
                    placeholder="Select priority"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cases List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Loading cases...
              </p>
            </div>
          ) : cases.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No cases found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ||
                statusFilter !== "all" ||
                priorityFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by creating your first case"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/4">
                      Case
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-1/5">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-20">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-20">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-32">
                      Next Hearing
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-24">
                      Documents
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-20">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {cases.map((caseItem) => (
                    <tr
                      key={caseItem.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white break-words">
                            {caseItem.caseNumber}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 break-words">
                            {caseItem.title}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            Filed:{" "}
                            {formatDate(
                              caseItem.filingDate || caseItem.createdAt
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white break-words">
                          {caseItem.client.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 break-words">
                          {caseItem.client.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(caseItem.status)}
                      </td>
                      <td className="px-6 py-4">
                        {getPriorityBadge(caseItem.priority)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {caseItem.nextHearingDate
                          ? formatDate(caseItem.nextHearingDate)
                          : "Not scheduled"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 mr-1" />
                          {caseItem.documents.length} docs
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                            onClick={() => openEditModal(caseItem)}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            onClick={() => handleDeleteClick(caseItem)}
                          >
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

      {/* Create Case Modal */}
      <ModalDialog
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        header="Create New Case"
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
              form="create-case-form"
              className="btn-primary"
            >
              Create Case
            </button>
          </div>
        }
        maxWidth="2xl"
        closeOnEscape={true}
        closeOnOverlayClick={true}
      >
        <form
          id="create-case-form"
          onSubmit={handleCreateCase}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Case Title *
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter case title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Client *
              </label>
              <CustomSelect
                options={clients.map((client) => ({
                  value: client.id,
                  label: `${client.name} (${client.email})`,
                }))}
                value={clients
                  .map((client) => ({
                    value: client.id,
                    label: `${client.name} (${client.email})`,
                  }))
                  .find((option) => option.value === createFormData.clientId)}
                onChange={(selectedOption) =>
                  setCreateFormData({
                    ...createFormData,
                    clientId: selectedOption?.value || "",
                  })
                }
                placeholder="Select a client"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category *
              </label>
              <CustomSelect
                options={categoryOptions}
                value={categoryOptions.find(
                  (option) => option.value === createFormData.category
                )}
                onChange={(selectedOption) =>
                  setCreateFormData({
                    ...createFormData,
                    category: selectedOption?.value || "CIVIL",
                  })
                }
                placeholder="Select category"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority *
              </label>
              <CustomSelect
                options={casePriorityOptions}
                value={casePriorityOptions.find(
                  (option) => option.value === createFormData.priority
                )}
                onChange={(selectedOption) =>
                  setCreateFormData({
                    ...createFormData,
                    priority: selectedOption?.value || "MEDIUM",
                  })
                }
                placeholder="Select priority"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Court
              </label>
              <CourtSelector
                value={createFormData.courtId}
                onChange={(courtId: string) =>
                  setCreateFormData({
                    ...createFormData,
                    courtId: courtId,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Judge
              </label>
              <input
                type="text"
                value={createFormData.judge}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    judge: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter judge name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Opposing Party
              </label>
              <input
                type="text"
                value={createFormData.opposingParty}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    opposingParty: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter opposing party name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Opposing Lawyer
              </label>
              <input
                type="text"
                value={createFormData.opposingLawyer}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    opposingLawyer: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter opposing lawyer name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filing Date
              </label>
              <input
                type="date"
                value={createFormData.filingDate}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    filingDate: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Next Hearing Date
              </label>
              <input
                type="date"
                value={createFormData.nextHearingDate}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    nextHearingDate: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={createFormData.description}
              onChange={(e) =>
                setCreateFormData({
                  ...createFormData,
                  description: e.target.value,
                })
              }
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Enter case description"
            />
          </div>
        </form>
      </ModalDialog>

      {/* Edit Case Modal */}
      <ModalDialog
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        header="Edit Case"
        footer={
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" form="edit-case-form" className="btn-primary">
              Save Changes
            </button>
          </div>
        }
        maxWidth="2xl"
        closeOnEscape={true}
        closeOnOverlayClick={true}
      >
        <form
          id="edit-case-form"
          onSubmit={handleEditCase}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Case Title *
              </label>
              <input
                type="text"
                required
                value={editFormData.title}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    title: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status *
              </label>
              <CustomSelect
                options={caseStatusOptions}
                value={caseStatusOptions.find(
                  (option) => option.value === editFormData.status
                )}
                onChange={(selectedOption) =>
                  setEditFormData({
                    ...editFormData,
                    status: selectedOption?.value || "OPEN",
                  })
                }
                placeholder="Select status"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority *
              </label>
              <CustomSelect
                options={casePriorityOptions}
                value={casePriorityOptions.find(
                  (option) => option.value === editFormData.priority
                )}
                onChange={(selectedOption) =>
                  setEditFormData({
                    ...editFormData,
                    priority: selectedOption?.value || "MEDIUM",
                  })
                }
                placeholder="Select priority"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category *
              </label>
              <CustomSelect
                options={categoryOptions}
                value={categoryOptions.find(
                  (option) => option.value === editFormData.category
                )}
                onChange={(selectedOption) =>
                  setEditFormData({
                    ...editFormData,
                    category: selectedOption?.value || "CIVIL",
                  })
                }
                placeholder="Select category"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Judge
              </label>
              <input
                type="text"
                value={editFormData.judge}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    judge: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Opposing Party
              </label>
              <input
                type="text"
                value={editFormData.opposingParty}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    opposingParty: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Opposing Lawyer
              </label>
              <input
                type="text"
                value={editFormData.opposingLawyer}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    opposingLawyer: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filing Date
              </label>
              <input
                type="date"
                value={editFormData.filingDate}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    filingDate: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Next Hearing Date
              </label>
              <input
                type="date"
                value={editFormData.nextHearingDate}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    nextHearingDate: e.target.value,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={editFormData.description}
              onChange={(e) =>
                setEditFormData({
                  ...editFormData,
                  description: e.target.value,
                })
              }
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Enter case description"
            />
          </div>
        </form>
      </ModalDialog>

      {/* Delete Confirmation Modal */}
      <ModalDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        header="Delete Case"
        footer={
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button onClick={handleDeleteCase} className="btn-danger">
              Delete
            </button>
          </div>
        }
        maxWidth="md"
        closeOnEscape={true}
        closeOnOverlayClick={true}
      >
        <div className="text-center">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to delete the case{" "}
            <span className="font-bold">{caseToDelete?.title}</span>? This
            action cannot be undone.
          </p>
        </div>
      </ModalDialog>
    </div>
  );
}
