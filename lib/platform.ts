import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const PLATFORM_COOKIE = "ag_platform";

export type PlatformSession = {
  adminId: string;
  email: string;
  name: string;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(value);
}

export async function createPlatformSession(admin: PlatformSession) {
  const token = await new SignJWT(admin)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());
  const store = await cookies();
  store.set(PLATFORM_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function destroyPlatformSession() {
  const store = await cookies();
  store.delete(PLATFORM_COOKIE);
}

export async function getPlatformSession(): Promise<PlatformSession | null> {
  const store = await cookies();
  const token = store.get(PLATFORM_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.adminId || !payload.email) return null;
    return {
      adminId: String(payload.adminId),
      email: String(payload.email),
      name: String(payload.name || "Platform admin"),
    };
  } catch {
    return null;
  }
}

export async function requirePlatformAdmin() {
  const session = await getPlatformSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function ensurePlatformAdminFromEnv() {
  const email = (process.env.PLATFORM_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.PLATFORM_ADMIN_PASSWORD || "";
  if (!email || !password) return;
  const count = await prisma.platformAdmin.count();
  if (count > 0) return;
  await prisma.platformAdmin.create({
    data: {
      email,
      name: "Platform admin",
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
}

export async function verifyPlatformLogin(email: string, password: string) {
  await ensurePlatformAdminFromEnv();
  const admin = await prisma.platformAdmin.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!admin) return null;
  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return null;
  return { adminId: admin.id, email: admin.email, name: admin.name } satisfies PlatformSession;
}
