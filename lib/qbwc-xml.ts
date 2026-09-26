import { prisma } from "./prisma";
import { ticketSiteName } from "./ticket-site";

function encodeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** QuickBooks' qbXML parser rejects many UTF-8 characters with 0x80040400. */
function qbText(value: string | number | null | undefined, max: number) {
  const ascii = String(value ?? "")
    .replace(/\u00b7/g, " - ")
    .replace(/[\u2012-\u2015]/g, "-")
    .replace(/[\u2018\u2019\u201b]/g, "'")
    .replace(/[\u201c\u201d\u201f]/g, '"')
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\r\n|\r|\n/g, " ")
    .trim();
  return ascii.slice(0, max);
}

function qbNumber(value: unknown, fallback: number) {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return fallback;
  return Math.round(amount * 1000) / 1000;
}

function qbxmlVersion(major: string, minor: string) {
  const maj = Number.parseInt(major, 10);
  if (!Number.isFinite(maj) || maj < 8) return "13.0";
  // EstimateAdd is stable; 13.0 avoids parser failures on newer PI versions.
  return "13.0";
}

function qbEnvelope(version: string, body: string) {
  return [
    `<?xml version="1.0" ?>`,
    `<?qbxml version="${version}"?>`,
    `<QBXML>`,
    `<QBXMLMsgsRq onError="stopOnError">`,
    body,
    `</QBXMLMsgsRq>`,
    `</QBXML>`,
  ].join("\r\n");
}

type EstimateLine = {
  itemName: string;
  description: string;
  quantity: number;
  rate: number | null;
};

function lineXml(line: EstimateLine) {
  const itemName = qbText(line.itemName, 31) || "Services";
  const description = qbText(line.description, 4095);
  const qty = qbNumber(line.quantity, 1);
  const rate = line.rate == null ? null : qbNumber(line.rate, 0);
  const rows = [
    `<EstimateLineAdd>`,
    `      <ItemRef>`,
    `        <FullName>${encodeXml(itemName)}</FullName>`,
    `      </ItemRef>`,
  ];
  if (description) rows.push(`      <Desc>${encodeXml(description)}</Desc>`);
  rows.push(`      <Quantity>${qty}</Quantity>`);
  if (rate != null) rows.push(`      <Rate>${rate.toFixed(2)}</Rate>`);
  rows.push(`    </EstimateLineAdd>`);
  return rows.join("\r\n");
}

export async function estimateAddXml(jobId: string, major: string, minor: string) {
  const job = await prisma.qbEstimateJob.findFirst({
    where: { id: jobId },
    include: {
      ticket: {
        include: {
          farmer: true,
          pivot: true,
          asset: { include: { assetType: { select: { name: true } } } },
          parts: { include: { catalogPart: { select: { name: true } } } },
          labor: { include: { catalogLabor: { select: { name: true } } } },
          equipment: { include: { catalogEquipment: { select: { name: true } } } },
        },
      },
    },
  });
  if (!job) return null;

  const ticket = job.ticket;
  const site = ticketSiteName(ticket);
  const lines: EstimateLine[] = [];
  for (const row of ticket.parts) {
    lines.push({
      itemName: row.catalogPart?.name || row.name,
      description: [row.name, row.sku].filter(Boolean).join(" - ") || row.name,
      quantity: row.quantity,
      rate: row.unitPrice,
    });
  }
  for (const row of ticket.labor) {
    lines.push({
      itemName: row.catalogLabor?.name || row.name,
      description: [row.name, row.sku].filter(Boolean).join(" - ") || row.name,
      quantity: row.hours,
      rate: row.unitRate,
    });
  }
  for (const row of ticket.equipment) {
    lines.push({
      itemName: row.catalogEquipment?.name || row.name,
      description: [row.name, row.sku].filter(Boolean).join(" - ") || row.name,
      quantity: row.hours,
      rate: row.unitRate,
    });
  }
  if (lines.length === 0) {
    lines.push({
      itemName: "Field service",
      description: ticket.title,
      quantity: 1,
      rate: null,
    });
  }

  const customer = qbText(ticket.farmer.name, 209) || "Customer";
  const memo = qbText(`AG Desk WO ${ticket.number} - ${ticket.title} - ${site}`, 4095);
  const poNumber = qbText(`WO-${ticket.number}`, 25);
  const txnDate = (ticket.scheduledAt ?? ticket.createdAt).toISOString().slice(0, 10);
  const version = qbxmlVersion(major, minor);
  const body = [
    `<EstimateAddRq requestID="${ticket.number}">`,
    `  <EstimateAdd>`,
    `    <CustomerRef>`,
    `      <FullName>${encodeXml(customer)}</FullName>`,
    `    </CustomerRef>`,
    `    <TxnDate>${txnDate}</TxnDate>`,
    `    <PONumber>${encodeXml(poNumber)}</PONumber>`,
    memo ? `    <Memo>${encodeXml(memo)}</Memo>` : "",
    ...lines.map((line) => `    ${lineXml(line)}`),
    `  </EstimateAdd>`,
    `</EstimateAddRq>`,
  ]
    .filter(Boolean)
    .join("\r\n");
  return qbEnvelope(version, body);
}

export function parseEstimateAddResponse(xml: string) {
  const status = xml.match(/<EstimateAddRs\b[^>]*statusCode="(\d+)"/i);
  const code = status?.[1] ?? "";
  const message = xml.match(/<EstimateAddRs\b[^>]*statusMessage="([^"]*)"/i)?.[1] ?? "";
  const txnId = xml.match(/<TxnID>([^<]+)<\/TxnID>/i)?.[1] ?? "";
  const refNumber = xml.match(/<RefNumber>([^<]+)<\/RefNumber>/i)?.[1] ?? "";
  if (code && code !== "0") {
    return { error: decodeXml(message || `QuickBooks status ${code}`) };
  }
  return { txnId, refNumber };
}

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
