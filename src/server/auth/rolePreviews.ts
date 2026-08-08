import { db } from "../db/index.js";
import type { RolePreview } from "../../shared/auth.js";

export function listRolePreviews(): RolePreview[] {
  const roles = db.prepare("SELECT id, name, description FROM roles ORDER BY name").all() as Array<{
    id: string;
    name: string;
    description: string;
  }>;
  const permissionsForRole = db.prepare(
    "SELECT permission_key FROM role_permissions WHERE role_id = ? ORDER BY permission_key",
  );
  return roles.map((role) => ({
    ...role,
    permissions: (permissionsForRole.all(role.id) as Array<{ permission_key: string }>).map(
      (row) => row.permission_key,
    ),
  }));
}
