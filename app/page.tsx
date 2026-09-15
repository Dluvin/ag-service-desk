import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-full bg-emerald-950 text-emerald-50">
      <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-center px-6 py-20">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">Irrigation field service</p>
        <h1 className="font-display mt-3 text-5xl leading-tight">AG Service Desk</h1>
        <p className="mt-4 max-w-xl text-lg text-emerald-100">
          Multi-tenant dispatch for irrigation companies. Map every pivot, assign tickets to
          technicians, and let farmers watch status from their own login.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-amber-400 px-5 py-2.5 font-semibold text-emerald-950 hover:bg-amber-300"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-lg border border-emerald-400 px-5 py-2.5 font-semibold text-emerald-50 hover:bg-emerald-900"
          >
            Start a company
          </Link>
        </div>
      </div>
    </div>
  );
}
