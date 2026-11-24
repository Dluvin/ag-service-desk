import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { homePath } from "@/lib/home";
import { loadPivotPackages } from "@/lib/pivot-packages-data";
import { PivotPackageSearch } from "@/components/PivotPackageSearch";

export default async function SalesPackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ item?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === ROLES.FARMER) redirect(homePath(session.role));

  const params = await searchParams;
  const packages = await loadPivotPackages();

  return (
    <div className="grid gap-5">
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
      </div>
      <PivotPackageSearch packages={packages} initialItem={params.item ?? ""} />
    </div>
  );
}
