import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { createFarmerAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";

export default async function FarmersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === ROLES.FARMER && session.farmerId) {
    redirect(`/farmers/${session.farmerId}`);
  }
  if (session.role !== ROLES.ADMIN) redirect("/dashboard");

  const farmers = await prisma.farmer.findMany({
    where: { organizationId: session.organizationId },
    include: {
      contacts: { orderBy: { name: "asc" } },
      _count: { select: { pivots: true, tickets: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <h1 className="font-display text-3xl">Farms</h1>
        <ul className="mt-6 divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white">
          {farmers.map((farmer) => (
            <li key={farmer.id} className="px-4 py-3">
              <Link href={`/farmers/${farmer.id}`} className="font-semibold text-emerald-900 hover:underline">
                {farmer.name}
              </Link>
              <p className="text-sm text-stone-600">
                {farmer._count.pivots} pivots · {farmer._count.tickets} tickets
                {farmer.contacts.length
                  ? ` · ${farmer.contacts.map((contact) => contact.name).join(", ")}`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      </div>
      <div className="lg:col-span-2">
        <h2 className="font-display text-xl">Add farm</h2>
        <ActionForm action={createFarmerAction} className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
          <label className="block text-sm font-medium">
            Farm name
            <input name="name" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Address
            <input name="address" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Primary contact</p>
          <label className="block text-sm font-medium">
            Contact name
            <input name="contactName" placeholder="Optional — defaults to farm name" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Phone
            <input name="contactPhone" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Email
            <input name="contactEmail" type="email" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Optional portal login</p>
          <label className="block text-sm font-medium">
            Login email
            <input name="loginEmail" type="email" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Login password
            <input name="loginPassword" type="password" minLength={8} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save farm</button>
        </ActionForm>
      </div>
    </div>
  );
}
