import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PortalSessionUser } from "../../shared/contracts";
import { api, ApiError } from "../lib/api";

interface PortalAuthContextValue {
  user: PortalSessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const PortalAuthContext = createContext<PortalAuthContextValue | null>(null);

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const session = useQuery({
    queryKey: ["portal-session"],
    queryFn: async () => {
      try {
        return await api<{ user: PortalSessionUser }>("/api/portal/auth/session");
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    retry: false,
  });

  const value = useMemo<PortalAuthContextValue>(() => ({
    user: session.data?.user ?? null,
    loading: session.isLoading,
    login: async (email, password) => {
      const result = await api<{ user: PortalSessionUser }>("/api/portal/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      queryClient.setQueryData(["portal-session"], result);
    },
    logout: async () => {
      await api("/api/portal/auth/logout", { method: "POST" });
      queryClient.setQueryData(["portal-session"], null);
    },
  }), [session.data, session.isLoading, queryClient]);

  return <PortalAuthContext.Provider value={value}>{children}</PortalAuthContext.Provider>;
}

export function usePortalAuth() {
  const context = useContext(PortalAuthContext);
  if (!context) throw new Error("usePortalAuth must be used inside PortalAuthProvider");
  return context;
}
