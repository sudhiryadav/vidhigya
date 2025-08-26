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
import { Toaster } from "react-hot-toast";

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
                            background: "var(--background)",
                            color: "var(--foreground)",
                            border: "1px solid var(--border)",
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
