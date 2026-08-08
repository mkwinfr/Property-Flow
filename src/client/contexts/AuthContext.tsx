import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RolePreview, SessionUser } from "../../shared/contracts";
import { api, ApiError } from "../lib/api";

const VIEW_AS_STORAGE_KEY = "ps:view-as-role";

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  can: (permission: string) => boolean;
  canUseViewAs: boolean;
  viewAsRole: RolePreview | null;
  setViewAsRoleId: (roleId: string | null) => void;
  displayRoles: string[];
  isViewingAs: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [viewAsRoleId, setViewAsRoleIdState] = useState<string | null>(
    () => window.localStorage.getItem(VIEW_AS_STORAGE_KEY),
  );
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => api<{ user: SessionUser }>("/api/auth/session"),
    retry: false,
  });
  const rolePreviews = useQuery({
    queryKey: ["role-previews"],
    queryFn: () => api<{ roles: RolePreview[] }>("/api/auth/role-previews"),
    enabled: Boolean(session.data?.user?.permissions.includes("users:view")),
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
      window.localStorage.removeItem(VIEW_AS_STORAGE_KEY);
      setViewAsRoleIdState(null);
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
      window.localStorage.removeItem(VIEW_AS_STORAGE_KEY);
      setViewAsRoleIdState(null);
      queryClient.clear();
      queryClient.setQueryData(["session"], null);
    },
  });

  const user = session.data?.user ?? null;
  const canUseViewAs = user?.permissions.includes("users:view") ?? false;
  const viewAsRole = useMemo(() => {
    if (!viewAsRoleId) return null;
    return rolePreviews.data?.roles.find((role) => role.id === viewAsRoleId) ?? null;
  }, [rolePreviews.data?.roles, viewAsRoleId]);

  useEffect(() => {
    if (!canUseViewAs) {
      window.localStorage.removeItem(VIEW_AS_STORAGE_KEY);
      setViewAsRoleIdState(null);
      return;
    }
    if (viewAsRoleId && rolePreviews.data && !viewAsRole) {
      window.localStorage.removeItem(VIEW_AS_STORAGE_KEY);
      setViewAsRoleIdState(null);
    }
  }, [canUseViewAs, rolePreviews.data, viewAsRole, viewAsRoleId]);

  const setViewAsRoleId = (roleId: string | null) => {
    if (roleId) window.localStorage.setItem(VIEW_AS_STORAGE_KEY, roleId);
    else window.localStorage.removeItem(VIEW_AS_STORAGE_KEY);
    setViewAsRoleIdState(roleId);
  };

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
      can: (permission) => {
        if (viewAsRole) return viewAsRole.permissions.includes(permission);
        return user?.permissions.includes(permission) ?? false;
      },
      canUseViewAs,
      viewAsRole,
      setViewAsRoleId,
      displayRoles: viewAsRole ? [viewAsRole.name] : (user?.roles ?? []),
      isViewingAs: Boolean(viewAsRole),
    }),
    [user, session.isLoading, loginMutation, logoutMutation, passwordMutation, viewAsRole, canUseViewAs],
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
