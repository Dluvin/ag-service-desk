import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { searchCatalogLabor } from "@/lib/catalog";
import { createCatalogLaborAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { LaborImportForm } from "@/components/LaborImportForm";

export const maxDuration = 120;

export default async function LaborPage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string; updated?: string; q?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === ROLES.FARMER) redirect("/dashboard");

  const query = await searchParams;
  const q = (query.q ?? "").trim();
  const [total, shown] = await Promise.all([
    prisma.catalogLabor.count({ where: { organizationId: session.organizationId } }),
    searchCatalogLabor({
      organizationId: session.organizationId,
      query: q,
      take: 150,
    }),
  ]);
  const isAdmin = session.role === ROLES.ADMIN;

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <h1 className="font-display text-3xl">Labor list</h1>
        <p className="mt-1 text-stone-600">
          Company labor items for service tickets. Import Service items from QuickBooks, or a CSV of labor names and rates.
        </p>
        {query.imported || query.updated ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
            Import finished: {query.imported ?? "0"} added, {query.updated ?? "0"} updated.
          </p>
        ) : null}
        <form className="mt-4" action="/labor">
          <label className="block text-sm font-medium">
            Search catalog
            <input
              name="q"
              defaultValue={q}
              placeholder="Name or code"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
            />
          </label>
        </form>
        <p className="mt-2 text-sm text-stone-500">
          {total === 0
            ? "No labor items in the catalog yet."
            : q
              ? `Showing ${shown.length.toLocaleString()} of ${total.toLocaleString()} items matching “${q}”.`
              : `Showing first ${shown.length.toLocaleString()} of ${total.toLocaleString()} items. Search to find one.`}
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-2">Labor</th>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-stone-600">
                    {total === 0 ? "No labor items yet." : "No labor items match that search."}
                  </td>
                </tr>
              ) : (
                shown.map((item) => (
                  <tr key={item.id} className={item.active ? "" : "text-stone-400"}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-900">{item.name}</p>
                      {item.description ? <p className="text-xs text-stone-500">{item.description}</p> : null}
                    </td>
                    <td className="px-4 py-3">{item.sku ?? "—"}</td>
                    <td className="px-4 py-3">{item.itemType ?? "—"}</td>
                    <td className="px-4 py-3">{item.rate != null ? `$${item.rate.toFixed(2)}/hr` : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="lg:col-span-2 space-y-8">
        {isAdmin ? (
          <>
            <section>
              <h2 className="font-display text-xl">Import labor items</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-stone-600">
                <li>In QuickBooks, export Products and Services (or the Item list).</li>
                <li>Save as CSV. Service and labor items are imported; inventory parts are skipped.</li>
                <li>Matching names update; new names are added.</li>
              </ol>
              <p className="mt-2 text-sm">
                <a href="/labor-template.csv" className="text-emerald-800 hover:underline">
                  Download a sample CSV
                </a>
              </p>
              <LaborImportForm />
            </section>
            <section>
              <h2 className="font-display text-xl">Add one labor item</h2>
              <ActionForm action={createCatalogLaborAction} className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
                <label className="block text-sm font-medium">
                  Name
                  <input name="name" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                </label>
                <label className="block text-sm font-medium">
                  Code
                  <input name="sku" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                </label>
                <label className="block text-sm font-medium">
                  Type
                  <input name="itemType" defaultValue="Service" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                </label>
                <label className="block text-sm font-medium">
                  Description
                  <input name="description" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                </label>
                <label className="block text-sm font-medium">
                  Hourly rate
                  <input name="rate" type="number" step="0.01" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                </label>
                <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save labor</button>
              </ActionForm>
            </section>
          </>
        ) : (
          <p className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
            Ask a company admin to import labor items. You can pick from the list when logging hours on a ticket.
          </p>
        )}
        <p className="text-sm text-stone-500">
          <Link href="/tickets" className="text-emerald-800 hover:underline">
            Back to tickets
          </Link>
        </p>
      </div>
    </div>
  );
}
