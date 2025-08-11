"use client";

import { useAuth } from "@/contexts/AuthContext";
import {
  Bell,
  Briefcase,
  Calendar,
  CheckSquare,
  CreditCard,
  FileText,
  Home,
  Menu,
  Search,
  Settings,
  User,
  Users,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import MessageBell from "./MessageBell";
import NotificationBell from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";

const getNavigationByRole = (role: string) => {
  switch (role) {
    case "SUPER_ADMIN":
    case "ADMIN":
      return [
        { name: "Dashboard", href: "/admin/dashboard", icon: Home },
        { name: "Lawyers", href: "/admin/lawyers", icon: Users },
        { name: "Settings", href: "/admin/settings", icon: Settings },
      ];
    case "LAWYER":
    case "ASSOCIATE":
    case "PARALEGAL":
      return [
        { name: "Dashboard", href: "/dashboard", icon: Home },
        { name: "Cases", href: "/cases", icon: Briefcase },
        { name: "Clients", href: "/clients", icon: Users },
        { name: "Calendar", href: "/calendar", icon: Calendar },
        { name: "Tasks", href: "/tasks", icon: CheckSquare },
        { name: "Documents", href: "/documents", icon: FileText },
        { name: "Billing", href: "/billing", icon: CreditCard },
        { name: "Video Calls", href: "/video-calls", icon: Video },
        { name: "Settings", href: "/settings", icon: Settings },
      ];
    case "CLIENT":
      return [
        { name: "Dashboard", href: "/dashboard", icon: Home },
        { name: "My Cases", href: "/cases", icon: Briefcase },
        { name: "Documents", href: "/documents", icon: FileText },
        { name: "Billing", href: "/billing", icon: CreditCard },
        { name: "Calendar", href: "/calendar", icon: Calendar },
        { name: "Video Calls", href: "/video-calls", icon: Video },
        { name: "Notifications", href: "/notifications", icon: Bell },
        { name: "Settings", href: "/settings", icon: Settings },
      ];
    default:
      return [
        { name: "Dashboard", href: "/", icon: Home },
        { name: "Cases", href: "/cases", icon: Briefcase },
        { name: "Clients", href: "/clients", icon: Users },
        { name: "Calendar", href: "/calendar", icon: Calendar },
        { name: "Tasks", href: "/tasks", icon: CheckSquare },
        { name: "Billing", href: "/billing", icon: CreditCard },
      ];
  }
};

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  const navigation = getNavigationByRole(user?.role || "");

  return (
    <nav className="bg-background shadow-sm border-b border-border">
      <div className="container-responsive">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="text-xl font-bold text-foreground">
                Vidhigya
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors duration-200">
              <Search className="w-5 h-5" />
            </button>

            {/* Messages - Show for all roles except admin */}
            {user?.role !== "SUPER_ADMIN" && user?.role !== "ADMIN" && (
              <MessageBell />
            )}

            {/* Notifications */}
            <NotificationBell />

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Menu */}
            <button className="p-2 text-muted-foreground hover:text-foreground transition-colors duration-200">
              <User className="w-5 h-5" />
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-base font-medium transition-colors duration-200 ${
                      isActive
                        ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
