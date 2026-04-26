"use client";

import LoadingOverlay from "@/components/LoadingOverlay";
import { useSuperAdminContext } from "@/contexts/SuperAdminContext";
import { apiClient } from "@/services/api";
import { Practice } from "@/types/practices";
import { Building2, Globe, Search } from "lucide-react";
import { useEffect, useState } from "react";

interface SuperAdminContextSelectorProps {
  onContextChange?: (context: {
    type: "all" | "practice" | "firm" | "individual";
    id?: string;
    name?: string;
  }) => void;
  currentContext?: {
    type: "all" | "practice" | "firm" | "individual";
    id?: string;
    name?: string;
  };
}

export default function SuperAdminContextSelector({
  onContextChange,
  currentContext,
}: SuperAdminContextSelectorProps) {
  const { context, setContext, isSuperAdmin } = useSuperAdminContext();
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      loadPractices();
    }
  }, [isSuperAdmin]);

  const loadPractices = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getUserPractices();
      setPractices(data);
    } catch (error) {
      console.error("Failed to load practices:", error);
    } finally {
      setLoading(false);
    }
  };

  // Only show for super admins
  if (!isSuperAdmin) {
    return null;
  }

  const handleContextSelect = (context: {
    type: "all" | "practice" | "firm" | "individual";
    id?: string;
    name?: string;
  }) => {
    // Update the context in the provider
    setContext(context);

    // Also call the optional callback if provided
    if (onContextChange) {
      onContextChange(context);
    }

    setShowDropdown(false);
    setSearchTerm("");
  };

  // Use the context from the provider if no currentContext is passed
  const displayContext = currentContext || context;

  const getContextIcon = (type: string) => {
    switch (type) {
      case "practice":
        return <Building2 className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const getContextLabel = (context: any) => {
    if (!context) return "Select Context";

    switch (context.type) {
      case "all":
        return "All Practices";
      case "practice":
        return `Practice: ${context.name}`;
      case "firm":
      case "individual":
        return `Practice: ${context.name}`;
      default:
        return "Select Context";
    }
  };

  const filteredPractices = practices.filter((practice) => {
    const matchesSearch =
      practice.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      practice.description?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const getContextOptions = () => {
    const options: Array<{
      type: "all" | "practice" | "firm" | "individual";
      id?: string;
      name: string;
      description: string;
      icon: React.ReactNode;
      count: number;
    }> = [
      {
        type: "all",
        id: undefined,
        name: "All Practices",
        description: "View and manage data across all practices",
        icon: <Globe className="h-5 w-5 text-blue-600" />,
        count: practices.length,
      },
    ];

    // Add practice options
    filteredPractices.forEach((practice) => {
      options.push({
        type: "practice",
        id: practice.id,
        name: practice.name,
        description: `Practice with ${practice.members?.length || 0} members`,
        icon: <Building2 className="h-5 w-5 text-orange-600" />,
        count: practice.members?.length || 0,
      });
    });

    return options;
  };

  return (
    <div className="relative">
      {/* Context Selector Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-colors duration-200 min-w-[280px]"
      >
        {displayContext ? (
          <>
            {getContextIcon(displayContext.type)}
            <span className="text-sm font-medium text-foreground truncate">
              {getContextLabel(displayContext)}
            </span>
          </>
        ) : (
          <>
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Select Context
            </span>
          </>
        )}
        <svg
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
            showDropdown ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
          {/* Search Header */}
          <div className="p-3 border-b border-border">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search practices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <LoadingOverlay
                  isVisible={true}
                  title="Loading Practices"
                  message="Please wait while we fetch practice information..."
                  absolute={false}
                />
              </div>
            ) : getContextOptions().length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  No practices found
                </p>
              </div>
            ) : (
              <div className="p-1">
                {getContextOptions().map((option, index) => (
                  <button
                    key={`${option.type}-${option.id || "all"}`}
                    onClick={() => handleContextSelect(option)}
                    className="w-full text-left p-3 hover:bg-muted rounded-md transition-colors duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      {option.icon}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground truncate">
                            {option.name}
                          </p>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            {option.count}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-1">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-border bg-muted/30">
            <p className="text-xs text-muted-foreground text-center">
              Select a context to view and manage specific practice data
            </p>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
}
