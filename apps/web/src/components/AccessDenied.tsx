import { AlertCircle } from "lucide-react";

interface AccessDeniedProps {
  title?: string;
  message?: string;
  showGoBack?: boolean;
  className?: string;
}

export function AccessDenied({
  title = "Access Denied",
  message = "You don't have permission to access this page. This page is only available to authorized users.",
  showGoBack = true,
  className = "",
}: AccessDeniedProps) {
  return (
    <div className={`container mx-auto px-4 py-8 ${className}`}>
      <div className="text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
        <p className="text-muted-foreground mb-4">{message}</p>
        {showGoBack && (
          <button
            onClick={() => window.history.back()}
            className="btn-secondary"
          >
            Go Back
          </button>
        )}
      </div>
    </div>
  );
}
