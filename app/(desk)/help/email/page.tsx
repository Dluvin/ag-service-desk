import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getRequestLocale } from "@/lib/user-locale";
import { t } from "@/lib/i18n";

const phone = "229-938-9001";
const phoneHref = "tel:+12299389001";

export default async function EmailSetupHelpPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const locale = await getRequestLocale();
  const es = locale === "es";

  return (
    <div className="max-w-3xl">
      <p className="text-sm text-stone-600">
        <Link href="/help" className="text-emerald-800 hover:underline">
          {t(locale, "nav.support")}
        </Link>
      </p>
      <h1 className="font-display mt-2 text-3xl">
        {es ? "Configurar correo con Resend" : "Set up email with Resend"}
      </h1>
      <p className="mt-2 text-stone-600">
        {es
          ? "Los mismos avisos del SMS pueden salir por correo, sin el registro 10DLC. Ag Desk Pro los envía por la cuenta de Resend del concesionario (resend.com). Resend cobra aparte. Esas tarifas no están incluidas en el plan de Ag Desk Pro."
          : "The same alerts as SMS can go by email, without 10DLC registration. Ag Desk Pro sends them through the dealership’s own Resend account at resend.com. Resend bills separately. Those fees are not included in the Ag Desk Pro plan."}
      </p>
      <p className="mt-2 text-sm text-stone-600">
        {es ? "El texto sigue disponible. " : "Text is still available. "}
        <Link href="/help/sms" className="font-semibold text-emerald-800 hover:underline">
          {t(locale, "nav.smsSetup")}
        </Link>
        {es ? " explica Bird. Puede usar correo, SMS, o los dos." : " covers Bird. You can use email, SMS, or both."}
      </p>

      <h2 className="font-display mt-8 text-xl">{es ? "Hay tarifas" : "There are fees"}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-stone-600">
        <li>
          {es
            ? "Resend incluye un cupo gratis cada mes. Después de ese cupo, cobra por el correo."
            : "Resend includes a free allowance each month. After that allowance, it charges for email."}
        </li>
        <li>
          {es
            ? "Verificar un dominio es un cambio de DNS en quien administra el sitio del concesionario. No hay un cargo de 10DLC, pero el dominio tiene que quedar verificado antes de escribir a los clientes."
            : "Verifying a domain is a DNS change at whoever hosts the dealership website. There is no 10DLC charge, but the domain has to show verified before you can email customers."}
        </li>
      </ul>
      <p className="mt-3 text-sm text-stone-600">
        {es ? "Si necesita ayuda antes de agregar un dominio o una clave, llame a David al " : "If you need help before you add a domain or an API key, call David at "}
        <a href={phoneHref} className="font-semibold text-emerald-800 hover:underline">
          {phone}
        </a>
        .
      </p>

      <h2 className="font-display mt-8 text-xl">{es ? "Pasos" : "Steps"}</h2>
      <ol className="mt-3 list-decimal space-y-4 pl-5 text-sm text-stone-700">
        <li>
          <p className="font-medium text-stone-900">{es ? "Abra una cuenta en Resend" : "Open a Resend account"}</p>
          <p className="mt-1 text-stone-600">
            {es ? "Entre en " : "Go to "}
            <a href="https://resend.com" className="font-semibold text-emerald-800 hover:underline" target="_blank" rel="noreferrer">
              resend.com
            </a>
            {es
              ? " y cree la cuenta del concesionario."
              : " and create the dealership’s account."}
          </p>
        </li>
        <li>
          <p className="font-medium text-stone-900">{es ? "Verifique el dominio" : "Verify the domain"}</p>
          <p className="mt-1 text-stone-600">
            {es
              ? "En Resend, abra Domains y agregue el dominio del concesionario, por ejemplo taller.com. Resend muestra registros DNS. Quien administra el sitio los agrega y espera a que el dominio diga Verified. Una dirección de Gmail no sirve para escribir a los clientes."
              : "In Resend, open Domains and add the dealership domain, such as yourshop.com. Resend shows DNS records. Whoever runs the website adds those records and waits until the domain says Verified. A Gmail address will not send to customers."}
          </p>
        </li>
        <li>
          <p className="font-medium text-stone-900">{es ? "Cree una clave de API" : "Create an API key"}</p>
          <p className="mt-1 text-stone-600">
            {es
              ? "En Resend, abra API Keys y cree una clave. Se ve como re_…. Cópiela en ese momento. Resend no la vuelve a mostrar completa."
              : "In Resend, open API Keys and create a key. It looks like re_…. Copy it then. Resend does not show the full key again."}
          </p>
        </li>
        <li>
          <p className="font-medium text-stone-900">{es ? "Elija la dirección From" : "Choose the From address"}</p>
          <p className="mt-1 text-stone-600">
            {es
              ? "Use una dirección en el dominio verificado, por ejemplo servicio@taller.com. El cliente ve ese remitente."
              : "Use an address on the verified domain, such as service@yourshop.com. The customer sees that sender."}
          </p>
        </li>
        <li>
          <p className="font-medium text-stone-900">{es ? "Péguelo en Ag Desk Pro" : "Paste it into Ag Desk Pro"}</p>
          <p className="mt-1 text-stone-600">
            {es ? "Un administrador abre " : "A company admin opens "}
            <Link href="/sms" className="font-semibold text-emerald-800 hover:underline">
              {es ? "Ajustes → SMS" : "Settings → SMS"}
            </Link>
            {es
              ? ". En Alertas elija Email only, o SMS and email si también quiere textos. Pegue la clave de Resend y la dirección From, y guarde."
              : ". Under Alerts choose Email only, or SMS and email if you also want texts. Paste the Resend key and the From address, and save."}
          </p>
        </li>
        <li>
          <p className="font-medium text-stone-900">{es ? "Ponga correos reales" : "Enter real email addresses"}</p>
          <p className="mt-1 text-stone-600">
            {es
              ? "El correo del gerente, de oficina y del técnico sale de la ficha de cada persona. El correo al cliente usa los correos de contacto, o el correo del cliente si no hay un contacto con correo."
              : "Manager, office, and technician email uses the address on each person’s record. Customer email uses contact emails, or the customer email when no contact has one."}
          </p>
        </li>
        <li>
          <p className="font-medium text-stone-900">{es ? "Envíe una prueba" : "Send a test"}</p>
          <p className="mt-1 text-stone-600">
            {es
              ? "Después de guardar la clave, la página muestra “Send a test email”. Si Resend lo rechaza, el dominio aún no está verificado o la dirección From no está en ese dominio."
              : "After the key is saved, the page shows “Send a test email”. If Resend rejects it, the domain is not verified yet or the From address is not on that domain."}
          </p>
        </li>
      </ol>

      <h2 className="font-display mt-8 text-xl">{es ? "Qué correos salen" : "Which emails go out"}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-stone-600">
        <li>
          {es
            ? "Una orden nueva avisa a los gerentes de la tienda de ese cliente. Si el cliente no tiene tienda, avisa a todos los gerentes."
            : "A new work order emails the managers at that customer’s store. If the customer has no store, it emails every manager."}
        </li>
        <li>
          {es
            ? "El técnico recibe un correo solo cuando la orden se le asigna."
            : "A technician is emailed only when the work order is assigned to them."}
        </li>
        <li>
          {es
            ? "Los cambios de estado avisan a los gerentes de la tienda."
            : "Status changes email the store’s managers."}
        </li>
        <li>
          {es
            ? "Al pasar a Repair done también se avisa a oficina, con una copia de la orden, y al cliente. Assigned, In progress, Waiting on parts, Completed y Cancelled no le escriben al cliente."
            : "Moving a work order to Repair done also emails office staff, with a copy of the work order, and emails the customer. Assigned, In progress, Waiting on parts, Completed, and Cancelled do not email the customer."}
        </li>
      </ul>

      <h2 className="font-display mt-8 text-xl">{es ? "Si necesita ayuda" : "If you need help"}</h2>
      <p className="mt-3 text-sm text-stone-600">
        {es ? "Llame a David al " : "Call David at "}
        <a href={phoneHref} className="font-semibold text-emerald-800 hover:underline">
          {phone}
        </a>
        {es
          ? " si necesita ayuda para configurar esto. Puede acompañarlo con el dominio, la clave y los campos de Ajustes → SMS."
          : " if you need assistance setting this up. He can walk through the domain, the API key, and the fields on Settings → SMS."}
      </p>
    </div>
  );
}
