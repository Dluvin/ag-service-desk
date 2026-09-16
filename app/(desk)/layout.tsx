import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/Nav";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const org = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    select: { name: true, logoMimeType: true },
  });

  return (
    <div className="min-h-full">
      <Nav session={session} companyName={org?.name} hasLogo={Boolean(org?.logoMimeType)} />
      <main className="mx-auto max-w-7xl px-4 py-8 print:max-w-none print:px-0 print:py-0">{children}</main>
    </div>
  );
}
