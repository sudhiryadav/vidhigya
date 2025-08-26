import { AlertTriangle, Clock, MessageSquare, Wrench } from "lucide-react";

interface MaintenanceModeProps {
  estimatedTime?: string;
  message?: string;
}

export function MaintenanceMode({
  estimatedTime,
  message = "We're currently performing system maintenance to improve your experience. Please check back soon.",
}: MaintenanceModeProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-card border border-border rounded-xl shadow-lg p-8">
          {/* Icon */}
          <div className="mx-auto mb-6">
            <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto">
              <Wrench className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-foreground mb-4">
            System Maintenance
          </h1>

          {/* Message */}
          <p className="text-muted-foreground mb-6">{message}</p>

          {/* Estimated Time - Only show if provided */}
          {estimatedTime && (
            <div className="flex items-center justify-center space-x-2 mb-6 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Estimated completion: {estimatedTime}</span>
            </div>
          )}

          {/* Status */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">
                Maintenance in Progress
              </span>
            </div>
          </div>

          {/* Contact Info */}
          <div className="text-xs text-muted-foreground">
            <p>
              If you have urgent matters, please contact your system
              administrator.
            </p>
            <div className="flex items-center justify-center space-x-1 mt-2">
              <MessageSquare className="w-3 h-3" />
              <span>Support: admin@vidhigya.com</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
