"""Shared exception for cooperative cancellation / time budget during document processing."""


class ProcessingAborted(Exception):
    """Raised when the user cancels or the job exceeds DOCUMENT_PROCESSING_TIMEOUT_SEC."""

    def __init__(self, reason: str = "cancelled"):
        self.reason = reason
        super().__init__(reason)


REASON_CANCELLED = "cancelled"
REASON_TIMEOUT = "timeout"
