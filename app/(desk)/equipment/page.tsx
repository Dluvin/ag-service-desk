import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES, canManageParts } from "@/lib/roles";
import { CATALOG_PAGE_SIZE, countCatalogEquipment, parseCatalogPage, searchCatalogEquipment } from "@/lib/catalog";
import { createCatalogEquipmentAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { EquipmentImportForm } from "@/components/EquipmentImportForm";
import { CatalogSearchBox } from "@/components/CatalogSearchBox";
import { CatalogPager } from "@/components/CatalogPager";

export const maxDuration = 120;

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string; updated?: string; q?: string; page?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === ROLES.FARMER) redirect("/dashboard");

  const query = await searchParams;
  const q = (query.q ?? "").trim();
  const requestedPage = parseCatalogPage(query.page);
  const [total, matched] = await Promise.all([
    prisma.catalogEquipment.count({ where: { organizationId: session.organizationId } }),
    countCatalogEquipment({ organizationId: session.organizationId, query: q }),
  ]);
  const pageCount = Math.max(1, Math.ceil(matched / CATALOG_PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const shown = await searchCatalogEquipment({
    organizationId: session.organizationId,
    query: q,
    take: CATALOG_PAGE_SIZE,
    skip: (page - 1) * CATALOG_PAGE_SIZE,
  });
  const from = matched === 0 ? 0 : (page - 1) * CATALOG_PAGE_SIZE + 1;
  const to = (page - 1) * CATALOG_PAGE_SIZE + shown.length;
  const canEdit = canManageParts(session.role);

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <h1 className="font-display text-3xl">Equipment list</h1>
        <p className="mt-1 text-stone-600">
          Shop equipment used on service tickets. Import a CSV of names and hourly rates, then log hours on a ticket.
        </p>
        {query.imported || query.updated ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
            Import finished: {query.imported ?? "0"} added, {query.updated ?? "0"} updated.
          </p>
        ) : null}
        <CatalogSearchBox action="/equipment" defaultQuery={q} placeholder="Name, code, or description" />
        <p className="mt-2 text-sm text-stone-500">
          {total === 0
            ? "No equipment in the catalog yet."
            : q
              ? `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${matched.toLocaleString()} items matching “${q}” (${total.toLocaleString()} in catalog).`
              : `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()} items.`}
        </p>
        <CatalogPager action="/equipment" query={q} page={page} pageCount={pageCount} />
        <div className="mt-4 overflow-hidden rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-2">Equipment</th>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-stone-600">
                    {total === 0 ? "No equipment items yet." : "No equipment items match that search."}
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
        <CatalogPager action="/equipment" query={q} page={page} pageCount={pageCount} />
      </div>
      <div className="lg:col-span-2 space-y-8">
        {canEdit ? (
          <>
            <section>
              <h2 className="font-display text-xl">Import equipment</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-stone-600">
                <li>Export equipment, rentals, or other-charge items from QuickBooks, or use the sample CSV.</li>
                <li>Save as CSV. Matching names update; new names are added.</li>
              </ol>
              <p className="mt-2 text-sm">
                <a href="/equipment-template.csv" className="text-emerald-800 hover:underline">
                  Download a sample CSV
                </a>
              </p>
              <EquipmentImportForm />
            </section>
            <section>
              <h2 className="font-display text-xl">Add one equipment item</h2>
              <ActionForm action={createCatalogEquipmentAction} className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
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
                  <input name="itemType" defaultValue="Equipment" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                </label>
                <label className="block text-sm font-medium">
                  Description
                  <input name="description" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                </label>
                <label className="block text-sm font-medium">
                  Hourly rate
                  <input name="rate" type="number" step="0.01" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                </label>
                <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save equipment</button>
              </ActionForm>
            </section>
          </>
        ) : (
          <p className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
            Ask an admin or manager to import equipment. You can pick from the list when logging equipment used on a ticket.
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
