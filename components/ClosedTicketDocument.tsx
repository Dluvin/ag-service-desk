import { TicketPhotoGrid } from "@/components/TicketPhotoGrid";
import { STATUS_LABELS, type TicketStatus } from "@/lib/roles";
import { formatDuration, visitMinutes } from "@/lib/onsite";

type PrintTicket = {
  number: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  invoiceNumber: string | null;
  invoiceAmount: number | null;
  createdAt: Date;
  closedAt: Date | null;
  updatedAt: Date;
  organization: { name: string; logoMimeType?: string | null };
  farmer: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    contacts?: { name: string; phone: string | null; email: string | null }[];
  };
  pivot: { name: string; serialNumber: string | null; latitude: number; longitude: number; locationNote: string | null };
  technician: { name: string } | null;
  siteVisits?: { startedAt: Date; endedAt: Date | null }[];
  parts: { quantity: number; name: string; sku: string | null; unitPrice: number | null }[];
  updates: {
    message: string;
    status: string | null;
    createdAt: Date;
    user: { name: string };
    photos?: { id: string; fileName: string }[];
  }[];
};

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

export function ClosedTicketDocument({ ticket }: { ticket: PrintTicket }) {
  const partsTotal = ticket.parts.reduce(
    (sum, part) => sum + part.quantity * (part.unitPrice ?? 0),
    0,
  );
  const hasPrices = ticket.parts.some((part) => part.unitPrice != null);

  return (
    <article className="print-sheet mx-auto max-w-3xl bg-white p-8 text-stone-900 shadow-sm print:max-w-none print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-300 pb-4">
        <div className="flex items-start gap-3">
          {ticket.organization.logoMimeType ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/api/company-logo" alt="" className="h-12 max-w-36 object-contain" />
          ) : null}
          <div>
            <p className="font-display text-2xl">{ticket.organization.name}</p>
            <p className="text-sm text-stone-600">Closed service ticket</p>
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold">Ticket #{ticket.number}</p>
          <p>
            {ticket.invoiceNumber ? `Invoice ${ticket.invoiceNumber}` : "No invoice number"}
            {ticket.invoiceAmount != null ? ` · ${money(ticket.invoiceAmount)}` : ""}
          </p>
          <p>
            Closed{" "}
            {(ticket.closedAt ?? ticket.updatedAt).toLocaleDateString()}
          </p>
        </div>
      </header>

      <h1 className="font-display mt-6 text-3xl">{ticket.title}</h1>
      <p className="mt-1 text-sm text-stone-600">
        {STATUS_LABELS[ticket.status as TicketStatus] ?? ticket.status} · {ticket.priority}
      </p>
      <p className="mt-4 whitespace-pre-wrap">{ticket.description}</p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 text-sm">
        <section>
          <h2 className="font-display text-lg">Farm</h2>
          <p className="font-medium">{ticket.farmer.name}</p>
          {ticket.farmer.address ? <p>{ticket.farmer.address}</p> : null}
          {(ticket.farmer.contacts?.length
            ? ticket.farmer.contacts
            : [{ name: ticket.farmer.name, phone: ticket.farmer.phone, email: ticket.farmer.email }]
          ).map((contact, index) => (
            <p key={`${contact.name}-${index}`} className="mt-2">
              <span className="font-medium">{contact.name}</span>
              {contact.phone ? ` · ${contact.phone}` : ""}
              {contact.email ? ` · ${contact.email}` : ""}
            </p>
          ))}
        </section>
        <section>
          <h2 className="font-display text-lg">Pivot</h2>
          <p className="font-medium">{ticket.pivot.name}</p>
          {ticket.pivot.serialNumber ? <p>SN {ticket.pivot.serialNumber}</p> : null}
          {ticket.pivot.locationNote ? <p>{ticket.pivot.locationNote}</p> : null}
          <p>
            {ticket.pivot.latitude.toFixed(5)}, {ticket.pivot.longitude.toFixed(5)}
          </p>
          <p className="mt-2">Technician: {ticket.technician?.name ?? "Unassigned"}</p>
          <p>Opened: {ticket.createdAt.toLocaleString()}</p>
          {ticket.siteVisits && ticket.siteVisits.length > 0 ? (
            <p>
              On-site time (Reveal GPS): {formatDuration(visitMinutes(ticket.siteVisits, ticket.closedAt ?? ticket.updatedAt) * 60_000)}
            </p>
          ) : null}
        </section>
      </div>

      <h2 className="font-display mt-8 text-lg">Parts used</h2>
      {ticket.parts.length === 0 ? (
        <p className="mt-2 text-sm text-stone-600">No parts logged.</p>
      ) : (
        <table className="mt-2 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-300">
              <th className="py-1">Qty</th>
              <th className="py-1">Part</th>
              <th className="py-1">SKU</th>
              {hasPrices ? <th className="py-1 text-right">Each</th> : null}
              {hasPrices ? <th className="py-1 text-right">Amount</th> : null}
            </tr>
          </thead>
          <tbody>
            {ticket.parts.map((part, index) => (
              <tr key={`${part.name}-${index}`} className="border-b border-stone-100">
                <td className="py-1">{part.quantity}</td>
                <td className="py-1">{part.name}</td>
                <td className="py-1">{part.sku ?? "—"}</td>
                {hasPrices ? (
                  <td className="py-1 text-right">{part.unitPrice != null ? money(part.unitPrice) : "—"}</td>
                ) : null}
                {hasPrices ? (
                  <td className="py-1 text-right">
                    {part.unitPrice != null ? money(part.quantity * part.unitPrice) : "—"}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
          {hasPrices ? (
            <tfoot>
              <tr>
                <td colSpan={4} className="pt-2 text-right font-semibold">
                  Parts total
                </td>
                <td className="pt-2 text-right font-semibold">{money(partsTotal)}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      )}

      <h2 className="font-display mt-8 text-lg">Work notes</h2>
      <ol className="mt-2 space-y-2 text-sm">
        {ticket.updates.map((update, index) => (
          <li key={index}>
            <p className="text-xs text-stone-500">
              {update.user.name} · {update.createdAt.toLocaleString()}
              {update.status ? ` · ${STATUS_LABELS[update.status as TicketStatus] ?? update.status}` : ""}
            </p>
            <p>{update.message}</p>
            {update.photos?.length ? <TicketPhotoGrid photos={update.photos} /> : null}
          </li>
        ))}
      </ol>
    </article>
  );
}
