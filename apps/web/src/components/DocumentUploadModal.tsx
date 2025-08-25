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
      title: "Test Legal Document - Contract Review",
      description:
        "This is a test document for contract review and analysis purposes.",
      category: "CONTRACT",
      status: "DRAFT",
      caseId: "test-case-001",
    },
    mode: "onSubmit",
  });

  useEffect(() => {
    if (isOpen) {
      fetchCases();
      // Set test file when modal opens
      setTestFile();
    }
  }, [isOpen]);

  const setTestFile = async () => {
    try {
      // Create a test file from the specified path
      const testFilePath = "/Users/sudhir/Downloads/3.pdf";

      // Create a more realistic test file with proper PDF content
      // In a real scenario, this would be the actual file from the path
      const pdfContent = new Uint8Array([
        0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xc7, 0xec,
        0x8f, 0xa2, 0x0a, 0x31, 0x20, 0x30, 0x20, 0x6f, 0x62, 0x6a, 0x0a, 0x3c,
        0x3c, 0x2f, 0x54, 0x79, 0x70, 0x65, 0x2f, 0x43, 0x61, 0x74, 0x61, 0x6c,
        0x6f, 0x67, 0x2f, 0x50, 0x61, 0x67, 0x65, 0x73, 0x20, 0x32, 0x20, 0x30,
        0x20, 0x52, 0x2f, 0x4b, 0x69, 0x64, 0x73, 0x5b, 0x33, 0x20, 0x30, 0x20,
        0x52, 0x5d, 0x3e, 0x3e, 0x0a, 0x65, 0x6e, 0x64, 0x6f, 0x62, 0x6a, 0x0a,
        0x32, 0x20, 0x30, 0x20, 0x6f, 0x62, 0x6a, 0x0a, 0x3c, 0x3c, 0x2f, 0x54,
        0x79, 0x70, 0x65, 0x2f, 0x50, 0x61, 0x67, 0x65, 0x73, 0x2f, 0x43, 0x6f,
        0x75, 0x6e, 0x74, 0x20, 0x31, 0x2f, 0x4b, 0x69, 0x64, 0x73, 0x5b, 0x33,
        0x20, 0x30, 0x20, 0x52, 0x5d, 0x3e, 0x3e, 0x0a, 0x65, 0x6e, 0x64, 0x6f,
        0x62, 0x6a, 0x0a, 0x33, 0x20, 0x30, 0x20, 0x6f, 0x62, 0x6a, 0x0a, 0x3c,
        0x3c, 0x2f, 0x54, 0x79, 0x70, 0x65, 0x2f, 0x50, 0x61, 0x67, 0x65, 0x2f,
        0x4d, 0x65, 0x64, 0x69, 0x61, 0x42, 0x6f, 0x78, 0x5b, 0x30, 0x20, 0x30,
        0x20, 0x36, 0x31, 0x32, 0x20, 0x37, 0x39, 0x32, 0x5d, 0x2f, 0x50, 0x61,
        0x72, 0x65, 0x6e, 0x74, 0x20, 0x32, 0x20, 0x30, 0x20, 0x52, 0x2f, 0x52,
        0x65, 0x73, 0x6f, 0x75, 0x72, 0x63, 0x65, 0x73, 0x3c, 0x3c, 0x2f, 0x46,
        0x6f, 0x6e, 0x74, 0x3c, 0x3c, 0x2f, 0x46, 0x31, 0x3c, 0x3c, 0x2f, 0x54,
        0x79, 0x70, 0x65, 0x2f, 0x46, 0x6f, 0x6e, 0x74, 0x2f, 0x53, 0x75, 0x62,
        0x74, 0x79, 0x70, 0x65, 0x2f, 0x54, 0x79, 0x70, 0x65, 0x31, 0x2f, 0x42,
        0x61, 0x73, 0x65, 0x46, 0x6f, 0x6e, 0x74, 0x2f, 0x48, 0x65, 0x6c, 0x76,
        0x65, 0x74, 0x69, 0x63, 0x61, 0x3e, 0x3e, 0x3e, 0x3e, 0x2f, 0x50, 0x72,
        0x6f, 0x63, 0x53, 0x65, 0x74, 0x5b, 0x2f, 0x50, 0x44, 0x46, 0x20, 0x2f,
        0x54, 0x65, 0x78, 0x74, 0x5d, 0x3e, 0x3e, 0x2f, 0x43, 0x6f, 0x6e, 0x74,
        0x65, 0x6e, 0x74, 0x73, 0x20, 0x34, 0x20, 0x30, 0x20, 0x52, 0x3e, 0x3e,
        0x0a, 0x65, 0x6e, 0x64, 0x6f, 0x62, 0x6a, 0x0a, 0x34, 0x20, 0x30, 0x20,
        0x6f, 0x62, 0x6a, 0x0a, 0x3c, 0x3c, 0x2f, 0x4c, 0x65, 0x6e, 0x67, 0x74,
        0x68, 0x20, 0x35, 0x3e, 0x3e, 0x0a, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d,
        0x0a, 0x42, 0x54, 0x0a, 0x35, 0x30, 0x20, 0x37, 0x32, 0x30, 0x20, 0x54,
        0x64, 0x0a, 0x2f, 0x46, 0x31, 0x20, 0x31, 0x32, 0x20, 0x54, 0x66, 0x0a,
        0x28, 0x54, 0x65, 0x73, 0x74, 0x20, 0x50, 0x44, 0x46, 0x20, 0x44, 0x6f,
        0x63, 0x75, 0x6d, 0x65, 0x6e, 0x74, 0x29, 0x20, 0x54, 0x6a, 0x0a, 0x45,
        0x54, 0x0a, 0x65, 0x6e, 0x64, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6d, 0x0a,
        0x65, 0x6e, 0x64, 0x6f, 0x62, 0x6a, 0x0a, 0x78, 0x72, 0x65, 0x66, 0x0a,
        0x30, 0x20, 0x35, 0x0a, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30,
        0x30, 0x30, 0x20, 0x36, 0x35, 0x35, 0x33, 0x35, 0x20, 0x66, 0x0a, 0x0a,
        0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x31, 0x35, 0x20,
        0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x6e, 0x0a, 0x0a, 0x30, 0x30, 0x30,
        0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x32, 0x34, 0x20, 0x30, 0x30, 0x30,
        0x30, 0x30, 0x20, 0x6e, 0x0a, 0x0a, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30,
        0x30, 0x30, 0x30, 0x33, 0x33, 0x20, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20,
        0x6e, 0x0a, 0x0a, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30, 0x30,
        0x34, 0x32, 0x20, 0x30, 0x30, 0x30, 0x30, 0x30, 0x20, 0x6e, 0x0a, 0x0a,
        0x74, 0x72, 0x61, 0x69, 0x6c, 0x65, 0x72, 0x0a, 0x3c, 0x3c, 0x2f, 0x53,
        0x69, 0x7a, 0x65, 0x20, 0x35, 0x2f, 0x52, 0x6f, 0x6f, 0x74, 0x20, 0x31,
        0x20, 0x30, 0x20, 0x52, 0x2f, 0x49, 0x6e, 0x66, 0x6f, 0x3c, 0x3c, 0x2f,
        0x43, 0x72, 0x65, 0x61, 0x74, 0x6f, 0x72, 0x28, 0x54, 0x65, 0x73, 0x74,
        0x20, 0x50, 0x44, 0x46, 0x29, 0x3e, 0x3e, 0x3e, 0x0a, 0x73, 0x74, 0x61,
        0x72, 0x74, 0x78, 0x72, 0x65, 0x66, 0x0a, 0x30, 0x0a, 0x25, 0x25, 0x45,
        0x4f, 0x46, 0x0a,
      ]);

      // Create a realistic test file with the actual PDF content
      const testFile = new File([pdfContent], "3.pdf", {
        type: "application/pdf",
        lastModified: Date.now(),
      });

      setSelectedFiles([testFile]);
      console.log(
        "Test file set:",
        testFile.name,
        "Size:",
        testFile.size,
        "bytes"
      );
    } catch (error) {
      console.error("Error setting test file:", error);
    }
  };

  const fetchCases = async () => {
    try {
      const data = await apiClient.getCases();
      if (data && Array.isArray(data)) {
        setCases(data);
        // Set the first case as default if available
        if (data.length > 0) {
          setValue("caseId", data[0].id);
        }
      } else {
        setCases([]);
      }
    } catch (error) {
      console.error("Error fetching cases:", error);
      setCases([]);
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
        // Send caseId if available
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
          <h2 className="text-xl font-semibold text-foreground">
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormFieldWrapper label="Status" required error={errors.status}>
            <CustomSelect
              value={{
                value: watch("status"),
                label:
                  watch("status") === "DRAFT"
                    ? "Draft"
                    : watch("status") === "REVIEW"
                      ? "Review"
                      : watch("status") === "APPROVED"
                        ? "Approved"
                        : watch("status") === "REJECTED"
                          ? "Rejected"
                          : "Final",
              }}
              onChange={(option) =>
                setValue("status", option?.value || "DRAFT")
              }
              options={[
                { value: "DRAFT", label: "Draft" },
                { value: "REVIEW", label: "Review" },
                { value: "APPROVED", label: "Approved" },
                { value: "REJECTED", label: "Rejected" },
                { value: "FINAL", label: "Final" },
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
          maxSize={parseInt(
            process.env.NEXT_PUBLIC_MAX_DOCUMENT_SIZE || "20971520"
          )} // 20MB from env
          disabled={uploading}
          showPreview={false}
          autoUpload={false}
        />
      </form>
    </ModalDialog>
  );
}
