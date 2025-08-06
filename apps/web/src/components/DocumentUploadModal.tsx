"use client";

import DocumentUpload from "@/components/DocumentUpload";
import ModalDialog from "@/components/ui/ModalDialog";
import CustomSelect from "@/components/ui/select";
import {
  FormFieldWrapper,
  ValidatedInput,
} from "@/components/ui/ValidationMessage";
import { documentUploadSchema } from "@/lib/validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useState } from "react";
import { Resolver, useForm } from "react-hook-form";
import toast from "react-hot-toast";

interface Case {
  id: string;
  caseNumber: string;
  title: string;
}

interface UploadFormData {
  title: string;
  description: string;
  category: string;
  status: string;
  caseId: string;
}

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void;
  apiClient: any; // You can make this more specific based on your API client type
}

export default function DocumentUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  apiClient,
}: DocumentUploadModalProps) {
  const [cases, setCases] = useState<Case[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const resolver = yupResolver(documentUploadSchema) as unknown as Resolver<
    UploadFormData,
    any
  >;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<UploadFormData>({
    resolver,
    defaultValues: {
      title: "",
      description: "",
      category: "PETITION",
      status: "DRAFT",
      caseId: "",
    },
    mode: "onSubmit",
  });

  useEffect(() => {
    if (isOpen) {
      fetchCases();
    }
  }, [isOpen]);

  const fetchCases = async () => {
    try {
      const data = await apiClient.getCases();
      setCases(data as Case[]);
    } catch (error) {
      console.error("Error fetching cases:", error);
    }
  };

  const handleUploadDocument = async (
    files: File[],
    formData: UploadFormData
  ) => {
    if (files.length === 0) return;

    try {
      setUploading(true);

      // Upload each file
      for (const file of files) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", file);
        uploadFormData.append("title", formData.title);
        uploadFormData.append("description", formData.description);
        uploadFormData.append("category", formData.category);
        uploadFormData.append("status", formData.status);
        if (formData.caseId) {
          uploadFormData.append("caseId", formData.caseId);
        }

        await apiClient.uploadDocument(uploadFormData);
      }

      onClose();
      reset();
      setSelectedFiles([]);
      onUploadSuccess?.();
      toast.success(`${files.length} document(s) uploaded successfully`);
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document(s)");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: UploadFormData) => {
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one file to upload");
      return;
    }

    await handleUploadDocument(selectedFiles, data);
  };

  const handleClose = () => {
    setSelectedFiles([]);
    reset();
    onClose();
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={handleClose}
      header={
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Upload Document
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Fill in the details and select files to upload
          </p>
        </div>
      }
      footer={
        <div className="flex justify-end space-x-3">
          <button type="button" onClick={handleClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            form="upload-form"
            disabled={uploading || selectedFiles.length === 0}
            className="btn-primary"
          >
            {uploading ? "Uploading..." : "Save Documents"}
          </button>
        </div>
      }
      maxWidth="2xl"
      closeOnEscape={true}
      closeOnOverlayClick={true}
    >
      <form
        id="upload-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-3"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ValidatedInput
            label="Document Title"
            required
            error={errors.title}
            register={register}
            name="title"
            placeholder="Enter document title"
          />
          <FormFieldWrapper label="Category" required error={errors.category}>
            <CustomSelect
              value={{
                value: watch("category"),
                label:
                  watch("category") === "PETITION"
                    ? "Petition"
                    : watch("category") === "EVIDENCE"
                      ? "Evidence"
                      : watch("category") === "CONTRACT"
                        ? "Contract"
                        : watch("category") === "AGREEMENT"
                          ? "Agreement"
                          : "Report",
              }}
              onChange={(option) =>
                setValue("category", option?.value || "PETITION")
              }
              options={[
                { value: "PETITION", label: "Petition" },
                { value: "EVIDENCE", label: "Evidence" },
                { value: "CONTRACT", label: "Contract" },
                { value: "AGREEMENT", label: "Agreement" },
                { value: "REPORT", label: "Report" },
              ]}
              placeholder="Select category"
              className={errors.category ? "border-red-500" : ""}
            />
          </FormFieldWrapper>
          <FormFieldWrapper label="Status" required error={errors.status}>
            <CustomSelect
              value={{
                value: watch("status"),
                label:
                  watch("status") === "DRAFT"
                    ? "Draft"
                    : watch("status") === "FILED"
                      ? "Filed"
                      : watch("status") === "APPROVED"
                        ? "Approved"
                        : watch("status") === "REJECTED"
                          ? "Rejected"
                          : "Archived",
              }}
              onChange={(option) =>
                setValue("status", option?.value || "DRAFT")
              }
              options={[
                { value: "DRAFT", label: "Draft" },
                { value: "FILED", label: "Filed" },
                { value: "APPROVED", label: "Approved" },
                { value: "REJECTED", label: "Rejected" },
                { value: "ARCHIVED", label: "Archived" },
              ]}
              placeholder="Select status"
              className={errors.status ? "border-red-500" : ""}
            />
          </FormFieldWrapper>
          <FormFieldWrapper label="Related Case" required error={errors.caseId}>
            <CustomSelect
              value={
                watch("caseId")
                  ? {
                      value: watch("caseId"),
                      label: cases.find((c) => c.id === watch("caseId"))
                        ? `${cases.find((c) => c.id === watch("caseId"))?.caseNumber} - ${cases.find((c) => c.id === watch("caseId"))?.title}`
                        : "Select case",
                    }
                  : { value: "", label: "Select case" }
              }
              onChange={(option) => setValue("caseId", option?.value || "")}
              options={[
                { value: "", label: "Select case" },
                ...cases.map((caseItem) => ({
                  value: caseItem.id,
                  label: `${caseItem.caseNumber} - ${caseItem.title}`,
                })),
              ]}
              placeholder="Select case"
              className={errors.caseId ? "border-red-500" : ""}
            />
          </FormFieldWrapper>
        </div>

        <ValidatedInput
          label="Description"
          required
          error={errors.description}
          register={register}
          name="description"
          type="textarea"
          rows={4}
          placeholder="Enter document description"
        />

        {/* Drag and Drop Upload Area */}
        <DocumentUpload
          onUpload={(files) => handleUploadDocument(files, watch())}
          onFilesSelected={setSelectedFiles}
          maxFiles={5}
          maxSize={10 * 1024 * 1024} // 10MB
          disabled={uploading}
          showPreview={false}
          autoUpload={false}
        />
      </form>
    </ModalDialog>
  );
}
