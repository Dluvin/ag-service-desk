import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

function guid() {
  return `{${randomUUID()}}`;
}

export async function ensureQbwcConfig(organizationId: string) {
  const org = await prisma.organization.findFirst({
    where: { id: organizationId },
    select: { id: true, slug: true },
  });
  if (!org) return null;
  const existing = await prisma.qbwcConfig.findFirst({ where: { organizationId } });
  if (existing) return existing;
  return prisma.qbwcConfig.create({
    data: {
      organizationId,
      username: org.slug.slice(0, 50) || `org-${org.id.slice(0, 8)}`,
      passwordHash: "",
      ownerId: guid(),
      fileId: guid(),
    },
  });
}

export async function setQbwcPassword(organizationId: string, password: string) {
  const config = await ensureQbwcConfig(organizationId);
  if (!config) return null;
  return prisma.qbwcConfig.update({
    where: { organizationId },
    data: { passwordHash: await bcrypt.hash(password, 10), lastError: null },
  });
}

export async function verifyQbwcLogin(username: string, password: string) {
  const config = await prisma.qbwcConfig.findFirst({ where: { username } });
  if (!config?.passwordHash) return null;
  const ok = await bcrypt.compare(password, config.passwordHash);
  return ok ? config : null;
}

export async function createQbwcSession(organizationId: string) {
  return prisma.qbwcSession.create({ data: { organizationId } });
}

export async function getQbwcSession(id: string) {
  if (!id) return null;
  return prisma.qbwcSession.findFirst({ where: { id } });
}

export async function qbwcIsReady(organizationId: string) {
  const config = await prisma.qbwcConfig.findFirst({
    where: { organizationId },
    select: { passwordHash: true },
  });
  return Boolean(config?.passwordHash);
}

let jobMetaReady: Promise<void> | null = null;

export async function ensureQbEstimateJobMeta() {
  if (!jobMetaReady) {
    jobMetaReady = addQbEstimateJobMetaColumn().catch((error) => {
      jobMetaReady = null;
      throw error;
    });
  }
  await jobMetaReady;
}

async function addQbEstimateJobMetaColumn() {
  const cols = await prisma.$queryRawUnsafe<Array<{ name: string }>>("PRAGMA table_info(QbEstimateJob)");
  if (!cols.some((col) => col.name === "qbMeta")) {
    await prisma.$executeRawUnsafe("ALTER TABLE QbEstimateJob ADD COLUMN qbMeta TEXT");
  }
}
