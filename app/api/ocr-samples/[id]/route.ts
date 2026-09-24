import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { loadOrgOcrSettings, readOrgOcrSampleFile } from "@/lib/ocr-samples";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;
  const settings = await loadOrgOcrSettings(session.organizationId);
  const sample = settings.samples.find((row) => row.id === id);
  if (!sample) {
    return NextResponse.json({ error: "Sample not found." }, { status: 404 });
  }

  try {
    const bytes = await readOrgOcrSampleFile(sample.id);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": sample.mimeType || "image/jpeg",
        "Content-Disposition": `inline; filename="${sample.fileName.replaceAll('"', "")}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "Sample file is missing." }, { status: 404 });
  }
}
