"use client";

import ModalDialog from "@/components/ui/ModalDialog";
import { usePractice } from "@/contexts/PracticeContext";
import { apiClient } from "@/services/api";
import { useState } from "react";
import toast from "react-hot-toast";

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddClientModal({
  isOpen,
  onClose,
  onSuccess,
}: AddClientModalProps) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[+]?[0-9\s\-()]{7,20}$/;
  const { currentPractice } = usePractice();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<"name" | "email" | "phone", string>>
  >({});
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    company: "",
    notes: "",
  });

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors: Partial<Record<"name" | "email" | "phone", string>> = {};
    if (!formData.name.trim()) nextErrors.name = "Full name is required";
    if (!formData.email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email.trim())) {
      nextErrors.email = "Please enter a valid email address";
    }
    if (formData.phone.trim() && !phoneRegex.test(formData.phone.trim())) {
      nextErrors.phone = "Please enter a valid phone number";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    if (!currentPractice) {
      toast.error("No practice selected");
      return;
    }

    try {
      setLoading(true);

      const clientData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
      };

      await apiClient.createClient(currentPractice.id, clientData);

      toast.success("Client added successfully!");

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        company: "",
        notes: "",
      });

      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error adding client:", error);
      toast.error("Failed to add client. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      header="Add New Client"
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
            form="add-client-form"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? "Adding..." : "Add Client"}
          </button>
        </div>
      }
      maxWidth="2xl"
      closeOnEscape={true}
      closeOnOverlayClick={true}
    >
      <form
        id="add-client-form"
        onSubmit={handleAddClient}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                {
                  setFormData({
                    ...formData,
                    name: e.target.value,
                  });
                  if (errors.name && e.target.value.trim()) {
                    setErrors((prev) => ({ ...prev, name: undefined }));
                  }
                }
              }
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground ${
                errors.name ? "border-red-500" : "border-border"
              }`}
              placeholder="Enter full name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                {
                  setFormData({
                    ...formData,
                    email: e.target.value,
                  });
                  if (errors.email && e.target.value.trim()) {
                    setErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }
              }
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground ${
                errors.email ? "border-red-500" : "border-border"
              }`}
              placeholder="Enter email address"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  phone: e.target.value,
                });
                if (errors.phone && !e.target.value.trim()) {
                  setErrors((prev) => ({ ...prev, phone: undefined }));
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground ${
                errors.phone ? "border-red-500" : "border-border"
              }`}
              placeholder="Enter phone number"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Company
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  company: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
              placeholder="Enter company name"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1">
              Address
            </label>
            <textarea
              value={formData.address}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  address: e.target.value,
                })
              }
              rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
              placeholder="Enter address"
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
