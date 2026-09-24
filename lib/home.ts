import { ROLES } from "./roles";

export function homePath(role: string) {
  if (role === ROLES.TECHNICIAN) return "/tickets";
  if (role === ROLES.ADMIN || role === ROLES.MANAGER || role === ROLES.CLERICAL) return "/dispatch";
  return "/dashboard";
}
