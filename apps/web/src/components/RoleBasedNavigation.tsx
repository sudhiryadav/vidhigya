"use client";

import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  CheckSquare,
  ChevronDown,
  CreditCard,
  FileText,
  Gavel,
  Home,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
  Users,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import NotificationBell from "./NotificationBell";
import ProfilePicture from "./ProfilePicture";
import { ThemeToggle } from "./ThemeToggle";

// Navigation items for different roles
const navigationItems = {
  SUPER_ADMIN: [
    { name: "Dashboard", href: "/admin/dashboard", icon: Home },
    { name: "Lawyers", href: "/admin/lawyers", icon: Users },
    { name: "Clients", href: "/admin/clients", icon: Building2 },
    { name: "Cases", href: "/admin/cases", icon: Briefcase },
    { name: "Documents", href: "/admin/documents", icon: FileText },
    { name: "Billing", href: "/admin/billing", icon: CreditCard },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { name: "System Settings", href: "/admin/settings", icon: Settings },
    { name: "Courts", href: "/admin/courts", icon: Gavel },
  ],
  ADMIN: [
    { name: "Dashboard", href: "/admin/dashboard", icon: Home },
    { name: "Lawyers", href: "/admin/lawyers", icon: Users },
    { name: "Clients", href: "/admin/clients", icon: Building2 },
    { name: "Cases", href: "/admin/cases", icon: Briefcase },
    { name: "Documents", href: "/admin/documents", icon: FileText },
    { name: "Billing", href: "/admin/billing", icon: CreditCard },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  ],
  LAWYER: [
    { name: "Dashboard", href: "/lawyer/dashboard", icon: Home },
    { name: "Cases", href: "/lawyer/cases", icon: Briefcase },
    { name: "Clients", href: "/lawyer/clients", icon: Users },
    { name: "Calendar", href: "/lawyer/calendar", icon: Calendar },
    { name: "Tasks", href: "/lawyer/tasks", icon: CheckSquare },
    { name: "Documents", href: "/lawyer/documents", icon: FileText },
    { name: "Search & Reference", href: "/lawyer/search", icon: Search },
    { name: "Reports", href: "/lawyer/reports", icon: BarChart3 },
    { name: "Billing", href: "/lawyer/billing", icon: CreditCard },
    { name: "Video Calls", href: "/lawyer/video-calls", icon: Video },
    { name: "Notifications", href: "/lawyer/notifications", icon: Bell },
  ],
  ASSOCIATE: [
    { name: "Dashboard", href: "/lawyer/dashboard", icon: Home },
    { name: "Cases", href: "/lawyer/cases", icon: Briefcase },
    { name: "Clients", href: "/lawyer/clients", icon: Users },
    { name: "Calendar", href: "/lawyer/calendar", icon: Calendar },
    { name: "Tasks", href: "/lawyer/tasks", icon: CheckSquare },
    { name: "Documents", href: "/lawyer/documents", icon: FileText },
    { name: "Search & Reference", href: "/lawyer/search", icon: Search },
    { name: "Reports", href: "/lawyer/reports", icon: BarChart3 },
    { name: "Video Calls", href: "/lawyer/video-calls", icon: Video },
    { name: "Notifications", href: "/lawyer/notifications", icon: Bell },
  ],
  PARALEGAL: [
    { name: "Dashboard", href: "/lawyer/dashboard", icon: Home },
    { name: "Cases", href: "/lawyer/cases", icon: Briefcase },
    { name: "Tasks", href: "/lawyer/tasks", icon: CheckSquare },
    { name: "Documents", href: "/lawyer/documents", icon: FileText },
    { name: "Calendar", href: "/lawyer/calendar", icon: Calendar },
    { name: "Video Calls", href: "/lawyer/video-calls", icon: Video },
    { name: "Notifications", href: "/lawyer/notifications", icon: Bell },
  ],
  CLIENT: [
    { name: "Dashboard", href: "/client/dashboard", icon: Home },
    { name: "My Cases", href: "/client/cases", icon: Briefcase },
    { name: "Documents", href: "/client/documents", icon: FileText },
    { name: "Billing", href: "/client/billing", icon: CreditCard },
    { name: "Events", href: "/client/events", icon: Calendar },
    { name: "Video Calls", href: "/client/video-calls", icon: Video },
    { name: "Notifications", href: "/client/notifications", icon: Bell },
    { name: "Settings", href: "/client/settings", icon: Settings },
  ],
};

export function RoleBasedNavigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, hasRole } = useAuth();

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (userMenuOpen && !target.closest(".user-menu-container")) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen]);

  if (!user) return null;

  const navigation = navigationItems[user.role] || [];

  const getRoleBadge = () => {
    const roleColors = {
      SUPER_ADMIN:
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      ADMIN: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      LAWYER: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      ASSOCIATE:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      PARALEGAL:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      CLIENT: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    };
    return roleColors[user.role] || roleColors.CLIENT;
  };

  const handleProfileClick = () => {
    setUserMenuOpen(false);
    if (user?.role === "CLIENT") {
      router.push("/client/profile");
    } else if (user?.role === "SUPER_ADMIN" || user?.role === "ADMIN") {
      router.push("/admin/profile");
    } else {
      router.push("/lawyer/profile");
    }
  };

  const handleSettingsClick = () => {
    setUserMenuOpen(false);
    if (user?.role === "SUPER_ADMIN" || user?.role === "ADMIN") {
      router.push("/admin/settings");
    } else if (user?.role === "CLIENT") {
      router.push("/client/settings");
    } else {
      router.push("/lawyer/settings");
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          ) : (
            <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          )}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-900 shadow-lg border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo and Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">व</span>
              </div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                विधीज्ञ
              </span>
            </Link>
            <div className="flex items-center space-x-2">
              {hasRole(["SUPER_ADMIN", "ADMIN"]) && (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge()}`}
                >
                  {user.role.replace("_", " ")}
                </span>
              )}
              {/* Notification Bell for Desktop */}
              <div className="hidden md:block">
                <NotificationBell />
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-600"
                      : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom Section - User Info and Actions */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            {/* User Info with Dropdown */}
            <div className="relative user-menu-container">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-3 w-full p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
              >
                <ProfilePicture
                  userId={user.id}
                  name={user.name}
                  size="md"
                  className="flex-shrink-0"
                />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* User Menu Dropdown */}
              {userMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                  <div className="p-2 space-y-1">
                    <button
                      onClick={handleProfileClick}
                      className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
                    >
                      <User className="w-4 h-4" />
                      <span>Profile</span>
                    </button>
                    <button
                      onClick={handleSettingsClick}
                      className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors duration-200"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                    <button
                      onClick={logout}
                      className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors duration-200"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <div className="mt-4">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Top bar for mobile */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              Vidhigya
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <NotificationBell />
            <ThemeToggle />
          </div>
        </div>
      </div>
    </>
  );
}
