import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES, canManageParts } from "@/lib/roles";
import { CATALOG_PAGE_SIZE, countCatalogParts, parseCatalogPage, searchCatalogParts } from "@/lib/catalog";
import { createCatalogPartAction, updateCatalogPartAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { PartsImportForm } from "@/components/PartsImportForm";
import { CatalogSearchBox } from "@/components/CatalogSearchBox";
import { CatalogPager } from "@/components/CatalogPager";

export const maxDuration = 120;

export default async function PartsPage({
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
    prisma.catalogPart.count({ where: { organizationId: session.organizationId } }),
    countCatalogParts({ organizationId: session.organizationId, query: q }),
  ]);
  const pageCount = Math.max(1, Math.ceil(matched / CATALOG_PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const shown = await searchCatalogParts({
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
        <h1 className="font-display text-3xl">Parts list</h1>
        <p className="mt-1 text-stone-600">
          Company catalog for work orders. Import Products and Services from QuickBooks.
        </p>
        {query.imported || query.updated ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
            QuickBooks import finished: {query.imported ?? "0"} added, {query.updated ?? "0"} updated.
          </p>
        ) : null}
        <CatalogSearchBox action="/parts" defaultQuery={q} placeholder="Name, SKU, or description" />
        <p className="mt-2 text-sm text-stone-500">
          {total === 0
            ? "No parts in the catalog yet."
            : q
              ? `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${matched.toLocaleString()} parts matching “${q}” (${total.toLocaleString()} in catalog).`
              : `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()} parts.`}
        </p>
        <CatalogPager action="/parts" query={q} page={page} pageCount={pageCount} />
        <div className="mt-4 overflow-hidden rounded-xl border border-stone-200 bg-white">
          {canEdit ? (
            <ul className="divide-y divide-stone-100">
              {shown.length === 0 ? (
                <li className="px-4 py-6 text-sm text-stone-600">
                  {total === 0 ? "No parts in the catalog yet." : "No parts match that search."}
                </li>
              ) : (
                shown.map((part) => (
                  <li key={part.id} className={`px-4 py-3 ${part.active ? "" : "opacity-60"}`}>
                    <ActionForm action={updateCatalogPartAction} className="grid gap-2 sm:grid-cols-6">
                      <input type="hidden" name="id" value={part.id} />
                      <input type="hidden" name="q" value={q} />
                      <input type="hidden" name="page" value={String(page)} />
                      <label className="block text-xs font-medium sm:col-span-2">
                        Name
                        <input
                          name="name"
                          required
                          defaultValue={part.name}
                          className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                        />
                      </label>
                      <label className="block text-xs font-medium">
                        SKU
                        <input
                          name="sku"
                          defaultValue={part.sku ?? ""}
                          className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                        />
                      </label>
                      <label className="block text-xs font-medium">
                        Type
                        <input
                          name="itemType"
                          defaultValue={part.itemType ?? ""}
                          className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                        />
                      </label>
                      <label className="block text-xs font-medium">
                        Price
                        <input
                          name="price"
                          type="number"
                          step="0.01"
                          defaultValue={part.price ?? ""}
                          className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                        />
                      </label>
                      <label className="block text-xs font-medium">
                        On hand
                        <input
                          name="quantityOnHand"
                          type="number"
                          step="0.01"
                          defaultValue={part.quantityOnHand ?? ""}
                          className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                        />
                      </label>
                      <label className="block text-xs font-medium sm:col-span-3">
                        Description
                        <input
                          name="description"
                          defaultValue={part.description ?? ""}
                          className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                        />
                      </label>
                      <label className="block text-xs font-medium">
                        Cost
                        <input
                          name="cost"
                          type="number"
                          step="0.01"
                          defaultValue={part.cost ?? ""}
                          className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                        />
                      </label>
                      <div className="flex items-end sm:col-span-2">
                        <button className="rounded-lg bg-emerald-800 px-3 py-1.5 text-sm font-semibold text-white">
                          Save
                        </button>
                      </div>
                    </ActionForm>
                  </li>
                ))
              )}
            </ul>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-2">Part</th>
                  <th className="px-4 py-2">SKU</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Price</th>
                  <th className="px-4 py-2">On hand</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {shown.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-stone-600">
                      {total === 0 ? "No parts in the catalog yet." : "No parts match that search."}
                    </td>
                  </tr>
                ) : (
                  shown.map((part) => (
                    <tr key={part.id} className={part.active ? "" : "text-stone-400"}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-stone-900">{part.name}</p>
                        {part.description ? <p className="text-xs text-stone-500">{part.description}</p> : null}
                      </td>
                      <td className="px-4 py-3">{part.sku ?? "—"}</td>
                      <td className="px-4 py-3">{part.itemType ?? "—"}</td>
                      <td className="px-4 py-3">{part.price != null ? `$${part.price.toFixed(2)}` : "—"}</td>
                      <td className="px-4 py-3">{part.quantityOnHand ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
        <CatalogPager action="/parts" query={q} page={page} pageCount={pageCount} />
      </div>
      <div className="lg:col-span-2 space-y-8">
        {canEdit ? (
          <>
            <section>
              <h2 className="font-display text-xl">Import from QuickBooks</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-stone-600">
                <li>In QuickBooks, open Products and Services (or the Item list).</li>
                <li>Export to Excel, then save as CSV — or export IIF INVITEM rows.</li>
                <li>Upload that file here. Matching names update; new names are added.</li>
              </ol>
              <p className="mt-2 text-sm text-stone-600">
                Large lists (~12,000 parts) are imported in small batches so the upload does not time out. Save Excel as CSV or IIF, under 20 MB.
              </p>
              <p className="mt-2 text-sm">
                <a href="/quickbooks-parts-template.csv" className="text-emerald-800 hover:underline">
                  Download a sample CSV
                </a>
              </p>
              <PartsImportForm />
            </section>
            <section>
              <h2 className="font-display text-xl">Add one part</h2>
              <ActionForm action={createCatalogPartAction} className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
                <input type="hidden" name="q" value={q} />
                <input type="hidden" name="page" value={String(page)} />
                <label className="block text-sm font-medium">
                  Name
                  <input name="name" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                </label>
                <label className="block text-sm font-medium">
                  SKU
                  <input name="sku" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                </label>
                <label className="block text-sm font-medium">
                  Type
                  <input name="itemType" placeholder="Inventory, Service…" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                </label>
                <label className="block text-sm font-medium">
                  Description
                  <input name="description" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-sm font-medium">
                    Price
                    <input name="price" type="number" step="0.01" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                  </label>
                  <label className="block text-sm font-medium">
                    Cost
                    <input name="cost" type="number" step="0.01" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                  </label>
                </div>
                <label className="block text-sm font-medium">
                  On hand
                  <input name="quantityOnHand" type="number" step="0.01" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                </label>
                <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save part</button>
              </ActionForm>
            </section>
          </>
        ) : (
          <p className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
            Ask an admin or manager to import or edit the parts list. You can pick from it when logging parts on a work order.
          </p>
        )}
        <p className="text-sm text-stone-500">
          <Link href="/tickets" className="text-emerald-800 hover:underline">
            Back to work orders
          </Link>
        </p>
      </div>
    </div>
  );
}
