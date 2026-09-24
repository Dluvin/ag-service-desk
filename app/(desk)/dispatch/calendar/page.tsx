import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ticketWhere } from "@/lib/scope";
import { DISPATCH_STATUSES, ROLES } from "@/lib/roles";
import { parseStoreParam, storeTicketWhere } from "@/lib/stores";
import { StoreFilter } from "@/components/StoreFilter";
import { DispatchCalendar } from "@/components/DispatchCalendar";
import { getRequestLocale } from "@/lib/user-locale";
import { t } from "@/lib/i18n";

export default async function DispatchCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; month?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === ROLES.FARMER) redirect("/dashboard");

  const query = await searchParams;
  const locale = await getRequestLocale();
  const stores = await prisma.store.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const selectedStore = parseStoreParam(query.store, stores);

  const tickets = await prisma.ticket.findMany({
    where: {
      ...ticketWhere(session),
      ...storeTicketWhere(selectedStore),
      status: { in: DISPATCH_STATUSES },
    },
    include: { farmer: true, technician: true },
    orderBy: { scheduledAt: "asc" },
  });

  const backParams = new URLSearchParams();
  if (query.store) backParams.set("store", query.store);
  if (query.month) backParams.set("month", query.month);
  const backQuery = backParams.toString();

  return (
    <div>
      <p className="text-sm text-stone-600">
        <Link href={backQuery ? `/dispatch?${backQuery}` : "/dispatch"} className="text-emerald-800 hover:underline">
          {t(locale, "dispatch.title")}
        </Link>
      </p>
      <h1 className="font-display mt-2 text-3xl">{t(locale, "desk.calendarTitle")}</h1>
      <p className="mt-1 text-stone-600">Scheduled work orders for the selected store. Open this page in its own window while you work the board and map.</p>
      <StoreFilter stores={stores} selected={selectedStore} pathname="/dispatch/calendar" />
      <DispatchCalendar
        tickets={tickets}
        month={query.month}
        store={selectedStore}
        basePath="/dispatch/calendar"
        compact
      />
    </div>
  );
}
