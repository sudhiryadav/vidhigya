"use client";

import DocumentProgressTracker from "@/components/DocumentProgressTracker";
import DocumentUploadModal from "@/components/DocumentUploadModal";
import DocumentViewer from "@/components/DocumentViewer";
import ModalDialog from "@/components/ui/ModalDialog";
import CustomSelect from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
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
  aiDocumentId?: string;
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
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCase, setFilterCase] = useState<string>("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cases, setCases] = useState<Case[]>([]);
  const [uploadFormData, setUploadFormData] = useState({
    title: "",
    description: "",
    caseId: "",
    file: null as File | null,
  });

  // Search state
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Role-based access control
  const isLawyer =
    user?.role === "LAWYER" ||
    user?.role === "ASSOCIATE" ||
    user?.role === "PARALEGAL";
  const isClient = user?.role === "CLIENT";
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

  // Only lawyers and admins can upload documents
  const canUploadDocuments = isLawyer || isAdmin;

  useEffect(() => {
    if (user) {
      fetchDocuments();
      fetchCases();
    }
  }, [user, searchTerm, filterStatus, filterCase]);

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

  const handleUploadSuccess = () => {
    fetchDocuments();
  };

  const handleViewClick = (document: Document) => {
    setSelectedDocument(document);
    setShowDocumentModal(true);
  };

  const handleDeleteClick = (document: Document) => {
    setSelectedDocument(document);
    // Only lawyers and admins can delete documents
    if (isLawyer || isAdmin) {
      setShowDeleteConfirm(true);
    } else {
      toast.error("You do not have permission to delete documents.");
    }
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
      // Only lawyers and admins can search documents
      if (!isLawyer && !isAdmin) {
        toast.error("You do not have permission to search documents.");
        return;
      }
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
      DRAFT: "bg-muted text-muted-foreground",
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
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[status as keyof typeof statusConfig] || "bg-muted text-muted-foreground"}`}
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
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryConfig[category as keyof typeof categoryConfig] || "bg-muted text-muted-foreground"}`}
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
      filterCase === "all" || doc.case?.caseNumber === filterCase;
    const matchesStatus = filterStatus === "all" || doc.status === filterStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 md:pt-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Documents Management
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage and organize all legal documents
              </p>
            </div>
            {canUploadDocuments && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="btn-primary flex items-center"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-background text-foreground"
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
            <div className="mt-6 bg-card border border-border rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Search Results ({searchResults.length})
                </h3>
                <button
                  onClick={() => setShowSearchResults(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="border border-border rounded-lg p-4 hover:bg-muted"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-foreground">
                            {result.document_title || result.filename}
                          </h4>
                          {result.page_number && (
                            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded">
                              Page {result.page_number}
                            </span>
                          )}
                          <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded">
                            {result.document_category || "Unknown"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {result.content.substring(0, 200)}...
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
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
            <div className="mt-4 pt-4 border-t border-border">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <CustomSelect
                    label="Case"
                    options={[
                      { value: "all", label: "All Cases" },
                      ...cases.map((c) => ({
                        value: c.caseNumber,
                        label: c.caseNumber,
                      })),
                    ]}
                    value={{
                      value: filterCase,
                      label: filterCase === "all" ? "All Cases" : filterCase,
                    }}
                    onChange={(option) => setFilterCase(option?.value || "all")}
                    placeholder="Select case"
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
                      value: filterStatus,
                      label:
                        filterStatus === "all" ? "All Status" : filterStatus,
                    }}
                    onChange={(option) =>
                      setFilterStatus(option?.value || "all")
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
                className="bg-card rounded-lg shadow-sm border border-border p-6 animate-pulse"
              >
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-muted rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </div>
            ))
          ) : filteredDocuments.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No documents found
              </h3>
              <p className="text-muted-foreground">
                {searchTerm || filterCase !== "all" || filterStatus !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by uploading your first document"}
              </p>
            </div>
          ) : (
            filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="bg-card rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow"
              >
                {/* Document Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center text-2xl">
                      {getFileIcon(doc.fileType)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground line-clamp-2">
                        {doc.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
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
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {doc.description}
                    </p>
                  )}

                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Uploaded {formatDate(doc.createdAt)}</span>
                  </div>

                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>by {doc.uploadedBy.name}</span>
                  </div>

                  {doc.case && (
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Briefcase className="w-4 h-4" />
                      <span>{doc.case.caseNumber}</span>
                    </div>
                  )}
                </div>

                {/* Progress Tracking */}
                {doc.aiDocumentId &&
                  (doc.status === "PROCESSING" ||
                    doc.status === "UPLOADED") && (
                    <div className="mb-4">
                      <DocumentProgressTracker
                        documentId={doc.id}
                        aiDocumentId={doc.aiDocumentId}
                        filename={doc.title}
                        apiClient={apiClient}
                        onComplete={() => {
                          // Refresh documents when processing is complete
                          fetchDocuments();
                          toast.success(`${doc.title} processing completed!`);
                        }}
                        onError={(error) => {
                          toast.error(
                            `Processing failed for ${doc.title}: ${error}`
                          );
                        }}
                      />
                    </div>
                  )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewClick(doc)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownloadDocument(doc)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {isLawyer || isAdmin ? (
                      <button
                        onClick={() => handleDeleteClick(doc)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>
                  <button className="text-sm text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Upload Document Modal */}
      {canUploadDocuments && (
        <DocumentUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={handleUploadSuccess}
          apiClient={apiClient}
        />
      )}

      {/* View Document Modal */}
      {showDocumentModal && selectedDocument ? (
        <DocumentViewer
          documentId={selectedDocument.id}
          documentTitle={selectedDocument.title}
          fileType={selectedDocument.fileType}
          onClose={() => setShowDocumentModal(false)}
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
          <h3 className="text-lg font-medium text-foreground mb-2">
            Delete Document
          </h3>
          <p className="text-muted-foreground">
            Are you sure you want to delete "{selectedDocument?.title}"? This
            action cannot be undone.
          </p>
        </div>
      </ModalDialog>
    </div>
  );
}
