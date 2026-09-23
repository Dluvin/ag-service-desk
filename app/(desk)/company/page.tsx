import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { removeCompanyLogoAction, saveCompanyLogoAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";

export default async function CompanyLogoPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdmin(session.role)) redirect("/dashboard");

  const org = await prisma.organization.findUnique({ where: { id: session.organizationId } });
  if (!org) redirect("/dashboard");

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl">Company logo</h1>
      <p className="mt-2 text-stone-600">
        This logo shows in the top bar for everyone in {org.name}, on printed work orders and
        reports, and on staff welcome emails. If you do not upload one, those prints and emails use
        the company name.
      </p>
      {org.logoMimeType ? (
        <div className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-sm font-medium text-stone-700">Current logo</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/api/company-logo" alt={`${org.name} logo`} className="mt-3 max-h-24 max-w-full object-contain" />
          <ActionForm action={removeCompanyLogoAction} className="mt-4">
            <button className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-800 hover:bg-red-50">
              Remove logo
            </button>
          </ActionForm>
        </div>
      ) : (
        <p className="mt-4 text-sm text-stone-600">No logo uploaded yet.</p>
      )}
      <ActionForm action={saveCompanyLogoAction} encType="multipart/form-data" className="mt-6 space-y-3 rounded-xl border border-stone-200 bg-white p-4">
        <label className="block text-sm font-medium">
          Logo file
          <input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/gif" required className="mt-1 w-full text-sm" />
        </label>
        <p className="text-xs text-stone-500">PNG, JPG, WebP, or GIF. 2 MB or smaller.</p>
        <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save logo</button>
      </ActionForm>
    </div>
  );
}
