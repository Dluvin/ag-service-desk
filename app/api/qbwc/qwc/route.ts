import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { appBaseUrl } from "@/lib/app-url";
import { orgQbwcIsOn } from "@/lib/ocr-samples";
import { ensureQbwcConfig } from "@/lib/qbwc";
import { qbwcFile } from "@/lib/qbwc-soap";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !isAdmin(session.role)) {
    return new NextResponse("Admin only", { status: 403 });
  }
  if (!(await orgQbwcIsOn(session.organizationId))) {
    return new NextResponse("QuickBooks Desktop is not on this plan", { status: 403 });
  }
  const config = await ensureQbwcConfig(session.organizationId);
  if (!config) return new NextResponse("Organization not found", { status: 404 });
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const origin = host ? `${proto}://${host}` : appBaseUrl();
  const xml = qbwcFile({
    appName: "AGDESKPRO",
    appUrl: `${origin}/qbwc`,
    supportUrl: `${origin}/support`,
    username: config.username,
    ownerId: config.ownerId,
    fileId: config.fileId,
  });
  return new NextResponse(xml, {
    headers: {
      "content-type": "application/xml",
      "content-disposition": `attachment; filename="AGDESKPRO.qwc"`,
      "cache-control": "no-store",
    },
  });
}
