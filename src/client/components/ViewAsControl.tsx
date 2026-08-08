import { Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { RolePreview } from "../../shared/contracts";
import { useAuth } from "../contexts/AuthContext";
import { AppSelect } from "./AppSelect";
import { api } from "../lib/api";

export function ViewAsControl() {
  const { canUseViewAs, viewAsRole, setViewAsRoleId } = useAuth();
  const roles = useQuery({
    queryKey: ["role-previews"],
    queryFn: () => api<{ roles: RolePreview[] }>("/api/auth/role-previews"),
    enabled: canUseViewAs,
  });

  if (!canUseViewAs) return null;

  return <section className="view-as-control" aria-label="Permission preview">
    <span className="view-as-control__label"><Eye size={15} />View as</span>
    <AppSelect
      compact
      ariaLabel="View as role"
      value={viewAsRole?.id ?? ""}
      onChange={(value) => setViewAsRoleId(value || null)}
      options={[
        { value: "", label: "My account" },
        ...(roles.data?.roles.map((role) => ({ value: role.id, label: role.name })) ?? []),
      ]}
    />
  </section>;
}
