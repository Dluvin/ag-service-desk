import { prisma } from "./prisma";
import { ticketSiteName } from "./ticket-site";

function encodeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function qbEnvelope(version: string, body: string) {
  return [
    `<?xml version="1.0"?>`,
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
  const qty = Number.isFinite(line.quantity) && line.quantity > 0 ? line.quantity : 1;
  const rate =
    line.rate != null && Number.isFinite(line.rate)
      ? `\r\n      <Rate>${line.rate.toFixed(2)}</Rate>`
      : "";
  return [
    `<EstimateLineAdd>`,
    `      <ItemRef>`,
    `        <FullName>${encodeXml(line.itemName.slice(0, 31))}</FullName>`,
    `      </ItemRef>`,
    `      <Desc>${encodeXml(line.description.slice(0, 4095))}</Desc>`,
    `      <Quantity>${qty}</Quantity>${rate}`,
    `    </EstimateLineAdd>`,
  ].join("\r\n");
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
      description: [row.name, row.sku].filter(Boolean).join(" · ") || row.name,
      quantity: row.quantity,
      rate: row.unitPrice,
    });
  }
  for (const row of ticket.labor) {
    lines.push({
      itemName: row.catalogLabor?.name || row.name,
      description: [row.name, row.sku].filter(Boolean).join(" · ") || row.name,
      quantity: row.hours,
      rate: row.unitRate,
    });
  }
  for (const row of ticket.equipment) {
    lines.push({
      itemName: row.catalogEquipment?.name || row.name,
      description: [row.name, row.sku].filter(Boolean).join(" · ") || row.name,
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

  const memo = `AG Desk WO #${ticket.number} · ${ticket.title} · ${site}`.slice(0, 4095);
  const version = `${major || "13"}.${minor || "0"}`;
  const body = [
    `<EstimateAddRq requestID="${encodeXml(job.id)}">`,
    `  <EstimateAdd>`,
    `    <CustomerRef>`,
    `      <FullName>${encodeXml(ticket.farmer.name.slice(0, 209))}</FullName>`,
    `    </CustomerRef>`,
    `    <PONumber>${encodeXml(`WO-${ticket.number}`)}</PONumber>`,
    `    <Memo>${encodeXml(memo)}</Memo>`,
    ...lines.map((line) => `    ${lineXml(line)}`),
    `  </EstimateAdd>`,
    `</EstimateAddRq>`,
  ].join("\r\n");
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
