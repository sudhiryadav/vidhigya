"use client";

import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import LoadingOverlay from "./LoadingOverlay";

const adminRoutes = [
  "/admin",
  "/admin/dashboard",
  "/admin/settings",
  "/admin/analytics",
  "/admin/billing",
  "/admin/cases",
  "/admin/clients",
  "/admin/documents",
  "/admin/lawyers",
  "/admin/modules",
  "/admin/reports",
];

export function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      // Check if current path is an admin route
      const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
      
      if (isAdminRoute) {
        // Check if user has admin privileges
        const hasAdminAccess = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
        
        if (!hasAdminAccess) {
          console.warn(`Unauthorized access attempt to admin route: ${pathname} by user with role: ${user?.role}`);
          router.push("/dashboard");
          return;
        }
      }
    }
  }, [user, loading, isAuthenticated, pathname, router]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <LoadingOverlay
        isVisible={true}
        title="Checking Access"
        message="Verifying your permissions..."
        absolute={false}
      />
    );
  }

  // If not authenticated, don't render anything (AuthGuard will handle redirect)
  if (!isAuthenticated) {
    return null;
  }

  // Check if current path is an admin route
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
  
  if (isAdminRoute) {
    // Check if user has admin privileges
    const hasAdminAccess = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
    
    if (!hasAdminAccess) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access this area.
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
