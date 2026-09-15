import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { createCatalogPartAction, importQuickbooksPartsAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";

export default async function PartsPage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string; updated?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === ROLES.FARMER) redirect("/dashboard");

  const query = await searchParams;
  const parts = await prisma.catalogPart.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { name: "asc" },
  });
  const isAdmin = session.role === ROLES.ADMIN;

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <h1 className="font-display text-3xl">Parts list</h1>
        <p className="mt-1 text-stone-600">
          Company catalog for service tickets. Import Products and Services from QuickBooks.
        </p>
        {query.imported || query.updated ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
            QuickBooks import finished: {query.imported ?? "0"} added, {query.updated ?? "0"} updated.
          </p>
        ) : null}
        <div className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white">
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
              {parts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-stone-600">
                    No parts in the catalog yet.
                  </td>
                </tr>
              ) : (
                parts.map((part) => (
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
        </div>
      </div>
      <div className="lg:col-span-2 space-y-8">
        {isAdmin ? (
          <>
            <section>
              <h2 className="font-display text-xl">Import from QuickBooks</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-stone-600">
                <li>In QuickBooks, open Products and Services (or the Item list).</li>
                <li>Export to Excel, then save as CSV — or export IIF INVITEM rows.</li>
                <li>Upload that file here. Matching names update; new names are added.</li>
              </ol>
              <p className="mt-2 text-sm">
                <a href="/quickbooks-parts-template.csv" className="text-emerald-800 hover:underline">
                  Download a sample CSV
                </a>
              </p>
              <ActionForm action={importQuickbooksPartsAction} encType="multipart/form-data" className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
                <label className="block text-sm font-medium">
                  QuickBooks file
                  <input name="file" type="file" accept=".csv,.txt,.iif" required className="mt-1 w-full text-sm" />
                </label>
                <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
                  Import parts
                </button>
              </ActionForm>
            </section>
            <section>
              <h2 className="font-display text-xl">Add one part</h2>
              <ActionForm action={createCatalogPartAction} className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
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
                <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save part</button>
              </ActionForm>
            </section>
          </>
        ) : (
          <p className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
            Ask a company admin to import the QuickBooks item list. You can pick from it when logging parts on a ticket.
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
