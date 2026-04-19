import { apiClient } from "@/services/api";
import { Loader2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

interface ProcessingStatus {
  status: string;
  details?: string;
  error?: string;
  progress?: number;
  timestamp?: string;
}

interface DocumentProgressTrackerProps {
  documentId: string;
  aiDocumentId: string;
  filename: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
  onRetrySuccess?: () => void;
  apiClient: typeof apiClient;
}

export default function DocumentProgressTracker({
  documentId,
  aiDocumentId,
  onComplete,
  onError,
  onRetrySuccess,
  apiClient,
}: DocumentProgressTrackerProps) {
  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const cleanupRef = useRef(false);
  const pollCountRef = useRef(0);
  const lastSuccessfulPollRef = useRef<number>(Date.now());

  useEffect(() => {
    const checkInitialStatus = async () => {
      try {
        const response = await apiClient.getDocumentStatus(aiDocumentId);
        const currentStatus = (response as { status: ProcessingStatus }).status;

        setStatus(currentStatus);

        // If document is already completed, failed, or not found, don't start polling
        if (
          currentStatus.status === "COMPLETED" ||
          currentStatus.status === "ERROR" ||
          currentStatus.status === "NOT_FOUND"
        ) {
          setIsPolling(false);
          cleanupRef.current = true;

          if (currentStatus.status === "COMPLETED") {
            onComplete?.();
          } else if (currentStatus.status === "ERROR") {
            onError?.(currentStatus.error || "Processing failed");
          } else if (currentStatus.status === "NOT_FOUND") {
            // NOT_FOUND usually means processing completed and status was cleared
            onComplete?.();
          }
          return; // Exit early, no need to set up polling
        }

        // Only start polling if document is actually processing
        if (
          currentStatus.status === "PROCESSING" ||
          currentStatus.status === "PENDING"
        ) {
          startPolling();
        } else {
          // For any other status, don't poll
          setIsPolling(false);
          cleanupRef.current = true;
        }
      } catch (error) {
        console.error("Error checking initial document status:", error);
        // If we can't get initial status, don't start polling
        setIsPolling(false);
        cleanupRef.current = true;
        onError?.("Unable to check document status. Please try again.");
      }
    };

    const startPolling = () => {
      // Reset cleanup flag and counters for new polling cycle
      cleanupRef.current = false;
      pollCountRef.current = 0;
      lastSuccessfulPollRef.current = Date.now();

      const pollStatus = async () => {
        // Don't poll if cleanup has been triggered
        if (cleanupRef.current) return;

        try {
          const response = await apiClient.getDocumentStatus(aiDocumentId);
          const currentStatus = (response as { status: ProcessingStatus })
            .status;

          // Don't update state if cleanup has been triggered
          if (cleanupRef.current) return;

          // Update successful poll timestamp
          lastSuccessfulPollRef.current = Date.now();
          pollCountRef.current = 0; // Reset error count on successful poll

          setStatus(currentStatus);

          // Stop polling if processing is complete, failed, or not found (likely completed)
          if (
            currentStatus.status === "COMPLETED" ||
            currentStatus.status === "ERROR" ||
            currentStatus.status === "NOT_FOUND"
          ) {
            setIsPolling(false);
            cleanupRef.current = true;

            if (currentStatus.status === "COMPLETED") {
              onComplete?.();
            } else if (currentStatus.status === "ERROR") {
              onError?.(currentStatus.error || "Processing failed");
            } else if (currentStatus.status === "NOT_FOUND") {
              // NOT_FOUND usually means processing completed and status was cleared
              onComplete?.();
            }
          }
        } catch (error) {
          // Don't log errors if cleanup has been triggered
          if (cleanupRef.current) return;

          pollCountRef.current++;
          console.error(
            `Error polling document status (attempt ${pollCountRef.current}):`,
            error
          );

          // Handle different types of errors
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";

          // If we get network errors or server errors multiple times, stop polling
          if (pollCountRef.current >= 5) {
            console.error("Too many consecutive errors, stopping polling");
            setIsPolling(false);
            cleanupRef.current = true;
            onError?.(
              "Document processing may have been interrupted. Please check the document status or try uploading again."
            );
            return;
          }

          // Check if too much time has passed since last successful poll (timeout)
          const timeSinceLastSuccess =
            Date.now() - lastSuccessfulPollRef.current;
          const timeoutThreshold = 5 * 60 * 1000; // 5 minutes

          if (timeSinceLastSuccess > timeoutThreshold) {
            console.error(
              "Polling timeout - no successful response for 5 minutes"
            );
            setIsPolling(false);
            cleanupRef.current = true;
            onError?.(
              "Document processing appears to have stopped. Please check the document status or try uploading again."
            );
            return;
          }

          // For temporary errors, continue polling but with exponential backoff
          const backoffDelay = Math.min(
            2000 * Math.pow(2, pollCountRef.current - 1),
            10000
          ); // Max 10 seconds
          setTimeout(() => {
            if (!cleanupRef.current) {
              pollStatus();
            }
          }, backoffDelay);
        }
      };

      // Set up polling interval (every 2 seconds)
      const pollInterval = setInterval(() => {
        if (!cleanupRef.current) {
          pollStatus();
        }
      }, 2000);

      // Set up a timeout to stop polling if it runs too long
      const maxPollingTime = 30 * 60 * 1000; // 30 minutes max
      const timeoutId = setTimeout(() => {
        if (!cleanupRef.current) {
          console.error("Maximum polling time exceeded");
          setIsPolling(false);
          cleanupRef.current = true;
          onError?.(
            "Document processing is taking longer than expected. Please check the document status or try uploading again."
          );
        }
      }, maxPollingTime);

      // Store the interval ID for cleanup
      return () => {
        if (pollInterval) {
          clearInterval(pollInterval);
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    };

    // Check initial status first
    checkInitialStatus();

    return () => {
      // Mark cleanup to prevent any further polling
      cleanupRef.current = true;
    };
  }, [aiDocumentId, apiClient, onComplete, onError]);

  if (!status) {
    return (
      <div className="rounded-md border border-border bg-muted/40 p-3 flex items-start gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Checking status…</p>
          <p className="text-xs text-muted-foreground mt-1">
            You can leave this page — processing continues on the server.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg p-3 bg-card shadow-sm">
      {status.details && (
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
          {status.details}
        </p>
      )}

      {status.status === "NOT_FOUND" && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          Document processing status not found. This might be a new upload or
          the processing has completed.
        </p>
      )}

      {status.progress !== undefined && status.progress > 0 && (
        <div className="mb-2">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
            <span>Progress</span>
            <span>{status.progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${status.progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {(status.status === "ERROR" ||
        (status.error && status.status !== "NOT_FOUND")) && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg space-y-2">
          {status.error && (
            <p className="text-sm text-red-700 dark:text-red-300">
              {status.error}
            </p>
          )}
          {status.status === "ERROR" && (
            <button
              type="button"
              disabled={retrying}
              onClick={async () => {
                setRetrying(true);
                try {
                  await apiClient.retryDocumentProcessing(documentId);
                  onRetrySuccess?.();
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Could not restart processing.",
                  );
                } finally {
                  setRetrying(false);
                }
              }}
              className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <RefreshCw
                className={`w-3 h-3 mr-1 ${retrying ? "animate-spin" : ""}`}
              />
              {retrying ? "Retrying…" : "Retry processing"}
            </button>
          )}
        </div>
      )}

      {isPolling &&
        (status.status === "PROCESSING" || status.status === "PENDING") && (
          <div className="rounded-md border border-blue-200 dark:border-blue-900 bg-blue-50/90 dark:bg-blue-950/50 p-3 flex items-start gap-3 mt-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Processing document…
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Embedding and indexing your file. You don&apos;t need to stay on
                this page — work continues in the background. Refresh or return
                later to see the updated status.
              </p>
            </div>
          </div>
        )}

      {status.timestamp && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Last updated: {new Date(status.timestamp).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
