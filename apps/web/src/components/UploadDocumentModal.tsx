"use client";

import ModalDialog from "@/components/ui/ModalDialog";
import CustomSelect from "@/components/ui/select";
import { apiClient } from "@/services/api";
import { Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface Case {
  id: string;
  caseNumber: string;
  title: string;
}

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function UploadDocumentModal({
  isOpen,
  onClose,
  onSuccess,
}: UploadDocumentModalProps) {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "LEGAL_DOCUMENT",
    caseId: "",
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || selectedFiles.length === 0) {
      toast.error("Please provide a title and select at least one file");
      return;
    }

    try {
      setLoading(true);

      // Create FormData for file upload
      const uploadData = new FormData();
      uploadData.append("title", formData.title);
      uploadData.append("description", formData.description);
      uploadData.append("category", formData.category);
      if (formData.caseId) {
        uploadData.append("caseId", formData.caseId);
      }

      selectedFiles.forEach((file) => {
        uploadData.append("files", file);
      });

      await apiClient.uploadDocument(uploadData);

      toast.success("Documents uploaded successfully!");

      // Reset form
      setFormData({
        title: "",
        description: "",
        category: "LEGAL_DOCUMENT",
        caseId: "",
      });
      setSelectedFiles([]);

      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error uploading documents:", error);
      toast.error("Failed to upload documents. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      header="Upload Documents"
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
            form="upload-document-form"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? "Uploading..." : "Upload Documents"}
          </button>
        </div>
      }
      maxWidth="2xl"
      closeOnEscape={true}
      closeOnOverlayClick={true}
    >
      <form
        id="upload-document-form"
        onSubmit={handleUpload}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1">
              Document Title *
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
              placeholder="Enter document title"
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
              placeholder="Enter document description"
            />
          </div>
          <div>
            <CustomSelect
              label="Category"
              options={[
                { value: "LEGAL_DOCUMENT", label: "Legal Document" },
                { value: "CONTRACT", label: "Contract" },
                { value: "EVIDENCE", label: "Evidence" },
                { value: "CORRESPONDENCE", label: "Correspondence" },
                { value: "COURT_FILING", label: "Court Filing" },
                { value: "OTHER", label: "Other" },
              ]}
              value={{
                value: formData.category,
                label: formData.category,
              }}
              onChange={(option) =>
                setFormData({
                  ...formData,
                  category: option?.value || "LEGAL_DOCUMENT",
                })
              }
              placeholder="Select category"
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
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Select Files *
          </label>
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer text-blue-600 hover:text-blue-500 font-medium"
            >
              Click to select files
            </label>
            <p className="text-sm text-muted-foreground mt-2">
              PDF, DOC, DOCX, TXT, JPG, JPEG, PNG files accepted
            </p>
          </div>
        </div>

        {selectedFiles.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Selected Files ({selectedFiles.length})
            </label>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="p-1 text-muted-foreground hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </form>
    </ModalDialog>
  );
}
