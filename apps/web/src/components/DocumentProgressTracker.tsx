import { apiClient } from "@/services/api";
import { getSocketService } from "@/services/socket";
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

interface ProcessingDiagnostics {
  statusSource: "ai-service" | "backend-fallback";
  ocrProvider: "current" | "google";
  note?: string;
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
  const isDiagnosticsEnabled =
    (process.env.NEXT_PUBLIC_NODE_ENV ?? process.env.NODE_ENV) ===
    "development";
  const [status, setStatus] = useState<ProcessingStatus | null>(null);
  const [diagnostics, setDiagnostics] = useState<ProcessingDiagnostics | null>(
    null
  );
  const [isPolling, setIsPolling] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const cleanupRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const lastTerminalStatusRef = useRef<string | null>(null);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  const parseStatusResponse = (response: unknown): {
    status: ProcessingStatus;
    diagnostics: ProcessingDiagnostics | null;
  } => {
    const payload = response as {
      status?: ProcessingStatus;
      diagnostics?: ProcessingDiagnostics;
    };
    return {
      status: payload?.status ?? { status: "PROCESSING" },
      diagnostics: payload?.diagnostics ?? null,
    };
  };

  useEffect(() => {
    const applyStatusUpdate = (incomingStatus: ProcessingStatus) => {
      setStatus((previousStatus) => {
        if (!previousStatus) {
          return incomingStatus;
        }

        const incomingTime = incomingStatus.timestamp
          ? new Date(incomingStatus.timestamp).getTime()
          : NaN;
        const previousTime = previousStatus.timestamp
          ? new Date(previousStatus.timestamp).getTime()
          : NaN;

        // Prefer newer updates when timestamps are available.
        if (!Number.isNaN(incomingTime) && !Number.isNaN(previousTime)) {
          if (incomingTime < previousTime) {
            return previousStatus;
          }
        }

        const processingStates = new Set(["PROCESSING", "PENDING"]);
        const incomingProgress = incomingStatus.progress;
        const previousProgress = previousStatus.progress;

        // Guard against backward progress jumps for in-flight processing.
        if (
          processingStates.has(incomingStatus.status) &&
          processingStates.has(previousStatus.status) &&
          typeof incomingProgress === "number" &&
          typeof previousProgress === "number" &&
          incomingProgress < previousProgress
        ) {
          return previousStatus;
        }

        return incomingStatus;
      });
    };

    const handleTerminalStatus = (currentStatus: ProcessingStatus) => {
      const terminalStatuses = new Set([
        "COMPLETED",
        "ERROR",
        "NOT_FOUND",
        "CANCELLED",
      ]);
      if (!terminalStatuses.has(currentStatus.status)) {
        return;
      }
      if (lastTerminalStatusRef.current === currentStatus.status) {
        return;
      }
      lastTerminalStatusRef.current = currentStatus.status;

      if (currentStatus.status === "COMPLETED") {
        setIsPolling(false);
        cleanupRef.current = true;
        onCompleteRef.current?.();
      } else if (currentStatus.status === "ERROR") {
        setIsPolling(false);
        cleanupRef.current = true;
        onErrorRef.current?.(currentStatus.error || "Processing failed");
      } else if (currentStatus.status === "NOT_FOUND") {
        setIsPolling(false);
        cleanupRef.current = true;
        onCompleteRef.current?.();
      } else if (currentStatus.status === "CANCELLED") {
        setIsPolling(false);
        cleanupRef.current = true;
        onErrorRef.current?.(currentStatus.details || "Processing was stopped.");
      }
    };

    cleanupRef.current = false;
    setIsPolling(true);
    lastTerminalStatusRef.current = null;
    setStatus((prev) =>
      prev ?? {
        status: "PROCESSING",
        details: "Waiting for live processing updates...",
        progress: 0,
      }
    );

    const socketService = getSocketService();
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (!socketService.isSocketConnected() && token) {
      socketService.connect(token);
    }
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData) as { id?: string };
        if (parsedUser.id) {
          socketService.joinPersonalRoom(parsedUser.id);
        }
      } catch {
        // ignore malformed local user cache
      }
    }

    const handleDocumentStatusUpdate = (
      event: Event
    ) => {
      if (cleanupRef.current) {
        return;
      }
      const customEvent = event as CustomEvent<{
        aiDocumentId?: string;
        status?: ProcessingStatus;
        diagnostics?: ProcessingDiagnostics;
      }>;
      if (customEvent.detail?.aiDocumentId !== aiDocumentId) {
        return;
      }
      if (!customEvent.detail?.status) {
        return;
      }
      applyStatusUpdate(customEvent.detail.status);
      setDiagnostics(customEvent.detail.diagnostics ?? null);
      handleTerminalStatus(customEvent.detail.status);
    };

    window.addEventListener("documentStatusUpdate", handleDocumentStatusUpdate);

    return () => {
      cleanupRef.current = true;
      window.removeEventListener(
        "documentStatusUpdate",
        handleDocumentStatusUpdate
      );
    };
  }, [aiDocumentId]);

  if (!status) {
    return (
      <div className="rounded-md border border-border bg-muted/40 p-3 flex items-start gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0 mt-0.5" />
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
        <p className="mb-2 text-sm text-foreground">{status.details}</p>
      )}

      {status.status === "NOT_FOUND" && (
        <p className="mb-2 text-sm text-muted-foreground">
          Document processing status not found. This might be a new upload or
          the processing has completed.
        </p>
      )}

      {status.progress !== undefined && status.progress >= 0 && (
        <div className="mb-2">
          <div className="mb-1 flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{status.progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="h-2 rounded-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${status.progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {(status.status === "ERROR" ||
        (status.error && status.status !== "NOT_FOUND")) && (
        <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2">
          {status.error && (
            <p className="text-sm text-destructive">{status.error}</p>
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
              className="inline-flex items-center rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
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
          <div className="mt-2 flex items-start gap-3 rounded-md border border-primary/20 bg-primary/10 p-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0 mt-0.5" />
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
        <p className="mt-2 text-xs text-muted-foreground">
          Last updated: {new Date(status.timestamp).toLocaleTimeString()}
        </p>
      )}

      {isDiagnosticsEnabled && diagnostics && (
        <div className="mt-2 rounded-md border border-border/70 bg-muted/40 px-2 py-1.5 text-[11px] text-muted-foreground">
          <p>
            Dev diagnostics: source{" "}
            <span className="font-medium text-foreground">
              {diagnostics.statusSource}
            </span>{" "}
            · OCR{" "}
            <span className="font-medium text-foreground">
              {diagnostics.ocrProvider === "google"
                ? "google-gemini"
                : "current/internal"}
            </span>
          </p>
          {diagnostics.note && <p className="mt-0.5">{diagnostics.note}</p>}
        </div>
      )}
    </div>
  );
}
