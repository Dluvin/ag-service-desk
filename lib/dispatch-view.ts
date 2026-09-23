import { prisma } from "./prisma";

export const DISPATCH_VIEWS = ["LIST", "TILES"] as const;
export type DispatchView = (typeof DISPATCH_VIEWS)[number];

export function parseDispatchView(value: string | null | undefined): DispatchView {
  return value === "TILES" ? "TILES" : "LIST";
}

export async function loadUserDispatchView(userId: string): Promise<DispatchView> {
  const rows = await prisma.$queryRaw<Array<{ dispatchView: string }>>`
    SELECT dispatchView FROM User WHERE id = ${userId}
  `;
  return parseDispatchView(rows[0]?.dispatchView);
}

export async function saveUserDispatchView(userId: string, view: DispatchView) {
  await prisma.$executeRaw`UPDATE User SET dispatchView = ${view} WHERE id = ${userId}`;
}
