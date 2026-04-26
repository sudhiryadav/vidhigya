import { AuthGuard } from "@/components/AuthGuard";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { seoConfig } from "@/lib/seo";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Legal Practice Management for Law Firms",
  description: seoConfig.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: seoConfig.defaultTitle,
    description: seoConfig.description,
    url: seoConfig.siteUrl,
    siteName: seoConfig.siteName,
    locale: seoConfig.locale,
    type: "website",
  },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGuard>
          <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex h-16 items-center justify-between">
                {/* Logo */}
                <div className="flex items-center">
                  <Link href="/" aria-label="Go to home page">
                    <Logo size="md" showText={true} />
                  </Link>
                </div>

                {/* Right side - Theme Toggle */}
                <div className="flex items-center space-x-4">
                  <Link href="/login" className="btn-outline">
                    Log in
                  </Link>
                  <Link href="/register" className="btn-primary">
                    Sign up
                  </Link>
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </header>
          <main className="min-h-screen">{children}</main>
        </AuthGuard>
      </AuthProvider>
    </ThemeProvider>
  );
}
