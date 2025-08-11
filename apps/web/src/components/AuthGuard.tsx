"use client";

import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import FloatingChatButton from "./FloatingChatButton";

const publicRoutes = ["/login", "/register", "/forgot-password"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Reset redirect flag when pathname changes
    hasRedirected.current = false;
  }, [pathname]);

  useEffect(() => {
    if (!loading && !hasRedirected.current) {
      // Add a small delay to prevent race conditions
      const timeoutId = setTimeout(() => {
        // If user is not authenticated and trying to access a protected route
        if (!isAuthenticated && !publicRoutes.includes(pathname)) {
          hasRedirected.current = true;
          router.push("/login");
          return;
        }

        // If user is authenticated and trying to access login page
        if (isAuthenticated && pathname === "/login") {
          hasRedirected.current = true;
          // Redirect based on role
          if (user?.role === "SUPER_ADMIN" || user?.role === "ADMIN") {
            router.push("/admin/dashboard");
          } else {
            router.push("/dashboard");
          }
          return;
        }

        // If user is authenticated and on root path, redirect to appropriate dashboard
        if (isAuthenticated && pathname === "/") {
          hasRedirected.current = true;
          if (user?.role === "SUPER_ADMIN" || user?.role === "ADMIN") {
            router.push("/admin/dashboard");
          } else {
            router.push("/dashboard");
          }
          return;
        }
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [user, loading, isAuthenticated, pathname, router]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      {/* Show FloatingChatButton on all authenticated pages */}
      {isAuthenticated && <FloatingChatButton />}
    </>
  );
}
