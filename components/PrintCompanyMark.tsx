import { getSession } from "@/lib/auth";
import { companyLogoSrc } from "@/lib/org-brand";
import { prisma } from "@/lib/prisma";

export function PrintCompanyMark({
  name,
  hasLogo,
  organizationId,
}: {
  name: string;
  hasLogo: boolean;
  organizationId?: string;
}) {
  return (
    <div className="mb-4 hidden items-center gap-3 border-b border-stone-300 pb-3 print:flex">
      {hasLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={organizationId ? companyLogoSrc(organizationId) : "/api/company-logo"}
          alt={name}
          className="h-12 max-w-40 object-contain"
        />
      ) : (
        <p className="font-display text-2xl">{name}</p>
      )}
    </div>
  );
}

export async function ReportPrintBrand() {
  const session = await getSession();
  if (!session) return null;
  const org = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    select: { id: true, name: true, logoMimeType: true },
  });
  return (
    <PrintCompanyMark
      name={org?.name ?? session.organizationName}
      hasLogo={Boolean(org?.logoMimeType)}
      organizationId={org?.id ?? session.organizationId}
    />
  );
}
