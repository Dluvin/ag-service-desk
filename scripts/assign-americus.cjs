const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function americusStoreId(stores) {
  const named = stores.filter((store) => String(store.name || "").trim().toLowerCase().includes("americus"));
  return named.find((store) => store.name.trim().toLowerCase() === "americus")?.id ?? named[0]?.id ?? null;
}

async function main() {
  const stores = await prisma.store.findMany({ select: { id: true, name: true, organizationId: true } });
  const byOrg = new Map();
  for (const store of stores) {
    const list = byOrg.get(store.organizationId) || [];
    list.push(store);
    byOrg.set(store.organizationId, list);
  }
  let updated = 0;
  for (const [organizationId, list] of byOrg) {
    const storeId = americusStoreId(list);
    if (!storeId) continue;
    const result = await prisma.farmer.updateMany({
      where: { organizationId, NOT: { storeId } },
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
