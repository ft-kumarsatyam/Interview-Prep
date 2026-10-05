import rolesJson from "@/data/roles.json";
import { rolesFileSchema, roleWeekMap, type RoleDef } from "@/modules/planner/domain/role-path";

/** Role paths from data/roles.json (validated in tests/content/roles.test.ts). */
export const roles: readonly RoleDef[] = rolesFileSchema.parse(rolesJson).roles;
export const roleById: ReadonlyMap<string, RoleDef> = new Map(roles.map((r) => [r.id, r]));

/** Topic -> week under a role id, or null when there is no (known) role, which keeps the syllabus weeks. */
export function weekMapForRole(roleId: string | null | undefined): Map<string, number> | null {
  const role = roleId ? roleById.get(roleId) : undefined;
  return role ? roleWeekMap(role) : null;
}
