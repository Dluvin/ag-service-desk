import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readCompanyLogoFile } from "@/lib/company-logo";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    select: { logoMimeType: true, logoFileName: true },
  });
  if (!org?.logoMimeType) {
    return NextResponse.json({ error: "No logo." }, { status: 404 });
  }

  try {
    const bytes = await readCompanyLogoFile(session.organizationId);
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
