"use client";

import DocumentProgressTracker from "@/components/DocumentProgressTracker";
import DocumentUploadModal from "@/components/DocumentUploadModal";
import DocumentViewer from "@/components/DocumentViewer";
import ModalDialog from "@/components/ui/ModalDialog";
import CustomSelect from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/services/api";
import {
  type DocumentSearchHit,
  extractDocumentSearchHits,
  formatSearchHitScore,
} from "@/utils/documentSearchHits";
import {
  Briefcase,
  Calendar,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  User,
  Video,
  X,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

interface Document {
  id: string;
  title: string;
  description?: string;
  originalFilename?: string;
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

/** Labels for filter dropdowns; union of schema, upload modal, and legacy UI values */
const FALLBACK_STATUSES = [
  "DRAFT",
  "REVIEW",
  "APPROVED",
  "FILED",
  "ARCHIVED",
  "PROCESSING",
  "PROCESSED",
  "PENDING",
  "UPLOADED",
  "REJECTED",
] as const;

const FALLBACK_CATEGORIES = [
  "LEGAL_DOCUMENT",
  "CONTRACT",
  "AGREEMENT",
  "PETITION",
  "AFFIDAVIT",
  "EVIDENCE",
  "CORRESPONDENCE",
  "COURT_FILING",
  "COURT_ORDER",
  "LEGAL_OPINION",
  "OTHER",
  "REPORT",
] as const;

function humanizeEnum(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getUploadedFilename(doc: Pick<Document, "originalFilename" | "fileUrl">) {
  const fromOriginal = (doc.originalFilename || "").trim();
  if (fromOriginal) return fromOriginal;

  const fromUrl = (doc.fileUrl || "").trim();
  if (!fromUrl) return "";

  const parts = fromUrl.split("/");
  const raw = parts[parts.length - 1] || "";
  return decodeURIComponent(raw).trim();
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, string> = {
    DRAFT:
      "bg-muted text-foreground ring-1 ring-border/70 dark:bg-muted/70 dark:text-foreground",
    PENDING:
      "bg-amber-100 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:ring-amber-800/80",
    PROCESSING:
      "bg-blue-100 text-blue-900 ring-1 ring-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:ring-blue-800/80",
    PROCESSED:
      "bg-green-100 text-green-900 ring-1 ring-green-200 dark:bg-green-900/40 dark:text-green-200 dark:ring-green-800/80",
    UPLOADED:
      "bg-sky-100 text-sky-900 ring-1 ring-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:ring-sky-800/80",
    REVIEW:
      "bg-cyan-100 text-cyan-900 ring-1 ring-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-200 dark:ring-cyan-800/80",
    APPROVED:
      "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:ring-emerald-800/80",
    FILED:
      "bg-teal-100 text-teal-900 ring-1 ring-teal-200 dark:bg-teal-900/40 dark:text-teal-200 dark:ring-teal-800/80",
    REJECTED:
      "bg-red-100 text-red-900 ring-1 ring-red-200 dark:bg-red-900/40 dark:text-red-200 dark:ring-red-800/80",
    ARCHIVED:
      "bg-violet-100 text-violet-900 ring-1 ring-violet-200 dark:bg-violet-900/40 dark:text-violet-200 dark:ring-violet-800/80",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${statusConfig[status] || "bg-muted text-foreground ring-1 ring-border/70 dark:bg-muted/70 dark:text-foreground"}`}
    >
      {humanizeEnum(status)}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const categoryConfig: Record<string, string> = {
    PETITION:
      "bg-blue-100 text-blue-900 ring-1 ring-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:ring-blue-800/80",
    LEGAL_DOCUMENT:
      "bg-slate-100 text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900/40 dark:text-slate-200 dark:ring-slate-700/80",
    EVIDENCE:
      "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:ring-emerald-800/80",
    CONTRACT:
      "bg-violet-100 text-violet-900 ring-1 ring-violet-200 dark:bg-violet-900/40 dark:text-violet-200 dark:ring-violet-800/80",
    AGREEMENT:
      "bg-orange-100 text-orange-900 ring-1 ring-orange-200 dark:bg-orange-900/40 dark:text-orange-200 dark:ring-orange-800/80",
    REPORT:
      "bg-indigo-100 text-indigo-900 ring-1 ring-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-200 dark:ring-indigo-800/80",
    CORRESPONDENCE:
      "bg-cyan-100 text-cyan-900 ring-1 ring-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-200 dark:ring-cyan-800/80",
    COURT_FILING:
      "bg-amber-100 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:ring-amber-800/80",
    COURT_ORDER:
      "bg-rose-100 text-rose-900 ring-1 ring-rose-200 dark:bg-rose-900/40 dark:text-rose-200 dark:ring-rose-800/80",
    AFFIDAVIT:
      "bg-lime-100 text-lime-900 ring-1 ring-lime-200 dark:bg-lime-900/40 dark:text-lime-200 dark:ring-lime-800/80",
    LEGAL_OPINION:
      "bg-fuchsia-100 text-fuchsia-900 ring-1 ring-fuchsia-200 dark:bg-fuchsia-900/40 dark:text-fuchsia-200 dark:ring-fuchsia-800/80",
    OTHER: "bg-muted text-foreground ring-1 ring-border/70 dark:bg-muted/70",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${categoryConfig[category] || "bg-muted text-foreground ring-1 ring-border/70 dark:bg-muted/70"}`}
    >
      {humanizeEnum(category)}
    </span>
  );
}

// Document Card Component
const DocumentCard = ({
  document: doc,
  onView,
  onDownload,
  onDelete,
  onComplete,
  onError,
  canDelete,
  deletingDocumentId,
  apiClient,
  onReupload,
  onProcessingRestarted,
}: {
  document: Document;
  onView: (doc: Document) => void;
  onDownload: (doc: Document) => void;
  onDelete: (doc: Document) => void;
  onComplete: () => void;
  onError: (error: string) => void;
  canDelete: boolean;
  deletingDocumentId: string | null;
  apiClient: any;
  onReupload: () => void;
  onProcessingRestarted: () => void;
}) => {
  const [retryingProcessing, setRetryingProcessing] = useState(false);
  const uploadedFilename = getUploadedFilename(doc);
  const isDeletingThisDocument = deletingDocumentId === doc.id;
  const isAnyDocumentDeleting = deletingDocumentId !== null;
  const fileTypeIcon = (fileType: string) => {
    const ft = fileType.toLowerCase();
    if (ft.includes("pdf")) return FileText;
    if (ft.includes("doc")) return FileText;
    if (ft.includes("image")) return ImageIcon;
    if (ft.includes("video")) return Video;
    return FileText;
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

  const handleRetryProcessing = async () => {
    setRetryingProcessing(true);
    try {
      await apiClient.retryDocumentProcessing(doc.id);
      onProcessingRestarted();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not restart processing. Try again or re-upload the file.",
      );
    } finally {
      setRetryingProcessing(false);
    }
  };

  // Helper function to determine if actions should be visible
  const shouldShowActions = (status: string) => {
    // Hide actions during processing states
    const processingStates = ["PROCESSING", "UPLOADED", "PENDING"];
    return !processingStates.includes(status);
  };

  // Helper function to determine if download should be visible
  const shouldShowDownload = (status: string) => {
    // Only show download for completed/processed documents
    const completedStates = ["PROCESSED", "APPROVED"];
    return completedStates.includes(status);
  };

  const IconComponent = fileTypeIcon(doc.fileType);

  return (
    <article className="group bg-card rounded-xl shadow-sm border border-border p-4 sm:p-6 hover:shadow-md hover:border-primary/20 transition-all duration-200 flex flex-col h-full min-h-0">
      {/* Document Title - Full Width */}
      <h3 className="font-semibold text-foreground text-base sm:text-lg mb-2 line-clamp-2 leading-snug pr-1">
        {doc.title}
      </h3>
      {uploadedFilename && (
        <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-1 break-all">
          File: {uploadedFilename}
        </p>
      )}

      {/* File Size */}
      <p className="text-xs sm:text-sm text-muted-foreground mb-4">
        {formatFileSize(doc.fileSize)}
      </p>

      {/* File Icon and Badges Row */}
      <div className="flex flex-wrap items-start gap-3 mb-4">
        <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center ring-1 ring-primary/15">
          <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden />
        </div>
        <div className="flex flex-wrap justify-end gap-2 min-w-0 flex-1">
          <CategoryBadge category={doc.category} />
          <StatusBadge status={doc.status} />
        </div>
      </div>

      {/* Document Info */}
      <div className="space-y-2.5 sm:space-y-3 mb-4 flex-1">
        {doc.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {doc.description}
          </p>
        )}

        <div className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
          <Calendar className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
          <span className="min-w-0 break-words">
            Uploaded {formatDate(doc.createdAt)}
          </span>
        </div>

        <div className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
          <User className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
          <span className="min-w-0 break-words">
            by {doc.uploadedBy.name}
          </span>
        </div>

        {doc.case && (
          <div className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground">
            <Briefcase className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
            <span className="min-w-0 break-words">{doc.case.caseNumber}</span>
          </div>
        )}
      </div>

      {/* Progress Tracking */}
      {doc.aiDocumentId &&
        (doc.status === "PROCESSING" || doc.status === "UPLOADED") && (
          <div className="mb-4">
            <DocumentProgressTracker
              documentId={doc.id}
              aiDocumentId={doc.aiDocumentId}
              filename={uploadedFilename || doc.title}
              apiClient={apiClient}
              onComplete={onComplete}
              onError={onError}
              onRetrySuccess={onProcessingRestarted}
            />
          </div>
        )}

      {/* Re-upload Message for DRAFT Status */}
      {doc.status === "DRAFT" && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">!</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Document Processing Failed
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {doc.fileUrl
                  ? "The file is still saved. You can retry processing without uploading again, or re-upload if retry is not available."
                  : "The stored file is no longer available. Please re-upload the document."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-4 mt-auto border-t border-border">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => onView(doc)}
            className="inline-flex items-center justify-center rounded-lg p-2.5 sm:p-2 text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`View ${doc.title}`}
          >
            <Eye className="w-4 h-4" />
          </button>
          {shouldShowDownload(doc.status) && (
            <button
              type="button"
              onClick={() => onDownload(doc)}
              className="inline-flex items-center justify-center rounded-lg p-2.5 sm:p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Download ${doc.title}`}
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(doc)}
              disabled={isAnyDocumentDeleting}
              className="inline-flex items-center justify-center rounded-lg p-2.5 sm:p-2 text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={`Delete ${doc.title}`}
              title={
                doc.status === "PROCESSING"
                  ? "Delete document (stops processing)"
                  : `Delete ${doc.title}`
              }
            >
              {isDeletingThisDocument ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {shouldShowActions(doc.status) && (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg p-2.5 sm:p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="More actions"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          )}
          {doc.status === "DRAFT" && (
            <>
              {doc.fileUrl && (
                <button
                  type="button"
                  onClick={handleRetryProcessing}
                  disabled={retryingProcessing}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-md transition-colors"
                >
                  <RefreshCw
                    className={`w-3 h-3 mr-1 ${retryingProcessing ? "animate-spin" : ""}`}
                  />
                  {retryingProcessing ? "Retrying…" : "Retry processing"}
                </button>
              )}
              <button
                type="button"
                onClick={onReupload}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors"
              >
                <Upload className="w-3 h-3 mr-1" />
                Re-upload
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
};

const DocumentTableRow = ({
  document: doc,
  onView,
  onDownload,
  onDelete,
  onComplete,
  onError,
  canDelete,
  deletingDocumentId,
  apiClient,
  onReupload,
  onProcessingRestarted,
}: {
  document: Document;
  onView: (doc: Document) => void;
  onDownload: (doc: Document) => void;
  onDelete: (doc: Document) => void;
  onComplete: () => void;
  onError: (error: string) => void;
  canDelete: boolean;
  deletingDocumentId: string | null;
  apiClient: any;
  onReupload: () => void;
  onProcessingRestarted: () => void;
}) => {
  const [retryingProcessing, setRetryingProcessing] = useState(false);
  const uploadedFilename = getUploadedFilename(doc);

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

  const handleRetryProcessing = async () => {
    setRetryingProcessing(true);
    try {
      await apiClient.retryDocumentProcessing(doc.id);
      onProcessingRestarted();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not restart processing. Try again or re-upload the file.",
      );
    } finally {
      setRetryingProcessing(false);
    }
  };

  const processingStates = ["PROCESSING", "UPLOADED", "PENDING"];
  const completedStates = ["PROCESSED", "APPROVED"];
  const shouldShowActions = !processingStates.includes(doc.status);
  const shouldShowDownload = completedStates.includes(doc.status);

  const showProgress =
    !!doc.aiDocumentId &&
    (doc.status === "PROCESSING" || doc.status === "UPLOADED");
  const showDraftExtras = doc.status === "DRAFT";
  const isDeletingThisDocument = deletingDocumentId === doc.id;
  const isAnyDocumentDeleting = deletingDocumentId !== null;

  return (
    <>
      <tr className="border-b border-border hover:bg-muted/40 transition-colors">
        <td className="py-3 px-4 align-top">
          <div className="font-medium text-foreground max-w-xs lg:max-w-md">
            {doc.title}
          </div>
          {uploadedFilename && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-1 break-all">
              File: {uploadedFilename}
            </p>
          )}
          {doc.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
              {doc.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1 md:hidden">
            {formatFileSize(doc.fileSize)} · {formatDate(doc.createdAt)}
          </p>
          <div className="flex flex-wrap gap-2 mt-2 md:hidden">
            <CategoryBadge category={doc.category} />
            <StatusBadge status={doc.status} />
          </div>
          {doc.case && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 lg:hidden">
              <Briefcase className="w-3 h-3 shrink-0" />
              {doc.case.caseNumber}
            </p>
          )}
        </td>
        <td className="py-3 px-3 align-middle hidden md:table-cell">
          <CategoryBadge category={doc.category} />
        </td>
        <td className="py-3 px-3 align-middle hidden sm:table-cell">
          <StatusBadge status={doc.status} />
        </td>
        <td className="py-3 px-3 align-middle hidden lg:table-cell text-sm text-muted-foreground">
          {doc.case ? (
            <span className="flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 shrink-0" />
              {doc.case.caseNumber}
            </span>
          ) : (
            <span className="text-muted-foreground/70">—</span>
          )}
        </td>
        <td className="py-3 px-3 align-middle hidden xl:table-cell text-sm text-muted-foreground whitespace-nowrap">
          <div className="flex flex-col gap-0.5">
            <span>{formatDate(doc.createdAt)}</span>
            <span className="text-xs">{doc.uploadedBy.name}</span>
          </div>
        </td>
        <td className="py-3 px-3 align-middle text-right">
          <div className="flex items-center justify-end gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => onView(doc)}
              className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 dark:text-blue-400"
              aria-label="View document"
            >
              <Eye className="w-4 h-4" />
            </button>
            {shouldShowDownload && (
              <button
                type="button"
                onClick={() => onDownload(doc)}
                className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Download document"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(doc)}
                disabled={isAnyDocumentDeleting}
                className="p-1.5 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 dark:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Delete document"
                title={
                  doc.status === "PROCESSING"
                    ? "Delete document (stops processing)"
                    : "Delete document"
                }
              >
                {isDeletingThisDocument ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            )}
            {shouldShowActions && (
              <span className="hidden sm:inline p-1.5 text-muted-foreground">
                <MoreHorizontal className="w-4 h-4" />
              </span>
            )}
          </div>
        </td>
      </tr>
      {(showProgress || showDraftExtras) && (
        <tr className="border-b border-border bg-muted/25">
          <td colSpan={6} className="px-4 py-3">
            {showProgress && doc.aiDocumentId && (
              <DocumentProgressTracker
                documentId={doc.id}
                aiDocumentId={doc.aiDocumentId}
                filename={uploadedFilename || doc.title}
                apiClient={apiClient}
                onComplete={onComplete}
                onError={onError}
                onRetrySuccess={onProcessingRestarted}
              />
            )}
            {showDraftExtras && (
              <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white text-xs">!</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Document processing failed
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      {doc.fileUrl
                        ? "Retry processing or re-upload the file."
                        : "The stored file is no longer available. Please re-upload."}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {doc.fileUrl && (
                    <button
                      type="button"
                      onClick={handleRetryProcessing}
                      disabled={retryingProcessing}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-md transition-colors"
                    >
                      <RefreshCw
                        className={`w-3 h-3 mr-1 ${retryingProcessing ? "animate-spin" : ""}`}
                      />
                      {retryingProcessing ? "Retrying…" : "Retry processing"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onReupload}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors"
                  >
                    <Upload className="w-3 h-3 mr-1" />
                    Re-upload
                  </button>
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
};

export default function DocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterCase, setFilterCase] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(
    null,
  );
  const [cases, setCases] = useState<Case[]>([]);
  const [viewerInitialPage, setViewerInitialPage] = useState<
    number | undefined
  >();

  // Search state
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DocumentSearchHit[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const statusFilterOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { value: string; label: string }[] = [
      { value: "all", label: "All statuses" },
    ];
    const add = (v: string) => {
      if (seen.has(v)) return;
      seen.add(v);
      opts.push({ value: v, label: humanizeEnum(v) });
    };
    FALLBACK_STATUSES.forEach((s) => add(s));
    documents.forEach((d) => add(d.status));
    return opts;
  }, [documents]);

  const categoryFilterOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { value: string; label: string }[] = [
      { value: "all", label: "All categories" },
    ];
    const add = (v: string) => {
      if (seen.has(v)) return;
      seen.add(v);
      opts.push({ value: v, label: humanizeEnum(v) });
    };
    FALLBACK_CATEGORIES.forEach((c) => add(c));
    documents.forEach((d) => add(d.category));
    return opts;
  }, [documents]);

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
  }, [user]);

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
    setViewerInitialPage(undefined);
    setSelectedDocument(document);
    setShowDocumentModal(true);
  };

  const openDocumentFromSearchHit = async (hit: DocumentSearchHit) => {
    try {
      const doc = (await apiClient.getDocument(hit.document_id)) as Document;
      setViewerInitialPage(
        hit.page_number != null && hit.page_number > 0
          ? hit.page_number
          : undefined,
      );
      setSelectedDocument(doc);
      setShowDocumentModal(true);
    } catch {
      toast.error("Could not open document");
    }
  };

  const handleDeleteClick = (document: Document) => {
    if (deletingDocumentId) return;
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
      setDeletingDocumentId(selectedDocument.id);
      await apiClient.deleteDocument(selectedDocument.id);
      setShowDeleteConfirm(false);
      setSelectedDocument(null);
      toast.success("Document deleted successfully");
      fetchDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    } finally {
      setDeletingDocumentId(null);
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
      const raw = await apiClient.searchDocuments(searchTerm);
      setSearchResults(extractDocumentSearchHits(raw));
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

  // After a semantic search, the query rarely appears verbatim in titles; don't
  // hide the library list while vector hits are shown (or after a vector search).
  const skipLocalTextFilter = showSearchResults;

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      skipLocalTextFilter ||
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.description &&
        doc.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCaseFilter =
      filterCase === "all" || doc.case?.caseNumber === filterCase;
    const matchesStatus = filterStatus === "all" || doc.status === filterStatus;
    const matchesCategory =
      filterCategory === "all" || doc.category === filterCategory;
    return (
      matchesSearch && matchesCaseFilter && matchesStatus && matchesCategory
    );
  });

  const hasActiveFilters =
    filterCase !== "all" ||
    filterStatus !== "all" ||
    filterCategory !== "all" ||
    Boolean(searchTerm.trim());

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pt-14 sm:pt-16 md:pt-8 pb-10">
        {/* Header */}
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="min-w-0 space-y-1">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
                Documents Management
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
                Manage and organize all legal documents
              </p>
            </div>
            {canUploadDocuments && (
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="btn-primary inline-flex items-center justify-center gap-2 w-full sm:w-auto shrink-0 min-h-[44px] sm:min-h-0 px-4"
              >
                <Upload className="w-4 h-4 shrink-0" aria-hidden />
                <span>Upload Document</span>
              </button>
            )}
          </div>
        </header>

        {/* Search and Filters */}
        <div className="mb-6 sm:mb-8">
          <div className="rounded-xl border border-border bg-card/70 shadow-sm backdrop-blur-sm p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:gap-5">
              <div className="w-full min-w-0">
                <label htmlFor="documents-search" className="sr-only">
                  Search documents
                </label>
                <div className="flex flex-col gap-2">
                  <div className="relative w-full">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 z-[1] hidden h-4 w-4 -translate-y-1/2 text-muted-foreground sm:block"
                      aria-hidden
                    />
                    <input
                      id="documents-search"
                      type="search"
                      enterKeyHint="search"
                      placeholder="Search documents..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSearch();
                      }}
                      className="w-full min-h-[44px] rounded-lg border border-border bg-background py-2.5 pl-4 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/40 sm:min-h-0 sm:py-2 sm:pl-10 sm:pr-[7.25rem] sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleSearch}
                      disabled={searching || !searchTerm.trim()}
                      className="absolute right-2 top-1/2 hidden min-h-0 -translate-y-1/2 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:inline-flex"
                    >
                      {searching ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                          <span className="max-w-[5.5rem] truncate sm:max-w-none">
                            Searching…
                          </span>
                        </>
                      ) : (
                        "Search"
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={searching || !searchTerm.trim()}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:hidden"
                  >
                    {searching ? (
                      <>
                        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                        Searching…
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 shrink-0" aria-hidden />
                        Search
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] gap-3 sm:gap-4 items-end">
                <div className="min-w-0">
                  <CustomSelect
                    label="Status"
                    options={statusFilterOptions}
                    value={{
                      value: filterStatus,
                      label:
                        statusFilterOptions.find((o) => o.value === filterStatus)
                          ?.label ?? "All statuses",
                    }}
                    onChange={(option) =>
                      setFilterStatus(option?.value ?? "all")
                    }
                    placeholder="Status"
                  />
                </div>
                <div className="min-w-0">
                  <CustomSelect
                    label="Category"
                    options={categoryFilterOptions}
                    value={{
                      value: filterCategory,
                      label:
                        categoryFilterOptions.find(
                          (o) => o.value === filterCategory,
                        )?.label ?? "All categories",
                    }}
                    onChange={(option) =>
                      setFilterCategory(option?.value ?? "all")
                    }
                    placeholder="Category"
                  />
                </div>
                <div className="min-w-0 sm:col-span-2 xl:col-span-1">
                  <CustomSelect
                    label="Related case"
                    options={[
                      { value: "all", label: "All cases" },
                      ...cases.map((c) => ({
                        value: c.caseNumber,
                        label: c.caseNumber,
                      })),
                    ]}
                    value={{
                      value: filterCase,
                      label:
                        filterCase === "all"
                          ? "All cases"
                          : cases.find((c) => c.caseNumber === filterCase)
                              ?.caseNumber ?? filterCase,
                    }}
                    onChange={(option) => setFilterCase(option?.value ?? "all")}
                    placeholder="Related case"
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2 xl:col-span-1 xl:justify-self-end xl:w-full xl:max-w-[11rem]">
                  <span className="text-xs font-medium text-muted-foreground sm:text-sm sm:text-foreground">
                    Layout
                  </span>
                  <div
                    className="flex rounded-lg border border-border p-1 bg-muted/50 shrink-0 w-full sm:w-auto xl:w-full"
                    role="group"
                    aria-label="Document layout"
                  >
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      aria-pressed={viewMode === "grid"}
                      aria-label="Card view"
                      title="Cards"
                      className={`flex-1 sm:flex-initial flex items-center justify-center min-h-[44px] sm:min-h-0 px-3 py-2 sm:p-2 rounded-md transition-colors ${viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      aria-pressed={viewMode === "list"}
                      aria-label="List view"
                      title="List"
                      className={`flex-1 sm:flex-initial flex items-center justify-center min-h-[44px] sm:min-h-0 px-3 py-2 sm:p-2 rounded-md transition-colors ${viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search Results */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="mt-6 rounded-xl border border-border bg-card p-4 shadow-md sm:p-6">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-foreground sm:text-lg">
                  Search Results ({searchResults.length})
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowSearchResults(false);
                    setSearchResults([]);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Dismiss search results"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-4">
                {searchResults.map((result, index) => {
                  const snippet = (result.content ?? "").trim();
                  const preview =
                    snippet.length > 220
                      ? `${snippet.slice(0, 220)}…`
                      : snippet;
                  return (
                    <div
                      key={`${result.document_id}-${index}`}
                      className="border border-border rounded-lg p-4 hover:bg-muted"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h4 className="font-medium text-foreground">
                              {result.document_title ||
                                result.filename ||
                                "Document"}
                            </h4>
                            {result.page_number != null &&
                              result.page_number > 0 && (
                                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded">
                                  Page {result.page_number}
                                </span>
                              )}
                            <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded">
                              {result.document_category || "Unknown"}
                            </span>
                          </div>
                          {(result.page_number != null && result.page_number > 0) ||
                          (result.start_char != null &&
                            result.end_char != null) ? (
                            <p className="text-xs text-muted-foreground mb-2">
                              <span className="font-medium text-foreground">
                                Source:{" "}
                              </span>
                              {result.page_number != null &&
                              result.page_number > 0 ? (
                                <>Page {result.page_number}</>
                              ) : (
                                <>Matched excerpt</>
                              )}
                              {result.start_char != null &&
                              result.end_char != null ? (
                                <>
                                  {" "}
                                  · characters {result.start_char}–
                                  {result.end_char}
                                </>
                              ) : null}
                            </p>
                          ) : null}
                          <p className="text-sm text-muted-foreground mb-2 break-words">
                            {preview || "(No excerpt)"}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>Score: {formatSearchHitScore(result.score)}</span>
                            {result.uploaded_by && (
                              <span>By: {result.uploaded_by}</span>
                            )}
                            {result.uploaded_at && (
                              <span>
                                Uploaded:{" "}
                                {new Date(
                                  result.uploaded_at,
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openDocumentFromSearchHit(result)}
                          className="inline-flex shrink-0 items-center justify-center self-start rounded-lg border border-border bg-background p-2 text-primary hover:bg-muted sm:self-auto sm:border-0 sm:bg-transparent"
                          aria-label="Open document"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {showSearchResults &&
            !searching &&
            searchResults.length === 0 &&
            (isLawyer || isAdmin) && (
              <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                No matching passages were found in your documents for this
                query. Try different keywords or clear filters below.
              </div>
            )}
        </div>

        {/* Documents list or grid */}
        {loading ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-xl border border-border bg-card p-4 sm:p-6"
                >
                  <div className="mb-4 flex flex-wrap items-start gap-3">
                    <div className="h-11 w-11 shrink-0 rounded-xl bg-muted sm:h-12 sm:w-12" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-4 w-3/4 rounded bg-muted" />
                      <div className="h-3 w-1/2 rounded bg-muted" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 rounded bg-muted" />
                    <div className="h-3 w-2/3 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden bg-card">
              <div className="animate-pulse divide-y divide-border">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap items-center gap-3 p-4 sm:p-3"
                  >
                    <div className="h-4 bg-muted rounded flex-1 min-w-[120px]" />
                    <div className="h-6 bg-muted rounded w-20 hidden md:block" />
                    <div className="h-6 bg-muted rounded w-24 hidden sm:block" />
                    <div className="h-4 bg-muted rounded w-28 hidden lg:block" />
                    <div className="h-4 bg-muted rounded w-24 hidden xl:block" />
                    <div className="h-8 bg-muted rounded w-24 ml-auto" />
                  </div>
                ))}
              </div>
            </div>
          )
        ) : filteredDocuments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-12 text-center sm:py-16">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-medium text-foreground">
              No documents found
            </h3>
            <p className="mx-auto max-w-md text-pretty text-muted-foreground">
              {hasActiveFilters
                ? "Try adjusting your search or filters"
                : "Get started by uploading your first document"}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
            {filteredDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onView={handleViewClick}
                onDownload={handleDownloadDocument}
                onDelete={handleDeleteClick}
                onComplete={() => {
                  fetchDocuments();
                  toast.success(`${doc.title} processing completed!`);
                }}
                onError={(error) => {
                  toast.error(`Processing failed for ${doc.title}: ${error}`);
                }}
                canDelete={isLawyer || isAdmin}
                deletingDocumentId={deletingDocumentId}
                apiClient={apiClient}
                onReupload={() => setShowUploadModal(true)}
                onProcessingRestarted={() => {
                  fetchDocuments();
                  toast.success(`${doc.title}: processing restarted`);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-x-auto shadow-sm bg-card">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                <tr>
                  <th scope="col" className="py-3 px-4 font-medium text-foreground">
                    Document
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-3 font-medium text-foreground hidden md:table-cell"
                  >
                    Category
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-3 font-medium text-foreground hidden sm:table-cell"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-3 font-medium text-foreground hidden lg:table-cell"
                  >
                    Related case
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-3 font-medium text-foreground hidden xl:table-cell whitespace-nowrap"
                  >
                    Uploaded
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-3 font-medium text-foreground text-right w-[120px]"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDocuments.map((doc) => (
                  <Fragment key={doc.id}>
                    <DocumentTableRow
                      document={doc}
                      onView={handleViewClick}
                      onDownload={handleDownloadDocument}
                      onDelete={handleDeleteClick}
                      onComplete={() => {
                        fetchDocuments();
                        toast.success(`${doc.title} processing completed!`);
                      }}
                      onError={(error) => {
                        toast.error(
                          `Processing failed for ${doc.title}: ${error}`,
                        );
                      }}
                      canDelete={isLawyer || isAdmin}
                      deletingDocumentId={deletingDocumentId}
                      apiClient={apiClient}
                      onReupload={() => setShowUploadModal(true)}
                      onProcessingRestarted={() => {
                        fetchDocuments();
                        toast.success(`${doc.title}: processing restarted`);
                      }}
                    />
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
          initialPage={viewerInitialPage}
          onClose={() => {
            setShowDocumentModal(false);
            setViewerInitialPage(undefined);
          }}
        />
      ) : null}

      {/* Delete Document Confirmation Modal */}
      <ModalDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          if (deletingDocumentId) return;
          setShowDeleteConfirm(false);
        }}
        header="Confirm Deletion"
        footer={
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={Boolean(deletingDocumentId)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteDocument}
              disabled={Boolean(deletingDocumentId)}
              className="btn-danger inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {deletingDocumentId ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </button>
          </div>
        }
        maxWidth="md"
        closeOnEscape={!deletingDocumentId}
        closeOnOverlayClick={!deletingDocumentId}
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
