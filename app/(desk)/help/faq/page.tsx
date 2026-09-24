import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getRequestLocale } from "@/lib/user-locale";
import { t, type Locale } from "@/lib/i18n";

function faqs(locale: Locale) {
  const linkClass = "font-semibold text-emerald-800 hover:underline";
  return [
    {
      id: "login",
      question: t(locale, "faq.login.q"),
      answer: (
        <>
          <p>
            {t(locale, "faq.login.p1a")}{" "}
            <Link href="/login" className={linkClass}>
              /login
            </Link>
            {t(locale, "faq.login.p1b")}
          </p>
          <p>
            {t(locale, "faq.login.p2a")}{" "}
            <Link href="/forgot" className={linkClass}>
              {t(locale, "faq.login.reset")}
            </Link>
            {t(locale, "faq.login.p2b")}
          </p>
        </>
      ),
    },
    {
      id: "work-orders",
      question: t(locale, "faq.wo.q"),
      answer: (
        <>
          <p>
            {t(locale, "faq.wo.p1a")}{" "}
            <Link href="/tickets" className={linkClass}>
              {t(locale, "nav.workOrders")}
            </Link>{" "}
            {t(locale, "faq.wo.p1b")}
          </p>
          <p>{t(locale, "faq.wo.p2")}</p>
        </>
      ),
    },
    {
      id: "customers",
      question: t(locale, "faq.cust.q"),
      answer: (
        <>
          <p>
            {t(locale, "faq.cust.p1a")}{" "}
            <Link href="/farmers" className={linkClass}>
              {t(locale, "nav.customers")}
            </Link>{" "}
            {t(locale, "faq.cust.p1b")}
          </p>
          <p>{t(locale, "faq.cust.p2")}</p>
        </>
      ),
    },
    {
      id: "farms",
      question: t(locale, "faq.farms.q"),
      answer: (
        <>
          <p>
            {t(locale, "faq.farms.p1a")}{" "}
            <Link href="/farms" className={linkClass}>
              {t(locale, "nav.farms")}
            </Link>{" "}
            {t(locale, "faq.farms.p1b")}
          </p>
          <p>{t(locale, "faq.farms.p2")}</p>
        </>
      ),
    },
    {
      id: "assets",
      question: t(locale, "faq.assets.q"),
      answer: (
        <>
          <p>
            <Link href="/assets" className={linkClass}>
              {t(locale, "nav.assets")}
            </Link>{" "}
            {t(locale, "faq.assets.p1b")}
          </p>
          <p>{t(locale, "faq.assets.p2")}</p>
        </>
      ),
    },
    {
      id: "dispatch",
      question: t(locale, "faq.dispatch.q"),
      answer: (
        <>
          <p>{t(locale, "faq.dispatch.p1")}</p>
          <p>
            {t(locale, "faq.dispatch.p2a")}{" "}
            <Link href="/settings" className={linkClass}>
              {t(locale, "faq.dispatch.settings")}
            </Link>
            {t(locale, "faq.dispatch.p2b")}
          </p>
        </>
      ),
    },
    {
      id: "print",
      question: t(locale, "faq.print.q"),
      answer: (
        <>
          <p>{t(locale, "faq.print.p1")}</p>
          <p>
            {t(locale, "faq.print.p2a")}{" "}
            <Link href="/tickets/print" className={linkClass}>
              {t(locale, "tickets.batchPrint")}
            </Link>{" "}
            {t(locale, "faq.print.p2b")}
          </p>
        </>
      ),
    },
    {
      id: "forms",
      question: t(locale, "faq.forms.q"),
      answer: (
        <p>
          {t(locale, "faq.forms.p1")}{" "}
          <Link href="/forms" className={linkClass}>
            {t(locale, "nav.forms")}
          </Link>
          .
        </p>
      ),
    },
    {
      id: "maps",
      question: t(locale, "faq.maps.q"),
      answer: (
        <>
          <p>{t(locale, "faq.maps.p1")}</p>
          <p>
            {t(locale, "faq.maps.p2a")}{" "}
            <Link href="/map" className={linkClass}>
              {t(locale, "nav.workOrderMap")}
            </Link>
            {t(locale, "faq.maps.p2b")}
          </p>
        </>
      ),
    },
    {
      id: "whos-signed-in",
      question: t(locale, "faq.online.q"),
      answer: (
        <p>
          {t(locale, "faq.online.p1a")}{" "}
          <Link href="/online" className={linkClass}>
            {t(locale, "faq.online.link")}
          </Link>
          {t(locale, "faq.online.p1b")}
        </p>
      ),
    },
    {
      id: "staff-invite",
      question: t(locale, "faq.staff.q"),
      answer: (
        <>
          <p>
            {t(locale, "faq.staff.p1a")}{" "}
            <Link href="/staff" className={linkClass}>
              {t(locale, "faq.staff.link")}
            </Link>
            {t(locale, "faq.staff.p1b")}
          </p>
          <p>{t(locale, "faq.staff.p2")}</p>
        </>
      ),
    },
  ];
}

export default async function DeskFaqPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const locale = await getRequestLocale();

  return (
    <div className="max-w-3xl">
      <p className="text-sm text-stone-600">
        <Link href="/help" className="text-emerald-800 hover:underline">
          {t(locale, "nav.support")}
        </Link>
      </p>
      <h1 className="font-display mt-2 text-3xl">{t(locale, "faq.title")}</h1>
      <p className="mt-2 text-stone-600">
        {t(locale, "faq.intro")}{" "}
        <Link href="/help" className="font-semibold text-emerald-800 hover:underline">
          {t(locale, "help.featureRequest")}
        </Link>
        .
      </p>

      <div className="mt-6 space-y-3">
        {faqs(locale).map((faq) => (
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
