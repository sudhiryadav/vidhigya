"use client";

import { apiClient } from "@/services/api";
import { getSocketService } from "@/services/socket";
import { useRouter } from "next/navigation";
import React, { createContext, useContext, useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  role:
    | "SUPER_ADMIN"
    | "ADMIN"
    | "LAWYER"
    | "ASSOCIATE"
    | "PARALEGAL"
    | "CLIENT";
  avatarBase64?: string | null;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (roles: string[]) => boolean;
  fetchAvatar: (userId: string) => Promise<void>;
  updateAvatar: (avatarBase64: string) => void;
  removeAvatar: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Initialize socket service when AuthProvider is created
  useEffect(() => {
    getSocketService();
  }, []);

  useEffect(() => {
    // Check for existing token and user data on mount
    // Only run on client side
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      const userData = localStorage.getItem("user");

      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          // Initialize socket connection
          getSocketService().connect(token);
        } catch (error) {
          console.error("Error parsing user data:", error);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      }
    }
    setLoading(false);
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = (await apiClient.login(email, password)) as {
        token: string;
        user: User;
      };

      // Store token and user info (only on client side)
      if (typeof window !== "undefined") {
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));
      }
      setUser(response.user);

      // Initialize socket connection after successful login
      getSocketService().connect(response.token);

      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Login failed";
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    // JWT tokens are stateless, so no backend logout is needed
    // Frontend cleanup is sufficient

    // Disconnect socket before logout
    getSocketService().disconnect();

    // Remove from localStorage (only on client side)
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }

    // Clear user state
    setUser(null);

    // Note: Redirect is now handled by the logout page
    // This prevents race conditions and allows for proper cleanup
  };

  const hasRole = (roles: string[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const fetchAvatar = async (userId: string) => {
    try {
      const blob = await apiClient.getAvatar(userId);
      if (!blob) {
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        setUser((prev) =>
          prev ? { ...prev, avatarBase64: base64data } : null
        );
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      // Don't show error for 404 - it's expected when no avatar exists
      // Just log it and continue without setting avatarBase64
    }
  };

  const updateAvatar = (avatarBase64: string) => {
    setUser((prev) => (prev ? { ...prev, avatarBase64 } : null));
    // Update localStorage if on client side
    if (typeof window !== "undefined" && user) {
      const userData = localStorage.getItem("user");
      if (userData) {
        const parsedUser = JSON.parse(userData);
        parsedUser.avatarBase64 = avatarBase64;
        localStorage.setItem("user", JSON.stringify(parsedUser));
      }
    }
  };

  const removeAvatar = async () => {
    try {
      await apiClient.removeAvatar();
      // Remove avatar from auth context
      setUser((prev) => (prev ? { ...prev, avatarBase64: null } : null));
      // Update localStorage if on client side
      if (typeof window !== "undefined" && user) {
        const userData = localStorage.getItem("user");
        if (userData) {
          const parsedUser = JSON.parse(userData);
          parsedUser.avatarBase64 = null;
          localStorage.setItem("user", JSON.stringify(parsedUser));
        }
      }
    } catch (error) {
      console.error("Error removing avatar:", error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    hasRole,
    fetchAvatar,
    updateAvatar,
    removeAvatar,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
