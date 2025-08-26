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
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
              <LogOut className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Auto Logout in Progress
            </h1>
            <p className="text-muted-foreground">
              You will be automatically logged out in a few seconds.
            </p>
          </div>

          {/* User Info - Only show if user exists */}
          {user && (
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                  Security Notice
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Logging out will end your current session and you'll need to
                  sign in again to access your account.
                </p>
              </div>
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="space-y-4">
            <div className="text-center">
              <div className="mb-4">
                <div className="text-6xl font-bold text-red-600 dark:text-red-400 mb-2">
                  {countdown}
                </div>
                <p className="text-lg text-muted-foreground">
                  {countdown === 1 ? "second" : "seconds"} until automatic
                  logout
                </p>
              </div>

              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${((3 - countdown) / 3) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={handleCancel}
                disabled={isLoggingOut}
                className="flex-1 px-4 py-2 text-sm font-medium text-foreground bg-background border border-input rounded-md hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel & Stay Logged In
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex-1 px-4 py-2 text-sm font-medium text-primary-foreground bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoggingOut ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                    <span>Logging out...</span>
                  </div>
                ) : (
                  "Logout Now"
                )}
              </button>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              This action will log you out from all devices and clear your
              session data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
