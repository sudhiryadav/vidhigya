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

interface ScheduleEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ScheduleEventModal({
  isOpen,
  onClose,
  onSuccess,
}: ScheduleEventModalProps) {
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    eventType: "HEARING",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    caseId: "",
    clientId: "",
    location: "",
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

  const handleScheduleEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.startDate || !formData.startTime) {
      toast.error("Please provide at least title, start date, and start time");
      return;
    }

    try {
      setLoading(true);

      const eventData = {
        title: formData.title,
        description: formData.description || undefined,
        eventType: formData.eventType,
        startDate: `${formData.startDate}T${formData.startTime}`,
        endDate:
          formData.endDate && formData.endTime
            ? `${formData.endDate}T${formData.endTime}`
            : undefined,
        caseId: formData.caseId || undefined,
        clientId: formData.clientId || undefined,
        location: formData.location || undefined,
        notes: formData.notes || undefined,
      };

      await apiClient.createEvent(eventData);

      toast.success("Event scheduled successfully!");

      // Reset form
      setFormData({
        title: "",
        description: "",
        eventType: "HEARING",
        startDate: "",
        startTime: "",
        endDate: "",
        endTime: "",
        caseId: "",
        clientId: "",
        location: "",
        notes: "",
      });

      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error scheduling event:", error);
      toast.error("Failed to schedule event. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      header="Schedule Event"
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
            form="schedule-event-form"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? "Scheduling..." : "Schedule Event"}
          </button>
        </div>
      }
      maxWidth="2xl"
      closeOnEscape={true}
      closeOnOverlayClick={true}
    >
      <form
        id="schedule-event-form"
        onSubmit={handleScheduleEvent}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1">
              Event Title *
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
              placeholder="Enter event title"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                })
              }
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
              placeholder="Enter event description"
            />
          </div>
          <div>
            <CustomSelect
              label="Event Type"
              options={[
                { value: "HEARING", label: "Court Hearing" },
                { value: "MEETING", label: "Client Meeting" },
                { value: "DEADLINE", label: "Deadline" },
                { value: "CONSULTATION", label: "Consultation" },
                { value: "FILING", label: "Court Filing" },
                { value: "OTHER", label: "Other" },
              ]}
              value={{
                value: formData.eventType,
                label: formData.eventType,
              }}
              onChange={(option) =>
                setFormData({
                  ...formData,
                  eventType: option?.value || "HEARING",
                })
              }
              placeholder="Select event type"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  location: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
              placeholder="Enter location"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Start Date *
            </label>
            <input
              type="date"
              required
              value={formData.startDate}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  startDate: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Start Time *
            </label>
            <input
              type="time"
              required
              value={formData.startTime}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  startTime: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              End Date
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  endDate: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              End Time
            </label>
            <input
              type="time"
              value={formData.endTime}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  endTime: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
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
