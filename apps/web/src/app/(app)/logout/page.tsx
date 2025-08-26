"use client";

import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Shield, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LogoutPage() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isCountdownActive, setIsCountdownActive] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Clear frontend state first
      if (typeof window !== "undefined") {
        sessionStorage.clear();
      }

      // Call the logout function
      await logout();

      // Redirect to login
      router.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
    }
  };

  const handleCancel = () => {
    // Stop countdown and go back
    setIsCountdownActive(false);
    setCountdown(3);
    router.back();
  };

  // Start countdown immediately (temporarily bypass auth check for testing)
  useEffect(() => {
    if (!isCountdownActive) {
      setIsCountdownActive(true);
      setCountdown(3);
    }
  }, [isCountdownActive]);

  // Countdown timer
  useEffect(() => {
    if (isCountdownActive && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (isCountdownActive && countdown === 0) {
      // Auto logout when countdown reaches 0
      handleLogout();
    }
  }, [isCountdownActive, countdown]);

  // Check authentication status
  useEffect(() => {
    // If no user and not loading, redirect to login
    if (!user && !loading) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Don't render if no user (but allow loading state)
  if (!user && !loading) {
    return null;
  }

  // Show loading state while logging out
  if (isLoggingOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-card rounded-lg shadow-lg border border-border p-8">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
              <LogOut className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Logging Out...
            </h2>
            <p className="text-muted-foreground mb-4">
              Please wait while we securely log you out.
            </p>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm text-muted-foreground">
                Clearing session...
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-card rounded-lg shadow-lg border border-border p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
              <LogOut className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Confirm Logout
            </h2>
            <p className="text-muted-foreground">
              Are you sure you want to log out?
            </p>
          </div>

          {/* User Info */}
          {user && (
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Shield className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground capitalize">
                      {user.role?.toLowerCase().replace("_", " ")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Countdown Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <div className="text-center">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                Auto-logout in {countdown} seconds
              </p>
              <div className="w-full bg-yellow-200 dark:bg-yellow-800 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${((3 - countdown) / 3) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors duration-200"
            >
              {isLoggingOut ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Logging out...</span>
                </div>
              ) : (
                "Logout"
              )}
            </button>
          </div>

          {/* Additional Info */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Your session will be securely terminated and all data will be
              cleared from this device.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
