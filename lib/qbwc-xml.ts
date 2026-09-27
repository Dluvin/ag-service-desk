import { prisma } from "./prisma";
import { STATUS_LABELS, type TicketStatus } from "./roles";
import { ensureQbEstimateJobMeta } from "./qbwc";

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

export function qbxmlVersion(major: string, minor: string) {
  const maj = Number.parseInt(major, 10);
  if (!Number.isFinite(maj) || maj < 8) return "13.0";
  return "13.0";
}

function qbEnvelope(version: string, body: string, onError = "stopOnError") {
  return [
    `<?xml version="1.0" ?>`,
    `<?qbxml version="${version}"?>`,
    `<QBXML>`,
    `<QBXMLMsgsRq onError="${onError}">`,
    body,
    `</QBXMLMsgsRq>`,
    `</QBXML>`,
  ].join("\r\n");
}

export type QbItemRef = { listId: string; fullName: string; name: string };
export type QbJobMeta = { itemQueryDone?: boolean; items?: Record<string, QbItemRef> };

type EstimateLine = {
  itemName: string;
  sku: string;
  description: string;
  quantity: number;
  rate: number | null;
};

function catalogItemName(
  catalog: { name: string; sku: string | null } | null | undefined,
  lineName: string,
  lineSku: string | null | undefined,
) {
  return catalog?.name || lineName || catalog?.sku || lineSku || "Services";
}

function itemKey(value: string) {
  return qbText(value, 159).toLowerCase();
}

/** QuickBooks item Name is 31 characters. Subitems store the child there, and FullName as Parent:Child. */
function itemLeaf(value: string) {
  const text = qbText(value, 159);
  const leaf = text.split(":").pop()?.trim() || text;
  return qbText(leaf, 31);
}

export function matchQbItem(itemName: string, sku: string, items: Record<string, QbItemRef>) {
  for (const value of [itemName, sku, itemLeaf(itemName), itemLeaf(sku)]) {
    const hit = items[itemKey(value)];
    if (hit?.listId) return hit;
  }
  return undefined;
}

export function estimateLineXml(line: EstimateLine, items: Record<string, QbItemRef>) {
  const description = qbText(line.description, 4095);
  const qty = qbNumber(line.quantity, 1);
  const rate = line.rate == null ? null : qbNumber(line.rate, 0);
  const matched = matchQbItem(line.itemName, line.sku, items);
  const rows = [`<EstimateLineAdd>`];
  if (matched?.listId) {
    rows.push(`      <ItemRef>`, `        <ListID>${encodeXml(matched.listId)}</ListID>`, `      </ItemRef>`);
  }
  if (description) rows.push(`      <Desc>${encodeXml(description)}</Desc>`);
  rows.push(`      <Quantity>${qty}</Quantity>`);
  if (rate != null) rows.push(`      <Rate>${rate.toFixed(2)}</Rate>`);
  rows.push(`    </EstimateLineAdd>`);
  return rows.join("\r\n");
}

async function loadTicketLines(jobId: string) {
  const job = await prisma.qbEstimateJob.findFirst({
    where: { id: jobId },
    include: {
      ticket: {
        include: {
          farmer: true,
          updates: {
            orderBy: { createdAt: "asc" },
            select: {
              message: true,
              status: true,
              createdAt: true,
              user: { select: { name: true } },
            },
          },
          pivot: true,
          asset: { include: { assetType: { select: { name: true } } } },
          parts: { include: { catalogPart: { select: { name: true, sku: true } } } },
          labor: { include: { catalogLabor: { select: { name: true, sku: true } } } },
          equipment: { include: { catalogEquipment: { select: { name: true, sku: true } } } },
        },
      },
    },
  });
  if (!job) return null;
  const ticket = job.ticket;
  const lines: EstimateLine[] = [];
  for (const row of ticket.parts) {
    lines.push({
      itemName: catalogItemName(row.catalogPart, row.name, row.sku),
      sku: row.catalogPart?.sku || row.sku || "",
      description: [row.name, row.sku].filter(Boolean).join(" - ") || row.name,
      quantity: row.quantity,
      rate: row.unitPrice,
    });
  }
  for (const row of ticket.labor) {
    lines.push({
      itemName: catalogItemName(row.catalogLabor, row.name, row.sku),
      sku: row.catalogLabor?.sku || row.sku || "",
      description: [row.name, row.sku].filter(Boolean).join(" - ") || row.name,
      quantity: row.hours,
      rate: row.unitRate,
    });
  }
  for (const row of ticket.equipment) {
    lines.push({
      itemName: catalogItemName(row.catalogEquipment, row.name, row.sku),
      sku: row.catalogEquipment?.sku || row.sku || "",
      description: [row.name, row.sku].filter(Boolean).join(" - ") || row.name,
      quantity: row.hours,
      rate: row.unitRate,
    });
  }
  if (lines.length === 0) {
    lines.push({
      itemName: "Field service",
      sku: "",
      description: ticket.title,
      quantity: 1,
      rate: null,
    });
  }
  return { job, ticket, lines };
}

export async function loadQbJobMeta(jobId: string): Promise<QbJobMeta> {
  await ensureQbEstimateJobMeta();
  const rows = await prisma.$queryRaw<Array<{ qbMeta: string | null }>>`
    SELECT qbMeta FROM QbEstimateJob WHERE id = ${jobId}
  `;
  try {
    const parsed = JSON.parse(rows[0]?.qbMeta || "{}") as QbJobMeta;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveQbJobMeta(jobId: string, meta: QbJobMeta) {
  await ensureQbEstimateJobMeta();
  const json = JSON.stringify(meta);
  await prisma.$executeRaw`UPDATE QbEstimateJob SET qbMeta = ${json} WHERE id = ${jobId}`;
}

export async function clearQbJobMeta(jobId: string) {
  await ensureQbEstimateJobMeta();
  await prisma.$executeRaw`UPDATE QbEstimateJob SET qbMeta = NULL WHERE id = ${jobId}`;
}

export function lookupTokens(lines: Array<{ itemName: string; sku: string }>) {
  const tokens = new Set<string>();
  for (const line of lines) {
    for (const value of [itemLeaf(line.itemName), itemLeaf(line.sku)]) {
      if (value) tokens.add(value);
    }
  }
  return [...tokens].slice(0, 20);
}

function itemQueryBlock(requestId: number, mode: "filter" | "range", name: string) {
  const filter =
    mode === "filter"
      ? [
          `  <NameFilter>`,
          `    <MatchCriterion>Contains</MatchCriterion>`,
          `    <Name>${encodeXml(name)}</Name>`,
          `  </NameFilter>`,
        ]
      : [
          `  <NameRangeFilter>`,
          `    <FromName>${encodeXml(name)}</FromName>`,
          `    <ToName>${encodeXml(name)}</ToName>`,
          `  </NameRangeFilter>`,
        ];
  return [
    `<ItemQueryRq requestID="${requestId}">`,
    `  <MaxReturned>25</MaxReturned>`,
    `  <ActiveStatus>All</ActiveStatus>`,
    ...filter,
    `  <IncludeRetElement>ListID</IncludeRetElement>`,
    `  <IncludeRetElement>Name</IncludeRetElement>`,
    `  <IncludeRetElement>FullName</IncludeRetElement>`,
    `  <IncludeRetElement>ManufacturerPartNumber</IncludeRetElement>`,
    `</ItemQueryRq>`,
  ].join("\r\n");
}

export function buildItemQueryXml(names: string[], major: string, minor: string) {
  const blocks: string[] = [];
  let requestId = 1;
  for (const name of names) {
    blocks.push(itemQueryBlock(requestId++, "filter", name));
    blocks.push(itemQueryBlock(requestId++, "range", name));
  }
  return qbEnvelope(qbxmlVersion(major, minor), blocks.join("\r\n"), "continueOnError");
}

export async function itemQueryXml(jobId: string, major: string, minor: string) {
  const loaded = await loadTicketLines(jobId);
  if (!loaded) return null;
  const names = lookupTokens(loaded.lines);
  if (names.length === 0) {
    await saveQbJobMeta(jobId, { itemQueryDone: true, items: {} });
    return "";
  }
  return buildItemQueryXml(names, major, minor);
}

function rememberItem(items: Record<string, QbItemRef>, key: string, ref: QbItemRef) {
  const normalized = itemKey(key);
  if (!normalized || !ref.listId) return;
  const existing = items[normalized];
  if (!existing) {
    items[normalized] = ref;
    return;
  }
  const exact = (item: QbItemRef) => itemKey(item.name) === normalized || itemKey(item.fullName) === normalized;
  if (exact(ref) && !exact(existing)) items[normalized] = ref;
}

export function parseItemQueryResponse(xml: string): Record<string, QbItemRef> {
  const items: Record<string, QbItemRef> = {};
  const blocks = xml.match(/<Item[A-Za-z]+Ret\b[\s\S]*?<\/Item[A-Za-z]+Ret>/gi) || [];
  for (const block of blocks) {
    const listId = block.match(/<ListID>([^<]*)<\/ListID>/i)?.[1]?.trim() || "";
    const name = decodeXml(block.match(/<Name>([^<]*)<\/Name>/i)?.[1]?.trim() || "");
    const fullName = decodeXml(block.match(/<FullName>([^<]*)<\/FullName>/i)?.[1]?.trim() || name);
    const sku = decodeXml(block.match(/<ManufacturerPartNumber>([^<]*)<\/ManufacturerPartNumber>/i)?.[1]?.trim() || "");
    if (!listId || !name) continue;
    const ref = { listId, fullName: fullName || name, name };
    for (const key of [name, fullName, sku, fullName.split(":").pop() || ""]) rememberItem(items, key, ref);
  }
  return items;
}

export function isItemQueryResponse(xml: string) {
  return /<ItemQueryRs\b/i.test(xml);
}

/** Blank description rows so the work notes start on line 10 of the estimate. */
const DESCRIPTION_LEAD_IN = 9;

type WorkOrderNote = { status: string; author: string; message: string };

function statusName(status: string) {
  if (status in STATUS_LABELS) return STATUS_LABELS[status as TicketStatus];
  return qbText(status.replaceAll("_", " "), 40);
}

export function workOrderNoteLines(notes: WorkOrderNote[]) {
  const lines: string[] = [];
  for (const note of notes) {
    const paragraphs = note.message
      .split(/\r\n|\r|\n/)
      .map((paragraph) => qbText(paragraph, 4095))
      .filter(Boolean);
    if (paragraphs.length === 0) continue;
    const prefix = [statusName(note.status), qbText(note.author, 80)].filter(Boolean).join(" - ");
    lines.push(qbText(prefix ? `${prefix}: ${paragraphs[0]}` : paragraphs[0], 4095));
    lines.push(...paragraphs.slice(1));
  }
  return lines;
}

export function workOrderDescriptionLines(notes: WorkOrderNote[]) {
  return workOrderNoteLines(notes);
}

/** Calendar day in Eastern time, so an evening finish stays on that day. */
export function repairFinishedDate(input: {
  repairDoneAt: Date | null;
  closedAt: Date | null;
  updatedAt: Date;
  status: string;
}) {
  const when =
    input.repairDoneAt ??
    (input.status === "REPAIR_DONE" || input.status === "COMPLETED" ? (input.closedAt ?? input.updatedAt) : null);
  if (!when) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(when);
}

function descriptionOnlyLineXml(description: string) {
  const value = description === " " ? " " : qbText(description, 4095);
  if (!value) return "";
  return [`<EstimateLineAdd>`, `      <Desc>${encodeXml(value)}</Desc>`, `    </EstimateLineAdd>`].join("\r\n");
}

export function descriptionOnlyEstimateLines(texts: string[]) {
  const blanks = Array.from({ length: DESCRIPTION_LEAD_IN }, () => descriptionOnlyLineXml(" "));
  const body = texts.map((text) => descriptionOnlyLineXml(text)).filter(Boolean);
  const lines = body.length > 0 ? [...blanks, ...body] : [descriptionOnlyLineXml("Field service")];
  return lines.filter(Boolean);
}

export async function estimateAddXml(jobId: string, major: string, minor: string) {
  const loaded = await loadTicketLines(jobId);
  if (!loaded) return null;
  const { ticket } = loaded;
  const customer = qbText(ticket.farmer.name, 209) || "Customer";
  const memo = qbText(`AG Desk WO ${ticket.number}`, 4095);
  const poNumber = qbText(`WO-${ticket.number}`, 25);
  const txnDate = repairFinishedDate({
    repairDoneAt: ticket.updates.find((update) => update.status === "REPAIR_DONE")?.createdAt ?? null,
    closedAt: ticket.closedAt,
    updatedAt: ticket.updatedAt,
    status: ticket.status,
  });
  const descriptions = descriptionOnlyEstimateLines(
    workOrderDescriptionLines(
      ticket.updates.map((update) => ({
        status: update.status || "",
        author: update.user?.name || "",
        message: update.message,
      })),
    ),
  );
  const body = [
    `<EstimateAddRq requestID="${ticket.number}">`,
    `  <EstimateAdd>`,
    `    <CustomerRef>`,
    `      <FullName>${encodeXml(customer)}</FullName>`,
    `    </CustomerRef>`,
    txnDate ? `    <TxnDate>${txnDate}</TxnDate>` : "",
    `    <PONumber>${encodeXml(poNumber)}</PONumber>`,
    memo ? `    <Memo>${encodeXml(memo)}</Memo>` : "",
    ...descriptions.map((line) => `    ${line}`),
    `  </EstimateAdd>`,
    `</EstimateAddRq>`,
  ]
    .filter(Boolean)
    .join("\r\n");
  return qbEnvelope(qbxmlVersion(major, minor), body);
}

export function parseEstimateAddResponse(xml: string) {
  const status = xml.match(/<EstimateAddRs\b[^>]*statusCode="(\d+)"/i);
  const code = status?.[1] ?? "";
  const message = xml.match(/<EstimateAddRs\b[^>]*statusMessage="([^"]*)"/i)?.[1] ?? "";
  const txnId = xml.match(/<TxnID>([^<]+)<\/TxnID>/i)?.[1] ?? "";
  const refNumber = xml.match(/<RefNumber>([^<]+)<\/RefNumber>/i)?.[1] ?? "";
  if (!code) {
    return { error: "QuickBooks did not return an estimate response. Send the work order again, then Update Selected." };
  }
  if (code !== "0") {
    return { error: decodeXml(message || `QuickBooks status ${code}`) };
  }
  if (!txnId) {
    return { error: "QuickBooks accepted the request but did not return an estimate id." };
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
