/**
 * Idempotent Live Oak customer merges for American Irrigation.
 * Moves farms/pivots/assets/tickets/contacts from source → target, then deletes source.
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const MERGES = [
  { source: "83 Farms", target: "83 Farms LLC" },
  { source: "Allaince", target: "Alliance" },
  { source: "Alliance Dairy Trenton", target: "Alliance Dairy - Trenton" },
  { source: "Alliance Diary - Trenton", target: "Alliance Dairy - Trenton" },
  { source: "Barnes Hay Farms", target: "Barnes Hay Farms INC" },
  { source: "Black Gold", target: "Black Gold Farms" },
  { source: "Lee Peanut Farm LLC", target: "Lee Peanut Farms LLC" },
  { source: "Lee Peanut Farms", target: "Lee Peanut Farms LLC" },
];

function isAmericanIrrigationOrg(org) {
  return /americus|american irrigation|heartland|demo-irrigation/i.test(`${org.name} ${org.slug}`);
}

async function mergeContacts(sourceId, targetId, sourceName) {
  const [sourceContacts, targetContacts] = await Promise.all([
    prisma.farmerContact.findMany({ where: { farmerId: sourceId } }),
    prisma.farmerContact.findMany({ where: { farmerId: targetId } }),
  ]);
  const existing = new Set(targetContacts.map((contact) => contact.name.trim().toLowerCase()));
  let created = 0;
  for (const contact of sourceContacts) {
    const key = contact.name.trim().toLowerCase();
    if (!key || existing.has(key)) continue;
    if (key === sourceName.toLowerCase()) continue;
    await prisma.farmerContact.create({
      data: {
        farmerId: targetId,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
      },
    });
    existing.add(key);
    created += 1;
  }
  return created;
}

async function mergeOne(organizationId, sourceName, targetName) {
  const source = await prisma.farmer.findFirst({
    where: { organizationId, name: sourceName },
    include: { farms: true },
  });
  if (!source) {
    console.log(`Merge customers: "${sourceName}" not found — skipped.`);
    return;
  }

  let target = await prisma.farmer.findFirst({
    where: { organizationId, name: targetName },
  });
  if (!target) {
    target = await prisma.farmer.update({
      where: { id: source.id },
      data: { name: targetName },
    });
    console.log(`Merge customers: renamed sole "${sourceName}" to "${targetName}".`);
    return;
  }
  if (source.id === target.id) {
    console.log(`Merge customers: "${sourceName}" and "${targetName}" are already the same.`);
    return;
  }

  const year = new Date().getFullYear();
  const contactsCreated = await mergeContacts(source.id, target.id, sourceName);

  await prisma.$transaction(async (tx) => {
    for (const farm of source.farms) {
      await tx.farm.update({
        where: { id: farm.id },
        data: { farmerId: target.id, primaryContactId: null },
      });
      await tx.pivot.updateMany({
        where: { farmId: farm.id, organizationId },
        data: { farmerId: target.id },
      });
      await tx.asset.updateMany({
        where: { farmId: farm.id, organizationId },
        data: { farmerId: target.id },
      });
      await tx.ticket.updateMany({
        where: { organizationId, pivot: { farmId: farm.id } },
        data: { farmerId: target.id },
      });
      await tx.farmAssignment.updateMany({
        where: { farmId: farm.id, endYear: null },
        data: { endYear: year },
      });
      await tx.farmAssignment.create({
        data: {
          farmId: farm.id,
          farmerId: target.id,
          startYear: year,
        },
      });
    }

    await tx.pivot.updateMany({
      where: { organizationId, farmerId: source.id },
      data: { farmerId: target.id },
    });
    await tx.asset.updateMany({
      where: { organizationId, farmerId: source.id },
      data: { farmerId: target.id },
    });
    await tx.ticket.updateMany({
      where: { organizationId, farmerId: source.id },
      data: { farmerId: target.id },
    });
    await tx.pivotInspection.updateMany({
      where: { organizationId, farmerId: source.id },
      data: { farmerId: target.id },
    });
    await tx.user.updateMany({
      where: { organizationId, farmerId: source.id },
      data: { farmerId: target.id },
    });
    await tx.farmAssignment.updateMany({
      where: { farmerId: source.id, endYear: null },
      data: { endYear: year },
    });

    await tx.farmerContact.deleteMany({ where: { farmerId: source.id } });
    await tx.farmer.delete({ where: { id: source.id } });
  });

  const pivots = await prisma.pivot.count({ where: { organizationId, farmerId: target.id } });
  const farms = await prisma.farm.count({ where: { organizationId, farmerId: target.id } });
  console.log(
    `Merge customers: "${sourceName}" → "${targetName}" · farms=${farms} pivots=${pivots} contacts+${contactsCreated}`,
  );
}

async function main() {
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true },
  });
  const org = orgs.find(isAmericanIrrigationOrg);
  if (!org) {
    console.log("Merge customers: American Irrigation organization not found; skipped.");
    return;
  }
  for (const pair of MERGES) {
    await mergeOne(org.id, pair.source, pair.target);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
