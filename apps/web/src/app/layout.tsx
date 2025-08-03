"use client";

import { AuthGuard } from "@/components/AuthGuard";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { AuthProvider } from "@/contexts/AuthContext";
import { FontSizeProvider } from "@/contexts/FontSizeContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
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
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <SettingsProvider>
              <FontSizeProvider>
                <ToastContainer>
                  <AuthGuard>
                    <LayoutWrapper>{children}</LayoutWrapper>
                  </AuthGuard>
                </ToastContainer>
              </FontSizeProvider>
            </SettingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
