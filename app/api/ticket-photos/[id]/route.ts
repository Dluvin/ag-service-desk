import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ticketWhere } from "@/lib/scope";
import { readTicketPhotoFile } from "@/lib/ticket-photos";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id } = await params;
  const photo = await prisma.ticketPhoto.findFirst({
    where: {
      id,
      ticket: ticketWhere(session),
    },
  });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  try {
    const bytes = await readTicketPhotoFile(photo.id);
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": photo.mimeType || "image/jpeg",
        "Content-Disposition": `inline; filename="${photo.fileName.replaceAll('"', "")}"`,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Photo file is missing." }, { status: 404 });
  }
}
