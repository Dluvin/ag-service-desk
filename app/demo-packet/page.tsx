import type { Metadata } from "next";
import Link from "next/link";
import { LandingFooter, LandingHeader } from "@/components/LandingChrome";
import { PLANS, formatPlanCents } from "@/lib/plans";
import "../landing.css";

export const metadata: Metadata = {
  title: "Welcome packet | Ag Desk Pro",
  description: "What to expect after you request an Ag Desk Pro demo.",
};

export default function DemoPacketPage() {
  return (
    <div className="landing">
      <a className="landing-skip" href="#content">
        Skip to content
      </a>
      <LandingHeader />
      <main id="content" className="landing-section">
        <div className="container landing-legal">
          <span className="landing-eyebrow">Demo</span>
          <h1>Welcome packet</h1>
          <p className="landing-muted">For irrigation dealers who asked for a demo of Ag Desk Pro.</p>
          <div className="landing-card landing-legal-body">
            <p>
              Ag Desk Pro is work-order software for irrigation dealers. It keeps customers, pivots
              and other equipment, and technician updates in one desk.
            </p>
            <h2>What happens next</h2>
            <ul>
              <li>We review the shop, the ZIP code, and the version you picked.</li>
              <li>A qualified request gets a follow-up from us to set a demo time.</li>
              <li>
                Call or text <a href="tel:+12293046901">(229) 304-6901</a>, or email{" "}
                <a href="mailto:david@agdeskpro.com">david@agdeskpro.com</a>.
              </li>
            </ul>
            <h2>The versions</h2>
            <ul>
              <li>Starter: {formatPlanCents(PLANS.STARTER.monthlyCents)} per user each month.</li>
              <li>
                Shop: {formatPlanCents(PLANS.SHOP.monthlyCents)} a month for {PLANS.SHOP.includedUsers}{" "}
                staff seats.
              </li>
              <li>Enterprise: {formatPlanCents(PLANS.ENTERPRISE.monthlyCents)} a month.</li>
            </ul>
            <p>
              Pricing on the site is at <Link href="/#pricing">agdeskpro.com/#pricing</Link>. A new
              company still starts only when we approve it.
            </p>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
