import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const password = "demo1234";

async function main() {
  const passwordHash = await bcrypt.hash(password, 10);

  const heartland = await prisma.organization.create({
    data: { name: "Heartland Irrigation", slug: "heartland-irrigation" },
  });
  const prairie = await prisma.organization.create({
    data: { name: "Prairie Tech Irrigation", slug: "prairie-tech" },
  });

  const york = await prisma.store.create({
    data: { organizationId: heartland.id, name: "York shop", address: "York, NE", phone: "402-555-0100" },
  });
  const grandIsland = await prisma.store.create({
    data: { organizationId: heartland.id, name: "Grand Island shop", address: "Grand Island, NE", phone: "308-555-0101" },
  });
  const thedford = await prisma.store.create({
    data: { organizationId: prairie.id, name: "Thedford shop", address: "Thedford, NE" },
  });

  const greenAcres = await prisma.farmer.create({
    data: {
      organizationId: heartland.id,
      storeId: york.id,
      name: "Green Acres Farm",
      phone: "402-555-0142",
      email: "tom@greenacres.farm",
      address: "14820 County Road 12, York, NE",
      contacts: {
        create: [
          { name: "Tom Walsh", phone: "402-555-0142", email: "tom@greenacres.farm" },
          { name: "Mary Walsh", phone: "402-555-0143", email: "mary@greenacres.farm" },
        ],
      },
    },
  });
  const riverside = await prisma.farmer.create({
    data: {
      organizationId: heartland.id,
      storeId: grandIsland.id,
      name: "Riverside Farms",
      phone: "402-555-0198",
      email: "pat@riverside.farm",
      address: "880 Platte River Rd, Grand Island, NE",
      contacts: {
        create: { name: "Pat Nguyen", phone: "402-555-0198", email: "pat@riverside.farm" },
      },
    },
  });
  const sandhill = await prisma.farmer.create({
    data: {
      organizationId: prairie.id,
      storeId: thedford.id,
      name: "Sandhill Cattle Co.",
      phone: "308-555-0110",
      email: "dana@sandhill.farm",
      address: "Thedford, NE",
      contacts: {
        create: { name: "Dana Brooks", phone: "308-555-0110", email: "dana@sandhill.farm" },
      },
    },
  });

  const admin = await prisma.user.create({
    data: {
      organizationId: heartland.id,
      name: "Jordan Hale",
      email: "admin@heartland.ag",
      role: "ADMIN",
      passwordHash,
      storeId: york.id,
    },
  });
  await prisma.user.create({
    data: {
      organizationId: heartland.id,
      name: "Chris Hale",
      email: "manager@heartland.ag",
      role: "MANAGER",
      passwordHash,
      phone: "402-555-0170",
      storeId: york.id,
    },
  });
  const mike = await prisma.user.create({
    data: {
      organizationId: heartland.id,
      name: "Mike Ruiz",
      email: "mike@heartland.ag",
      role: "TECHNICIAN",
      passwordHash,
      phone: "402-555-0188",
      storeId: york.id,
    },
  });
  await prisma.user.create({
    data: {
      organizationId: heartland.id,
      name: "Lisa Chen",
      email: "lisa@heartland.ag",
      role: "TECHNICIAN",
      passwordHash,
      phone: "402-555-0189",
      storeId: grandIsland.id,
    },
  });
  await prisma.user.create({
    data: {
      organizationId: heartland.id,
      farmerId: greenAcres.id,
      name: "Tom Walsh",
      email: "tom@greenacres.farm",
      role: "FARMER",
      passwordHash,
    },
  });
  await prisma.user.create({
    data: {
      organizationId: heartland.id,
      farmerId: riverside.id,
      name: "Pat Nguyen",
      email: "pat@riverside.farm",
      role: "FARMER",
      passwordHash,
    },
  });
  await prisma.user.create({
    data: {
      organizationId: prairie.id,
      name: "Sam Ortiz",
      email: "admin@prairie.ag",
      role: "ADMIN",
      passwordHash,
    },
  });
  await prisma.user.create({
    data: {
      organizationId: prairie.id,
      farmerId: sandhill.id,
      name: "Dana Brooks",
      email: "dana@sandhill.farm",
      role: "FARMER",
      passwordHash,
    },
  });

  const builtinAssetTypes = [
    { slug: "pivots", name: "Pivots", kind: "PIVOT", sortOrder: 0 },
    { slug: "wells", name: "Wells", kind: "GENERIC", sortOrder: 1 },
    { slug: "pumps", name: "Pumps", kind: "GENERIC", sortOrder: 2 },
    { slug: "generators", name: "Generators", kind: "GENERIC", sortOrder: 3 },
  ];
  await prisma.assetType.createMany({
    data: [heartland.id, prairie.id].flatMap((organizationId) =>
      builtinAssetTypes.map((type) => ({ organizationId, ...type, builtIn: true })),
    ),
  });
  const heartlandWells = await prisma.assetType.findFirstOrThrow({
    where: { organizationId: heartland.id, slug: "wells" },
  });
  const heartlandPumps = await prisma.assetType.findFirstOrThrow({
    where: { organizationId: heartland.id, slug: "pumps" },
  });

  const p1 = await prisma.pivot.create({
    data: {
      organizationId: heartland.id,
      farmerId: greenAcres.id,
      name: "North Quarter Pivot",
      serialNumber: "Z-4418",
      latitude: 40.8684,
      longitude: -97.5919,
      locationNote: "North of the grain bins",
    },
  });
  const p2 = await prisma.pivot.create({
    data: {
      organizationId: heartland.id,
      farmerId: greenAcres.id,
      name: "South Section Pivot",
      serialNumber: "Z-4492",
      latitude: 40.8412,
      longitude: -97.6104,
      locationNote: "Along County Road 12",
    },
  });
  const p3 = await prisma.pivot.create({
    data: {
      organizationId: heartland.id,
      farmerId: riverside.id,
      name: "River Bend Pivot",
      serialNumber: "V-2201",
      latitude: 40.9251,
      longitude: -98.3418,
      locationNote: "West of the river road",
    },
  });
  await prisma.pivot.create({
    data: {
      organizationId: prairie.id,
      farmerId: sandhill.id,
      name: "Home Place Pivot",
      serialNumber: "P-1004",
      latitude: 41.9783,
      longitude: -100.5757,
      locationNote: "Headquarters quarter",
    },
  });

  await prisma.asset.createMany({
    data: [
      {
        organizationId: heartland.id,
        assetTypeId: heartlandWells.id,
        farmerId: greenAcres.id,
        name: "North well",
        latitude: 40.8691,
        longitude: -97.5932,
        locationNote: "East of the north pivot",
        notes: "Irrigation well for North Quarter",
      },
      {
        organizationId: heartland.id,
        assetTypeId: heartlandPumps.id,
        farmerId: riverside.id,
        name: "River lift pump",
        latitude: 40.9244,
        longitude: -98.3402,
        serialNumber: "PU-188",
        locationNote: "River intake",
      },
    ],
  });

  await prisma.catalogPart.createMany({
    data: [
      { organizationId: heartland.id, name: "Gearbox oil", sku: "GO-80W90", itemType: "Inventory", price: 18.5, cost: 9.25, quantityOnHand: 24, source: "QUICKBOOKS" },
      { organizationId: heartland.id, name: "Center drive gearbox", sku: "CDG-7000", itemType: "Inventory", price: 890, cost: 540, quantityOnHand: 3, source: "QUICKBOOKS" },
      { organizationId: heartland.id, name: "Tower gearbox", sku: "TGB-8", itemType: "Inventory", price: 410, cost: 255, quantityOnHand: 6, source: "QUICKBOOKS" },
      { organizationId: heartland.id, name: "Span cable", sku: "SC-10-4", itemType: "Inventory", price: 165, cost: 92, quantityOnHand: 12, source: "QUICKBOOKS" },
      { organizationId: heartland.id, name: "Collector ring", sku: "CR-10", itemType: "Inventory", price: 275, cost: 160, quantityOnHand: 4, source: "QUICKBOOKS" },
      { organizationId: heartland.id, name: "Last tower box", sku: "LTB-14", itemType: "Inventory", price: 220, cost: 128, quantityOnHand: 5, source: "QUICKBOOKS" },
      { organizationId: heartland.id, name: "Nelson R3000 sprinkler", sku: "R3000", itemType: "Inventory", price: 42, cost: 21.5, quantityOnHand: 40, source: "QUICKBOOKS" },
      { organizationId: heartland.id, name: "End gun coupling", sku: "EG-2", itemType: "Inventory", price: 38, cost: 16, quantityOnHand: 10, source: "QUICKBOOKS" },
      { organizationId: heartland.id, name: "11.2-38 tire", sku: "T-11238", itemType: "Inventory", price: 285, cost: 175, quantityOnHand: 8, source: "QUICKBOOKS" },
      { organizationId: heartland.id, name: "U-joint", sku: "UJ-1350", itemType: "Inventory", price: 64, cost: 31, quantityOnHand: 15, source: "QUICKBOOKS" },
      { organizationId: heartland.id, name: "Contactor", sku: "CNT-30", itemType: "Inventory", price: 78, cost: 39, quantityOnHand: 9, source: "QUICKBOOKS" },
      { organizationId: heartland.id, name: "Startup inspection", sku: "SVC-START", itemType: "Service", price: 185, cost: 0, quantityOnHand: 0, source: "QUICKBOOKS" },
    ],
  });

  await prisma.catalogLabor.createMany({
    data: [
      { organizationId: heartland.id, name: "Shop labor", sku: "LAB-SHOP", itemType: "Service", rate: 125, source: "QUICKBOOKS" },
      { organizationId: heartland.id, name: "Field service", sku: "LAB-FIELD", itemType: "Service", rate: 145, source: "QUICKBOOKS" },
      { organizationId: heartland.id, name: "After hours", sku: "LAB-OT", itemType: "Service", rate: 185, source: "QUICKBOOKS" },
      { organizationId: heartland.id, name: "Travel time", sku: "LAB-TRAVEL", itemType: "Service", rate: 95, source: "QUICKBOOKS" },
    ],
  });

  await prisma.catalogEquipment.createMany({
    data: [
      { organizationId: heartland.id, name: "Service truck", sku: "EQ-TRUCK", itemType: "Equipment", rate: 85, source: "QUICKBOOKS" },
      { organizationId: heartland.id, name: "Trencher", sku: "EQ-TRENCH", itemType: "Equipment", rate: 95, source: "QUICKBOOKS" },
      { organizationId: heartland.id, name: "Boom truck", sku: "EQ-BOOM", itemType: "Equipment", rate: 125, source: "QUICKBOOKS" },
      { organizationId: heartland.id, name: "Welder", sku: "EQ-WELD", itemType: "Equipment", rate: 45, source: "QUICKBOOKS" },
    ],
  });

  await prisma.ticket.create({
    data: {
      organizationId: heartland.id,
      farmerId: greenAcres.id,
      pivotId: p1.id,
      technicianId: mike.id,
      number: 1001,
      title: "Center drive not advancing",
      description: "Pivot stalled overnight. Last span is sitting in the low spot near the north road.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      updates: {
        create: [
          {
            userId: admin.id,
            message: "Work order opened from morning dispatch.",
            status: "OPEN",
          },
          {
            userId: mike.id,
            message: "On site. Checking gearbox oil and last tower box.",
            status: "IN_PROGRESS",
          },
        ],
      },
      parts: {
        create: [
          { userId: mike.id, name: "Gearbox oil", quantity: 2, sku: "GO-80W90" },
          { userId: mike.id, name: "Last tower box", quantity: 1, sku: "LTB-14" },
        ],
      },
    },
  });

  await prisma.ticket.create({
    data: {
      organizationId: heartland.id,
      farmerId: riverside.id,
      pivotId: p3.id,
      number: 1002,
      title: "End gun leaking at coupling",
      description: "Water spraying at the end gun. Can wait until Thursday if needed.",
      status: "OPEN",
      priority: "NORMAL",
      updates: {
        create: {
          userId: admin.id,
          message: "Logged from customer call.",
          status: "OPEN",
        },
      },
    },
  });

  const tireTicket = await prisma.ticket.create({
    data: {
      organizationId: heartland.id,
      farmerId: greenAcres.id,
      pivotId: p2.id,
      technicianId: mike.id,
      number: 1003,
      title: "Replace span 3 tire",
      description: "Tire is shredded on the south machine. Need a 11.2-38 if we have one on the truck.",
      status: "ASSIGNED",
      priority: "URGENT",
      updates: {
        create: {
          userId: admin.id,
          message: "Assigned to Mike for today.",
          status: "ASSIGNED",
        },
      },
      parts: {
        create: [{ userId: mike.id, name: "11.2-38 tire", quantity: 1, sku: "T-11238" }],
      },
    },
  });

  const seasonYear = new Date().getFullYear();
  await prisma.startupInspection.create({
    data: {
      organizationId: heartland.id,
      pivotId: p1.id,
      seasonYear,
      status: "PASSED",
      inspectorId: mike.id,
      checks: {
        create: [
          { checkKey: "power", result: "PASS" },
          { checkKey: "alignment", result: "PASS" },
          { checkKey: "sprinklers", result: "PASS" },
          { checkKey: "gearbox", result: "PASS", notes: "Topped off oil." },
          { checkKey: "tires", result: "PASS" },
          { checkKey: "endgun", result: "PASS" },
          { checkKey: "controls", result: "PASS" },
        ],
      },
    },
  });
  await prisma.startupInspection.create({
    data: {
      organizationId: heartland.id,
      pivotId: p2.id,
      seasonYear,
      status: "FAILED",
      inspectorId: mike.id,
      ticketId: tireTicket.id,
      checks: {
        create: [
          { checkKey: "power", result: "PASS" },
          { checkKey: "alignment", result: "PASS" },
          { checkKey: "sprinklers", result: "PENDING" },
          { checkKey: "gearbox", result: "PENDING" },
          { checkKey: "tires", result: "FAIL", notes: "South tower tire shredded." },
          { checkKey: "endgun", result: "PENDING" },
          { checkKey: "controls", result: "PENDING" },
        ],
      },
    },
  });

  console.log("Seeded AG Service Desk demo data. Password for all demo users: demo1234");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
