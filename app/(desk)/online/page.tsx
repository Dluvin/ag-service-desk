import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { canViewStaffPresence } from "@/lib/roles";
import { homePath } from "@/lib/home";
import { describeDeskPath, formatPresenceTime, listStaffPresence } from "@/lib/presence";
import { roleLabel } from "@/lib/scope";
import { googleMapsPlaceUrl } from "@/lib/maps";
import { StaffPresenceMap } from "@/components/StaffPresenceMap";
import type { MapPin } from "@/lib/map-pins";

export const dynamic = "force-dynamic";

export default async function OnlineStaffPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewStaffPresence(session.role)) redirect(homePath(session.role));

  const people = await listStaffPresence(session.organizationId);
  const online = people.filter((person) => person.online);
  const pins: MapPin[] = people
    .filter((person) => person.lastLatitude != null && person.lastLongitude != null)
    .map((person) => ({
      id: person.id,
      name: person.name,
      lat: person.lastLatitude as number,
      lng: person.lastLongitude as number,
      subtitle: `${person.online ? "Signed in" : "Last seen"} · ${describeDeskPath(person.lastPath)} · ${formatPresenceTime(person.lastSeenAt)}`,
      href: person.lastPath || undefined,
      hrefLabel: person.lastPath ? `Open ${describeDeskPath(person.lastPath)}` : undefined,
      kind: "person",
    }));

  return (
    <div>
      <h1 className="font-display text-3xl">Who’s signed in</h1>
      <p className="mt-2 max-w-3xl text-stone-600">
        Company admins can see shop staff who have the desk open, the screen they are on, and the
        last location their browser sent. Location needs the person to allow it on that device.
        Customer logins are not listed. Refresh this page to update.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-stone-500">Signed in now</p>
          <p className="mt-1 text-2xl font-semibold">{online.length}</p>
          <p className="mt-1 text-sm text-stone-600">Active in the last 5 minutes</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-stone-500">Staff</p>
          <p className="mt-1 text-2xl font-semibold">{people.length}</p>
          <p className="mt-1 text-sm text-stone-600">Admins, managers, and technicians</p>
        </div>
      </div>

      <div className="mt-6">
        <StaffPresenceMap pins={pins} />
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">Person</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Screen</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Store</th>
            </tr>
          </thead>
          <tbody>
            {people.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-stone-600" colSpan={5}>
                  No shop staff yet. Add people on{" "}
                  <Link href="/staff" className="font-medium text-emerald-800 hover:underline">
                    Staff
                  </Link>
                  .
                </td>
              </tr>
            ) : (
              people.map((person) => {
                const hasCoords = person.lastLatitude != null && person.lastLongitude != null;
                return (
                  <tr key={person.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{person.name}</p>
                      <p className="text-xs text-stone-500">
                        {roleLabel(person.role)} · {person.email}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {person.online ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-900">
                          <span className="size-1.5 rounded-full bg-emerald-600" />
                          Signed in
                        </span>
                      ) : (
                        <span className="text-stone-600">{formatPresenceTime(person.lastSeenAt)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {person.lastPath ? (
                        <Link href={person.lastPath} className="text-emerald-800 hover:underline">
                          {describeDeskPath(person.lastPath)}
                        </Link>
                      ) : (
                        <span className="text-stone-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {hasCoords ? (
                        <a
                          href={googleMapsPlaceUrl(person.lastLatitude as number, person.lastLongitude as number)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-800 hover:underline"
                        >
                          {(person.lastLatitude as number).toFixed(4)}, {(person.lastLongitude as number).toFixed(4)}
                        </a>
                      ) : (
                        <span className="text-stone-500">No phone location</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-600">{person.storeName ?? "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
