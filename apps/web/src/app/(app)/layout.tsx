import { AdminRouteGuard } from "@/components/AdminRouteGuard";
import { AuthGuard } from "@/components/AuthGuard";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { SessionTimeoutManager } from "@/components/SessionTimeoutManager";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { AuthProvider } from "@/contexts/AuthContext";
import { FontSizeProvider } from "@/contexts/FontSizeContext";
import { PermissionProvider } from "@/contexts/PermissionContext";
import { PracticeProvider } from "@/contexts/PracticeContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { SuperAdminProvider } from "@/contexts/SuperAdminContext";
import { SystemSettingsProvider } from "@/contexts/SystemSettingsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { VideoCallProvider } from "@/contexts/VideoCallContext";
import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-image-preview": "none",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SystemSettingsProvider>
          <SettingsProvider>
            <FontSizeProvider>
              <VideoCallProvider>
                <PracticeProvider>
                  <PermissionProvider>
                    <SuperAdminProvider>
                      <ToastContainer>
                        <AuthGuard>
                          <AdminRouteGuard>
                            <SessionTimeoutManager />
                            <LayoutWrapper>{children}</LayoutWrapper>
                          </AdminRouteGuard>
                        </AuthGuard>
                      </ToastContainer>
                      {/* Add react-hot-toast Toaster for toast notifications */}
                      <Toaster
                        position="top-right"
                        toastOptions={{
                          duration: 4000,
                          style: {
                            background: "var(--color-toast-bg)",
                            color: "var(--color-toast-color)",
                            border: "1px solid var(--color-toast-border)",
                            backdropFilter: "none",
                            WebkitBackdropFilter: "none",
                            boxShadow:
                              "0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.06)",
                          },
                          success: {
                            iconTheme: {
                              primary: "#ffffff",
                              secondary: "rgb(22 163 74)",
                            },
                          },
                          error: {
                            iconTheme: {
                              primary: "#ffffff",
                              secondary: "rgb(220 38 38)",
                            },
                          },
                        }}
                      />
                    </SuperAdminProvider>
                  </PermissionProvider>
                </PracticeProvider>
              </VideoCallProvider>
            </FontSizeProvider>
          </SettingsProvider>
        </SystemSettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
