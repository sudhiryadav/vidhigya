"use client";

import { Download, ExternalLink, FileText, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

/** NEXT_PUBLIC_API_URL may be `http://host:port` or `http://host:port/api`. */
function documentsApiBase(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  if (!raw) return "";
  return raw.endsWith("/api") ? raw : `${raw}/api`;
}

interface DocumentViewerProps {
  documentId: string;
  documentTitle: string;
  fileType: string;
  onClose: () => void;
  /** 1-based page index for PDF viewers (uses `#page=` fragment). */
  initialPage?: number;
  /** Optional snippet to search/highlight in PDF viewers (best effort). */
  initialSearchText?: string;
}

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function DocumentViewer({
  documentId,
  documentTitle,
  fileType,
  onClose,
  initialPage,
  initialSearchText,
}: DocumentViewerProps) {
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null);
  const [currentPdfPage, setCurrentPdfPage] = useState(
    typeof initialPage === "number" && initialPage > 0 ? initialPage : 1
  );

  useEffect(() => {
    setCurrentPdfPage(
      typeof initialPage === "number" && initialPage > 0 ? initialPage : 1
    );
  }, [initialPage, documentId]);

  useEffect(() => {
    const fetchDocumentUrl = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get the document download URL
        const apiBase = documentsApiBase();
        if (!apiBase) {
          throw new Error("NEXT_PUBLIC_API_URL is not configured");
        }

        const response = await fetch(
          `${apiBase}/documents/${documentId}/download`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Document not found");
          } else if (response.status === 403) {
            throw new Error("Access denied to this document");
          } else {
            throw new Error(`Failed to fetch document: ${response.status}`);
          }
        }

        // The backend redirects to a signed URL, so we need to get the final URL
        if (response.redirected) {
          setDocumentUrl(response.url);
        } else {
          // If no redirect, try to get the blob and create a URL
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setDocumentUrl(url);
        }
      } catch (err) {
        console.error("Error fetching document:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load document"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDocumentUrl();

    // Cleanup function to revoke object URL
    return () => {
      if (documentUrl && documentUrl.startsWith("blob:")) {
        URL.revokeObjectURL(documentUrl);
      }
    };
  }, [documentId]);

  const isPdf = useMemo(() => {
    const normalizedType = fileType.toLowerCase();
    const normalizedTitle = documentTitle.toLowerCase();
    return normalizedType.includes("pdf") || normalizedTitle.endsWith(".pdf");
  }, [fileType, documentTitle]);

  const viewerMediaUrl = useMemo(() => {
    if (!documentUrl) return null;
    if (!isPdf) {
      return documentUrl;
    }

    const hashParams: string[] = [];
    if (typeof initialPage === "number" && initialPage > 0) {
      hashParams.push(`page=${initialPage}`);
    }

    const searchText =
      typeof initialSearchText === "string"
        ? initialSearchText.trim().slice(0, 120)
        : "";
    if (searchText) {
      hashParams.push(`search=${encodeURIComponent(searchText)}`);
    }

    if (hashParams.length === 0) {
      return documentUrl;
    }

    const hash = hashParams.join("&");
    if (documentUrl.includes("#")) {
      return `${documentUrl}&${hash}`;
    }
    return `${documentUrl}#${hash}`;
  }, [documentUrl, initialPage, initialSearchText, isPdf]);

  const escapedSearchText = useMemo(() => {
    const searchText =
      typeof initialSearchText === "string"
        ? initialSearchText.replace(/\s+/g, " ").trim().slice(0, 120)
        : "";
    if (!searchText) return "";
    return searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }, [initialSearchText]);

  const handleDownload = () => {
    if (documentUrl) {
      const link = document.createElement("a");
      link.href = documentUrl;
      link.download = documentTitle;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleOpenInNewTab = () => {
    if (documentUrl) {
      window.open(documentUrl, "_blank");
    }
  };

  const renderDocumentContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-muted-foreground">
            Loading document...
          </span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={handleOpenInNewTab}
              className="btn-primary flex items-center mx-auto"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </button>
          </div>
        </div>
      );
    }

    if (!documentUrl) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Document not available</p>
          </div>
        </div>
      );
    }

    // Render based on file type
    if (isPdf) {
      return (
        <div className="h-full overflow-auto bg-muted/20">
          <div className="flex items-center justify-between border-b border-border px-4 py-2 bg-card sticky top-0 z-10">
            <div className="text-sm text-muted-foreground">
              {pdfPageCount
                ? `Page ${currentPdfPage} of ${pdfPageCount}`
                : "Loading pages..."}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setCurrentPdfPage((prev) => Math.max(1, prev - 1))
                }
                disabled={currentPdfPage <= 1}
                className="px-2 py-1 text-xs rounded border border-border disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() =>
                  setCurrentPdfPage((prev) => {
                    if (!pdfPageCount) return prev + 1;
                    return Math.min(pdfPageCount, prev + 1);
                  })
                }
                disabled={pdfPageCount != null && currentPdfPage >= pdfPageCount}
                className="px-2 py-1 text-xs rounded border border-border disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
          <div className="p-4 flex justify-center">
            <Document
              file={documentUrl}
              loading={
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              }
              onLoadSuccess={({ numPages }) => {
                setPdfPageCount(numPages);
                setCurrentPdfPage((prev) => {
                  const target =
                    typeof initialPage === "number" && initialPage > 0
                      ? initialPage
                      : prev;
                  return Math.min(Math.max(target, 1), numPages);
                });
              }}
              onLoadError={(pdfError) => {
                console.error("Error loading PDF:", pdfError);
                setError("Failed to render PDF preview");
              }}
            >
              <Page
                pageNumber={currentPdfPage}
                renderAnnotationLayer={true}
                renderTextLayer={true}
                width={1000}
                customTextRenderer={({ str }) => {
                  if (!escapedSearchText) {
                    return str;
                  }
                  const re = new RegExp(`(${escapedSearchText})`, "ig");
                  if (!re.test(str)) {
                    return str;
                  }
                  return str.replace(re, "<mark>$1</mark>");
                }}
              />
            </Document>
          </div>
        </div>
      );
    }

    if (fileType.includes("image")) {
      return (
        <div className="flex items-center justify-center h-full">
          <img
            src={viewerMediaUrl || documentUrl}
            alt={documentTitle}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      );
    }

    if (fileType.includes("text/plain") || fileType.includes("txt")) {
      return (
        <div className="h-full overflow-auto p-4">
          <pre className="whitespace-pre-wrap text-sm text-foreground font-mono">
            {/* We'll need to fetch the text content separately */}
            <div className="text-center text-gray-500 dark:text-gray-400">
              Text file detected. Click "Open in New Tab" to view content.
            </div>
          </pre>
        </div>
      );
    }

    if (
      fileType.includes("text") ||
      fileType.includes("doc") ||
      fileType.includes("word") ||
      fileType.includes("excel") ||
      fileType.includes("powerpoint")
    ) {
      return (
        <div className="h-full overflow-auto p-4">
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewerMediaUrl || documentUrl)}`}
            className="w-full h-full border-0"
            title={documentTitle}
          />
        </div>
      );
    }

    // Default fallback
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">
            Preview not available for this file type
          </p>
          <div className="space-x-3">
            <button
              onClick={handleDownload}
              className="btn-secondary flex items-center mx-auto mb-2"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </button>
            <button
              onClick={handleOpenInNewTab}
              className="btn-primary flex items-center mx-auto"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg w-full max-w-7xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {documentTitle}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {fileType}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Download document"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={handleOpenInNewTab}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Open in new tab"
            >
              <ExternalLink className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">{renderDocumentContent()}</div>
      </div>
      <style jsx global>{`
        .react-pdf__Page {
          position: relative;
          box-shadow: 0 1px 6px rgba(0, 0, 0, 0.2);
        }
        .react-pdf__Page__textContent {
          position: absolute;
          inset: 0;
          overflow: hidden;
          line-height: 1;
        }
        .react-pdf__Page__textContent mark {
          background: rgba(250, 204, 21, 0.45);
          padding: 0;
        }
        .react-pdf__Page__annotations {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
