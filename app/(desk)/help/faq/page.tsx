import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

const faqs = [
  {
    id: "login",
    question: "How do I log in, and what if I forgot my password?",
    answer: (
      <>
        <p>
          Staff, managers, technicians, and customers use the same login at{" "}
          <Link href="/login" className="font-semibold text-emerald-800 hover:underline">
            /login
          </Link>
          . Use the email your company set up for you.
        </p>
        <p>
          Forgot the password? Use{" "}
          <Link href="/forgot" className="font-semibold text-emerald-800 hover:underline">
            Reset password
          </Link>
          . We email a link if that address is in the system. Check spam if you do not see it. The
          reset link is good for one day.
        </p>
      </>
    ),
  },
  {
    id: "work-orders",
    question: "How do work orders work?",
    answer: (
      <>
        <p>
          Shop staff open a work order from{" "}
          <Link href="/tickets" className="font-semibold text-emerald-800 hover:underline">
            Work orders
          </Link>{" "}
          or the dispatch board. Pick the customer and pivot (or other asset), then assign a
          technician when you are ready.
        </p>
        <p>
          Status moves from Unassigned to Assigned, In progress, Waiting on parts, Repair done, then
          Completed. Customers who log in can request service and follow their own work orders.
          Customers are texted and emailed when a work order is moved to Repair done — not on every
          status change.
        </p>
      </>
    ),
  },
  {
    id: "customers",
    question: "Where do I add and manage customers?",
    answer: (
      <>
        <p>
          Open{" "}
          <Link href="/farmers" className="font-semibold text-emerald-800 hover:underline">
            Customers
          </Link>{" "}
          to see every customer, add one, and set a default store so new work orders start at the
          right shop.
        </p>
        <p>
          Optional portal login lives on the customer, not on Staff. Enter a login email when you add
          or edit the customer. Leave the password blank so they set one from the welcome email.
        </p>
      </>
    ),
  },
  {
    id: "farms",
    question: "What are farms, and how do they relate to customers?",
    answer: (
      <>
        <p>
          A farm belongs to a customer. Use{" "}
          <Link href="/farms" className="font-semibold text-emerald-800 hover:underline">
            Farms
          </Link>{" "}
          to see every farm, or open a customer and manage farms there.
        </p>
        <p>
          Assign pivots and other assets to a farm so the customer record stays organized when one
          grower has more than one place.
        </p>
      </>
    ),
  },
  {
    id: "assets",
    question: "Where are assets and pivots?",
    answer: (
      <>
        <p>
          <Link href="/assets" className="font-semibold text-emerald-800 hover:underline">
            Assets
          </Link>{" "}
          lists pivots plus wells, pumps, generators, and any types your shop added. Filter by type
          from the Assets menu.
        </p>
        <p>
          Shop staff can add types under Assets → Manage types. When you add a pivot, save GPS so
          dispatch and maps can find the field — paste coordinates or a Google Maps link if you do
          not drop a pin.
        </p>
      </>
    ),
  },
  {
    id: "dispatch",
    question: "What is the difference between dispatch list and tiles?",
    answer: (
      <>
        <p>
          Dispatch is the shop board for open work. List view (the default) shows work orders in one
          list, with status chips and Hide completed. Tiles view is columns by status, like a
          classic board, and shows open work only.
        </p>
        <p>
          Admins and managers pick their own view under{" "}
          <Link href="/settings" className="font-semibold text-emerald-800 hover:underline">
            Settings → Dispatch view
          </Link>
          . That choice is yours — it does not change anyone else’s board. Filter by store to work
          one shop at a time.
        </p>
      </>
    ),
  },
  {
    id: "print",
    question: "How do I print a work order?",
    answer: (
      <>
        <p>
          Open a Repair done or Completed work order and choose Print work order. In the print
          dialog you can send it to a printer or Save as PDF. The printout includes repair notes,
          parts, equipment, and labor.
        </p>
        <p>
          To print several at once, use{" "}
          <Link href="/tickets/print" className="font-semibold text-emerald-800 hover:underline">
            Batch print work orders
          </Link>{" "}
          from the Work orders page. Select the ones you need; each starts on a new page.
        </p>
      </>
    ),
  },
  {
    id: "maps",
    question: "What is the difference between in-app maps and Open in Google Maps?",
    answer: (
      <>
        <p>
          Open in Google Maps is on every work order that has pivot coordinates. It opens Google
          Maps with those coordinates so a technician can navigate to the field — not only the
          customer mailing address.
        </p>
        <p>
          In-app satellite maps (dispatch map,{" "}
          <Link href="/map" className="font-semibold text-emerald-800 hover:underline">
            Work order map
          </Link>
          , and pin pickers) depend on your plan. Starter keeps Open in Google Maps and turns
          in-app satellite maps off. Shop and Enterprise include the in-app maps. Live truck GPS is
          a separate connector (for example Verizon Connect Reveal) on Connectors.
        </p>
      </>
    ),
  },
  {
    id: "whos-signed-in",
    question: "Can I see who is signed in and where they are?",
    answer: (
      <>
        <p>
          Company admins can open{" "}
          <Link href="/online" className="font-semibold text-emerald-800 hover:underline">
            Settings → Who’s signed in
          </Link>
          . It lists shop staff who have the desk open, the screen they are on, and the last
          location their browser sent if they allowed location. It is not truck GPS. Customer
          logins are not shown.
        </p>
      </>
    ),
  },
  {
    id: "staff-invite",
    question: "How do staff invite emails work?",
    answer: (
      <>
        <p>
          Admins and managers add people on{" "}
          <Link href="/staff" className="font-semibold text-emerald-800 hover:underline">
            Settings → Staff
          </Link>
          . Enter name and email. Leave the password blank so they choose one from the welcome
          email. If you set a password, the email still asks them to change it. The welcome link is
          good for seven days.
        </p>
        <p>
          Customer logins are not staff seats and are not added here — use the Customers page.
          After you save, the desk tells you if the welcome email was sent, skipped (mail is not
          configured on the server), or failed. Ask them to check spam if the message does not
          arrive.
        </p>
      </>
    ),
  },
];

export default async function DeskFaqPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="max-w-3xl">
      <p className="text-sm text-stone-600">
        <Link href="/help" className="text-emerald-800 hover:underline">
          Support
        </Link>
      </p>
      <h1 className="font-display mt-2 text-3xl">FAQ</h1>
      <p className="mt-2 text-stone-600">
        Common questions for the dealer desk. If you need something the desk does not do yet, send a{" "}
        <Link href="/help" className="font-semibold text-emerald-800 hover:underline">
          feature request
        </Link>
        .
      </p>

      <div className="mt-6 space-y-3">
        {faqs.map((faq) => (
          <details
            key={faq.id}
            id={faq.id}
            className="group rounded-xl border border-stone-200 bg-white open:shadow-sm"
          >
            <summary className="cursor-pointer list-none px-4 py-3 font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-start justify-between gap-3">
                {faq.question}
                <span aria-hidden className="mt-0.5 text-stone-400 group-open:rotate-180">
                  ▾
                </span>
              </span>
            </summary>
            <div className="space-y-3 border-t border-stone-100 px-4 py-3 text-sm text-stone-600">
              {faq.answer}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
