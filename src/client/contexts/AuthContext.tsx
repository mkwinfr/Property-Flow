import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SessionUser } from "../../shared/contracts";
import { api, ApiError } from "../lib/api";

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => api<{ user: SessionUser }>("/api/auth/session"),
    retry: false,
  });
  const loginMutation = useMutation({
    mutationFn: (credentials: { email: string; password: string }) =>
      api<{ user: SessionUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      }),
    onSuccess: (data) => queryClient.setQueryData(["session"], data),
  });
  const logoutMutation = useMutation({
    mutationFn: () => api<void>("/api/auth/logout", { method: "POST" }),
    onSettled: () => {
      queryClient.clear();
      queryClient.setQueryData(["session"], null);
    },
  });
  const passwordMutation = useMutation({
    mutationFn: (passwords: { currentPassword: string; newPassword: string }) =>
      api<void>("/api/auth/password", {
        method: "POST",
        body: JSON.stringify(passwords),
      }),
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(["session"], null);
    },
  });

  const user = session.data?.user ?? null;
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading: session.isLoading,
      login: async (email, password) => {
        await loginMutation.mutateAsync({ email, password });
      },
      logout: async () => {
        await logoutMutation.mutateAsync();
      },
      changePassword: async (currentPassword, newPassword) => {
        await passwordMutation.mutateAsync({ currentPassword, newPassword });
      },
      can: (permission) => user?.permissions.includes(permission) ?? false,
    }),
    [user, session.isLoading, loginMutation, logoutMutation, passwordMutation],
  );

  if (session.error && (!(session.error instanceof ApiError) || session.error.status !== 401)) {
    return <div className="fatal-state">Property Suite could not reach the local service.</div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
