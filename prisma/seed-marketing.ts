import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { STARTUP_CHECKS } from "../lib/startup";
import { ensureRevealVehicleLocationColumns } from "../lib/reveal-locations";

const prisma = new PrismaClient();
const password = "demo1234";
const SLUG = "high-plains-irrigation";
const NAME = "High Plains Irrigation";

function atDay(offset: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function pin(baseLat: number, baseLng: number, dLat: number, dLng: number) {
  return { lat: baseLat + dLat, lng: baseLng + dLng };
}

async function main() {
  const existing = await prisma.organization.findUnique({ where: { slug: SLUG } });
  if (existing) {
    await prisma.organization.delete({ where: { id: existing.id } });
    console.log(`Removed previous ${NAME} tenant.`);
  }

  const hash = await bcrypt.hash(password, 10);
  const org = await prisma.organization.create({
    data: {
      name: NAME,
      slug: SLUG,
      plan: "ENTERPRISE",
      gpsEnabled: true,
      gpsProvider: "VERIZON",
      signupStatus: "ACTIVE",
      paused: false,
    },
  });
  await prisma.$executeRaw`
    UPDATE Organization SET ocrEnabled = 1, formsEnabled = 1 WHERE id = ${org.id}
  `;

  const kearney = await prisma.store.create({
    data: {
      organizationId: org.id,
      name: "Kearney shop",
      address: "1820 2nd Ave, Kearney, NE",
      phone: "308-555-2100",
    },
  });
  const holdrege = await prisma.store.create({
    data: {
      organizationId: org.id,
      name: "Holdrege shop",
      address: "410 West Ave, Holdrege, NE",
      phone: "308-555-2140",
    },
  });
  const lexington = await prisma.store.create({
    data: {
      organizationId: org.id,
      name: "Lexington shop",
      address: "90 Frontier St, Lexington, NE",
      phone: "308-555-2180",
    },
  });

  const alex = await prisma.user.create({
    data: {
      organizationId: org.id,
      storeId: kearney.id,
      name: "Alex Reed",
      email: "admin@highplains.ag",
      role: "ADMIN",
      passwordHash: hash,
      phone: "308-555-2101",
    },
  });
  const dana = await prisma.user.create({
    data: {
      organizationId: org.id,
      storeId: kearney.id,
      name: "Dana Brooks",
      email: "manager@highplains.ag",
      role: "MANAGER",
      passwordHash: hash,
      phone: "308-555-2102",
    },
  });
  await prisma.user.create({
    data: {
      organizationId: org.id,
      storeId: kearney.id,
      name: "Kim Walsh",
      email: "office@highplains.ag",
      role: "CLERICAL",
      passwordHash: hash,
      phone: "308-555-2103",
    },
  });
  const carlos = await prisma.user.create({
    data: {
      organizationId: org.id,
      storeId: kearney.id,
      name: "Carlos Vega",
      email: "carlos@highplains.ag",
      role: "TECHNICIAN",
      passwordHash: hash,
      phone: "308-555-2110",
      revealVehicleNumber: "12",
    },
  });
  const megan = await prisma.user.create({
    data: {
      organizationId: org.id,
      storeId: holdrege.id,
      name: "Megan Holt",
      email: "megan@highplains.ag",
      role: "TECHNICIAN",
      passwordHash: hash,
      phone: "308-555-2111",
      revealVehicleNumber: "18",
    },
  });
  const ty = await prisma.user.create({
    data: {
      organizationId: org.id,
      storeId: lexington.id,
      name: "Ty Benson",
      email: "ty@highplains.ag",
      role: "TECHNICIAN",
      passwordHash: hash,
      phone: "308-555-2112",
      revealVehicleNumber: "21",
    },
  });
  const jordan = await prisma.user.create({
    data: {
      organizationId: org.id,
      storeId: kearney.id,
      name: "Jordan Pike",
      email: "jordan@highplains.ag",
      role: "TECHNICIAN",
      passwordHash: hash,
      phone: "308-555-2113",
      revealVehicleNumber: "24",
    },
  });

  await prisma.assetType.createMany({
    data: [
      { organizationId: org.id, slug: "pivots", name: "Pivots", kind: "PIVOT", builtIn: true, sortOrder: 0 },
      { organizationId: org.id, slug: "wells", name: "Wells", kind: "GENERIC", builtIn: true, sortOrder: 1 },
      { organizationId: org.id, slug: "pumps", name: "Pumps", kind: "GENERIC", builtIn: true, sortOrder: 2 },
      { organizationId: org.id, slug: "generators", name: "Generators", kind: "GENERIC", builtIn: true, sortOrder: 3 },
    ],
  });
  const wells = await prisma.assetType.findFirstOrThrow({ where: { organizationId: org.id, slug: "wells" } });
  const pumps = await prisma.assetType.findFirstOrThrow({ where: { organizationId: org.id, slug: "pumps" } });
  const generators = await prisma.assetType.findFirstOrThrow({
    where: { organizationId: org.id, slug: "generators" },
  });

  await prisma.startupCheckTemplate.createMany({
    data: STARTUP_CHECKS.map((check, index) => ({
      organizationId: org.id,
      checkKey: check.key,
      label: check.label,
      detail: check.detail,
      sortOrder: index,
    })),
  });

  const K = { lat: 40.6995, lng: -99.0817 };
  const H = { lat: 40.4403, lng: -99.3698 };
  const L = { lat: 40.7808, lng: -99.7415 };

  type CustomerSpec = {
    name: string;
    email: string;
    phone: string;
    address: string;
    storeId: string;
    contact: { name: string; phone: string; email: string };
    extraContact?: { name: string; phone: string; email: string };
    farms: { name: string; location: string; lat: number; lng: number }[];
  };

  const customerSpecs: CustomerSpec[] = [
    {
      name: "Twin Rivers Farms",
      email: "beth@twinrivers.farm",
      phone: "308-555-4001",
      address: "21480 Highway 30, Kearney, NE",
      storeId: kearney.id,
      contact: { name: "Beth Harmon", phone: "308-555-4001", email: "beth@twinrivers.farm" },
      extraContact: { name: "Nate Harmon", phone: "308-555-4002", email: "nate@twinrivers.farm" },
      farms: [
        { name: "Home place", location: "North of Highway 30", ...pin(K.lat, K.lng, 0.08, 0.04) },
        { name: "River quarter", location: "Platte River road", ...pin(K.lat, K.lng, 0.12, -0.06) },
      ],
    },
    {
      name: "Cottonwood Cattle Co.",
      email: "cole@cottonwood.farm",
      phone: "308-555-4010",
      address: "880 County Road 40, Gibbon, NE",
      storeId: kearney.id,
      contact: { name: "Cole Brennan", phone: "308-555-4010", email: "cole@cottonwood.farm" },
      farms: [
        { name: "Headquarters", location: "Feedlot quarter", ...pin(K.lat, K.lng, 0.18, 0.11) },
        { name: "West grass", location: "County Road 40", ...pin(K.lat, K.lng, 0.2, 0.16) },
      ],
    },
    {
      name: "Elm Creek Grain",
      email: "rita@elmcreek.farm",
      phone: "308-555-4020",
      address: "12 Elevator Rd, Elm Creek, NE",
      storeId: kearney.id,
      contact: { name: "Rita Alvarez", phone: "308-555-4020", email: "rita@elmcreek.farm" },
      farms: [{ name: "Elevator farm", location: "West of town", ...pin(K.lat, K.lng, 0.04, 0.28) }],
    },
    {
      name: "Prairie Wind Farms",
      email: "owen@prairiewind.farm",
      phone: "308-555-4030",
      address: "44100 Road 442, Holdrege, NE",
      storeId: holdrege.id,
      contact: { name: "Owen Drake", phone: "308-555-4030", email: "owen@prairiewind.farm" },
      extraContact: { name: "Sasha Drake", phone: "308-555-4031", email: "sasha@prairiewind.farm" },
      farms: [
        { name: "North section", location: "North of Holdrege", ...pin(H.lat, H.lng, 0.09, 0.05) },
        { name: "South section", location: "Highway 23", ...pin(H.lat, H.lng, -0.07, 0.08) },
      ],
    },
    {
      name: "Buffalo County Farms",
      email: "lee@buffalocounty.farm",
      phone: "308-555-4040",
      address: "900 30th Ave, Kearney, NE",
      storeId: kearney.id,
      contact: { name: "Lee Nguyen", phone: "308-555-4040", email: "lee@buffalocounty.farm" },
      farms: [
        { name: "East 80", location: "East of 30th", ...pin(K.lat, K.lng, -0.05, 0.09) },
        { name: "West 160", location: "Canal road", ...pin(K.lat, K.lng, -0.08, -0.05) },
      ],
    },
    {
      name: "Lost Island Ranch",
      email: "maya@lostisland.farm",
      phone: "308-555-4050",
      address: "Rural Route 2, Lexington, NE",
      storeId: lexington.id,
      contact: { name: "Maya Ortiz", phone: "308-555-4050", email: "maya@lostisland.farm" },
      farms: [
        { name: "Headquarters", location: "Island road", ...pin(L.lat, L.lng, 0.06, 0.04) },
        { name: "North grass", location: "North pivot trail", ...pin(L.lat, L.lng, 0.11, -0.03) },
      ],
    },
    {
      name: "Harvest Moon Farms",
      email: "jon@harvestmoon.farm",
      phone: "308-555-4060",
      address: "55 Pioneer Ave, Minden, NE",
      storeId: holdrege.id,
      contact: { name: "Jon Keller", phone: "308-555-4060", email: "jon@harvestmoon.farm" },
      farms: [{ name: "Home farm", location: "South of Minden", ...pin(H.lat, H.lng, 0.16, -0.12) }],
    },
    {
      name: "Platte Valley Produce",
      email: "ana@plattevalley.farm",
      phone: "308-555-4070",
      address: "2200 Avenue N, Kearney, NE",
      storeId: kearney.id,
      contact: { name: "Ana Silva", phone: "308-555-4070", email: "ana@plattevalley.farm" },
      farms: [
        { name: "North packing", location: "Avenue N", ...pin(K.lat, K.lng, 0.02, -0.1) },
        { name: "South packing", location: "South canal", ...pin(K.lat, K.lng, -0.11, -0.08) },
      ],
    },
    {
      name: "Red Willow Land",
      email: "hugh@redwillow.farm",
      phone: "308-555-4080",
      address: "14 Main St, Lexington, NE",
      storeId: lexington.id,
      contact: { name: "Hugh Patel", phone: "308-555-4080", email: "hugh@redwillow.farm" },
      farms: [
        { name: "East quarter", location: "East of Lexington", ...pin(L.lat, L.lng, -0.05, 0.12) },
        { name: "West quarter", location: "Gothenburg road", ...pin(L.lat, L.lng, 0.03, 0.18) },
      ],
    },
    {
      name: "South Loup Farms",
      email: "tess@southloup.farm",
      phone: "308-555-4090",
      address: "County Road 18, Pleasanton, NE",
      storeId: kearney.id,
      contact: { name: "Tess Morgan", phone: "308-555-4090", email: "tess@southloup.farm" },
      extraContact: { name: "Cal Morgan", phone: "308-555-4091", email: "cal@southloup.farm" },
      farms: [
        { name: "Pleasanton home", location: "County Road 18", ...pin(K.lat, K.lng, 0.28, 0.02) },
        { name: "Loup bottoms", location: "River bottoms", ...pin(K.lat, K.lng, 0.32, -0.04) },
      ],
    },
  ];

  const farmers: {
    id: string;
    storeId: string;
    farms: { id: string; name: string; lat: number; lng: number }[];
    name: string;
  }[] = [];

  for (const spec of customerSpecs) {
    const farmer = await prisma.farmer.create({
      data: {
        organizationId: org.id,
        storeId: spec.storeId,
        name: spec.name,
        email: spec.email,
        phone: spec.phone,
        address: spec.address,
        notes: "Long-time irrigation customer. Prefers morning calls.",
        contacts: {
          create: spec.extraContact ? [spec.contact, spec.extraContact] : [spec.contact],
        },
      },
      include: { contacts: true },
    });
    const primary = farmer.contacts[0];
    const farmRows: { id: string; name: string; lat: number; lng: number }[] = [];
    for (const farm of spec.farms) {
      const created = await prisma.farm.create({
        data: {
          organizationId: org.id,
          farmerId: farmer.id,
          primaryContactId: primary.id,
          name: farm.name,
          location: farm.location,
          latitude: farm.lat,
          longitude: farm.lng,
          assignments: { create: { farmerId: farmer.id, startYear: 2018 } },
        },
      });
      farmRows.push({ id: created.id, name: created.name, lat: farm.lat, lng: farm.lng });
    }
    farmers.push({ id: farmer.id, storeId: spec.storeId, farms: farmRows, name: spec.name });
  }

  const farmerLogins = [
    { farmer: farmers[0], email: "beth@twinrivers.farm", name: "Beth Harmon" },
    { farmer: farmers[3], email: "owen@prairiewind.farm", name: "Owen Drake" },
    { farmer: farmers[5], email: "maya@lostisland.farm", name: "Maya Ortiz" },
    { farmer: farmers[9], email: "tess@southloup.farm", name: "Tess Morgan" },
  ];
  for (const login of farmerLogins) {
    await prisma.user.create({
      data: {
        organizationId: org.id,
        farmerId: login.farmer.id,
        name: login.name,
        email: login.email,
        role: "FARMER",
        passwordHash: hash,
      },
    });
  }

  const serials = ["Z-8801", "Z-8802", "V-4410", "V-4418", "P-2204", "P-2211", "L-910", "L-922"];
  const pivots: { id: string; farmerId: string; storeId: string; farmId: string; name: string; lat: number; lng: number }[] =
    [];
  let serialIndex = 0;
  for (const farmer of farmers) {
    for (const [farmIndex, farm] of farmer.farms.entries()) {
      const count = farmIndex === 0 ? 2 : 1;
      for (let i = 0; i < count; i += 1) {
        const loc = pin(farm.lat, farm.lng, 0.012 * (i + 1), 0.01 * (i === 0 ? 1 : -1));
        const name =
          i === 0 && farmIndex === 0
            ? `${farm.name} north pivot`
            : i === 1
              ? `${farm.name} south pivot`
              : `${farm.name} pivot`;
        const created = await prisma.pivot.create({
          data: {
            organizationId: org.id,
            farmerId: farmer.id,
            farmId: farm.id,
            name,
            serialNumber: serials[serialIndex % serials.length] + String(serialIndex + 1).padStart(2, "0"),
            latitude: loc.lat,
            longitude: loc.lng,
            locationNote: i === 0 ? "North of the bins" : "Along the county road",
          },
        });
        pivots.push({
          id: created.id,
          farmerId: farmer.id,
          storeId: farmer.storeId,
          farmId: farm.id,
          name: created.name,
          lat: loc.lat,
          lng: loc.lng,
        });
        serialIndex += 1;
      }
    }
  }

  const wellAssets = pivots.slice(0, 8).map((pivot, index) => ({
    organizationId: org.id,
    assetTypeId: wells.id,
    farmerId: pivot.farmerId,
    farmId: pivot.farmId,
    name: `${pivot.name.replace(" pivot", "")} well`,
    latitude: pivot.lat + 0.004,
    longitude: pivot.lng + 0.003,
    locationNote: "Irrigation well",
    serialNumber: `W-${1200 + index}`,
    notes: "Sand screen last replaced 2024.",
  }));
  const pumpAssets = pivots.slice(2, 8).map((pivot, index) => ({
    organizationId: org.id,
    assetTypeId: pumps.id,
    farmerId: pivot.farmerId,
    farmId: pivot.farmId,
    name: `${pivot.name.replace(" pivot", "")} pump`,
    latitude: pivot.lat + 0.003,
    longitude: pivot.lng - 0.002,
    serialNumber: `PU-${300 + index}`,
    locationNote: "Well head",
  }));
  const genAssets = pivots.slice(0, 4).map((pivot, index) => ({
    organizationId: org.id,
    assetTypeId: generators.id,
    farmerId: pivot.farmerId,
    farmId: pivot.farmId,
    name: `${pivot.name.replace(" pivot", "")} generator`,
    latitude: pivot.lat - 0.002,
    longitude: pivot.lng + 0.005,
    serialNumber: `GN-${40 + index}`,
    notes: "Diesel standby.",
  }));
  await prisma.asset.createMany({ data: [...wellAssets, ...pumpAssets, ...genAssets] });

  const partRows = [
    ["Gearbox oil", "GO-80W90", 18.5, 9.25, 48],
    ["Center drive gearbox", "CDG-7000", 890, 540, 5],
    ["Tower gearbox", "TGB-8", 410, 255, 9],
    ["Span cable", "SC-10-4", 165, 92, 18],
    ["Collector ring", "CR-10", 275, 160, 7],
    ["Last tower box", "LTB-14", 220, 128, 8],
    ["Nelson R3000 sprinkler", "R3000", 42, 21.5, 80],
    ["End gun coupling", "EG-2", 38, 16, 16],
    ["11.2-38 tire", "T-11238", 285, 175, 12],
    ["U-joint", "UJ-1350", 64, 31, 22],
    ["Contactor", "CNT-30", 78, 39, 14],
    ["Percent timer", "PT-10", 95, 48, 6],
    ["Reinke tower box", "RTB-12", 198, 110, 5],
    ["Valley span pipe 6-5/8", "VSP-658", 240, 150, 10],
    ["Lindsay drop hose", "LDH-20", 28, 12, 60],
    ["Pressure switch", "PS-40", 54, 22, 11],
    ["Fuse pack", "FP-10", 16, 6, 40],
    ["Startup inspection", "SVC-START", 185, 0, 0],
    ["Alignment service", "SVC-ALIGN", 265, 0, 0],
    ["Wire pull", "SVC-WIRE", 320, 0, 0],
  ] as const;
  await prisma.catalogPart.createMany({
    data: partRows.map(([name, sku, price, cost, qty]) => ({
      organizationId: org.id,
      name,
      sku,
      itemType: sku.startsWith("SVC") ? "Service" : "Inventory",
      price,
      cost,
      quantityOnHand: qty,
      source: "QUICKBOOKS",
    })),
  });
  await prisma.catalogLabor.createMany({
    data: [
      { organizationId: org.id, name: "Shop labor", sku: "LAB-SHOP", itemType: "Service", rate: 125, source: "QUICKBOOKS" },
      { organizationId: org.id, name: "Field service", sku: "LAB-FIELD", itemType: "Service", rate: 145, source: "QUICKBOOKS" },
      { organizationId: org.id, name: "After hours", sku: "LAB-OT", itemType: "Service", rate: 185, source: "QUICKBOOKS" },
      { organizationId: org.id, name: "Travel time", sku: "LAB-TRAVEL", itemType: "Service", rate: 95, source: "QUICKBOOKS" },
      { organizationId: org.id, name: "Electrical", sku: "LAB-ELEC", itemType: "Service", rate: 155, source: "QUICKBOOKS" },
      { organizationId: org.id, name: "Welding", sku: "LAB-WELD", itemType: "Service", rate: 150, source: "QUICKBOOKS" },
    ],
  });
  await prisma.catalogEquipment.createMany({
    data: [
      { organizationId: org.id, name: "Service truck", sku: "EQ-TRUCK", itemType: "Equipment", rate: 85, source: "QUICKBOOKS" },
      { organizationId: org.id, name: "Trencher", sku: "EQ-TRENCH", itemType: "Equipment", rate: 95, source: "QUICKBOOKS" },
      { organizationId: org.id, name: "Boom truck", sku: "EQ-BOOM", itemType: "Equipment", rate: 125, source: "QUICKBOOKS" },
      { organizationId: org.id, name: "Welder", sku: "EQ-WELD", itemType: "Equipment", rate: 45, source: "QUICKBOOKS" },
      { organizationId: org.id, name: "Forklift", sku: "EQ-FORK", itemType: "Equipment", rate: 65, source: "QUICKBOOKS" },
      { organizationId: org.id, name: "Wire trailer", sku: "EQ-WIRE", itemType: "Equipment", rate: 55, source: "QUICKBOOKS" },
    ],
  });

  const catalogParts = await prisma.catalogPart.findMany({ where: { organizationId: org.id } });
  const catalogLabor = await prisma.catalogLabor.findMany({ where: { organizationId: org.id } });
  const catalogEquipment = await prisma.catalogEquipment.findMany({ where: { organizationId: org.id } });
  const partBySku = (sku: string) => catalogParts.find((row) => row.sku === sku);
  const laborBySku = (sku: string) => catalogLabor.find((row) => row.sku === sku);
  const eqBySku = (sku: string) => catalogEquipment.find((row) => row.sku === sku);

  const techs = [carlos, megan, ty, jordan];
  const jobs: {
    pivot: (typeof pivots)[number];
    tech?: typeof carlos;
    title: string;
    description: string;
    status: string;
    priority: string;
    scheduledAt?: Date;
    invoiceNumber?: string;
    invoiceAmount?: number;
    closedAt?: Date;
    updates: { userId: string; message: string; status: string }[];
    parts?: { sku: string; qty: number }[];
    labor?: { sku: string; hours: number }[];
    equipment?: { sku: string; hours: number }[];
  }[] = [
    {
      pivot: pivots[0],
      tech: carlos,
      title: "Center drive not advancing",
      description: "North machine stalled overnight. Last span sitting in the low spot by the bins.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      scheduledAt: atDay(0, 8, 0),
      updates: [
        { userId: dana.id, message: "Opened from morning dispatch. Carlos taking it first.", status: "ASSIGNED" },
        { userId: carlos.id, message: "On site. Checking gearbox oil and last tower box.", status: "IN_PROGRESS" },
      ],
      parts: [
        { sku: "GO-80W90", qty: 2 },
        { sku: "LTB-14", qty: 1 },
      ],
      labor: [{ sku: "LAB-FIELD", hours: 2.5 }],
      equipment: [{ sku: "EQ-TRUCK", hours: 2.5 }],
    },
    {
      pivot: pivots[1],
      tech: carlos,
      title: "Replace span 3 tire",
      description: "Shredded 11.2-38 on the south tower. Customer wants it today.",
      status: "ASSIGNED",
      priority: "URGENT",
      scheduledAt: atDay(0, 10, 30),
      updates: [{ userId: alex.id, message: "Urgent. Tire is on truck 12.", status: "ASSIGNED" }],
      parts: [{ sku: "T-11238", qty: 1 }],
    },
    {
      pivot: pivots[3],
      title: "End gun leaking at coupling",
      description: "Spray at the end gun. Can wait until Thursday if crews are stacked.",
      status: "OPEN",
      priority: "NORMAL",
      scheduledAt: atDay(1, 9, 0),
      updates: [{ userId: dana.id, message: "Logged from customer call this morning.", status: "OPEN" }],
    },
    {
      pivot: pivots[4],
      tech: megan,
      title: "Collector ring noisy",
      description: "Farmer hears arcing in the collector. Machine still runs.",
      status: "WAITING_PARTS",
      priority: "HIGH",
      scheduledAt: atDay(0, 13, 0),
      updates: [
        { userId: megan.id, message: "Diagnosed worn collector ring. Ordered CR-10 from Kearney.", status: "WAITING_PARTS" },
      ],
      parts: [{ sku: "CR-10", qty: 1 }],
      labor: [{ sku: "LAB-ELEC", hours: 1.5 }],
    },
    {
      pivot: pivots[5],
      tech: megan,
      title: "Percent timer sticking",
      description: "Timer hangs at 40%. Need a new PT-10 if stock is there.",
      status: "ASSIGNED",
      priority: "NORMAL",
      scheduledAt: atDay(0, 15, 0),
      updates: [{ userId: dana.id, message: "Holdrege route this afternoon.", status: "ASSIGNED" }],
    },
    {
      pivot: pivots[8],
      tech: ty,
      title: "Span cable short on tower 5",
      description: "Ground fault when it hits the wet corner. Likely span cable.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      scheduledAt: atDay(0, 7, 30),
      updates: [
        { userId: ty.id, message: "Pulled cover. Cable insulation is cooked.", status: "IN_PROGRESS" },
      ],
      parts: [{ sku: "SC-10-4", qty: 1 }],
      labor: [{ sku: "LAB-ELEC", hours: 3 }],
      equipment: [{ sku: "EQ-WIRE", hours: 3 }],
    },
    {
      pivot: pivots[9],
      tech: ty,
      title: "Alignment drift on last two towers",
      description: "Machine doglegs west. Wants it tracked before weekend watering.",
      status: "ASSIGNED",
      priority: "NORMAL",
      scheduledAt: atDay(1, 8, 0),
      updates: [{ userId: dana.id, message: "On Ty's Lexington list for tomorrow.", status: "ASSIGNED" }],
    },
    {
      pivot: pivots[12],
      tech: jordan,
      title: "2026 startup — Home place north",
      description: "Pre-season checklist. Customer wants a written report.",
      status: "REPAIR_DONE",
      priority: "NORMAL",
      scheduledAt: atDay(-1, 9, 0),
      updates: [
        { userId: jordan.id, message: "Inspection complete. One tire low, topped gearbox oil.", status: "REPAIR_DONE" },
      ],
      parts: [{ sku: "SVC-START", qty: 1 }, { sku: "GO-80W90", qty: 1 }],
      labor: [{ sku: "LAB-FIELD", hours: 2 }],
    },
    {
      pivot: pivots[13],
      tech: jordan,
      title: "U-joint clunk on tower 2",
      description: "Heard it from the road. Replace if play is there.",
      status: "COMPLETED",
      priority: "NORMAL",
      scheduledAt: atDay(-3, 11, 0),
      closedAt: atDay(-3, 14, 30),
      invoiceNumber: "INV-44821",
      invoiceAmount: 289.5,
      updates: [
        { userId: jordan.id, message: "Replaced U-joint. Ran two circles. Smooth.", status: "COMPLETED" },
      ],
      parts: [{ sku: "UJ-1350", qty: 1 }],
      labor: [{ sku: "LAB-FIELD", hours: 1.5 }],
      equipment: [{ sku: "EQ-TRUCK", hours: 1.5 }],
    },
    {
      pivot: pivots[16],
      tech: megan,
      title: "Well pressure switch chatter",
      description: "Pump cycling. Suspect pressure switch.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      scheduledAt: atDay(0, 11, 0),
      updates: [{ userId: megan.id, message: "At the well head. Switch is pitted.", status: "IN_PROGRESS" }],
      parts: [{ sku: "PS-40", qty: 1 }],
    },
    {
      pivot: pivots[18],
      title: "Need drop hoses on outer spans",
      description: "Several hanging drops cracked. Order hose if we are short.",
      status: "OPEN",
      priority: "LOW",
      scheduledAt: atDay(3, 9, 0),
      updates: [{ userId: alex.id, message: "Parts quote sent. Waiting on go-ahead.", status: "OPEN" }],
    },
    {
      pivot: pivots[20],
      tech: ty,
      title: "Generator will not start",
      description: "Standby gen at Lost Island. Fuel and batteries checked by farmer.",
      status: "ASSIGNED",
      priority: "URGENT",
      scheduledAt: atDay(0, 16, 0),
      updates: [{ userId: dana.id, message: "Storms tonight. Ty rolling after the cable job.", status: "ASSIGNED" }],
    },
    {
      pivot: pivots[2],
      tech: carlos,
      title: "Contactor burned in panel",
      description: "Smell of burnt contacts. Machine dead.",
      status: "WAITING_PARTS",
      priority: "URGENT",
      scheduledAt: atDay(-1, 14, 0),
      updates: [
        { userId: carlos.id, message: "CNT-30 on order from Omaha. ETA tomorrow 10 a.m.", status: "WAITING_PARTS" },
      ],
    },
    {
      pivot: pivots[6],
      tech: jordan,
      title: "Sprinkler package tune",
      description: "Replace worn R3000s on outer 8 drops.",
      status: "COMPLETED",
      priority: "LOW",
      scheduledAt: atDay(-6, 8, 0),
      closedAt: atDay(-6, 12, 0),
      invoiceNumber: "INV-44790",
      invoiceAmount: 612,
      updates: [{ userId: jordan.id, message: "Eight nozzles swapped. Pressure looks even.", status: "COMPLETED" }],
      parts: [{ sku: "R3000", qty: 8 }],
      labor: [{ sku: "LAB-FIELD", hours: 3 }],
    },
    {
      pivot: pivots[7],
      title: "Customer cancelled wet-corner trench",
      description: "They decided to wait until harvest.",
      status: "CANCELLED",
      priority: "NORMAL",
      updates: [{ userId: alex.id, message: "Cancelled per Beth. Reopen after harvest if needed.", status: "CANCELLED" }],
    },
    {
      pivot: pivots[10],
      tech: megan,
      title: "Boom truck gearbox swap",
      description: "Center drive gearbox howling. Need boom truck.",
      status: "ASSIGNED",
      priority: "HIGH",
      scheduledAt: atDay(2, 7, 0),
      updates: [{ userId: dana.id, message: "Boom scheduled Friday. CDG-7000 pulled from Kearney stock.", status: "ASSIGNED" }],
      parts: [{ sku: "CDG-7000", qty: 1 }],
      equipment: [{ sku: "EQ-BOOM", hours: 4 }],
    },
    {
      pivot: pivots[11],
      tech: ty,
      title: "Fuse pack blowing on reverse",
      description: "Only blows when they reverse. Suspect last tower stop.",
      status: "OPEN",
      priority: "NORMAL",
      scheduledAt: atDay(2, 13, 0),
      updates: [{ userId: dana.id, message: "Parked for Friday afternoon.", status: "OPEN" }],
    },
    {
      pivot: pivots[14],
      tech: carlos,
      title: "Repair done — waiting farmer approve",
      description: "Replaced last tower box and oil. Farmer wants to walk it tonight.",
      status: "REPAIR_DONE",
      priority: "NORMAL",
      scheduledAt: atDay(-1, 15, 0),
      updates: [{ userId: carlos.id, message: "Ready for farmer. Texted Beth.", status: "REPAIR_DONE" }],
      parts: [{ sku: "LTB-14", qty: 1 }],
      labor: [{ sku: "LAB-FIELD", hours: 2 }],
    },
    {
      pivot: pivots[15],
      tech: jordan,
      title: "Valley span dent from implement",
      description: "Farmer clipped span 4 with a disk. Needs weld and check.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      scheduledAt: atDay(0, 14, 0),
      updates: [{ userId: jordan.id, message: "Welder on site. Span is true enough to run.", status: "IN_PROGRESS" }],
      labor: [{ sku: "LAB-WELD", hours: 2 }],
      equipment: [{ sku: "EQ-WELD", hours: 2 }],
    },
    {
      pivot: pivots[17],
      title: "Winterize request",
      description: "Drain and park after last watering.",
      status: "OPEN",
      priority: "LOW",
      scheduledAt: atDay(10, 9, 0),
      updates: [{ userId: alex.id, message: "On the fall list.", status: "OPEN" }],
    },
    {
      pivot: pivots[19],
      tech: megan,
      title: "Tower gearbox leak",
      description: "Oil on the pad at tower 6.",
      status: "ASSIGNED",
      priority: "NORMAL",
      scheduledAt: atDay(1, 11, 0),
      updates: [{ userId: dana.id, message: "Megan after the collector ring if the part lands.", status: "ASSIGNED" }],
      parts: [{ sku: "TGB-8", qty: 1 }],
    },
    {
      pivot: pivots[21],
      tech: ty,
      title: "Completed wire pull",
      description: "New span cable through three spans.",
      status: "COMPLETED",
      priority: "HIGH",
      scheduledAt: atDay(-8, 8, 0),
      closedAt: atDay(-8, 16, 0),
      invoiceNumber: "INV-44755",
      invoiceAmount: 1240,
      updates: [{ userId: ty.id, message: "Cable in. Grounds clean. Farmer signed.", status: "COMPLETED" }],
      parts: [{ sku: "SC-10-4", qty: 3 }],
      labor: [{ sku: "LAB-ELEC", hours: 6 }],
      equipment: [{ sku: "EQ-WIRE", hours: 6 }],
    },
    {
      pivot: pivots[22],
      tech: carlos,
      title: "Panel lightning hit",
      description: "Storm last night. Panel dead, fuses gone.",
      status: "WAITING_PARTS",
      priority: "URGENT",
      scheduledAt: atDay(0, 9, 30),
      updates: [{ userId: carlos.id, message: "Need fuse pack and contactor. Truck 12 heading back to Kearney.", status: "WAITING_PARTS" }],
      parts: [
        { sku: "FP-10", qty: 2 },
        { sku: "CNT-30", qty: 1 },
      ],
    },
    {
      pivot: pivots[23],
      title: "New customer walkthrough",
      description: "Show them dispatch, customer portal, and how we log parts.",
      status: "OPEN",
      priority: "LOW",
      scheduledAt: atDay(4, 10, 0),
      updates: [{ userId: alex.id, message: "Sales follow-up. Not a breakdown.", status: "OPEN" }],
    },
  ];

  let number = 2401;
  const createdTickets: { id: string; pivot: (typeof pivots)[number]; tech?: typeof carlos; status: string }[] = [];
  for (const job of jobs) {
    const ticket = await prisma.ticket.create({
      data: {
        organizationId: org.id,
        farmerId: job.pivot.farmerId,
        pivotId: job.pivot.id,
        technicianId: job.tech?.id ?? null,
        storeId: job.pivot.storeId,
        number,
        title: job.title,
        description: job.description,
        status: job.status,
        priority: job.priority,
        scheduledAt: job.scheduledAt ?? null,
        closedAt: job.closedAt ?? null,
        invoiceNumber: job.invoiceNumber ?? null,
        invoiceAmount: job.invoiceAmount ?? null,
        updates: { create: job.updates },
      },
    });
    createdTickets.push({ id: ticket.id, pivot: job.pivot, tech: job.tech, status: job.status });
    const logger = job.tech?.id ?? alex.id;
    for (const line of job.parts ?? []) {
      const catalog = partBySku(line.sku);
      await prisma.ticketPart.create({
        data: {
          ticketId: ticket.id,
          userId: logger,
          catalogPartId: catalog?.id,
          name: catalog?.name ?? line.sku,
          sku: line.sku,
          quantity: line.qty,
          unitPrice: catalog?.price ?? null,
        },
      });
    }
    for (const line of job.labor ?? []) {
      const catalog = laborBySku(line.sku);
      await prisma.ticketLabor.create({
        data: {
          ticketId: ticket.id,
          userId: logger,
          catalogLaborId: catalog?.id,
          name: catalog?.name ?? line.sku,
          sku: line.sku,
          hours: line.hours,
          unitRate: catalog?.rate ?? null,
        },
      });
    }
    for (const line of job.equipment ?? []) {
      const catalog = eqBySku(line.sku);
      await prisma.ticketEquipment.create({
        data: {
          ticketId: ticket.id,
          userId: logger,
          catalogEquipmentId: catalog?.id,
          name: catalog?.name ?? line.sku,
          sku: line.sku,
          hours: line.hours,
          unitRate: catalog?.rate ?? null,
        },
      });
    }
    number += 1;
  }

  const seasonYear = new Date().getFullYear();
  const passKeys = STARTUP_CHECKS.map((check) => check.key);
  await prisma.startupInspection.create({
    data: {
      organizationId: org.id,
      pivotId: pivots[12].id,
      seasonYear,
      status: "PASSED",
      inspectorId: jordan.id,
      ticketId: createdTickets.find((row) => row.pivot.id === pivots[12].id)?.id,
      checks: {
        create: passKeys.map((key, index) => ({
          checkKey: key,
          label: STARTUP_CHECKS[index].label,
          detail: STARTUP_CHECKS[index].detail,
          sortOrder: index,
          result: key === "gearbox" ? "PASS" : "PASS",
          notes: key === "gearbox" ? "Topped off oil." : key === "tires" ? "North tower 4 PSI low, aired up." : null,
        })),
      },
    },
  });
  const tireTicket = createdTickets.find((row) => row.pivot.id === pivots[1].id);
  await prisma.startupInspection.create({
    data: {
      organizationId: org.id,
      pivotId: pivots[1].id,
      seasonYear,
      status: "FAILED",
      inspectorId: carlos.id,
      ticketId: tireTicket?.id,
      checks: {
        create: passKeys.map((key, index) => ({
          checkKey: key,
          label: STARTUP_CHECKS[index].label,
          detail: STARTUP_CHECKS[index].detail,
          sortOrder: index,
          result: key === "tires" ? "FAIL" : key === "power" || key === "alignment" ? "PASS" : "PENDING",
          notes: key === "tires" ? "South tower tire shredded." : null,
        })),
      },
    },
  });
  for (const pivot of pivots.slice(2, 6)) {
    await prisma.startupInspection.create({
      data: {
        organizationId: org.id,
        pivotId: pivot.id,
        seasonYear,
        status: "IN_PROGRESS",
        inspectorId: megan.id,
        checks: {
          create: passKeys.map((key, index) => ({
            checkKey: key,
            label: STARTUP_CHECKS[index].label,
            detail: STARTUP_CHECKS[index].detail,
            sortOrder: index,
            result: index < 3 ? "PASS" : "PENDING",
          })),
        },
      },
    });
  }

  const notePivots = pivots.slice(0, 8);
  const notes = [
    "Farmer wants texts, not calls, after 6 p.m.",
    "Soft corner on the west. Do not circle after a 1-inch rain.",
    "Gate code 4418. Close it — cattle.",
    "End gun stays off unless they ask. Neighbor complaint last year.",
    "Well sanded in 2023. Watch amps on start.",
    "New collector ring in 2025. Keep the cover latched.",
    "Park facing north. Low wire on the south approach.",
    "Customer has their own 11.2-38 in the shed if we run short.",
  ];
  await prisma.pivotNote.createMany({
    data: notePivots.map((pivot, index) => ({
      pivotId: pivot.id,
      userId: dana.id,
      message: notes[index],
    })),
  });

  await prisma.revealVehicle.createMany({
    data: [
      { organizationId: org.id, storeId: kearney.id, number: "12", name: "Carlos — Kearney 12", showOnMap: true },
      { organizationId: org.id, storeId: holdrege.id, number: "18", name: "Megan — Holdrege 18", showOnMap: true },
      { organizationId: org.id, storeId: lexington.id, number: "21", name: "Ty — Lexington 21", showOnMap: true },
      { organizationId: org.id, storeId: kearney.id, number: "24", name: "Jordan — Kearney 24", showOnMap: true },
      { organizationId: org.id, storeId: kearney.id, number: "30", name: "Boom truck", showOnMap: true },
    ],
  });

  await ensureRevealVehicleLocationColumns(prisma);
  const nowIso = new Date().toISOString();
  const demoGps = [
    {
      number: "12",
      lat: pivots[0].lat + 0.0007,
      lng: pivots[0].lng + 0.0005,
      address: "Twin Rivers north pivot, Highway 30, Kearney, NE",
      displayState: "Stopped",
      techId: carlos.id,
    },
    {
      number: "18",
      lat: (H.lat + K.lat) / 2,
      lng: (H.lng + K.lng) / 2,
      address: "US-183 north of Holdrege, NE",
      displayState: "Moving",
      techId: megan.id,
    },
    {
      number: "21",
      lat: pivots[8].lat + 0.0006,
      lng: pivots[8].lng - 0.0004,
      address: "Prairie Wind north section, Holdrege, NE",
      displayState: "Stopped",
      techId: ty.id,
    },
    {
      number: "24",
      lat: pivots[15].lat - 0.0005,
      lng: pivots[15].lng + 0.0006,
      address: "Lost Island north grass, Lexington, NE",
      displayState: "Stopped",
      techId: jordan.id,
    },
    {
      number: "30",
      lat: K.lat,
      lng: K.lng,
      address: "1820 2nd Ave, Kearney, NE",
      displayState: "Idle",
    },
  ];
  for (const truck of demoGps) {
    await prisma.$executeRaw`
      UPDATE RevealVehicle
      SET lastLatitude = ${truck.lat},
          lastLongitude = ${truck.lng},
          lastAddress = ${truck.address},
          displayState = ${truck.displayState},
          locationUpdatedAt = ${nowIso}
      WHERE organizationId = ${org.id} AND number = ${truck.number}
    `;
    if (truck.techId) {
      await prisma.$executeRaw`
        UPDATE User
        SET lastLatitude = ${truck.lat},
            lastLongitude = ${truck.lng},
            lastSeenAt = ${nowIso},
            lastPath = ${"/dispatch"}
        WHERE id = ${truck.techId}
      `;
    }
  }

  const liveJobs = createdTickets.filter((row) => row.status === "IN_PROGRESS" && row.tech);
  for (const job of liveJobs.slice(0, 3)) {
    await prisma.siteVisit.create({
      data: {
        ticketId: job.id,
        technicianId: job.tech!.id,
        vehicleNumber: job.tech!.revealVehicleNumber || "12",
        startedAt: atDay(0, 8, 15),
        lastSeenAt: new Date(),
        metersFromPivot: 80,
      },
    });
  }

  console.log(`${NAME} is ready for the marketing video.`);
  console.log("Login: admin@highplains.ag  /  demo1234");
  console.log("Also: manager@highplains.ag, carlos@highplains.ag, beth@twinrivers.farm");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
