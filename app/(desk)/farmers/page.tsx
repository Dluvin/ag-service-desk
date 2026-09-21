import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { createFarmerAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { FarmDirectory } from "@/components/FarmDirectory";
import { StoreSelect } from "@/components/StoreSelect";
import { WelcomeMailNotice } from "@/components/WelcomeMailNotice";

export default async function FarmersPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === ROLES.FARMER && session.farmerId) {
    redirect(`/farmers/${session.farmerId}`);
  }
  if (session.role === ROLES.FARMER) redirect("/dashboard");
  const query = await searchParams;

  const [farmers, stores] = await Promise.all([
    prisma.farmer.findMany({
      where: { organizationId: session.organizationId },
      include: {
        store: true,
        contacts: { orderBy: { name: "asc" } },
        _count: { select: { pivots: true, tickets: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.store.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <h1 className="font-display text-3xl">Customers</h1>
        <WelcomeMailNotice status={query.welcome} />
        <FarmDirectory
          farms={farmers.map((farmer) => ({
            id: farmer.id,
            name: farmer.name,
            address: farmer.address,
            store: farmer.store?.name ?? null,
            pivotCount: farmer._count.pivots,
            ticketCount: farmer._count.tickets,
            contacts: farmer.contacts.map((contact) => contact.name).join(", "),
          }))}
        />
      </div>
      <div className="lg:col-span-2">
        <h2 className="font-display text-xl">Add customer</h2>
        <ActionForm action={createFarmerAction} className="mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
          <label className="block text-sm font-medium">
            Customer name
            <input name="name" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Address
            <input name="address" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <StoreSelect stores={stores} />
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Primary contact</p>
          <label className="block text-sm font-medium">
            Contact name
            <input name="contactName" placeholder="Optional — defaults to customer name" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
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
            <span className="mt-1 block text-xs font-normal text-stone-500">
              Optional if you enter a login email. Leave blank so they set a password from the welcome
              email.
            </span>
          </label>
          <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save customer</button>
        </ActionForm>
      </div>
    </div>
  );
}
