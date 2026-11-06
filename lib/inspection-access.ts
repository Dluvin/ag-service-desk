import { redirect } from "next/navigation";
import type { SessionUser } from "./auth";
import { orgInspectionsIsOn } from "./ocr-samples";
import { ROLES } from "./roles";

export async function requireInspectionsAccess(session: SessionUser) {
  if (session.role === ROLES.FARMER) redirect("/dashboard");
  if (!(await orgInspectionsIsOn(session.organizationId))) redirect("/tickets");
}
