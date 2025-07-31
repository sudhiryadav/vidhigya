import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../services/api";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthContextData {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  role: "LAWYER" | "CLIENT" | "ADMIN" | "ASSOCIATE" | "PARALEGAL";
  phone?: string;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem("@Vidhigya:token");
      const storedUser = await AsyncStorage.getItem("@Vidhigya:user");

      if (storedToken && storedUser) {
        api.defaults.headers.authorization = `Bearer ${storedToken}`;
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Error loading stored auth:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await api.post("/auth/login", { email, password });

      const { token: newToken, user: userData } = response.data;

      api.defaults.headers.authorization = `Bearer ${newToken}`;

      await AsyncStorage.setItem("@Vidhigya:token", newToken);
      await AsyncStorage.setItem("@Vidhigya:user", JSON.stringify(userData));

      setToken(newToken);
      setUser(userData);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setIsLoading(true);
      const response = await api.post("/auth/register", userData);

      const { token: newToken, user: newUser } = response.data;

      api.defaults.headers.authorization = `Bearer ${newToken}`;

      await AsyncStorage.setItem("@Vidhigya:token", newToken);
      await AsyncStorage.setItem("@Vidhigya:user", JSON.stringify(newUser));

      setToken(newToken);
      setUser(newUser);
    } catch (error) {
      console.error("Register error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("@Vidhigya:token");
      await AsyncStorage.removeItem("@Vidhigya:user");

      setToken(null);
      setUser(null);

      delete api.defaults.headers.authorization;
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const refreshToken = async () => {
    try {
      const response = await api.post("/auth/refresh");
      const { token: newToken } = response.data;

      api.defaults.headers.authorization = `Bearer ${newToken}`;
      await AsyncStorage.setItem("@Vidhigya:token", newToken);

      setToken(newToken);
    } catch (error) {
      console.error("Token refresh error:", error);
      await logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        register,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
