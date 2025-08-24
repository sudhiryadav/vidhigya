"use client";

import { useAuth } from "@/contexts/AuthContext";
import React, { createContext, ReactNode, useContext, useState } from "react";

export interface SuperAdminContextType {
  type: "all" | "practice" | "firm" | "individual";
  id?: string;
  name?: string;
}

interface SuperAdminContextValue {
  context: SuperAdminContextType | null;
  setContext: (context: SuperAdminContextType | null) => void;
  clearContext: () => void;
  isSuperAdmin: boolean;
}

const SuperAdminContext = createContext<SuperAdminContextValue | undefined>(
  undefined
);

export const useSuperAdminContext = () => {
  const context = useContext(SuperAdminContext);
  if (context === undefined) {
    throw new Error(
      "useSuperAdminContext must be used within a SuperAdminProvider"
    );
  }
  return context;
};

interface SuperAdminProviderProps {
  children: ReactNode;
}

export const SuperAdminProvider: React.FC<SuperAdminProviderProps> = ({
  children,
}) => {
  const { user } = useAuth();
  const [context, setContext] = useState<SuperAdminContextType | null>(null);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const clearContext = () => {
    setContext(null);
  };

  const value: SuperAdminContextValue = {
    context,
    setContext,
    clearContext,
    isSuperAdmin,
  };

  return (
    <SuperAdminContext.Provider value={value}>
      {children}
    </SuperAdminContext.Provider>
  );
};
