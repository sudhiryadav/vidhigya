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
    
    if (!formData.amount || !formData.billType || !formData.dueDate || !formData.clientId || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

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
  );
}
