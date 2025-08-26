import { AdminRouteGuard } from "@/components/AdminRouteGuard";
import { AuthGuard } from "@/components/AuthGuard";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { AuthProvider } from "@/contexts/AuthContext";
import { FontSizeProvider } from "@/contexts/FontSizeContext";
import { PermissionProvider } from "@/contexts/PermissionContext";
import { PracticeProvider } from "@/contexts/PracticeContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { SuperAdminProvider } from "@/contexts/SuperAdminContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { VideoCallProvider } from "@/contexts/VideoCallContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <FontSizeProvider>
            <VideoCallProvider>
              <PracticeProvider>
                <PermissionProvider>
                  <SuperAdminProvider>
                    <ToastContainer>
                      <AuthGuard>
                        <AdminRouteGuard>
                          <LayoutWrapper>{children}</LayoutWrapper>
                        </AdminRouteGuard>
                      </AuthGuard>
                    </ToastContainer>
                  </SuperAdminProvider>
                </PermissionProvider>
              </PracticeProvider>
            </VideoCallProvider>
          </FontSizeProvider>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
