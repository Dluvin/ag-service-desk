import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getRequestLocale } from "@/lib/user-locale";
import { t } from "@/lib/i18n";

const phone = "229-938-9001";
const phoneHref = "tel:+12299389001";

export default async function SmsSetupHelpPage() {
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
        {es ? "Configurar SMS con Bird" : "Set up SMS with Bird"}
      </h1>
      <p className="mt-2 text-stone-600">
        {es
          ? "Ag Desk Pro envía los textos de las órdenes de trabajo por su propia cuenta de Bird (bird.com). Bird le cobra al concesionario por separado. Esas tarifas no están incluidas en el plan de Ag Desk Pro."
          : "Ag Desk Pro sends work-order texts through your own Bird account at bird.com. Bird bills the dealership separately. Those fees are not included in the Ag Desk Pro plan."}
      </p>
      <p className="mt-2 text-sm text-stone-600">
        {es ? "Si el registro 10DLC se interpone, use " : "If 10DLC registration is in the way, use "}
        <Link href="/help/email" className="font-semibold text-emerald-800 hover:underline">
          {es ? "correo con Resend" : "email with Resend"}
        </Link>
        {es ? " para los mismos avisos." : " for the same alerts."}
      </p>

      <h2 className="font-display mt-8 text-xl">{es ? "Hay tarifas" : "There are fees"}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-stone-600">
        <li>
          {es
            ? "Ag Desk Pro cobra $400 una sola vez para configurar el SMS: la cuenta de Bird del concesionario, el número y el registro 10DLC. Esa tarifa no está incluida en el plan."
            : "Ag Desk Pro charges $400 one time to set up SMS: the dealership’s Bird account, the sending number, and 10DLC registration. That fee is not included in the plan."}
        </li>
        <li>
          {es
            ? "Bird usa una billetera de prepago. Si no alcanza el saldo, el texto no sale."
            : "Bird uses a prepaid wallet. A text does not send when the balance cannot cover it."}
        </li>
        <li>
          {es
            ? "Cada texto se cobra por segmento. El precio depende del país y de la operadora. En Estados Unidos puede haber cargos extra de la operadora (10DLC)."
            : "Each text is billed per segment. The price depends on the country and the carrier. United States routes can add carrier fees (10DLC)."}
        </li>
        <li>
          {es
            ? "Un número o un remitente con nombre puede tener un cargo de alta y una cuota mensual. Registrar un número puede ser gratis; enviarlo no lo es."
            : "A phone number or a named sender can have a setup fee and a monthly charge. Registering a number can be free. Sending from it is not."}
        </li>
      </ul>
      <p className="mt-3 text-sm text-stone-600">
        {es ? "Si necesita ayuda antes de agregar una tarjeta o comprar un número, llame a David al " : "If you need help before you add a card or buy a number, call David at "}
        <a href={phoneHref} className="font-semibold text-emerald-800 hover:underline">
          {phone}
        </a>
        .
      </p>

      <h2 className="font-display mt-8 text-xl">{es ? "Pasos" : "Steps"}</h2>
      <ol className="mt-3 list-decimal space-y-4 pl-5 text-sm text-stone-700">
        <li>
          <p className="font-medium text-stone-900">
            {es ? "Abra una cuenta en Bird" : "Open a Bird account"}
          </p>
          <p className="mt-1 text-stone-600">
            {es ? "Entre en " : "Go to "}
            <a href="https://bird.com" className="font-semibold text-emerald-800 hover:underline" target="_blank" rel="noreferrer">
              bird.com
            </a>
            {es
              ? " y cree la organización del concesionario. El espacio de trabajo es donde viven los números y la clave."
              : " and create the dealership’s organization. The workspace is where the number and the API key live."}
          </p>
        </li>
        <li>
          <p className="font-medium text-stone-900">
            {es ? "Ponga fondos en la billetera" : "Put funds in the wallet"}
          </p>
          <p className="mt-1 text-stone-600">
            {es
              ? "Agregue una forma de pago y recargue la billetera de la organización. Una prueba con saldo en cero falla por saldo insuficiente."
              : "Add a payment method and top up the organization wallet. A test with an empty wallet fails for insufficient balance."}
          </p>
        </li>
        <li>
          <p className="font-medium text-stone-900">
            {es ? "Active los países de destino" : "Turn on destination countries"}
          </p>
          <p className="mt-1 text-stone-600">
            {es
              ? "En Bird, abra SMS y luego Destinations. Active Estados Unidos y cualquier otro país al que envíe textos. Un país apagado rechaza el mensaje."
              : "In Bird, open SMS, then Destinations. Turn on the United States and any other country you text. A country that is off rejects the message."}
          </p>
        </li>
        <li>
          <p className="font-medium text-stone-900">
            {es ? "Consiga un remitente que el espacio de trabajo posea" : "Get a sender the workspace owns"}
          </p>
          <p className="mt-1 text-stone-600">
            {es
              ? "En Estados Unidos no se puede usar el nombre de la tienda como remitente. Use un número que Bird asignó al espacio de trabajo, con +1 y los 10 dígitos. Complete el registro que Bird pida (en Estados Unidos suele ser la marca y la campaña 10DLC) antes del tráfico habitual a clientes. Un número gratuito (toll-free) suele tener un registro 10DLC más sencillo que un número local de 10 dígitos."
              : "In the United States you cannot use the shop name as the sender. Use a number Bird assigned to the workspace, with +1 and the 10-digit number. Finish the registration Bird asks for (in the United States that is usually the 10DLC brand and campaign) before regular customer traffic. A toll-free number typically has an easier 10DLC setup than a regular local 10-digit number."}
          </p>
          <p className="mt-1 text-stone-600">
            {es
              ? "Fuera de Estados Unidos, algunos países permiten un remitente corto de letras y números (de 3 a 11 caracteres, con al menos una letra). El cliente no puede responder a esos mensajes."
              : "Outside the United States, some countries allow a short letter-and-number sender (3 to 11 characters, with at least one letter). Customers cannot reply to those."}
          </p>
        </li>
        <li>
          <p className="font-medium text-stone-900">
            {es ? "Cree una clave de API" : "Create an API key"}
          </p>
          <p className="mt-1 text-stone-600">
            {es
              ? "En Bird, vaya a Platform tools y luego API keys. Cree una clave con el permiso sms:write. Se ve como bk_us1_… (Estados Unidos) o bk_eu1_… (Europa). Cópiela en ese momento. Bird la muestra una sola vez."
              : "In Bird, go to Platform tools, then API keys. Create a key with the sms:write permission. It looks like bk_us1_… (United States) or bk_eu1_… (Europe). Copy it then. Bird shows it only once."}
          </p>
          <p className="mt-1 text-stone-600">
            {es
              ? "Si en vez de una clave bk_ usa un Access Key, copie también el ID del espacio de trabajo y el ID del canal de SMS. Ag Desk Pro necesita los dos."
              : "If you use an Access Key instead of a bk_ key, also copy the workspace ID and the SMS channel ID. Ag Desk Pro needs both."}
          </p>
        </li>
        <li>
          <p className="font-medium text-stone-900">
            {es ? "Péguelo en Ag Desk Pro" : "Paste it into Ag Desk Pro"}
          </p>
          <p className="mt-1 text-stone-600">
            {es ? "Un administrador de la empresa abre " : "A company admin opens "}
            <Link href="/sms" className="font-semibold text-emerald-800 hover:underline">
              {es ? "Ajustes → SMS" : "Settings → SMS"}
            </Link>
            {es
              ? ". Marque “Send SMS on assign and work order updates”, pegue la clave y el número From, y guarde. Con un Access Key, pegue también el ID del espacio de trabajo y el ID del canal."
              : ". Check “Send SMS on assign and work order updates”, paste the key and the From number, and save. With an Access Key, also paste the workspace ID and the channel ID."}
          </p>
        </li>
        <li>
          <p className="font-medium text-stone-900">
            {es ? "Ponga números móviles reales" : "Enter real mobile numbers"}
          </p>
          <p className="mt-1 text-stone-600">
            {es
              ? "El teléfono del gerente, de oficina y del técnico sale de la ficha de cada persona. El texto al cliente usa los teléfonos de contacto del cliente. Un número de muestra, como 555-0100, no se envía."
              : "Manager, office, and technician texts use the phone on each person’s record. Customer texts use the customer contact phones. A sample number, such as 555-0100, is not sent."}
          </p>
        </li>
        <li>
          <p className="font-medium text-stone-900">
            {es ? "Envíe una prueba" : "Send a test"}
          </p>
          <p className="mt-1 text-stone-600">
            {es
              ? "Después de guardar la clave, la página de SMS muestra “Send a test text”. Use un móvil real. Si Bird rechaza el envío, el saldo, el país de destino o el remitente suelen ser la causa."
              : "After the key is saved, the SMS page shows “Send a test text”. Use a real mobile number. If Bird rejects the send, the wallet, the destination country, or the sender is usually why."}
          </p>
        </li>
      </ol>

      <h2 className="font-display mt-8 text-xl">{es ? "Qué textos salen" : "Which texts go out"}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-stone-600">
        <li>
          {es
            ? "Una orden nueva avisa a los gerentes de la tienda de ese cliente. Si el cliente no tiene tienda, avisa a todos los gerentes."
            : "A new work order texts the managers at that customer’s store. If the customer has no store, it texts every manager."}
        </li>
        <li>
          {es
            ? "El técnico recibe un texto solo cuando la orden se le asigna."
            : "A technician is texted only when the work order is assigned to them."}
        </li>
        <li>
          {es
            ? "Los cambios de estado avisan a los gerentes de la tienda."
            : "Status changes text the store’s managers."}
        </li>
        <li>
          {es
            ? "Al pasar a Repair done también se avisa a oficina y al cliente, por texto y por correo. Assigned, In progress, Waiting on parts, Completed y Cancelled no le escriben al cliente."
            : "Moving a work order to Repair done also texts office staff and the customer, and emails the customer. Assigned, In progress, Waiting on parts, Completed, and Cancelled do not text the customer."}
        </li>
      </ul>

      <h2 className="font-display mt-8 text-xl">{es ? "Si necesita ayuda" : "If you need help"}</h2>
      <p className="mt-3 text-sm text-stone-600">
        {es
          ? "Llame a David al "
          : "Call David at "}
        <a href={phoneHref} className="font-semibold text-emerald-800 hover:underline">
          {phone}
        </a>
        {es
          ? " si necesita ayuda para configurar esto. Puede acompañarlo con la cuenta de Bird, el número y los campos de Ajustes → SMS."
          : " if you need assistance setting this up. He can walk through the Bird account, the number, and the fields on Settings → SMS."}
      </p>
    </div>
  );
}
