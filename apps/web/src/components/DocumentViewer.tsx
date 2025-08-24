"use client";

import { Download, ExternalLink, FileText, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

interface DocumentViewerProps {
  documentId: string;
  documentTitle: string;
  fileType: string;
  onClose: () => void;
}

export default function DocumentViewer({
  documentId,
  documentTitle,
  fileType,
  onClose,
}: DocumentViewerProps) {
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocumentUrl = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get the document download URL
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/documents/${documentId}/download`,
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
    if (fileType.includes("pdf")) {
      return (
        <iframe
          src={documentUrl}
          className="w-full h-full border-0"
          title={documentTitle}
        />
      );
    }

    if (fileType.includes("image")) {
      return (
        <div className="flex items-center justify-center h-full">
          <img
            src={documentUrl}
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
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(documentUrl)}`}
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
    </div>
  );
}
