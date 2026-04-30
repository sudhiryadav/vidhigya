"use client";

import { useState, useEffect } from "react";
import ModalDialog from "@/components/ui/ModalDialog";
import CustomSelect from "@/components/ui/select";
import { apiClient } from "@/services/api";
import toast from "react-hot-toast";

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

const BILL_TYPE_OPTIONS = [
  { value: "CONSULTATION", label: "Consultation" },
  { value: "COURT_FILING", label: "Court Filing" },
  {
    value: "DOCUMENT_PREPARATION",
    label: "Document Preparation",
  },
  { value: "REPRESENTATION", label: "Representation" },
  { value: "OTHER", label: "Other" },
] as const;

interface CreateBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userCurrency?: string;
}

export default function CreateBillModal({
  isOpen,
  onClose,
  onSuccess,
  userCurrency = "USD",
}: CreateBillModalProps) {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<"amount" | "dueDate" | "clientId" | "description", string>>
  >({});
  const [formData, setFormData] = useState({
    amount: "",
    billType: "CONSULTATION",
    dueDate: "",
    clientId: "",
    caseId: "",
    description: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchCases();
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

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors: Partial<
      Record<"amount" | "dueDate" | "clientId" | "description", string>
    > = {};
    if (!formData.amount.trim()) nextErrors.amount = "Amount is required";
    if (formData.amount.trim() && Number(formData.amount) <= 0) {
      nextErrors.amount = "Amount must be greater than 0";
    }
    if (!formData.dueDate.trim()) nextErrors.dueDate = "Due date is required";
    if (!formData.clientId.trim()) nextErrors.clientId = "Client is required";
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
      
      const billData = {
        amount: parseFloat(formData.amount),
        billType: formData.billType,
        dueDate: formData.dueDate,
        clientId: formData.clientId,
        caseId: formData.caseId || undefined,
        description: formData.description,
      };

      await apiClient.createBill(billData);
      
      toast.success("Bill created successfully!");
      
      // Reset form
      setFormData({
        amount: "",
        billType: "CONSULTATION",
        dueDate: "",
        clientId: "",
        caseId: "",
        description: "",
      });
      
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error creating bill:", error);
      toast.error("Failed to create bill. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = {
      USD: "$",
      EUR: "€",
      GBP: "£",
      INR: "₹",
    };
    return symbols[currency] || currency;
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      header="Create New Bill"
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
            form="create-bill-form"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Bill"}
          </button>
        </div>
      }
      maxWidth="2xl"
      closeOnEscape={true}
      closeOnOverlayClick={true}
    >
      <form
        id="create-bill-form"
        onSubmit={handleCreateBill}
        className="space-y-5"
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
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    amount: e.target.value,
                  });
                  if (errors.amount && e.target.value.trim()) {
                    setErrors((prev) => ({ ...prev, amount: undefined }));
                  }
                }}
                className={`w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground ${
                  errors.amount ? "border-red-500" : "border-border"
                }`}
                placeholder="0.00"
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
            )}
          </div>
          <div>
            <CustomSelect
              label="Bill type"
              required
              options={[...BILL_TYPE_OPTIONS]}
              value={{
                value: formData.billType,
                label:
                  BILL_TYPE_OPTIONS.find((o) => o.value === formData.billType)
                    ?.label ?? formData.billType,
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
              onChange={(e) => {
                setFormData({
                  ...formData,
                  dueDate: e.target.value,
                });
                if (errors.dueDate && e.target.value.trim()) {
                  setErrors((prev) => ({ ...prev, dueDate: undefined }));
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground min-h-[42px] ${
                errors.dueDate ? "border-red-500" : "border-border"
              }`}
            />
            {errors.dueDate && (
              <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>
            )}
          </div>
          <div>
            <CustomSelect
              label="Client"
              required
              error={errors.clientId}
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
              onChange={(option) => {
                setFormData({
                  ...formData,
                  clientId: option?.value || "",
                });
                if (errors.clientId && option?.value) {
                  setErrors((prev) => ({ ...prev, clientId: undefined }));
                }
              }}
              placeholder="Select a client"
            />
          </div>
          <div className="md:col-span-2">
            <CustomSelect
              label="Related case"
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
            onChange={(e) => {
              setFormData({
                ...formData,
                description: e.target.value,
              });
              if (errors.description && e.target.value.trim()) {
                setErrors((prev) => ({ ...prev, description: undefined }));
              }
            }}
            rows={4}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground ${
              errors.description ? "border-red-500" : "border-border"
            }`}
            placeholder="Enter bill description"
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
        </div>
      </form>
    </ModalDialog>
  );
}
