const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function americusStoreId(stores) {
  const named = stores.filter((store) => String(store.name || "").trim().toLowerCase().includes("americus"));
  return named.find((store) => store.name.trim().toLowerCase() === "americus")?.id ?? named[0]?.id ?? null;
}

async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, name: true, slug: true } });
  let updated = 0;
  for (const org of orgs) {
    const stores = await prisma.store.findMany({
      where: { organizationId: org.id },
      select: { id: true, name: true },
    });
    let storeId = americusStoreId(stores);
    if (!storeId && stores.length === 1) storeId = stores[0].id;
    const isAmericusCompany = /americus|american irrigation|heartland|demo-irrigation/i.test(`${org.name} ${org.slug}`);
    if (!storeId && isAmericusCompany) {
      const created = await prisma.store.create({
        data: { organizationId: org.id, name: "Americus" },
        select: { id: true },
      });
      storeId = created.id;
    }
    if (!storeId) continue;
    const result = await prisma.farmer.updateMany({
      where: { organizationId: org.id },
      data: { storeId },
    });
    updated += result.count;
    console.log(`Americus: assigned ${result.count} customers`);
  }
  console.log(`Americus assignment done (${updated})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
