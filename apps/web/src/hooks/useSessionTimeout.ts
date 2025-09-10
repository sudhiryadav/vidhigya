import { useAuth } from "@/contexts/AuthContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
import { useEffect, useRef } from "react";

export function useSessionTimeout() {
  const { logout } = useAuth();
  const { sessionTimeout } = useSystemSettings();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout based on system settings
    const timeoutMs = sessionTimeout * 60 * 1000; // Convert minutes to milliseconds

    timeoutRef.current = setTimeout(() => {
      logout();
    }, timeoutMs);

    // Reset timeout on user activity
    const resetTimeout = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        logout();
      }, timeoutMs);
    };

    // Listen for user activity events
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    events.forEach((event) => {
      document.addEventListener(event, resetTimeout, true);
    });

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      events.forEach((event) => {
        document.removeEventListener(event, resetTimeout, true);
      });
    };
  }, [sessionTimeout, logout]);

  // Return remaining time in minutes
  const getRemainingTime = (): number => {
    // This is a simplified calculation - in a real app you might want to track the actual start time
    return sessionTimeout;
  };

  return { getRemainingTime };
}
