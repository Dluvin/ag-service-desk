import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readCompanyLogoFile } from "@/lib/company-logo";
import { resolveOrgBrandByEmail, resolveOrgBrandById } from "@/lib/org-brand";
import { prisma } from "@/lib/prisma";

async function resolveLogoOrg(request: Request) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("org")?.trim();
  const email = url.searchParams.get("email")?.trim() ?? "";

  if (orgId) {
    const brand = await resolveOrgBrandById(orgId);
    if (brand?.hasLogo) return brand.organizationId;
  }

  if (email) {
    const brand = await resolveOrgBrandByEmail(email);
    if (brand?.hasLogo) return brand.organizationId;
  }

  const session = await getSession();
  if (session) return session.organizationId;
  return null;
}

export async function GET(request: Request) {
  const organizationId = await resolveLogoOrg(request);
  if (!organizationId) {
    return NextResponse.json({ error: "No logo." }, { status: 404 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { logoMimeType: true, logoFileName: true },
  });
  if (!org?.logoMimeType) {
    return NextResponse.json({ error: "No logo." }, { status: 404 });
  }

  try {
    const bytes = await readCompanyLogoFile(organizationId);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": org.logoMimeType,
        "Content-Disposition": `inline; filename="${(org.logoFileName ?? "logo").replaceAll('"', "")}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "Logo file is missing." }, { status: 404 });
  }
}
