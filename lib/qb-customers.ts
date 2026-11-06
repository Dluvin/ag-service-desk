import { prisma } from "./prisma";

let schemaReady: Promise<void> | null = null;

export async function ensureQbCustomerSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS QbCustomer (
          id TEXT PRIMARY KEY NOT NULL,
          organizationId TEXT NOT NULL,
          listId TEXT NOT NULL,
          name TEXT NOT NULL,
          fullName TEXT NOT NULL,
          companyName TEXT NOT NULL DEFAULT '',
          updatedAt DATETIME NOT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (organizationId) REFERENCES Organization(id) ON DELETE CASCADE
        )
      `);
      await prisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS QbCustomer_organizationId_listId_key ON QbCustomer(organizationId, listId)`,
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS QbCustomer_organizationId_fullName_idx ON QbCustomer(organizationId, fullName)`,
      );
      const cols = await prisma.$queryRawUnsafe<Array<{ name: string }>>("PRAGMA table_info(QbwcConfig)");
      const names = new Set(cols.map((col) => col.name));
      if (!names.has("customersSyncedAt")) {
        await prisma.$executeRawUnsafe("ALTER TABLE QbwcConfig ADD COLUMN customersSyncedAt DATETIME");
      }
      if (!names.has("customersIteratorId")) {
        await prisma.$executeRawUnsafe("ALTER TABLE QbwcConfig ADD COLUMN customersIteratorId TEXT");
      }
      if (!names.has("customersSyncRequested")) {
        await prisma.$executeRawUnsafe(
          "ALTER TABLE QbwcConfig ADD COLUMN customersSyncRequested BOOLEAN NOT NULL DEFAULT 0",
        );
      }
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

export type QbCustomerRow = {
  listId: string;
  name: string;
  fullName: string;
  companyName: string;
};

export type CustomerListOption = {
  key: string;
  label: string;
  farmerId?: string;
  listId?: string;
  pivots?: {
    id: string;
    name: string;
    serialNumber: string | null;
    packageItem: string | null;
    packageDescription: string | null;
    packageBrand: string | null;
    packageTowerCount: number | null;
  }[];
};

function normalizeCustomerName(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(llc|inc|co|company|corp|ltd|lp|farm|farms)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function customerNamesMatch(left: string, right: string) {
  const a = normalizeCustomerName(left);
  const b = normalizeCustomerName(right);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 6 && b.length >= 6 && (a.includes(b) || b.includes(a))) return true;
  const aParts = a.split(" ").filter((part) => part.length >= 3);
  const bParts = b.split(" ").filter((part) => part.length >= 3);
  if (!aParts.length || !bParts.length) return false;
  const shared = aParts.filter((part) => bParts.includes(part));
  return shared.length >= Math.min(2, Math.min(aParts.length, bParts.length));
}

export function qbCustomerMatchNames(row: { name: string; fullName: string; companyName: string }) {
  return [row.fullName, row.name, row.companyName].map((value) => value.trim()).filter(Boolean);
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function encodeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function xmlText(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<(?:[\\w-]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`, "i"));
  return decodeXml(match?.[1]?.trim() ?? "");
}

function blocks(xml: string, tag: string) {
  return xml.match(new RegExp(`<(?:[\\w-]+:)?${tag}\\b[\\s\\S]*?</(?:[\\w-]+:)?${tag}>`, "gi")) ?? [];
}

function openAttrs(xml: string, tag: string) {
  return xml.match(new RegExp(`<(?:[\\w-]+:)?${tag}\\b([^>]*)>`, "i"))?.[1] ?? "";
}

function attr(attrs: string, name: string) {
  return decodeXml(new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i").exec(attrs)?.[1] ?? "");
}

function withoutNestedRefs(xml: string) {
  return xml.replace(
    /<(?:[\w-]+:)?(?:ClassRef|ParentRef|TermsRef|SalesTaxCodeRef|CustomerTypeRef|ShipAddress|BillAddress|ContactsRet|AdditionalContactRef|DataExtRet)\b[\s\S]*?<\/(?:[\w-]+:)?(?:ClassRef|ParentRef|TermsRef|SalesTaxCodeRef|CustomerTypeRef|ShipAddress|BillAddress|ContactsRet|AdditionalContactRef|DataExtRet)>/gi,
    "",
  );
}

function extraLabel(primary: string[], extras: string[]) {
  const seen = new Set(primary.map((value) => value.trim().toLowerCase()).filter(Boolean));
  const parts: string[] = [];
  for (const value of extras) {
    const trimmed = value.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    parts.push(trimmed);
  }
  return parts.join(" · ").slice(0, 500);
}

export function customerQueryXml(iteratorId: string, major: string, minor: string) {
  const version = `${major || "13"}.${minor || "0"}`;
  const body = iteratorId
    ? `<CustomerQueryRq requestID="customers" iterator="Continue" iteratorID="${encodeXml(iteratorId)}"></CustomerQueryRq>`
    : [
        `<CustomerQueryRq requestID="customers" iterator="Start">`,
        `<MaxReturned>200</MaxReturned>`,
        `<ActiveStatus>ActiveOnly</ActiveStatus>`,
        `<IncludeRetElement>ListID</IncludeRetElement>`,
        `<IncludeRetElement>Name</IncludeRetElement>`,
        `<IncludeRetElement>FullName</IncludeRetElement>`,
        `<IncludeRetElement>CompanyName</IncludeRetElement>`,
        `</CustomerQueryRq>`,
      ].join("\r\n");
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

export function isCustomerQueryResponse(xml: string) {
  return /<(?:[\w-]+:)?CustomerQueryRs\b/i.test(xml);
}

export function parseCustomerQuery(xml: string) {
  const attrs = openAttrs(xml, "CustomerQueryRs");
  const remainingRaw = attr(attrs, "iteratorRemainingCount");
  const remaining = remainingRaw ? Number(remainingRaw) : 0;
  const seen = new Set<string>();
  const rows: QbCustomerRow[] = [];
  for (const block of blocks(xml, "CustomerRet")) {
    const own = withoutNestedRefs(block);
    const listId = xmlText(own, "ListID");
    const name = xmlText(own, "Name");
    if (!listId || !name || seen.has(listId)) continue;
    seen.add(listId);
    const fullName = xmlText(own, "FullName") || name;
    rows.push({
      listId,
      name,
      fullName,
      companyName: extraLabel([name, fullName], [xmlText(own, "CompanyName")]),
    });
  }
  return {
    code: attr(attrs, "statusCode"),
    message: attr(attrs, "statusMessage"),
    remaining: Number.isFinite(remaining) ? remaining : 0,
    iteratorId: attr(attrs, "iteratorID"),
    rows,
  };
}

export async function saveQbCustomerPage(
  organizationId: string,
  rows: QbCustomerRow[],
  replace: boolean,
) {
  await ensureQbCustomerSchema();
  if (replace) {
    await prisma.qbCustomer.deleteMany({ where: { organizationId } });
  }
  if (!rows.length) return;
  for (const row of rows) {
    await prisma.qbCustomer.upsert({
      where: {
        organizationId_listId: { organizationId, listId: row.listId },
      },
      create: {
        organizationId,
        listId: row.listId,
        name: row.name,
        fullName: row.fullName,
        companyName: row.companyName,
      },
      update: {
        name: row.name,
        fullName: row.fullName,
        companyName: row.companyName,
      },
    });
  }
}

export async function requestQbCustomerSync(organizationId: string) {
  await ensureQbCustomerSchema();
  await prisma.qbwcConfig.update({
    where: { organizationId },
    data: {
      customersSyncRequested: true,
      customersIteratorId: null,
      lastError: null,
    },
  });
}

async function findExistingFarmerForQbNames(organizationId: string, names: string[]) {
  const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  if (!unique.length) return null;

  const farmExact = await prisma.farm.findFirst({
    where: { organizationId, qbCustomerName: { in: unique } },
    include: { farmer: true },
    orderBy: { createdAt: "asc" },
  });
  if (farmExact) return farmExact.farmer;

  const farmerExact = await prisma.farmer.findFirst({
    where: { organizationId, name: { in: unique } },
  });
  if (farmerExact) return farmerExact;

  const [farmers, farms] = await Promise.all([
    prisma.farmer.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      take: 5000,
    }),
    prisma.farm.findMany({
      where: { organizationId, qbCustomerName: { not: null } },
      select: { farmerId: true, qbCustomerName: true },
      take: 5000,
    }),
  ]);

  for (const farm of farms) {
    if (!farm.qbCustomerName) continue;
    if (unique.some((name) => customerNamesMatch(name, farm.qbCustomerName!))) {
      const farmer = farmers.find((row) => row.id === farm.farmerId);
      if (farmer) return farmer;
    }
  }
  for (const farmer of farmers) {
    if (unique.some((name) => customerNamesMatch(name, farmer.name))) return farmer;
  }
  return null;
}

async function ensureFarmQbCustomerName(organizationId: string, farmerId: string, qbName: string) {
  const farm = await prisma.farm.findFirst({
    where: { organizationId, farmerId },
    orderBy: { createdAt: "asc" },
  });
  if (farm) {
    if (!farm.qbCustomerName) {
      await prisma.farm.update({
        where: { id: farm.id },
        data: { qbCustomerName: qbName },
      });
    }
    return farm;
  }
  return prisma.farm.create({
    data: {
      organizationId,
      farmerId,
      name: "Main",
      qbCustomerName: qbName,
    },
  });
}

export async function loadQbCustomerOptions(organizationId: string): Promise<{
  customers: CustomerListOption[];
  syncedAt: Date | null;
}> {
  await ensureQbCustomerSchema();
  const [rows, config, farmers, farms] = await Promise.all([
    prisma.qbCustomer.findMany({
      where: { organizationId },
      orderBy: { fullName: "asc" },
      take: 5000,
    }),
    prisma.qbwcConfig.findFirst({
      where: { organizationId },
      select: { customersSyncedAt: true },
    }),
    prisma.farmer.findMany({
      where: { organizationId },
      select: { id: true, name: true },
      take: 5000,
    }),
    prisma.farm.findMany({
      where: { organizationId },
      select: { farmerId: true, qbCustomerName: true },
      take: 5000,
    }),
  ]);

  return {
    syncedAt: config?.customersSyncedAt ?? null,
    customers: rows.map((row) => {
      const names = qbCustomerMatchNames(row);
      let farmerId: string | undefined;
      for (const farm of farms) {
        if (farm.qbCustomerName && names.some((name) => customerNamesMatch(name, farm.qbCustomerName!))) {
          farmerId = farm.farmerId;
          break;
        }
      }
      if (!farmerId) {
        const farmer = farmers.find((rowFarmer) => names.some((name) => customerNamesMatch(name, rowFarmer.name)));
        farmerId = farmer?.id;
      }
      return {
        key: row.listId,
        label: row.companyName ? `${row.fullName} · ${row.companyName}` : row.fullName,
        listId: row.listId,
        farmerId,
      };
    }),
  };
}

export async function resolveFarmerFromQbCustomer(
  organizationId: string,
  listId: string,
  options?: { createIfMissing?: boolean },
) {
  await ensureQbCustomerSchema();
  const qb = await prisma.qbCustomer.findFirst({
    where: { organizationId, listId },
  });
  if (!qb) return null;
  const names = qbCustomerMatchNames(qb);
  const qbName = names[0] ?? "";
  if (!qbName) return null;

  const existing = await findExistingFarmerForQbNames(organizationId, names);
  if (existing) {
    await ensureFarmQbCustomerName(organizationId, existing.id, qbName);
    return existing;
  }

  if (options?.createIfMissing === false) return null;

  const farmer = await prisma.farmer.create({
    data: { organizationId, name: qbName },
  });
  await prisma.farm.create({
    data: {
      organizationId,
      farmerId: farmer.id,
      name: "Main",
      qbCustomerName: qbName,
    },
  });
  return farmer;
}

export async function linkQbCustomerToFarmer(organizationId: string, listId: string, farmerId: string) {
  await ensureQbCustomerSchema();
  const qb = await prisma.qbCustomer.findFirst({
    where: { organizationId, listId },
  });
  if (!qb) return;
  const qbName = qbCustomerMatchNames(qb)[0];
  if (!qbName) return;
  await ensureFarmQbCustomerName(organizationId, farmerId, qbName);
}
