import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SLUG = "heartland-irrigation";
const KEEP = new Set(["Green Acres Farm", "Riverside Farms"]);

const ADJECTIVES = [
  "Willow", "Cedar", "Ridge", "Canyon", "Prairie", "Meadow", "Cotton", "Amber",
  "Silver", "Copper", "Maple", "Oak", "Pine", "Stone", "River", "Creek",
  "Sunset", "Harvest", "North", "South", "East", "West", "Open", "Quiet",
  "Bright", "Golden", "Little", "Grand", "Twin", "Three",
];
const NOUNS = [
  "Bend", "Fork", "Draw", "Flats", "Grove", "Hill", "Lake", "Line",
  "Ridge", "Road", "Spring", "Trail", "Valley", "View", "Well", "Wind",
];
const KINDS = ["Farms", "Ranch", "Grain", "Land", "Cattle Co.", "Produce"];
const FIRST = [
  "Amy", "Carl", "Rita", "Owen", "Lee", "Maya", "Jon", "Ana", "Hugh", "Tess",
  "Ned", "Sasha", "Cal", "Kim", "Troy", "Nina", "Wade", "Pia", "Gus", "Eve",
];
const LAST = [
  "Keller", "Benson", "Hale", "Finch", "Walsh", "Ruiz", "Chen", "Ortiz",
  "Pike", "Brooks", "Reed", "Holt", "Vega", "Nguyen", "Patel", "Morgan",
];

function fakeFarmName(index: number) {
  const adjective = ADJECTIVES[index % ADJECTIVES.length];
  const noun = NOUNS[Math.floor(index / ADJECTIVES.length) % NOUNS.length];
  const kind = KINDS[Math.floor(index / (ADJECTIVES.length * NOUNS.length)) % KINDS.length];
  const cycle = Math.floor(index / (ADJECTIVES.length * NOUNS.length * KINDS.length));
  return cycle > 0 ? `${adjective} ${noun} ${kind} ${cycle + 1}` : `${adjective} ${noun} ${kind}`;
}

function fakePerson(index: number) {
  return `${FIRST[index % FIRST.length]} ${LAST[Math.floor(index / FIRST.length) % LAST.length]}`;
}

function slugEmail(name: string, index: number) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return `${slug || "demo"}-${index}@demo.farm`;
}

function replaceName(text: string | null | undefined, from: string, to: string) {
  if (!text || from === to) return text ?? undefined;
  return text.split(from).join(to);
}

async function main() {
  const org = await prisma.organization.findUnique({ where: { slug: SLUG } });
  if (!org) throw new Error(`No ${SLUG} tenant.`);

  const farmers = await prisma.farmer.findMany({
    where: { organizationId: org.id },
    include: { contacts: true, users: true, tickets: { include: { updates: true } } },
    orderBy: { createdAt: "asc" },
  });

  let index = 0;
  let changed = 0;
  for (const farmer of farmers) {
    if (KEEP.has(farmer.name)) continue;
    const name = fakeFarmName(index);
    const person = fakePerson(index);
    const email = slugEmail(name, index);
    const phone = `402-555-${String(2000 + index).slice(-4)}`;
    const address = `${100 + index} County Road ${index + 1}, York, NE`;
    index += 1;

    await prisma.farmer.update({
      where: { id: farmer.id },
      data: {
        name,
        email,
        phone,
        address,
        notes: "Demo customer. Prefers morning calls.",
      },
    });

    for (const [contactIndex, contact] of farmer.contacts.entries()) {
      const contactName = contactIndex === 0 ? person : fakePerson(index + contactIndex + 50);
      await prisma.farmerContact.update({
        where: { id: contact.id },
        data: {
          name: contactName,
          email: contactIndex === 0 ? email : slugEmail(`${name}-c${contactIndex}`, index),
          phone: contact.phone ? `402-555-${String(3000 + index + contactIndex).slice(-4)}` : contact.phone,
        },
      });
    }

    for (const user of farmer.users) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: person, email },
      });
    }

    for (const ticket of farmer.tickets) {
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          title: replaceName(ticket.title, farmer.name, name) ?? ticket.title,
          description: replaceName(ticket.description, farmer.name, name) ?? ticket.description,
        },
      });
      for (const update of ticket.updates) {
        const message = replaceName(update.message, farmer.name, name);
        if (message && message !== update.message) {
          await prisma.ticketUpdate.update({
            where: { id: update.id },
            data: { message },
          });
        }
      }
    }

    changed += 1;
  }

  console.log(`Renamed ${changed} Heartland customers to fake demo names.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
