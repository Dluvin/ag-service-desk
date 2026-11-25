import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROLES, canManageParts } from "@/lib/roles";
import { homePath } from "@/lib/home";
import { loadPivotPackages } from "@/lib/pivot-packages-data";
import { CreatePivotPackageForm } from "@/components/CreatePivotPackageForm";
import { PivotPackageSearch } from "@/components/PivotPackageSearch";

export default async function SalesPackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ item?: string; created?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === ROLES.FARMER) redirect(homePath(session.role));

  const params = await searchParams;
  const packages = await loadPivotPackages(session.organizationId);
  const canCreate = canManageParts(session.role);

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="grid gap-5 lg:col-span-3">
        <div>
          <p className="text-sm text-stone-500">
            <Link href="/sales" className="text-emerald-800 hover:underline">
              Sales
            </Link>
          </p>
          <h1 className="font-display text-3xl">Pivot packages</h1>
          <p className="mt-1 max-w-2xl text-stone-600">
            Look up sprinkler and pivot packages by any part of the item number, description, purchase description,
            vendor, cost, or price. Select an item number for quantity, MPN, barcode, and other details.
          </p>
          {params.created ? (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
              Package created. Search below opens the new item when you typed its number.
            </p>
          ) : null}
        </div>
        <PivotPackageSearch packages={packages} initialItem={params.item ?? ""} />
      </div>
      <div className="lg:col-span-2">
        {canCreate ? (
          <section>
            <h2 className="font-display text-xl">New package</h2>
            <p className="mt-1 text-sm text-stone-600">
              Add a pivot or sprinkler package for this company. It shows up in search with the shared catalog.
            </p>
            <div className="mt-3">
              <CreatePivotPackageForm />
            </div>
          </section>
        ) : (
          <p className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
            Ask an admin, manager, or salesperson to add a new pivot or sprinkler package.
          </p>
        )}
      </div>
    </div>
  );
}
