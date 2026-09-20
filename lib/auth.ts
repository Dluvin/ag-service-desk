import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { Role } from "./roles";

const COOKIE = "ag_session";

export type SessionUser = {
  userId: string;
  organizationId: string;
  organizationName: string;
  role: Role;
  farmerId: string | null;
  name: string;
  email: string;
  impersonatorId?: string;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(value);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function verifyLogin(
  email: string,
  password: string,
): Promise<SessionUser | { paused: true } | { pending: true } | { rejected: true } | null> {
  const normalized = email.trim().toLowerCase();
  const matches = await prisma.user.findMany({
    where: { email: normalized },
    include: { organization: true },
  });

  for (const user of matches) {
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (ok) {
      if (user.organization.signupStatus === "PENDING") {
        return { pending: true as const };
      }
      if (user.organization.signupStatus === "REJECTED") {
        return { rejected: true as const };
      }
      if (user.organization.paused) {
        return { paused: true as const };
      }
      return {
        userId: user.id,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
        role: user.role as Role,
        farmerId: user.farmerId,
        name: user.name,
        email: user.email,
      } satisfies SessionUser;
    }
  }
  return null;
}
