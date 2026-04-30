"use client";

import ModalDialog from "@/components/ui/ModalDialog";
import CustomSelect from "@/components/ui/select";
import { apiClient } from "@/services/api";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface Case {
  id: string;
  caseNumber: string;
  title: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateTaskModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateTaskModalProps) {
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<"title" | "description", string>>
  >({});
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    status: "PENDING",
    dueDate: "",
    caseId: "",
    clientId: "",
    assignedTo: "",
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchCases();
      fetchClients();
    }
  }, [isOpen]);

  const fetchCases = async () => {
    try {
      const response = await apiClient.getCases();
      if (response && Array.isArray(response)) {
        setCases(response);
      }
    } catch (error) {
      console.error("Error fetching cases:", error);
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

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors: Partial<Record<"title" | "description", string>> = {};
    if (!formData.title.trim()) nextErrors.title = "Task title is required";
    if (!formData.description.trim()) {
      nextErrors.description = "Description is required";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    try {
      setLoading(true);

      const taskData = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: formData.status,
        dueDate: formData.dueDate || undefined,
        caseId: formData.caseId || undefined,
        clientId: formData.clientId || undefined,
        assignedTo: formData.assignedTo || undefined,
        notes: formData.notes || undefined,
      };

      await apiClient.createTask(taskData);

      toast.success("Task created successfully!");

      // Reset form
      setFormData({
        title: "",
        description: "",
        priority: "MEDIUM",
        status: "PENDING",
        dueDate: "",
        caseId: "",
        clientId: "",
        assignedTo: "",
        notes: "",
      });

      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error("Failed to create task. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      header="Create New Task"
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
            form="create-task-form"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Task"}
          </button>
        </div>
      }
      maxWidth="2xl"
      closeOnEscape={true}
      closeOnOverlayClick={true}
    >
      <form
        id="create-task-form"
        onSubmit={handleCreateTask}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  title: e.target.value,
                });
                if (errors.title && e.target.value.trim()) {
                  setErrors((prev) => ({ ...prev, title: undefined }));
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground ${
                errors.title ? "border-red-500" : "border-border"
              }`}
              placeholder="Enter task title"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1">
              Description *
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  description: e.target.value,
                });
                if (errors.description && e.target.value.trim()) {
                  setErrors((prev) => ({ ...prev, description: undefined }));
                }
              }}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground ${
                errors.description ? "border-red-500" : "border-border"
              }`}
              placeholder="Enter task description"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>
          <div>
            <CustomSelect
              label="Priority"
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
            <CustomSelect
              label="Status"
              options={[
                { value: "PENDING", label: "Pending" },
                { value: "IN_PROGRESS", label: "In Progress" },
                { value: "COMPLETED", label: "Completed" },
                { value: "CANCELLED", label: "Cancelled" },
              ]}
              value={{
                value: formData.status,
                label: formData.status,
              }}
              onChange={(option) =>
                setFormData({
                  ...formData,
                  status: option?.value || "PENDING",
                })
              }
              placeholder="Select status"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Due Date
            </label>
            <input
              type="date"
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
            <label className="block text-sm font-medium text-foreground mb-1">
              Assigned To
            </label>
            <input
              type="text"
              value={formData.assignedTo}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  assignedTo: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
              placeholder="Enter assignee name"
            />
          </div>
          <div>
            <CustomSelect
              label="Related Case (Optional)"
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
          <div>
            <CustomSelect
              label="Client (Optional)"
              options={[
                { value: "", label: "Select client (optional)" },
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
                        : "Select client (optional)",
                    }
                  : { value: "", label: "Select client (optional)" }
              }
              onChange={(option) =>
                setFormData({
                  ...formData,
                  clientId: option?.value || "",
                })
              }
              placeholder="Select client (optional)"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  notes: e.target.value,
                })
              }
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
              placeholder="Enter any additional notes"
            />
          </div>
        </div>
      </form>
    </ModalDialog>
  );
}
