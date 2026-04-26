"use client";

import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import LoadingOverlay from "./LoadingOverlay";

const publicRoutes = ["/", "/landing", "/login", "/register", "/forgot-password"];
const specialRoutes = ["/logout"]; // Routes that need special handling

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  // Helper function to check if current path is a public route
  const isPublicRoute = (path: string) => {
    return publicRoutes.some((route) => {
      if (route === "/") {
        return path === "/";
      }
      return path === route || path.startsWith(`${route}/`);
    });
  };

  useEffect(() => {
    // Reset redirect flag when pathname changes
    hasRedirected.current = false;
  }, [pathname]);

  useEffect(() => {
    if (!loading && !hasRedirected.current) {
      // Add a small delay to prevent race conditions
      const timeoutId = setTimeout(() => {
        // If user is not authenticated and trying to access a protected route
        if (!isAuthenticated && !isPublicRoute(pathname)) {
          hasRedirected.current = true;
          router.push("/login");
          return;
        }

        // If user is authenticated and trying to access login page
        if (isAuthenticated && isPublicRoute(pathname)) {
          hasRedirected.current = true;
          // Redirect based on role
          if (user?.role === "SUPER_ADMIN" || user?.role === "ADMIN") {
            router.push("/admin/dashboard");
          } else {
            router.push("/dashboard");
          }
          return;
        }

        // If user is authenticated and on logout page, allow access (don't redirect)
        if (isAuthenticated && pathname === "/logout") {
          return; // Allow access to logout page
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

  // Check if current path is a public route or special route
  const isCurrentPublicRoute = isPublicRoute(pathname);
  const isSpecialRoute = specialRoutes.includes(pathname);

  return (
    <>
      <LoadingOverlay
        isVisible={loading && !isCurrentPublicRoute && !isSpecialRoute}
        title="Loading Authentication"
        message="Please wait while we verify your credentials..."
        absolute={false}
      />

      {children}
      {/* Hidden FloatingChatButton on all authenticated pages */}
      {/* {isAuthenticated && <FloatingChatButton />} */}
    </>
  );
}
