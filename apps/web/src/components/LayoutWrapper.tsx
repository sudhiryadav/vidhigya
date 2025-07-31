"use client";

import { usePathname } from "next/navigation";
import { RoleBasedNavigation } from "./RoleBasedNavigation";

const AUTH_ROUTES = ["/login", "/register", "/forgot-password"];

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_ROUTES.includes(pathname);

  if (isAuthPage) {
    return (
      <main className="flex-1 flex flex-col min-h-screen justify-center items-center">
        {children}
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      <RoleBasedNavigation />
      <main className="flex-1 md:ml-64 transition-all duration-300">
        {children}
      </main>
    </div>
  );
}
