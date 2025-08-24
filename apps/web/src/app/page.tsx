"use client";

import LoadingOverlay from "@/components/LoadingOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else {
        // Redirect based on role
        if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
          router.push("/admin/dashboard");
        } else {
          router.push("/dashboard");
        }
      }
    }
  }, [user, loading, router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingOverlay
        isVisible={loading}
        title="Redirecting"
        message="Please wait while we redirect you to the appropriate page..."
        absolute={false}
      />

      {!loading && (
        <div className="flex flex-col items-center space-y-4">
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      )}
    </div>
  );
}
