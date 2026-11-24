import { ROLES } from "./roles";

export function homePath(role: string) {
  if (role === ROLES.TECHNICIAN) return "/tickets";
  if (
    role === ROLES.ADMIN ||
    role === ROLES.MANAGER ||
    role === ROLES.SALESPERSON ||
    role === ROLES.TECH_LEAD ||
    role === ROLES.CLERICAL
  ) {
    return "/dispatch";
  }
  return "/dashboard";
}
