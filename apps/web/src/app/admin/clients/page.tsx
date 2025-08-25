"use client";

import { useAuth } from "@/contexts/AuthContext";
import { usePractice } from "@/contexts/PracticeContext";
import { apiClient } from "@/services/api";
import {
  Building2,
  Mail,
  Phone,
  Plus,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ClientModal } from "@/components/ClientModal";

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  practiceId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminClients() {
  const { user } = useAuth();
  const { currentPractice } = usePractice();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch real clients from the backend API
      const response = await apiClient.getClients();
      if (response && Array.isArray(response)) {
        setClients(response);
      } else {
        setClients([]);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
      setError("Failed to load clients. Please try again later.");
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearch = () => {
    // Search is handled by filtering the existing clients
  };

  const handleAddClient = () => {
    setSelectedClient(null);
    setShowModal(true);
  };

  const handleEditClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    setSelectedClient(client || null);
    setShowModal(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (confirm("Are you sure you want to delete this client? This action cannot be undone.")) {
      try {
        await apiClient.deleteClient(clientId);
        // Refresh the clients list
        fetchClients();
      } catch (error) {
        console.error("Error deleting client:", error);
        alert("Failed to delete client. Please try again.");
      }
    }
  };

  const handleModalSuccess = () => {
    fetchClients();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner w-12 h-12"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Client Management
              </h1>
              <p className="text-muted-foreground mt-2">
                Manage all clients across the system
              </p>
            </div>
            <button
              onClick={handleAddClient}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Client
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-card rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search clients by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-input rounded-md text-sm font-medium text-foreground bg-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
            >
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <select className="px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring">
                <option value="">All Practices</option>
                <option value="practice-1">Practice 1</option>
                <option value="practice-2">Practice 2</option>
              </select>
              <select className="px-3 py-2 border border-input rounded-md text-sm bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Apply Filters
              </button>
            </div>
          )}
        </div>

        {/* Clients List */}
        <div className="bg-card rounded-lg shadow overflow-hidden">
          {filteredClients.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">
                No clients found
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchTerm
                  ? "Try adjusting your search criteria."
                  : "Get started by adding a new client."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Practice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-muted/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {client.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ID: {client.id}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center text-sm text-foreground">
                            <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                            {client.email}
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                            {client.phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                          {client.practiceId}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            client.isActive
                              ? "bg-green-500/10 text-green-600 border border-green-500/20"
                              : "bg-red-500/10 text-red-600 border border-red-500/20"
                          }`}
                        >
                          {client.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditClient(client.id)}
                            className="text-primary hover:text-primary/80"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id)}
                            className="text-destructive hover:text-destructive/80"
                          >
                            Delete
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

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg shadow p-4">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-primary mr-3" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Clients
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {clients.length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg shadow p-4">
            <div className="flex items-center">
              <Building2 className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Clients
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {clients.filter((c) => c.isActive).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg shadow p-4">
            <div className="flex items-center">
              <Plus className="w-8 h-8 text-purple-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  This Month
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {
                    clients.filter((c) => {
                      const created = new Date(c.createdAt);
                      const now = new Date();
                      return (
                        created.getMonth() === now.getMonth() &&
                        created.getFullYear() === now.getFullYear()
                      );
                    }).length
                  }
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-lg shadow p-4">
            <div className="flex items-center">
              <Search className="w-8 h-8 text-orange-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Search Results
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {filteredClients.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Client Modal */}
      {currentPractice && (
        <ClientModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          client={selectedClient}
          practiceId={currentPractice.id}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}
