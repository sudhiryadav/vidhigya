"use client";

import { apiClient } from "@/services/api";
import { socketService } from "@/services/socket";
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
  login: (email: string, password: string) => Promise<boolean>;
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

  useEffect(() => {
    // Check for existing token and user data on mount
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        // Initialize socket connection
        socketService.connect(token);
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log("Login attempt started for:", email);
      const response = (await apiClient.login(email, password)) as {
        token: string;
        user: User;
      };

      console.log("Login response received:", {
        hasToken: !!response.token,
        userRole: response.user?.role,
      });

      // Store token and user info
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      setUser(response.user);

      console.log("User state updated, user role:", response.user?.role);

      // Initialize socket connection after successful login
      socketService.connect(response.token);

      console.log("Login successful, returning true");
      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = () => {
    // Disconnect socket before logout
    socketService.disconnect();

    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    // Use replace to prevent back button issues and add a small delay
    setTimeout(() => {
      router.replace("/login");
    }, 100);
  };

  const hasRole = (roles: string[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const fetchAvatar = async (userId: string) => {
    try {
      const blob = await apiClient.getAvatar(userId);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        setUser((prev) =>
          prev ? { ...prev, avatarBase64: base64data } : null
        );
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.log("No avatar found for user:", userId);
      // Don't show error for 404 - it's expected when no avatar exists
      // Just log it and continue without setting avatarBase64
    }
  };

  const updateAvatar = (avatarBase64: string) => {
    setUser((prev) => (prev ? { ...prev, avatarBase64 } : null));
  };

  const removeAvatar = async () => {
    try {
      await apiClient.removeAvatar();
      // Remove avatar from auth context
      setUser((prev) => (prev ? { ...prev, avatarBase64: null } : null));
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
