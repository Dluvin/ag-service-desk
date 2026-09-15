import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { SelectableMap } from "@/components/SelectableMap";
import { StatusBadge } from "@/components/Badges";

export default async function FarmerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  if (session.role === ROLES.FARMER && session.farmerId !== id) notFound();

  const farmer = await prisma.farmer.findFirst({
    where: { id, organizationId: session.organizationId },
    include: {
      pivots: true,
      tickets: { include: { pivot: true }, orderBy: { updatedAt: "desc" }, take: 12 },
    },
  });
  if (!farmer) notFound();

  return (
    <div>
      <h1 className="font-display text-3xl">{farmer.name}</h1>
      <p className="text-stone-600">
        {[farmer.phone, farmer.email, farmer.address].filter(Boolean).join(" · ")}
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SelectableMap
          markers={farmer.pivots.map((pivot) => ({
            id: pivot.id,
            name: pivot.name,
            lat: pivot.latitude,
            lng: pivot.longitude,
            subtitle: pivot.serialNumber ?? undefined,
          }))}
        />
        <div>
          <h2 className="font-display text-xl">Pivots</h2>
          <ul className="mt-2 space-y-2">
            {farmer.pivots.map((pivot) => (
              <li key={pivot.id}>
                <Link href={`/pivots/${pivot.id}`} className="text-emerald-800 hover:underline">
                  {pivot.name}
                </Link>
              </li>
            ))}
          </ul>
          <h2 className="font-display mt-6 text-xl">Tickets</h2>
          <ul className="mt-2 space-y-2">
            {farmer.tickets.map((ticket) => (
              <li key={ticket.id} className="flex items-center justify-between gap-2">
                <Link href={`/tickets/${ticket.id}`} className="hover:underline">
                  #{ticket.number} {ticket.title}
                </Link>
                <StatusBadge status={ticket.status} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
