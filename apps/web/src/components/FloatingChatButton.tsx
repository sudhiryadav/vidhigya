"use client";

import { MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface FloatingChatButtonProps {
  className?: string;
}

export default function FloatingChatButton({
  className = "",
}: FloatingChatButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();

  const handleChatClick = () => {
    // Navigate to the chat page
    router.push("/chat");
  };

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      {/* Main Chat Button */}
      <button
        onClick={handleChatClick}
        className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-background"
        title="Start Chat"
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      {/* Optional: Quick Actions Menu */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 mb-2 bg-card border border-border rounded-lg shadow-lg p-2 min-w-[200px]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              Quick Actions
            </span>
            <button
              onClick={handleToggle}
              className="text-muted-foreground hover:text-foreground p-1 rounded"
            >
              <span className="text-xs">✕</span>
            </button>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => {
                router.push("/chat");
                setIsExpanded(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted rounded transition-colors"
            >
              💬 Start New Chat
            </button>
            <button
              onClick={() => {
                router.push("/notifications");
                setIsExpanded(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted rounded transition-colors"
            >
              🔔 View Notifications
            </button>
            <button
              onClick={() => {
                router.push("/video-calls");
                setIsExpanded(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted rounded transition-colors"
            >
              📹 Video Call
            </button>
          </div>
        </div>
      )}

      {/* Toggle Button for Quick Actions */}
      <button
        onClick={handleToggle}
        className={`absolute -top-2 -left-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-full p-1.5 shadow-md transition-all duration-200 ${
          isExpanded ? "rotate-45" : ""
        }`}
        title="Quick Actions"
      >
        <div className="w-3 h-3 flex items-center justify-center">
          <span className="text-xs">⚙️</span>
        </div>
      </button>
    </div>
  );
}
