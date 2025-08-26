import { AuthGuard } from "@/components/AuthGuard";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { AuthProvider } from "@/contexts/AuthContext";
import { FontSizeProvider } from "@/contexts/FontSizeContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "react-hot-toast";

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
          </FontSizeProvider>
        </SettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
