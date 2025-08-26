import { AuthGuard } from "@/components/AuthGuard";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

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
                  <Logo size="md" showText={true} />
                </div>

                {/* Right side - Theme Toggle */}
                <div className="flex items-center space-x-4">
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
