import Stripe from "stripe";
import { NextResponse } from "next/server";
import { applyStripeCheckout, applyStripeSubscriptionDeleted, stripeClient } from "@/lib/stripe";

export async function POST(request: Request) {
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) {
    return new NextResponse("Stripe webhook is not configured.", { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new NextResponse("Missing signature.", { status: 400 });
  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch {
    return new NextResponse("Invalid signature.", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    await applyStripeCheckout(event.data.object);
  }
  if (event.type === "customer.subscription.deleted") {
    await applyStripeSubscriptionDeleted(event.data.object);
  }
  return NextResponse.json({ received: true });
}
