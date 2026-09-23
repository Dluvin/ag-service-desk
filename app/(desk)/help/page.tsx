import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { deskSupportAction } from "@/lib/help-actions";

export default async function DeskSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { sent } = await searchParams;

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl">Support</h1>
      <p className="mt-2 text-stone-600">
        Tell us what would make the desk better for your shop. Feature requests, rough ideas, and
        “we wish it did this” notes are welcome — we read every one.
      </p>
      <p className="mt-2 text-sm text-stone-600">
        Looking for how-to answers first? See the{" "}
        <Link href="/help/faq" className="font-semibold text-emerald-800 hover:underline">
          FAQ
        </Link>
        .
      </p>

      {sent === "1" ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          Thanks. We received your message and will follow up.
        </p>
      ) : null}

      <ActionForm
        action={deskSupportAction}
        className="mt-6 space-y-3 rounded-xl border border-stone-200 bg-white p-4"
      >
        <label className="block text-sm font-medium">
          Name
          <input
            name="name"
            type="text"
            required
            placeholder="Your name"
            autoComplete="name"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium">
          Email
          <input
            name="email"
            type="email"
            required
            placeholder="Your email"
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium">
          Feature request or message
          <textarea
            name="message"
            required
            rows={6}
            placeholder="What should the desk do that it does not do today?"
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
        <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
          Send feature request
        </button>
      </ActionForm>
    </div>
  );
}
