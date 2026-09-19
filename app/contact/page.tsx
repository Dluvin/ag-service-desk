import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="min-h-full bg-emerald-950 text-emerald-50">
      <div className="mx-auto max-w-2xl px-6 py-20">
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">AG Service Desk</p>
        <h1 className="font-display mt-3 text-4xl">Request a feature</h1>
        <p className="mt-4 text-lg text-emerald-100">
          This contact page will live on the public website. Use it to ask for another GPS connector
          or a product feature. A request form will go here.
        </p>
        <p className="mt-3 text-emerald-200">
          Custom GPS connectors may include a development fee.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-lg bg-amber-400 px-5 py-2.5 font-semibold text-emerald-950 hover:bg-amber-300"
          >
            AG Service Desk
          </Link>
          <Link href="/login" className="rounded-lg border border-emerald-400 px-5 py-2.5 font-semibold hover:bg-emerald-900">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
