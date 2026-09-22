import { SALES_EMAIL, SALES_MAILTO } from "@/lib/plans";

export function ContactSalesNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-stone-700">
      <p>{children}</p>
      <p className="mt-2">
        <a href={SALES_MAILTO} className="font-semibold text-emerald-800 hover:underline">
          {SALES_EMAIL}
        </a>
      </p>
    </div>
  );
}
