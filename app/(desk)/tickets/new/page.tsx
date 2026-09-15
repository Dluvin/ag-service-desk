import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pivotWhere, loadTechnicians } from "@/lib/scope";
import { ROLES, PRIORITIES } from "@/lib/roles";
import { createTicketAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";

export default async function NewTicketPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [pivots, technicians] = await Promise.all([
    prisma.pivot.findMany({
      where: pivotWhere(session),
      include: { farmer: true },
      orderBy: { name: "asc" },
    }),
    loadTechnicians(session.organizationId),
  ]);

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl">New service ticket</h1>
      <ActionForm action={createTicketAction} className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-6">
        <label className="block text-sm font-medium">
          Pivot
          <select name="pivotId" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2">
            <option value="">Select a pivot</option>
            {pivots.map((pivot) => (
              <option key={pivot.id} value={pivot.id}>
                {pivot.farmer.name} — {pivot.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Title
          <input name="title" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">
          Description
          <textarea name="description" required rows={4} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">
          Priority
          <select name="priority" defaultValue="NORMAL" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2">
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        {session.role === ROLES.ADMIN ? (
          <label className="block text-sm font-medium">
            Assign technician
            <select name="technicianId" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2">
              <option value="">Unassigned</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button className="rounded-lg bg-emerald-800 px-4 py-2 font-semibold text-white">Create ticket</button>
      </ActionForm>
    </div>
  );
}
