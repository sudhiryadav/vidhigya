"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PermissionBasedNavigation } from "./PermissionBasedNavigation";

const AUTH_ROUTES = ["/login", "/register", "/forgot-password"];

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = AUTH_ROUTES.includes(pathname);

  useEffect(() => {
    const handleAppNavigate = (event: Event) => {
      const customEvent = event as CustomEvent<{ path?: string }>;
      const targetPath = customEvent.detail?.path;
      if (targetPath) {
        router.push(targetPath);
      }
    };

    window.addEventListener("app:navigate", handleAppNavigate as EventListener);
    return () => {
      window.removeEventListener(
        "app:navigate",
        handleAppNavigate as EventListener
      );
    };
  }, [router]);

  if (isAuthPage) {
    return (
      <main className="flex-1 flex flex-col min-h-screen justify-center items-center">
        {children}
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      <PermissionBasedNavigation />
      <main className="flex-1 md:ml-64 transition-all duration-300">
        {children}
      </main>
    </div>
  );
}
