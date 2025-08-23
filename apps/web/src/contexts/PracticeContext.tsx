"use client";

import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiClient } from "../services/api";
import { useAuth } from "./AuthContext";

export interface Practice {
  id: string;
  name: string;
  description?: string;
  practiceType: "INDIVIDUAL" | "FIRM" | "MIXED";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  firm?: {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  members: PracticeMember[];
  _count?: {
    clients: number;
    members: number;
  };
}

export interface PracticeMember {
  id: string;
  role: "OWNER" | "PARTNER" | "ASSOCIATE" | "PARALEGAL" | "STAFF";
  isActive: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface PracticeStats {
  clientCount: number;
  caseCount: number;
  documentCount: number;
  billingTotal: number;
}

interface PracticeContextType {
  currentPractice: Practice | null;
  userPractices: Practice[];
  practiceStats: PracticeStats | null;
  isLoading: boolean;
  error: string | null;
  setCurrentPractice: (practice: Practice | null) => void;
  createPractice: (data: CreatePracticeData) => Promise<Practice>;
  updatePractice: (id: string, data: UpdatePracticeData) => Promise<Practice>;
  addMember: (
    practiceId: string,
    data: AddMemberData
  ) => Promise<PracticeMember>;
  updateMemberRole: (
    practiceId: string,
    memberId: string,
    role: string
  ) => Promise<PracticeMember>;
  removeMember: (practiceId: string, memberId: string) => Promise<void>;
  getPracticeStats: (practiceId: string) => Promise<PracticeStats>;
  refreshPractices: () => Promise<void>;
}

interface CreatePracticeData {
  name: string;
  description?: string;
  practiceType: "INDIVIDUAL" | "FIRM" | "MIXED";
  firmName?: string;
  firmAddress?: string;
  firmPhone?: string;
  firmEmail?: string;
}

interface UpdatePracticeData {
  name?: string;
  description?: string;
  isActive?: boolean;
}

interface AddMemberData {
  email: string;
  role: string;
}

const PracticeContext = createContext<PracticeContextType | undefined>(
  undefined
);

export const usePractice = () => {
  const context = useContext(PracticeContext);
  if (context === undefined) {
    throw new Error("usePractice must be used within a PracticeProvider");
  }
  return context;
};

interface PracticeProviderProps {
  children: ReactNode;
}

export const PracticeProvider: React.FC<PracticeProviderProps> = ({
  children,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [currentPractice, setCurrentPractice] = useState<Practice | null>(null);
  const [userPractices, setUserPractices] = useState<Practice[]>([]);
  const [practiceStats, setPracticeStats] = useState<PracticeStats | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUserPractices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = (await apiClient.getPractices()) as Practice[];
      setUserPractices(response || []);
    } catch (err) {
      setError("Failed to load practices");
      setUserPractices([]); // Reset to empty array on error
      console.error("Error loading practices:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load user practices on authentication
  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserPractices();
    } else {
      // Reset to empty array when not authenticated
      setUserPractices([]);
      setCurrentPractice(null);
    }
  }, [isAuthenticated, user, loadUserPractices]);

  // Set current practice from user's first practice (or we can implement primary practice logic later)
  useEffect(() => {
    if (userPractices && userPractices.length > 0 && !currentPractice) {
      // For now, just use the first practice. We can implement primary practice logic later
      setCurrentPractice(userPractices[0]);
    }
  }, [userPractices]); // Removed currentPractice from dependencies to prevent infinite loop

  const createPractice = useCallback(
    async (data: CreatePracticeData): Promise<Practice> => {
      try {
        setIsLoading(true);
        setError(null);
        const newPractice = (await apiClient.createPractice(data)) as Practice;

        setUserPractices((prev) => [...prev, newPractice]);
        setCurrentPractice(newPractice);

        return newPractice;
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.message || "Failed to create practice";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const updatePractice = useCallback(
    async (id: string, data: UpdatePracticeData): Promise<Practice> => {
      try {
        setIsLoading(true);
        setError(null);
        const updatedPractice = (await apiClient.updatePractice(
          id,
          data
        )) as Practice;

        setUserPractices((prev) =>
          prev.map((p) => (p.id === id ? updatedPractice : p))
        );

        if (currentPractice?.id === id) {
          setCurrentPractice(updatedPractice);
        }

        return updatedPractice;
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.message || "Failed to update practice";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [currentPractice?.id]
  );

  const addMember = useCallback(
    async (
      practiceId: string,
      data: AddMemberData
    ): Promise<PracticeMember> => {
      try {
        setIsLoading(true);
        setError(null);
        const newMember = (await apiClient.addPracticeMember(
          practiceId,
          data
        )) as PracticeMember;

        // Update the practice with new member
        setUserPractices((prev) =>
          prev.map((p) =>
            p.id === practiceId
              ? { ...p, members: [...p.members, newMember] }
              : p
          )
        );

        if (currentPractice?.id === practiceId) {
          setCurrentPractice((prev) =>
            prev ? { ...prev, members: [...prev.members, newMember] } : null
          );
        }

        return newMember;
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.message || "Failed to add member";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [currentPractice?.id]
  );

  const updateMemberRole = useCallback(
    async (
      practiceId: string,
      memberId: string,
      role: string
    ): Promise<PracticeMember> => {
      try {
        setIsLoading(true);
        setError(null);
        const updatedMember = (await apiClient.updatePracticeMember(
          practiceId,
          memberId,
          { role }
        )) as PracticeMember;

        // Update the practice with updated member
        setUserPractices((prev) =>
          prev.map((p) =>
            p.id === practiceId
              ? {
                  ...p,
                  members: p.members.map((m) =>
                    m.id === memberId ? updatedMember : m
                  ),
                }
              : p
          )
        );

        if (currentPractice?.id === practiceId) {
          setCurrentPractice((prev) =>
            prev
              ? {
                  ...prev,
                  members: prev.members.map((m) =>
                    m.id === memberId ? updatedMember : m
                  ),
                }
              : null
          );
        }

        return updatedMember;
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.message || "Failed to update member role";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [currentPractice?.id]
  );

  const removeMember = useCallback(
    async (practiceId: string, memberId: string): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        await apiClient.removePracticeMember(practiceId, memberId);

        // Update the practice with removed member
        setUserPractices((prev) =>
          prev.map((p) =>
            p.id === practiceId
              ? {
                  ...p,
                  members: p.members.map((m) =>
                    m.id === memberId ? { ...m, isActive: false } : m
                  ),
                }
              : p
          )
        );

        if (currentPractice?.id === practiceId) {
          setCurrentPractice((prev) =>
            prev
              ? {
                  ...prev,
                  members: prev.members.map((m) =>
                    m.id === memberId ? { ...m, isActive: false } : m
                  ),
                }
              : null
          );
        }
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.message || "Failed to remove member";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [currentPractice?.id]
  );

  const getPracticeStats = useCallback(
    async (practiceId: string): Promise<PracticeStats> => {
      try {
        setError(null);
        const stats = (await apiClient.getPracticeStats(practiceId)) as any;
        setPracticeStats(stats);
        return stats;
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.message || "Failed to load practice stats";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    []
  );

  const refreshPractices = useCallback(async () => {
    await loadUserPractices();
  }, []);

  const value: PracticeContextType = {
    currentPractice,
    userPractices,
    practiceStats,
    isLoading,
    error,
    setCurrentPractice,
    createPractice,
    updatePractice,
    addMember,
    updateMemberRole,
    removeMember,
    getPracticeStats,
    refreshPractices,
  };

  return (
    <PracticeContext.Provider value={value}>
      {children}
    </PracticeContext.Provider>
  );
};
