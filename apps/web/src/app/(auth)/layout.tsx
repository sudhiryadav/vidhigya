import { AuthGuard } from "@/components/AuthGuard";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { AuthProvider } from "@/contexts/AuthContext";
import { FontSizeProvider } from "@/contexts/FontSizeContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SettingsProvider>
          <FontSizeProvider>
            <ToastContainer>
              <AuthGuard>{children}</AuthGuard>
            </ToastContainer>
          </FontSizeProvider>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
