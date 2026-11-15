const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();
const SLUG = "ed-bullard-irrigation";

const STARTUP_CHECKS = [
  { key: "power", label: "Power and electrical", detail: "Panel, fuses, grounding, and last-tower stop." },
  { key: "alignment", label: "Alignment", detail: "Spans tracking straight; no tower lag." },
  { key: "sprinklers", label: "Sprinklers and nozzles", detail: "Plugs, worn nozzles, and hanging drops." },
  { key: "gearbox", label: "Gearboxes and drivetrain", detail: "Oil level, leaks, and u-joints." },
  { key: "tires", label: "Tires and towers", detail: "Pressure, rims, and motor mounts." },
  { key: "endgun", label: "End gun", detail: "Coupling, booster, and shutoff." },
  { key: "controls", label: "Control panel", detail: "Direction, speed, and percent timer." },
];

const ASSET_TYPES = [
  { slug: "pivots", name: "Pivots", kind: "PIVOT", sortOrder: 0 },
  { slug: "wells", name: "Wells", kind: "GENERIC", sortOrder: 1 },
  { slug: "pumps", name: "Pumps", kind: "GENERIC", sortOrder: 2 },
  { slug: "generators", name: "Generators", kind: "GENERIC", sortOrder: 3 },
];

function daysAgo(days, hours) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hours, 15, 0, 0);
  return date;
}

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);
  const now = new Date();
  let org = await prisma.organization.findUnique({ where: { slug: SLUG } });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Ed Bullard Irrigation",
        slug: SLUG,
        paused: false,
        signupStatus: "ACTIVE",
        signupPhone: "(910) 483-7148",
        signupAddress: "3304 Hayfield Rd",
        signupCity: "Wade",
        signupRegion: "NC",
        signupPostalCode: "28395",
        trialEndsAt: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()),
      },
    });
    console.log(`Created company ${org.name}.`);
  } else {
    console.log(`Adding demo data to existing company ${org.name} (${org.slug}).`);
  }

  for (const [index, check] of STARTUP_CHECKS.entries()) {
    const found = await prisma.startupCheckTemplate.findFirst({
      where: { organizationId: org.id, checkKey: check.key },
    });
    if (!found) {
      await prisma.startupCheckTemplate.create({
        data: {
          organizationId: org.id,
          checkKey: check.key,
          label: check.label,
          detail: check.detail,
          sortOrder: index,
        },
      });
    }
  }

  for (const type of ASSET_TYPES) {
    const found = await prisma.assetType.findFirst({
      where: { organizationId: org.id, slug: type.slug },
    });
    if (!found) {
      await prisma.assetType.create({
        data: { organizationId: org.id, ...type, builtIn: true },
      });
    }
  }

  let store = await prisma.store.findFirst({
    where: { organizationId: org.id, name: "Wade shop" },
  });
  if (!store) {
    store = await prisma.store.create({
      data: {
        organizationId: org.id,
        name: "Wade shop",
        address: "3304 Hayfield Rd, Wade, NC",
        phone: "(910) 483-7148",
      },
    });
  }

  const staff = {};
  for (const person of [
    { key: "admin", name: "Ed Bullard", email: "admin@edbullard.demo", role: "ADMIN", phone: "910-555-0100" },
    { key: "manager", name: "Marie Hayes", email: "manager@edbullard.demo", role: "MANAGER", phone: "910-555-0101" },
    { key: "luis", name: "Luis Ortega", email: "luis@edbullard.demo", role: "TECHNICIAN", phone: "910-555-0188" },
    { key: "chris", name: "Chris Lang", email: "chris@edbullard.demo", role: "TECHNICIAN", phone: "910-555-0189" },
  ]) {
    const found = await prisma.user.findFirst({
      where: { organizationId: org.id, email: person.email },
    });
    staff[person.key] =
      found ??
      (await prisma.user.create({
        data: {
          organizationId: org.id,
          storeId: store.id,
          name: person.name,
          email: person.email,
          role: person.role,
          phone: person.phone,
          passwordHash,
        },
      }));
  }

  async function addFarmer(input) {
    let farmer = await prisma.farmer.findFirst({
      where: { organizationId: org.id, email: input.email },
      include: { contacts: true },
    });
    if (!farmer) {
      farmer = await prisma.farmer.create({
        data: {
          organizationId: org.id,
          storeId: store.id,
          name: input.name,
          email: input.email,
          phone: input.phone,
          address: input.address,
          notes: "Demo customer for the Wade service area.",
          contacts: { create: { name: input.contactName, phone: input.phone, email: input.email } },
        },
        include: { contacts: true },
      });
    }
    let contact = farmer.contacts[0];
    if (!contact) {
      contact = await prisma.farmerContact.create({
        data: { farmerId: farmer.id, name: input.contactName, phone: input.phone, email: input.email },
      });
    }
    let farm = await prisma.farm.findFirst({
      where: { organizationId: org.id, farmerId: farmer.id, name: input.farmName },
    });
    if (!farm) {
      farm = await prisma.farm.create({
        data: {
          organizationId: org.id,
          farmerId: farmer.id,
          primaryContactId: contact.id,
          name: input.farmName,
          location: input.farmLocation,
          latitude: input.lat,
          longitude: input.lng,
          assignments: { create: { farmerId: farmer.id, startYear: 2016 } },
        },
      });
    }
    return { farmer, farm };
  }

  const capeFear = await addFarmer({
    name: "Cape Fear Farms",
    email: "sam@capefear.demo",
    phone: "910-555-0142",
    address: "1420 River Rd, Wade, NC",
    contactName: "Sam Eller",
    farmName: "River road",
    farmLocation: "North of Wade, along the Cape Fear",
    lat: 35.172,
    lng: -78.705,
  });
  const hayfield = await addFarmer({
    name: "Hayfield Creek Farm",
    email: "ruth@hayfield.demo",
    phone: "910-555-0155",
    address: "880 Hayfield Rd, Wade, NC",
    contactName: "Ruth Coleman",
    farmName: "Home place",
    farmLocation: "West of Hayfield Road",
    lat: 35.148,
    lng: -78.748,
  });
  const blackRiver = await addFarmer({
    name: "Black River Growers",
    email: "james@blackriver.demo",
    phone: "910-555-0164",
    address: "2200 Black River Rd, Godwin, NC",
    contactName: "James McNeill",
    farmName: "Black River",
    farmLocation: "North of Godwin",
    lat: 35.214,
    lng: -78.682,
  });
  const cedar = await addFarmer({
    name: "Cedar Creek Farm",
    email: "annie@cedarcreek.demo",
    phone: "910-555-0171",
    address: "410 Cedar Creek Rd, Eastover, NC",
    contactName: "Annie Tew",
    farmName: "Cedar Creek",
    farmLocation: "East of Eastover",
    lat: 35.118,
    lng: -78.648,
  });

  const pivotSpecs = [
    { farmer: capeFear, name: "River road north", serial: "V-6101", lat: 35.1768, lng: -78.7012, note: "North of the grain bins" },
    { farmer: capeFear, name: "River road south", serial: "V-6102", lat: 35.1674, lng: -78.7096, note: "Along River Road" },
    { farmer: capeFear, name: "Canal quarter", serial: "V-6108", lat: 35.1811, lng: -78.6924, note: "East of the canal" },
    { farmer: hayfield, name: "Home place east", serial: "V-6220", lat: 35.1512, lng: -78.7418, note: "East of the shop lane" },
    { farmer: hayfield, name: "Home place west", serial: "V-6224", lat: 35.1446, lng: -78.7562, note: "West quarter, past the creek" },
    { farmer: hayfield, name: "Creek bottom", serial: "V-6231", lat: 35.1388, lng: -78.7364, note: "Low ground by Hayfield Creek" },
    { farmer: blackRiver, name: "North field", serial: "V-6404", lat: 35.2214, lng: -78.6748, note: "North of the farm road" },
    { farmer: blackRiver, name: "South field", serial: "V-6409", lat: 35.2066, lng: -78.6895, note: "South of the well" },
    { farmer: cedar, name: "East pivot", serial: "V-6512", lat: 35.1226, lng: -78.6392, note: "East of Cedar Creek Road" },
    { farmer: cedar, name: "West pivot", serial: "V-6518", lat: 35.1124, lng: -78.6588, note: "West field, next to the woods" },
  ];

  const pivots = {};
  for (const spec of pivotSpecs) {
    const found = await prisma.pivot.findFirst({
      where: { organizationId: org.id, serialNumber: spec.serial },
    });
    const pivot =
      found ??
      (await prisma.pivot.create({
        data: {
          organizationId: org.id,
          farmerId: spec.farmer.farmer.id,
          farmId: spec.farmer.farm.id,
          name: spec.name,
          serialNumber: spec.serial,
          latitude: spec.lat,
          longitude: spec.lng,
          locationNote: spec.note,
        },
      }));
    pivots[spec.name] = { ...spec, id: pivot.id };
  }

  const tickets = [
    {
      pivot: pivots["Canal quarter"],
      number: 1001,
      title: "End gun leaking at the coupling",
      description: "Customer called this morning. Water is spraying at the end gun. Can wait until a truck is already east of Wade.",
      status: "OPEN",
      priority: "NORMAL",
      technicianId: null,
      userId: staff.admin.id,
      message: "Logged from Sam Eller's call. No technician assigned yet.",
      createdAt: daysAgo(0, 7),
    },
    {
      pivot: pivots["Home place east"],
      number: 1002,
      title: "Flat tire on span 4",
      description: "Tire is off the rim on the east machine. Need an 11.2-38 if the Wade truck has one.",
      status: "ASSIGNED",
      priority: "URGENT",
      technicianId: staff.luis.id,
      userId: staff.manager.id,
      message: "Assigned to Luis Ortega for this afternoon.",
      createdAt: daysAgo(0, 8),
      scheduledAt: daysAgo(0, 13),
    },
    {
      pivot: pivots["North field"],
      number: 1003,
      title: "Center drive not advancing",
      description: "Pivot stalled overnight on the north field. Last span is sitting in the low spot.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      technicianId: staff.chris.id,
      userId: staff.chris.id,
      message: "On site. Checking gearbox oil and the last tower box.",
      createdAt: daysAgo(1, 8),
      scheduledAt: daysAgo(0, 8),
    },
    {
      pivot: pivots["East pivot"],
      number: 1004,
      title: "Tower gearbox ordered",
      description: "Span 3 gearbox is howling and low on oil. Machine is parked until the gearbox arrives.",
      status: "WAITING_PARTS",
      priority: "HIGH",
      technicianId: staff.luis.id,
      userId: staff.luis.id,
      message: "Gearbox is on order. Customer knows the pivot is down.",
      createdAt: daysAgo(3, 10),
      scheduledAt: daysAgo(3, 11),
    },
    {
      pivot: pivots["River road south"],
      number: 1005,
      title: "Alignment on the south machine",
      description: "Tower 2 was lagging. Spans are tracking straight again. Needs an invoice before it can be closed.",
      status: "REPAIR_DONE",
      priority: "NORMAL",
      technicianId: staff.chris.id,
      userId: staff.chris.id,
      message: "Repair done. Alignment holds through a full circle. Waiting on the invoice number.",
      createdAt: daysAgo(2, 9),
      scheduledAt: daysAgo(1, 9),
    },
    {
      pivot: pivots["Home place west"],
      number: 1006,
      title: "Replace worn sprinklers",
      description: "Drops on spans 2 and 3 were plugged and the nozzles were worn. Replaced the bad ones and flushed the spans.",
      status: "COMPLETED",
      priority: "LOW",
      technicianId: staff.luis.id,
      userId: staff.manager.id,
      message: "Closed with shop invoice EB-1842.",
      createdAt: daysAgo(6, 9),
      scheduledAt: daysAgo(5, 9),
      invoiceNumber: "EB-1842",
      invoiceAmount: 980,
      closedAt: daysAgo(4, 16),
    },
  ];

  for (const ticket of tickets) {
    const already = await prisma.ticket.findFirst({
      where: { organizationId: org.id, title: ticket.title },
      select: { id: true },
    });
    if (already) continue;

    const numberTaken = await prisma.ticket.findFirst({
      where: { organizationId: org.id, number: ticket.number },
      select: { id: true },
    });
    let number = ticket.number;
    if (numberTaken) {
      const last = await prisma.ticket.aggregate({
        where: { organizationId: org.id },
        _max: { number: true },
      });
      number = (last._max.number ?? 1000) + 1;
    }

    await prisma.ticket.create({
      data: {
        organizationId: org.id,
        farmerId: ticket.pivot.farmer.farmer.id,
        pivotId: ticket.pivot.id,
        storeId: store.id,
        technicianId: ticket.technicianId,
        number,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        scheduledAt: ticket.scheduledAt ?? null,
        invoiceNumber: ticket.invoiceNumber ?? null,
        invoiceAmount: ticket.invoiceAmount ?? null,
        closedAt: ticket.closedAt ?? null,
        createdAt: ticket.createdAt,
        updates: {
          create: {
            userId: ticket.userId,
            message: ticket.message,
            status: ticket.status,
            createdAt: ticket.closedAt ?? ticket.createdAt,
          },
        },
      },
    });
  }

  const [users, farmers, pivotCount, ticketCount] = await Promise.all([
    prisma.user.count({ where: { organizationId: org.id } }),
    prisma.farmer.count({ where: { organizationId: org.id } }),
    prisma.pivot.count({ where: { organizationId: org.id } }),
    prisma.ticket.count({ where: { organizationId: org.id } }),
  ]);
  console.log(
    `Ed Bullard Irrigation demo ready: ${users} staff, ${farmers} customers, ${pivotCount} pivots, ${ticketCount} work orders.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
