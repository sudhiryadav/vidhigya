"use client";

import DocumentUpload from "@/components/DocumentUpload";
import DocumentViewer from "@/components/DocumentViewer";
import Overlay from "@/components/Overlay";
import ModalDialog from "@/components/ui/ModalDialog";
import CustomSelect from "@/components/ui/select";
import {
  FormFieldWrapper,
  ValidatedInput,
} from "@/components/ui/ValidationMessage";
import { useAuth } from "@/contexts/AuthContext";
import { documentUploadSchema } from "@/lib/validation";
import { apiClient } from "@/services/api";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Briefcase,
  Calendar,
  Download,
  Eye,
  FileText,
  Filter,
  Loader2,
  MoreHorizontal,
  Search,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Resolver, useForm } from "react-hook-form";
import toast from "react-hot-toast";

interface Document {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: string;
  status: string;
  createdAt: string;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
  case?: {
    id: string;
    caseNumber: string;
    title: string;
  };
}

interface Case {
  id: string;
  caseNumber: string;
  title: string;
}

interface SearchResult {
  document_id: string;
  document_title: string;
  filename: string;
  page_number: number;
  document_category: string;
  content: string;
  score: number;
  uploaded_by: string;
  uploaded_at: string;
}

interface UploadFormData {
  title: string;
  description: string;
  category: string;
  status: string;
  caseId: string;
}

export default function DocumentsPage() {
  const { user } = useAuth();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const resolver = yupResolver(documentUploadSchema) as unknown as Resolver<
    UploadFormData,
    any
  >;

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
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
    if (user) {
      fetchDocuments();
      fetchCases();
    }
  }, [user, searchTerm, categoryFilter, statusFilter]);

  // Ensure all state is properly initialized
  if (!user) {
    return null;
  }

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getDocuments();
      setDocuments(data as Document[]);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

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

      setShowUploadModal(false);
      reset();
      setSelectedFiles([]);
      fetchDocuments();
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

  const handleViewClick = (document: Document) => {
    setSelectedDocument(document);
    setShowViewModal(true);
  };

  const handleDeleteClick = (document: Document) => {
    setSelectedDocument(document);
    setShowDeleteConfirm(true);
  };

  const handleDeleteDocument = async () => {
    if (!selectedDocument) return;
    try {
      await apiClient.deleteDocument(selectedDocument.id);
      setShowDeleteConfirm(false);
      setSelectedDocument(null);
      fetchDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    try {
      setSearching(true);
      const results = await apiClient.searchDocuments(searchTerm);
      setSearchResults(results.results || []);
      setShowSearchResults(true);
    } catch (error) {
      console.error("Error searching documents:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleDownloadDocument = async (doc: Document) => {
    try {
      // Use the reliable download method with debugging
      apiClient.downloadDocumentReliable(doc.id);
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) return "📄";
    if (fileType.includes("doc")) return "📝";
    if (fileType.includes("image")) return "🖼️";
    if (fileType.includes("video")) return "🎥";
    return "📎";
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
      PENDING:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
      APPROVED:
        "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
      REJECTED: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
      ARCHIVED:
        "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[status as keyof typeof statusConfig] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"}`}
      >
        {status.replace("_", " ")}
      </span>
    );
  };

  const getCategoryBadge = (category: string) => {
    const categoryConfig = {
      PETITION:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
      EVIDENCE:
        "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
      CONTRACT:
        "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
      AGREEMENT:
        "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
      REPORT:
        "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400",
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryConfig[category as keyof typeof categoryConfig] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"}`}
      >
        {category.replace("_", " ")}
      </span>
    );
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.description &&
        doc.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory =
      categoryFilter === "all" || doc.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Documents Management
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage and organize all legal documents
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn-primary flex items-center"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching || !searchTerm.trim()}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {searching ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                      Searching...
                    </>
                  ) : (
                    "Search"
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary flex items-center"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>
          </div>

          {/* Search Results */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Search Results ({searchResults.length})
                </h3>
                <button
                  onClick={() => setShowSearchResults(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {result.document_title || result.filename}
                          </h4>
                          {result.page_number && (
                            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded">
                              Page {result.page_number}
                            </span>
                          )}
                          <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded">
                            {result.document_category || "Unknown"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {result.content.substring(0, 200)}...
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>Score: {(result.score * 100).toFixed(1)}%</span>
                          {result.uploaded_by && (
                            <span>By: {result.uploaded_by}</span>
                          )}
                          {result.uploaded_at && (
                            <span>
                              Uploaded:{" "}
                              {new Date(
                                result.uploaded_at
                              ).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleViewClick({
                            id: result.document_id,
                          } as Document)
                        }
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <CustomSelect
                    label="Category"
                    options={[
                      { value: "all", label: "All Categories" },
                      { value: "PETITION", label: "Petition" },
                      { value: "EVIDENCE", label: "Evidence" },
                      { value: "CONTRACT", label: "Contract" },
                      { value: "AGREEMENT", label: "Agreement" },
                      { value: "REPORT", label: "Report" },
                    ]}
                    value={{
                      value: categoryFilter,
                      label:
                        categoryFilter === "all"
                          ? "All Categories"
                          : categoryFilter,
                    }}
                    onChange={(option) =>
                      setCategoryFilter(option?.value || "all")
                    }
                    placeholder="Select category"
                  />
                </div>
                <div>
                  <CustomSelect
                    label="Status"
                    options={[
                      { value: "all", label: "All Status" },
                      { value: "DRAFT", label: "Draft" },
                      { value: "FILED", label: "Filed" },
                      { value: "APPROVED", label: "Approved" },
                      { value: "REJECTED", label: "Rejected" },
                      { value: "ARCHIVED", label: "Archived" },
                    ]}
                    value={{
                      value: statusFilter,
                      label:
                        statusFilter === "all" ? "All Status" : statusFilter,
                    }}
                    onChange={(option) =>
                      setStatusFilter(option?.value || "all")
                    }
                    placeholder="Select status"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse"
              >
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-2/3"></div>
                </div>
              </div>
            ))
          ) : filteredDocuments.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No documents found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm ||
                categoryFilter !== "all" ||
                statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by uploading your first document"}
              </p>
            </div>
          ) : (
            filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
              >
                {/* Document Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center text-2xl">
                      {getFileIcon(doc.fileType)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2">
                        {doc.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatFileSize(doc.fileSize)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getCategoryBadge(doc.category)}
                    {getStatusBadge(doc.status)}
                  </div>
                </div>

                {/* Document Info */}
                <div className="space-y-3 mb-4">
                  {doc.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {doc.description}
                    </p>
                  )}

                  <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>Uploaded {formatDate(doc.createdAt)}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                    <User className="w-4 h-4" />
                    <span>by {doc.uploadedBy.name}</span>
                  </div>

                  {doc.case && (
                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                      <Briefcase className="w-4 h-4" />
                      <span>{doc.case.caseNumber}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewClick(doc)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownloadDocument(doc)}
                      className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(doc)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <button className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Upload Document Modal */}
      {showUploadModal && (
        <ModalDialog
          isOpen={true}
          onClose={() => {
            setShowUploadModal(false);
            setSelectedFiles([]);
            reset();
          }}
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
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFiles([]);
                  reset();
                }}
                className="btn-secondary"
              >
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
              <FormFieldWrapper
                label="Category"
                required
                error={errors.category}
              >
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
              <FormFieldWrapper
                label="Related Case"
                required
                error={errors.caseId}
              >
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
      )}

      {/* Upload Overlay Loader */}
      <Overlay
        isVisible={uploading}
        title="Uploading Document"
        message="Please wait while we process your document..."
      />

      {/* View Document Modal */}
      {showViewModal && selectedDocument ? (
        <DocumentViewer
          documentId={selectedDocument.id}
          documentTitle={selectedDocument.title}
          fileType={selectedDocument.fileType}
          onClose={() => setShowViewModal(false)}
        />
      ) : null}

      {/* Delete Document Confirmation Modal */}
      <ModalDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        header="Confirm Deletion"
        footer={
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button onClick={handleDeleteDocument} className="btn-danger">
              Delete
            </button>
          </div>
        }
        maxWidth="md"
        closeOnEscape={true}
        closeOnOverlayClick={true}
      >
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Delete Document
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Are you sure you want to delete "{selectedDocument?.title}"? This
            action cannot be undone.
          </p>
        </div>
      </ModalDialog>
    </div>
  );
}
