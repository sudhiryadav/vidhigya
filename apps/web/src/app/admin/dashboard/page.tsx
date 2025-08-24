"use client";

import SuperAdminContextSelector from "@/components/admin/SuperAdminContextSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperAdminContext } from "@/contexts/SuperAdminContext";
import {
  BarChart3,
  Briefcase,
  Building2,
  DollarSign,
  FileText,
  Globe,
  User,
  Users,
} from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { context, isSuperAdmin } = useSuperAdminContext();

  const getContextIcon = () => {
    if (!context) return <Globe className="h-8 w-8 text-blue-600" />;

    switch (context.type) {
      case "practice":
        return <Building2 className="h-8 w-8 text-orange-600" />;
      case "firm":
        return <Users className="h-8 w-8 text-green-600" />;
      case "individual":
        return <User className="h-8 w-8 text-purple-600" />;
      default:
        return <Globe className="h-8 w-8 text-blue-600" />;
    }
  };

  const getContextLabel = () => {
    if (!context) return "All Practices & Users";

    switch (context.type) {
      case "all":
        return "All Practices & Users";
      case "practice":
        return `Practice: ${context.name}`;
      case "firm":
        return `Firm: ${context.name}`;
      case "individual":
        return `Individual: ${context.name}`;
      default:
        return "All Practices & Users";
    }
  };

  const getContextDescription = () => {
    if (!context) return "View and manage all data across the system";

    switch (context.type) {
      case "all":
        return "View and manage all data across the system";
      case "practice":
        return `Managing data for practice: ${context.name}`;
      case "firm":
        return `Managing data for firm: ${context.name}`;
      case "individual":
        return `Managing data for individual lawyer: ${context.name}`;
      default:
        return "View and manage all data across the system";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            {getContextIcon()}
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            {getContextDescription()}
          </p>
          {context && context.type !== "all" && (
            <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
              <span className="w-2 h-2 bg-blue-600 rounded-full mr-2"></span>
              Context: {getContextLabel()}
            </div>
          )}
        </div>

        {/* Super Admin Context Selector */}
        {isSuperAdmin && (
          <div className="flex items-center gap-3">
            <SuperAdminContextSelector />
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                Total Users
              </p>
              <p className="text-2xl font-bold text-foreground">1,234</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Briefcase className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                Active Cases
              </p>
              <p className="text-2xl font-bold text-foreground">567</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <FileText className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                Documents
              </p>
              <p className="text-2xl font-bold text-foreground">2,891</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">
                Revenue
              </p>
              <p className="text-2xl font-bold text-foreground">$45.2K</p>
            </div>
          </div>
        </div>
      </div>

      {/* Context Information */}
      {isSuperAdmin && (
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Super Admin Context
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Current Context
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Type:</span>
                  <span className="text-sm font-medium text-foreground">
                    {context?.type || "All"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Name:</span>
                  <span className="text-sm font-medium text-foreground">
                    {context?.name || "All Practices & Users"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">ID:</span>
                  <span className="text-sm font-medium text-foreground">
                    {context?.id || "N/A"}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                What This Means
              </h3>
              <p className="text-sm text-muted-foreground">
                {getContextDescription()}
              </p>
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> As a Super Admin, you can switch
                  between different contexts to view and manage data from
                  specific practices, firms, or individual lawyers. This allows
                  you to provide support and oversight across the entire system.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-foreground ml-3">
              Manage Users
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Add, edit, and manage user accounts across all practices
          </p>
          <button className="w-full btn-secondary">Go to Users</button>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Briefcase className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-foreground ml-3">
              View Cases
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Monitor and manage cases across all practices
          </p>
          <button className="w-full btn-secondary">Go to Cases</button>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Building2 className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-medium text-foreground ml-3">
              Practice Settings
            </h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Configure system-wide settings and practice configurations
          </p>
          <button className="w-full btn-secondary">Go to Settings</button>
        </div>
      </div>
    </div>
  );
}
