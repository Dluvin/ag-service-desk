/**
 * One-time / idempotent: merge customer "83 Farms" into "83 Farms LLC"
 * for the American Irrigation dealership (Live Oak).
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const SOURCE_NAME = "83 Farms";
const TARGET_NAME = "83 Farms LLC";

function isAmericanIrrigationOrg(org) {
  return /americus|american irrigation|heartland|demo-irrigation/i.test(`${org.name} ${org.slug}`);
}

async function mergeContacts(sourceId, targetId) {
  const [sourceContacts, targetContacts] = await Promise.all([
    prisma.farmerContact.findMany({ where: { farmerId: sourceId } }),
    prisma.farmerContact.findMany({ where: { farmerId: targetId } }),
  ]);
  const existing = new Set(targetContacts.map((contact) => contact.name.trim().toLowerCase()));
  let created = 0;
  for (const contact of sourceContacts) {
    const key = contact.name.trim().toLowerCase();
    if (!key || existing.has(key)) continue;
    // Skip the auto contact that only mirrors the source customer name.
    if (key === SOURCE_NAME.toLowerCase()) continue;
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

async function mergeOne(organizationId) {
  const source = await prisma.farmer.findFirst({
    where: { organizationId, name: SOURCE_NAME },
    include: {
      farms: true,
      pivots: { select: { id: true } },
      assets: { select: { id: true } },
      tickets: { select: { id: true } },
      users: { select: { id: true } },
      pivotInspections: { select: { id: true } },
    },
  });
  if (!source) {
    console.log(`Merge 83 Farms: source "${SOURCE_NAME}" not found — skipped.`);
    return;
  }

  let target = await prisma.farmer.findFirst({
    where: { organizationId, name: TARGET_NAME },
  });
  if (!target) {
    target = await prisma.farmer.update({
      where: { id: source.id },
      data: { name: TARGET_NAME },
    });
    console.log(`Merge 83 Farms: renamed sole "${SOURCE_NAME}" to "${TARGET_NAME}".`);
    return;
  }
  if (source.id === target.id) {
    console.log("Merge 83 Farms: already the same customer.");
    return;
  }

  const year = new Date().getFullYear();
  const contactsCreated = await mergeContacts(source.id, target.id);

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

    // Drop source contacts then the empty customer.
    await tx.farmerContact.deleteMany({ where: { farmerId: source.id } });
    await tx.farmer.delete({ where: { id: source.id } });
  });

  const pivots = await prisma.pivot.count({ where: { organizationId, farmerId: target.id } });
  const farms = await prisma.farm.count({ where: { organizationId, farmerId: target.id } });
  console.log(
    `Merge 83 Farms: merged "${SOURCE_NAME}" into "${TARGET_NAME}" · farms=${farms} pivots=${pivots} contacts+${contactsCreated}`,
  );
}

async function main() {
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true },
  });
  const org = orgs.find(isAmericanIrrigationOrg);
  if (!org) {
    console.log("Merge 83 Farms: American Irrigation organization not found; skipped.");
    return;
  }
  await mergeOne(org.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
