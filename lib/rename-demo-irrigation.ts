import { prisma } from "./prisma";

/** Login uses email, not slug — keep demo-irrigation so existing tenants stay findable. */
export const DEMO_IRRIGATION_SLUG = "demo-irrigation";
export const AMERICAN_IRRIGATION_NAME = "American Irrigation";

export async function renameDemoIrrigationCompany() {
  await prisma.organization.updateMany({
    where: {
      OR: [{ slug: DEMO_IRRIGATION_SLUG }, { name: "Demo Irrigation" }],
    },
    data: { name: AMERICAN_IRRIGATION_NAME },
  });
}
