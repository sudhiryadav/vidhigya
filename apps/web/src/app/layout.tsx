import { AuthGuard } from "@/components/AuthGuard";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { AuthProvider } from "@/contexts/AuthContext";
import { FontSizeProvider } from "@/contexts/FontSizeContext";
import { PermissionProvider } from "@/contexts/PermissionContext";
import { PracticeProvider } from "@/contexts/PracticeContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { VideoCallProvider } from "@/contexts/VideoCallContext";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <meta name="color-scheme" content="light dark" />
        <title>Vidhigya - Legal Practice Management</title>
        <meta
          name="description"
          content="Comprehensive legal practice management platform for lawyers and law firms"
        />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/logo.svg" />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <SettingsProvider>
              <FontSizeProvider>
                <VideoCallProvider>
                  <PracticeProvider>
                    <PermissionProvider>
                      <ToastContainer>
                        <AuthGuard>
                          <LayoutWrapper>{children}</LayoutWrapper>
                        </AuthGuard>
                      </ToastContainer>
                    </PermissionProvider>
                  </PracticeProvider>
                </VideoCallProvider>
              </FontSizeProvider>
            </SettingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
