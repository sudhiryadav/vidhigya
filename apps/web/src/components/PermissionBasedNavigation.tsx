"use client";

import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionContext";
import { usePractice } from "@/contexts/PracticeContext";
import { apiClient } from "@/services/api";

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
  Home,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PermissionAction, PermissionResource } from "../types/permissions";
import { Logo } from "./Logo";
import NotificationBell from "./NotificationBell";
import ProfilePicture from "./ProfilePicture";
import { ThemeToggle } from "./ThemeToggle";
import { PermissionGate } from "./permissions/PermissionGate";

// Enhanced navigation items with permission requirements
const baseNavigationItems = [
  // Admin/Super Admin specific
  {
    name: "Admin Dashboard",
    href: "/admin/dashboard",
    icon: Home,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    name: "User Management",
    href: "/admin/users",
    icon: Users,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    name: "System Settings",
    href: "/admin/settings",
    icon: Settings,
    roles: ["SUPER_ADMIN"],
  },

  // General navigation items with permission requirements
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
    excludeRoles: ["SUPER_ADMIN"], // Super admin uses admin dashboard
  },
  {
    name: "Practice",
    href: "/practice",
    icon: Building2,
    action: PermissionAction.READ,
    resource: PermissionResource.PRACTICE,
  },
  {
    name: "Cases",
    href: "/cases",
    icon: Briefcase,
    action: PermissionAction.READ,
    resource: PermissionResource.CASE,
  },
  {
    name: "Clients",
    href: "/clients",
    icon: Users,
    action: PermissionAction.READ,
    resource: PermissionResource.CLIENT,
  },
  {
    name: "Documents",
    href: "/documents",
    icon: FileText,
    action: PermissionAction.READ,
    resource: PermissionResource.DOCUMENT,
  },
  {
    name: "Calendar",
    href: "/calendar",
    icon: Calendar,
    action: PermissionAction.READ,
    resource: PermissionResource.CALENDAR,
  },
  {
    name: "Tasks",
    href: "/tasks",
    icon: CheckSquare,
    action: PermissionAction.READ,
    resource: PermissionResource.TASK,
  },
  {
    name: "Billing",
    href: "/billing",
    icon: CreditCard,
    action: PermissionAction.READ,
    resource: PermissionResource.BILLING,
  },
  {
    name: "Search & Reference",
    href: "/search",
    icon: Search,
    action: PermissionAction.READ,
    resource: PermissionResource.DOCUMENT,
  },
  {
    name: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    action: PermissionAction.READ,
    resource: PermissionResource.ANALYTICS,
    roles: ["SUPER_ADMIN", "ADMIN"], // Only visible to firm owners and super admins
  },
  {
    name: "Reports",
    href: "/admin/reports",
    icon: FileText,
    action: PermissionAction.READ,
    resource: PermissionResource.REPORT,
    roles: ["SUPER_ADMIN", "ADMIN"], // Only visible to firm owners and super admins
  },
  {
    name: "Notifications",
    href: "/notifications",
    icon: Bell,
    // Always visible for authenticated users
  },

  // Admin specific navigation
  {
    name: "Admin Lawyers",
    href: "/admin/lawyers",
    icon: Users,
    roles: ["SUPER_ADMIN", "ADMIN"],
    action: PermissionAction.MANAGE,
    resource: PermissionResource.USER,
  },
  {
    name: "Admin Clients",
    href: "/admin/clients",
    icon: Building2,
    roles: ["SUPER_ADMIN", "ADMIN"],
    action: PermissionAction.MANAGE,
    resource: PermissionResource.CLIENT,
  },
  {
    name: "Admin Cases",
    href: "/admin/cases",
    icon: Briefcase,
    roles: ["SUPER_ADMIN", "ADMIN"],
    action: PermissionAction.MANAGE,
    resource: PermissionResource.CASE,
  },
  {
    name: "Admin Documents",
    href: "/admin/documents",
    icon: FileText,
    roles: ["SUPER_ADMIN", "ADMIN"],
    action: PermissionAction.MANAGE,
    resource: PermissionResource.DOCUMENT,
  },
  {
    name: "Admin Billing",
    href: "/admin/billing",
    icon: CreditCard,
    roles: ["SUPER_ADMIN", "ADMIN"],
    action: PermissionAction.MANAGE,
    resource: PermissionResource.BILLING,
  },
  {
    name: "Admin Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    roles: ["SUPER_ADMIN", "ADMIN"],
    action: PermissionAction.READ,
    resource: PermissionResource.ANALYTICS,
  },
  {
    name: "Admin Reports",
    href: "/admin/reports",
    icon: FileText,
    roles: ["SUPER_ADMIN", "ADMIN"],
    action: PermissionAction.READ,
    resource: PermissionResource.REPORT,
  },
  // Practice Users - only for firm owners (LAWYER role who created the practice)
  {
    name: "Practice Users",
    href: "/practice/users",
    icon: Users,
    roles: ["LAWYER"],
    action: PermissionAction.MANAGE,
    resource: PermissionResource.PRACTICE,
  },
];

interface NavigationItemProps {
  name: string;
  href: string;
  icon: any;
  roles?: string[];
  excludeRoles?: string[];
  action?: PermissionAction;
  resource?: PermissionResource;
  isActive: boolean;
  onClick: () => void;
}

const NavigationItem = ({
  name,
  href,
  icon: Icon,
  roles,
  excludeRoles,
  action,
  resource,
  isActive,
  onClick,
}: NavigationItemProps) => {
  const { user } = useAuth();

  // Debug logging for User Management
  if (name === "User Management") {
    console.log("NavigationItem for User Management:", {
      name,
      userRole: user?.role,
      roles,
      excludeRoles,
      action,
      resource,
    });
  }

  // Check if user role should be excluded
  if (excludeRoles && user && excludeRoles.includes(user.role)) {
    if (name === "User Management") {
      console.log("User Management excluded by excludeRoles");
    }
    return null;
  }

  const linkContent = (
    <Link
      href={href}
      className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
        isActive
          ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-600"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
      onClick={onClick}
    >
      <Icon className="w-5 h-5" />
      <span>{name}</span>
    </Link>
  );

  // If no specific permissions required, just check roles
  if (!action || !resource) {
    if (roles && roles.length > 0) {
      return (
        <PermissionGate roles={roles} requireAll={false}>
          {linkContent}
        </PermissionGate>
      );
    }
    return linkContent;
  }

  // Use permission-based gate
  return (
    <PermissionGate
      action={action}
      resource={resource}
      roles={roles}
      requireAll={false}
    >
      {linkContent}
    </PermissionGate>
  );
};

export function PermissionBasedNavigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const [userStats, setUserStats] = useState<any>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, hasRole } = useAuth();
  const { hasPermission } = usePermissions();
  const { currentPractice } = usePractice();

  // Load user dashboard stats
  useEffect(() => {
    const loadUserStats = async () => {
      if (!user) return;

      try {
        setIsLoadingStats(true);
        const stats = await apiClient.getDashboardStats();
        setUserStats(stats);
      } catch (error) {
        console.error("Failed to load user stats:", error);
        setUserStats(null);
      } finally {
        setIsLoadingStats(false);
      }
    };

    loadUserStats();
  }, [user]);

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

  const getRoleBadge = () => {
    const roleColors = {
      SUPER_ADMIN: "text-purple-600 dark:text-purple-400",
      ADMIN: "text-red-600 dark:text-red-400",
      LAWYER: "text-blue-600 dark:text-blue-400",
      ASSOCIATE: "text-green-600 dark:text-green-400",
      PARALEGAL: "text-yellow-600 dark:text-yellow-400",
      CLIENT: "text-muted-foreground",
    };
    return roleColors[user.role] || roleColors.CLIENT;
  };

  const handleProfileClick = () => {
    setUserMenuOpen(false);
    router.push("/profile");
  };

  const handleSettingsClick = () => {
    setUserMenuOpen(false);
    if (user?.role === "SUPER_ADMIN" || user?.role === "ADMIN") {
      router.push("/admin/settings");
    } else {
      router.push("/settings");
    }
  };

  // Use base navigation items only
  const allNavigationItems = baseNavigationItems;

  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 bg-card rounded-lg shadow-lg border border-border"
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6 text-muted-foreground" />
          ) : (
            <Menu className="w-6 h-6 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <div
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-border shadow-lg transform transition-transform bg-card duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="flex flex-col h-full">
          {/* Logo and Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex flex-col items-start space-y-1">
              <Link href="/" className="flex items-center space-x-2">
                <Logo size="md" />
              </Link>
              {/* Firm Name Display */}
              {currentPractice?.firm?.name && (
                <p className="text-xs text-muted-foreground font-medium ml-2">
                  {currentPractice.firm.name}
                </p>
              )}
              {/* Practice Name Display (fallback if no firm name) */}
              {!currentPractice?.firm?.name && currentPractice?.name && (
                <p className="text-xs text-muted-foreground font-medium ml-2">
                  {currentPractice.name}
                </p>
              )}
              {/* Practice Stats Display */}
              {userStats && (
                <div className="text-xs text-muted-foreground ml-2 space-y-1">
                  {userStats.activeCases > 0 && (
                    <p>Active Cases: {userStats.activeCases}</p>
                  )}
                  {userStats.pendingTasks > 0 && (
                    <p>Pending Tasks: {userStats.pendingTasks}</p>
                  )}
                </div>
              )}
            </div>
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
            {allNavigationItems.map((item) => {
              const isActive = pathname === item.href;
              // Debug logging for User Management item
              if (item.name === "User Management") {
                console.log("User Management item:", {
                  item,
                  userRole: user?.role,
                  hasRoles: !!item.roles,
                  roles: item.roles,
                  shouldShow: item.roles
                    ? item.roles.includes(user?.role || "")
                    : true,
                });
              }
              return (
                <NavigationItem
                  key={`${item.name}-${item.href}`}
                  {...item}
                  isActive={isActive}
                  onClick={() => setMobileMenuOpen(false)}
                />
              );
            })}
          </nav>

          {/* Bottom Section - User Info and Actions */}
          <div className="p-4 border-t border-border">
            {/* Mobile Logout Button */}
            <div className="md:hidden mb-4">
              <button
                onClick={() => router.push("/logout")}
                className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors duration-200 border border-red-200 dark:border-red-800"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>

            {/* User Info with Dropdown */}
            <div className="relative user-menu-container">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-3 w-full p-2 rounded-lg hover:bg-muted transition-colors duration-200"
              >
                <ProfilePicture
                  userId={user.id}
                  name={user.name}
                  size="md"
                  className="flex-shrink-0"
                />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                  <p
                    className={`text-xs font-medium truncate ${getRoleBadge()}`}
                  >
                    {user.role.replace("_", " ")}
                  </p>
                  {/* User Status */}
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {user.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {/* User Menu Dropdown */}
              {userMenuOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-background border border-border rounded-lg shadow-xl z-50 backdrop-blur-sm bg-opacity-95">
                  <div className="p-2 space-y-1.5">
                    <button
                      onClick={handleProfileClick}
                      className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors duration-200"
                    >
                      <User className="w-4 h-4" />
                      <span>Profile</span>
                    </button>
                    <button
                      onClick={handleSettingsClick}
                      className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors duration-200"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                    <div className="border-t border-border my-1"></div>
                    <button
                      onClick={() => router.push("/logout")}
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
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex flex-col items-start space-y-1">
            <div className="flex items-center space-x-3">
              <Logo size="md" />
            </div>
            {/* Firm Name Display for Mobile */}
            {currentPractice?.firm?.name && (
              <p className="text-xs text-muted-foreground font-medium ml-3">
                {currentPractice.firm.name}
              </p>
            )}
            {/* Practice Name Display for Mobile (fallback if no firm name) */}
            {!currentPractice?.firm?.name && currentPractice?.name && (
              <p className="text-xs text-muted-foreground font-medium ml-3">
                {currentPractice.name}
              </p>
            )}
            {/* Practice Stats Display for Mobile */}
            {userStats && (
              <div className="text-xs text-muted-foreground ml-3 space-y-1">
                {userStats.activeCases > 0 && (
                  <p>Active Cases: {userStats.activeCases}</p>
                )}
                {userStats.pendingTasks > 0 && (
                  <p>Pending Tasks: {userStats.pendingTasks}</p>
                )}
              </div>
            )}
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
