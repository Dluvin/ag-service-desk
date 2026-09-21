import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pivotWhere } from "@/lib/scope";
import { downloadDisposition, readPivotDocumentFile, safeDownloadName } from "@/lib/pivot-documents";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;
  const document = await prisma.pivotDocument.findFirst({
    where: {
      id,
      pivot: pivotWhere(session),
    },
  });
  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  try {
    const bytes = await readPivotDocumentFile(document.id);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": document.mimeType || "application/octet-stream",
        "Content-Disposition": `${downloadDisposition(document.mimeType)}; filename="${safeDownloadName(document.fileName)}"`,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Document file is missing." }, { status: 404 });
  }
}
