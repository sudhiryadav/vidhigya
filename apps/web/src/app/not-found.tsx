"use client";

import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Building2,
  FileText,
  Home,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NotFound() {
  const pathname = usePathname();

  // Determine if this is an admin page
  const isAdminPage = pathname?.startsWith("/admin");

  // Get suggested navigation based on current path
  const getSuggestedNavigation = () => {
    const suggestions = [];

    if (isAdminPage) {
      suggestions.push(
        { name: "Dashboard", href: "/admin/dashboard", icon: Home },
        { name: "Lawyers", href: "/admin/lawyers", icon: Users },
        { name: "Clients", href: "/admin/clients", icon: Building2 },
        { name: "Cases", href: "/admin/cases", icon: Briefcase },
        { name: "Documents", href: "/admin/documents", icon: FileText }
      );
    } else {
      suggestions.push(
        { name: "Dashboard", href: "/dashboard", icon: Home },
        { name: "Practice", href: "/practice", icon: Building2 },
        { name: "Cases", href: "/cases", icon: Briefcase },
        { name: "Clients", href: "/clients", icon: Users },
        { name: "Documents", href: "/documents", icon: FileText }
      );
    }

    return suggestions;
  };

  const suggestedNavigation = getSuggestedNavigation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* 404 Icon */}
        <div className="mb-8">
          <div className="relative">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-16 h-16 text-primary" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-destructive rounded-full flex items-center justify-center">
              <span className="text-destructive-foreground text-sm font-bold">
                4
              </span>
            </div>
            <div className="absolute -bottom-2 -left-2 w-8 h-8 bg-destructive rounded-full flex items-center justify-center">
              <span className="text-destructive-foreground text-sm font-bold">
                4
              </span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-foreground mb-4">Oops!</h1>
          <h2 className="text-2xl font-semibold text-muted-foreground mb-4">
            Page Not Found
          </h2>
          <p className="text-lg text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            URL:{" "}
            <code className="bg-muted px-2 py-1 rounded text-xs">
              {pathname}
            </code>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Link href="/">
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </Link>

          <Link href="/dashboard">
            <Button variant="outline" size="lg">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Suggested Navigation */}
        {suggestedNavigation.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-medium text-foreground mb-4">
              You might be looking for:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {suggestedNavigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group p-4 bg-card hover:bg-accent rounded-lg border border-border transition-all duration-200 hover:shadow-md"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {item.name}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-medium text-foreground mb-3">
            Need Help?
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4" />
              <span>Use the search bar to find what you need</span>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Contact your system administrator</span>
            </div>
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Check the navigation menu</span>
            </div>
            <div className="flex items-center space-x-2">
              <Home className="w-4 h-4" />
              <span>Return to the main dashboard</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            If you believe this is an error, please contact support
          </p>
          <div className="mt-2 flex items-center justify-center space-x-4 text-xs text-muted-foreground">
            <span>Error Code: 404</span>
            <span>•</span>
            <span>Page: {pathname}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
