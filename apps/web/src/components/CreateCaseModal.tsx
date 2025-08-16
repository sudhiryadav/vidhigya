"use client";

import ModalDialog from "@/components/ui/ModalDialog";
import CustomSelect from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface Client {
  id: string;
  name: string;
  email: string;
}

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateCaseModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateCaseModalProps) {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "CIVIL",
    priority: "MEDIUM",
    clientId: "",
    courtId: "",
    filingDate: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchClients();
    }
  }, [isOpen]);

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

    if (
      !formData.title ||
      !formData.description ||
      !formData.clientId ||
      !formData.category ||
      !formData.priority
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);

      const caseData = {
        caseNumber: `CASE-${Date.now()}`, // Generate a temporary case number
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        clientId: formData.clientId,
        courtId: formData.courtId || undefined,
        filingDate: formData.filingDate || undefined,
        assignedLawyerId: user?.id || "", // Get the current user's ID
      };

      await apiClient.createCase(caseData);

      toast.success("Case created successfully!");

      // Reset form
      setFormData({
        title: "",
        description: "",
        category: "CIVIL",
        priority: "MEDIUM",
        clientId: "",
        courtId: "",
        filingDate: "",
      });

      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error creating case:", error);
      toast.error("Failed to create case. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      header="Create New Case"
      footer={
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-case-form"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Case"}
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
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1">
              Case Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  title: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
              placeholder="Enter case title"
            />
          </div>
          <div className="md:col-span-2">
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
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
              placeholder="Enter case description"
            />
          </div>
          <div>
            <CustomSelect
              label="Client *"
              required
              options={[
                { value: "", label: "Select a client" },
                ...clients.map((client) => ({
                  value: client.id,
                  label: `${client.name} (${client.email})`,
                })),
              ]}
              value={
                formData.clientId
                  ? {
                      value: formData.clientId,
                      label: clients.find((c) => c.id === formData.clientId)
                        ? `${clients.find((c) => c.id === formData.clientId)?.name} (${clients.find((c) => c.id === formData.clientId)?.email})`
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
              label="Category *"
              required
              options={[
                { value: "CIVIL", label: "Civil" },
                { value: "CRIMINAL", label: "Criminal" },
                { value: "FAMILY", label: "Family" },
                { value: "CORPORATE", label: "Corporate" },
                { value: "PROPERTY", label: "Property" },
                { value: "LABOR", label: "Labor" },
                { value: "OTHER", label: "Other" },
              ]}
              value={{
                value: formData.category,
                label: formData.category,
              }}
              onChange={(option) =>
                setFormData({
                  ...formData,
                  category: option?.value || "CIVIL",
                })
              }
              placeholder="Select category"
            />
          </div>
          <div>
            <CustomSelect
              label="Priority *"
              required
              options={[
                { value: "LOW", label: "Low" },
                { value: "MEDIUM", label: "Medium" },
                { value: "HIGH", label: "High" },
                { value: "URGENT", label: "Urgent" },
              ]}
              value={{
                value: formData.priority,
                label: formData.priority,
              }}
              onChange={(option) =>
                setFormData({
                  ...formData,
                  priority: option?.value || "MEDIUM",
                })
              }
              placeholder="Select priority"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Filing Date
            </label>
            <input
              type="date"
              value={formData.filingDate}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  filingDate: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
            />
          </div>
        </div>
      </form>
    </ModalDialog>
  );
}
