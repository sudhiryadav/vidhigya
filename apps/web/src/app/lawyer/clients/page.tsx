"use client";

import ModalDialog from "@/components/ui/ModalDialog";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import {
  Briefcase,
  Calendar,
  DollarSign,
  Edit,
  Eye,
  FileText,
  Filter,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  cases: Array<{
    id: string;
    caseNumber: string;
    title: string;
    status: string;
  }>;
  documents: Array<{
    id: string;
    title: string;
    category: string;
  }>;
  billingRecords: Array<{
    id: string;
    amount: number;
    status: string;
    dueDate: string;
  }>;
}

export default function ClientsPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [createFormData, setCreateFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    isActive: true,
  });

  useEffect(() => {
    fetchClients();
  }, [searchTerm, statusFilter]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getClients();
      setClients(data as Client[]);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.createClient({
        name: createFormData.name,
        email: createFormData.email,
        phone: createFormData.phone || undefined,
        role: "CLIENT",
      });
      setShowCreateModal(false);
      setCreateFormData({ name: "", email: "", phone: "" });
      fetchClients();
    } catch (error) {
      console.error("Error creating client:", error);
    }
  };

  const handleEditClick = (client: Client) => {
    // Ensure billingRecords is always an array
    const clientWithSafeBillingRecords = {
      ...client,
      billingRecords: client.billingRecords || [],
    };
    setSelectedClient(clientWithSafeBillingRecords);
    setEditFormData({
      name: client.name,
      email: client.email,
      phone: client.phone || "",
      isActive: client.isActive,
    });
    setShowEditModal(true);
  };

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    try {
      await apiClient.updateClient(selectedClient.id, {
        name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone || undefined,
        isActive: editFormData.isActive,
      });
      setShowEditModal(false);
      setSelectedClient(null);
      fetchClients();
    } catch (error) {
      console.error("Error updating client:", error);
    }
  };

  const handleViewClick = (client: Client) => {
    // Ensure billingRecords is always an array
    const clientWithSafeBillingRecords = {
      ...client,
      billingRecords: client.billingRecords || [],
    };
    setSelectedClient(clientWithSafeBillingRecords);
    setShowViewModal(true);
  };

  const handleDeleteClick = (client: Client) => {
    // Ensure billingRecords is always an array
    const clientWithSafeBillingRecords = {
      ...client,
      billingRecords: client.billingRecords || [],
    };
    setSelectedClient(clientWithSafeBillingRecords);
    setShowDeleteConfirm(true);
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;
    try {
      await apiClient.deleteClient(selectedClient.id);
      setShowDeleteConfirm(false);
      setSelectedClient(null);
      fetchClients();
    } catch (error) {
      console.error("Error deleting client:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          isActive
            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
        }`}
      >
        {isActive ? "Active" : "Inactive"}
      </span>
    );
  };

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.phone && client.phone.includes(searchTerm));
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && client.isActive) ||
      (statusFilter === "inactive" && !client.isActive);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Clients Management
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage and track all client relationships
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Client
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
                  placeholder="Search clients by name, email, or phone..."
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
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="all">All Clients</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse"
              >
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
                </div>
              </div>
            ))
          ) : filteredClients.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No clients found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by adding your first client"}
              </p>
            </div>
          ) : (
            filteredClients.map((client) => (
              <div
                key={client.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
              >
                {/* Client Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-lg">
                        {client.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {client.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {client.email}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(client.isActive)}
                </div>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  {client.phone && (
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <Phone className="w-4 h-4 mr-2" />
                      {client.phone}
                    </div>
                  )}
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4 mr-2" />
                    Client since {formatDate(client.createdAt)}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {(client.cases ?? []).length}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center">
                      <Briefcase className="w-3 h-3 mr-1" />
                      Cases
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {(client.documents ?? []).length}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center">
                      <FileText className="w-3 h-3 mr-1" />
                      Documents
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {(client.billingRecords ?? []).length}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center">
                      <DollarSign className="w-3 h-3 mr-1" />
                      Bills
                    </div>
                  </div>
                </div>

                {/* Recent Cases */}
                {(client.cases ?? []).length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Recent Cases
                    </h4>
                    <div className="space-y-1">
                      {(client.cases ?? []).slice(0, 2).map((caseItem) => (
                        <div
                          key={caseItem.id}
                          className="text-xs text-gray-600 dark:text-gray-400 flex items-center justify-between"
                        >
                          <span className="truncate">
                            {caseItem.caseNumber}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs ${
                              caseItem.status === "OPEN"
                                ? "bg-blue-100 text-blue-800"
                                : caseItem.status === "IN_PROGRESS"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : caseItem.status === "CLOSED"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {caseItem.status.replace("_", " ")}
                          </span>
                        </div>
                      ))}
                      {(client.cases ?? []).length > 2 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          +{(client.cases ?? []).length - 2} more cases
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewClick(client)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditClick(client)}
                      className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(client)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <button className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Client Modal */}
      <ModalDialog
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        header="Add New Client"
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
              form="create-client-form"
              className="btn-primary"
            >
              Create Client
            </button>
          </div>
        }
        maxWidth="md"
        closeOnEscape={true}
        closeOnOverlayClick={true}
      >
        <form
          id="create-client-form"
          onSubmit={handleCreateClient}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={createFormData.name}
              onChange={(e) =>
                setCreateFormData({
                  ...createFormData,
                  name: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Enter full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              value={createFormData.email}
              onChange={(e) =>
                setCreateFormData({
                  ...createFormData,
                  email: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Enter email address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={createFormData.phone}
              onChange={(e) =>
                setCreateFormData({
                  ...createFormData,
                  phone: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Enter phone number"
            />
          </div>
        </form>
      </ModalDialog>

      {/* Edit Client Modal */}
      <ModalDialog
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        header="Edit Client"
        footer={
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-client-form"
              className="btn-primary"
            >
              Save Changes
            </button>
          </div>
        }
        maxWidth="md"
        closeOnEscape={true}
        closeOnOverlayClick={true}
      >
        <form
          id="edit-client-form"
          onSubmit={handleEditClient}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={editFormData.name}
              onChange={(e) =>
                setEditFormData({ ...editFormData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              value={editFormData.email}
              onChange={(e) =>
                setEditFormData({ ...editFormData, email: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={editFormData.phone}
              onChange={(e) =>
                setEditFormData({ ...editFormData, phone: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={editFormData.isActive}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    isActive: e.target.checked,
                  })
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Active Client
              </span>
            </label>
          </div>
        </form>
      </ModalDialog>

      {/* View Client Details Modal */}
      <ModalDialog
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        header="Client Details"
        footer={
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowViewModal(false)}
              className="btn-secondary"
            >
              Close
            </button>
            <button
              onClick={() => {
                setShowViewModal(false);
                if (selectedClient) {
                  handleEditClick(selectedClient);
                }
              }}
              className="btn-primary"
            >
              Edit Client
            </button>
          </div>
        }
        maxWidth="2xl"
        closeOnEscape={true}
        closeOnOverlayClick={true}
      >
        <div className="space-y-6">
          {/* Client Info */}
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white font-medium text-xl">
                {selectedClient?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedClient?.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {selectedClient?.email}
              </p>
              {selectedClient?.phone && (
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedClient.phone}
                </p>
              )}
              {getStatusBadge(selectedClient?.isActive || false)}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {(selectedClient?.cases ?? []).length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Cases
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {(selectedClient?.documents ?? []).length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Documents
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {(selectedClient?.billingRecords ?? []).length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Bills
              </div>
            </div>
          </div>

          {/* Recent Cases */}
          {(selectedClient?.cases ?? []).length > 0 && (
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Recent Cases
              </h4>
              <div className="space-y-2">
                {(selectedClient?.cases ?? []).slice(0, 5).map((caseItem) => (
                  <div
                    key={caseItem.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {caseItem.caseNumber}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {caseItem.title}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        caseItem.status === "OPEN"
                          ? "bg-blue-100 text-blue-800"
                          : caseItem.status === "IN_PROGRESS"
                            ? "bg-yellow-100 text-yellow-800"
                            : caseItem.status === "CLOSED"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {caseItem.status.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ModalDialog>

      {/* Delete Confirmation Modal */}
      <ModalDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        header="Delete Client"
        footer={
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button onClick={handleDeleteClient} className="btn-danger">
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
            Are you sure you want to delete the client{" "}
            <span className="font-bold">{selectedClient?.name}</span>? This
            action cannot be undone.
          </p>
        </div>
      </ModalDialog>
    </div>
  );
}
