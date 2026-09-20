import Stripe from "stripe";
import { appBaseUrl } from "./app-url";
import { PLAN } from "./plan";
import { prisma } from "./prisma";

export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key);
}

export function stripeIsConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_PRICE_BASE?.trim());
}

export async function startTenantBilling(organizationId: string) {
  const stripe = stripeClient();
  const price = process.env.STRIPE_PRICE_BASE?.trim();
  if (!stripe || !price) {
    return { checkoutUrl: "" as const, error: "Stripe is not configured yet." };
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { users: { where: { role: "ADMIN" }, orderBy: { createdAt: "asc" }, take: 1 } },
  });
  if (!org) return { checkoutUrl: "" as const, error: "Company not found." };
  const admin = org.users[0];

  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: org.name,
      email: admin?.email,
      metadata: { organizationId: org.id },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: org.id,
    success_url: `${appBaseUrl() || "https://agdeskpro.com"}/login?billing=ok`,
    cancel_url: `${appBaseUrl() || "https://agdeskpro.com"}/login?billing=pending`,
    allow_promotion_codes: true,
    line_items: [{ price, quantity: 1 }],
    subscription_data: {
      trial_period_days: PLAN.trialDays,
      metadata: { organizationId: org.id },
    },
    metadata: { organizationId: org.id },
  });

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      stripeCustomerId: customerId,
      stripeCheckoutUrl: session.url,
    },
  });

  return { checkoutUrl: session.url ?? "", error: "" as const };
}

export async function applyStripeCheckout(session: Stripe.Checkout.Session) {
  const organizationId =
    session.client_reference_id ||
    (typeof session.metadata?.organizationId === "string" ? session.metadata.organizationId : "");
  if (!organizationId) return;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      ...(customerId ? { stripeCustomerId: customerId } : {}),
      ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
    },
  });
}

export async function applyStripeSubscriptionDeleted(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata?.organizationId;
  if (!organizationId) {
    const org = await prisma.organization.findFirst({
      where: { stripeSubscriptionId: subscription.id },
      select: { id: true },
    });
    if (!org) return;
    await prisma.organization.update({
      where: { id: org.id },
      data: { stripeSubscriptionId: null, paused: true },
    });
    return;
  }
  await prisma.organization.update({
    where: { id: organizationId },
    data: { stripeSubscriptionId: null, paused: true },
  });
}
