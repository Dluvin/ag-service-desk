import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { REVEAL_EU, loadRevealCreds, storedRevealVehicles } from "@/lib/reveal";
import { saveRevealSettingsAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { RevealTestForm } from "@/components/RevealTestForm";
import Link from "next/link";

export default async function RevealSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== ROLES.ADMIN) redirect("/dashboard");

  const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
  if (!org) redirect("/dashboard");
  const configured = Boolean(await loadRevealCreds(session.organizationId));
  const vehicles = configured ? await storedRevealVehicles(session.organizationId) : [];

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl">Connectors</h1>
      <p className="mt-2 text-stone-600">
        Connect GPS and other fleet systems so truck locations show on Dispatch and ticket maps.
      </p>

      <section className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="font-display text-xl">Verizon Connect Reveal</h2>
        <p className="mt-2 text-sm text-stone-600">
          Use the Reveal REST integration username and password (not the everyday portal login), plus
          the App ID from Integration Manager. GPS uses Vehicle Update API v1 (Live) only:{" "}
          {`POST /vehicles/locations`}, {`POST /vehicles/statuses`}, and{" "}
          {`GET /vehicles/{vehicleNumber}/location`}. The identifier is Vehicle Number, not the name
          on the live map. DTC and ECM calls are not used for pins.
        </p>

      <ActionForm action={saveRevealSettingsAction} className="mt-6 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
        <label className="block text-sm font-medium">
          App ID
          <input
            name="revealAppId"
            required
            defaultValue={org.revealAppId ?? ""}
            placeholder="fleetmatics-p-us-…"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
          <span className="mt-1 block text-xs font-normal text-stone-500">
            Only the App ID, like fleetmatics-p-us-…. Do not paste Atmosphere, Bearer, or the whole
            Authorization header from Integration Manager.
          </span>
        </label>
        <label className="block text-sm font-medium">
          Integration username
          <input
            name="revealUsername"
            required
            defaultValue={org.revealUsername ?? ""}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium">
          Integration password
          <input
            name="revealPassword"
            type="password"
            placeholder={org.revealPassword ? "Saved — leave blank to keep" : ""}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium">
          Region
          <select
            name="revealRegion"
            defaultValue={org.revealBaseUrl === REVEAL_EU ? "EU" : "US"}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          >
            <option value="US">United States</option>
            <option value="EU">Europe</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          On-site radius (meters)
          <input
            name="revealOnsiteMeters"
            type="number"
            min={50}
            max={2000}
            defaultValue={org.revealOnsiteMeters}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
          <span className="mt-1 block text-xs font-normal text-stone-500">
            Truck GPS within this distance of the pivot pin counts as on site. 400m is a typical
            starting point for a center pivot.
          </span>
        </label>
        <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
          Save Reveal login
        </button>
      </ActionForm>

      {configured ? (
        <form method="get" action="/api/reveal/places.csv" className="mt-4 space-y-2">
          <label className="block text-sm font-medium">
            Place categories
            <textarea
              name="category"
              rows={4}
              className="mt-1 w-full max-w-md rounded-lg border border-stone-300 px-3 py-2"
              placeholder={"ALL\nor Customer, Yard, Shop"}
            />
          </label>
          <p className="text-xs text-stone-500">
            Verizon has no single All-categories API. Type ALL to try every truck group in one
            sheet, or paste every Places category (commas or one per line) to combine them.
          </p>
          <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            Download Places (Excel)
          </button>
        </form>
      ) : null}

      {configured ? <RevealTestForm /> : null}

      {vehicles.length > 0 ? (
        <div className="mt-8">
          <h3 className="font-display text-lg">Saved Verizon vehicles</h3>
          <p className="mt-1 text-sm text-stone-600">
            Full list is under{" "}
            <Link href="/vehicles" className="text-emerald-800 hover:underline">
              Settings → Vehicles
            </Link>
            . Assign a truck to each technician on{" "}
            <Link href="/technicians" className="text-emerald-800 hover:underline">
              technicians
            </Link>
            .
          </p>
          <p className="mt-3 text-sm text-stone-700">{vehicles.length} vehicle(s) saved.</p>
        </div>
      ) : configured ? (
        <p className="mt-6 text-sm text-stone-600">
          Test the connection or{" "}
          <Link href="/vehicles" className="text-emerald-800 hover:underline">
            refresh vehicles
          </Link>{" "}
          to save the Verizon truck list.
        </p>
      ) : null}
      </section>

      <section className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h2 className="font-display text-xl text-stone-900">Other GPS connectors</h2>
        <p className="mt-2 text-sm text-stone-700">
          Need Samsara, Motive, Geotab, or another GPS system? We can add connectors. Development
          fees may apply depending on the provider and how their API works.
        </p>
        <Link
          href="/contact"
          className="mt-3 inline-block text-sm font-semibold text-emerald-800 hover:underline"
        >
          Request feature
        </Link>
      </section>
    </div>
  );
}
