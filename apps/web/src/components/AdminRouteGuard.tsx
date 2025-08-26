"use client";

import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AccessDenied } from "./AccessDenied";
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
  "/admin/reports",
];

export function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      // Check if current path is an admin route
      const isAdminRoute = adminRoutes.some((route) =>
        pathname.startsWith(route)
      );

      if (isAdminRoute) {
        // Check if user has admin privileges
        const hasAdminAccess =
          user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

        if (!hasAdminAccess) {
          console.warn(
            `Unauthorized access attempt to admin route: ${pathname} by user with role: ${user?.role}`
          );
          router.push("/dashboard");
          return;
        }
      }
    }
  }, [user, loading, isAuthenticated, pathname, router]);

  // Check if current path is an admin route
  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

  // Show loading only for admin routes while checking authentication
  if (loading && isAdminRoute) {
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

  if (isAdminRoute) {
    // Check if user has admin privileges
    const hasAdminAccess =
      user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";

    if (!hasAdminAccess) {
      return (
        <AccessDenied
          title="Access Denied"
          message="You don't have permission to access this area."
          showGoBack={false}
        />
      );
    }
  }

  return <>{children}</>;
}
