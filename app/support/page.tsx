import type { Metadata } from "next";
import Link from "next/link";
import { LandingFooter, LandingHeader } from "@/components/LandingChrome";
import "../landing.css";

export const metadata: Metadata = {
  title: "Support | AG Desk Pro",
  description: "Get help with AG Desk Pro: login, billing, GPS, tickets, and demo requests.",
};

export default function SupportPage() {
  return (
    <div className="landing">
      <a className="landing-skip" href="#content">
        Skip to content
      </a>
      <LandingHeader />
      <main id="content" className="landing-section">
        <div className="container landing-legal">
          <span className="landing-eyebrow">Help</span>
          <h1>Support</h1>
          <p className="landing-muted">
            We are here for irrigation dealers using AG Desk Pro, and for people who want a demo.
          </p>

          <div className="landing-card landing-legal-body">
            <h2>Reach us</h2>
            <ul>
              <li>
                Phone: <a href="tel:+12299389000">229-938-9000</a>
              </li>
              <li>
                Email: <a href="mailto:info@agdeskpro.com">info@agdeskpro.com</a>
                {" or "}
                <a href="mailto:david@agdeskpro.com">david@agdeskpro.com</a>
              </li>
              <li>
                Demo form: <Link href="/#contact">Request a demo</Link> on the homepage
              </li>
            </ul>
            <p>
              Say your company name, the email you log in with, and what you were trying to do. If
              it is a GPS or map issue, include the truck or pivot name.
            </p>

            <h2>Log in and passwords</h2>
            <p>
              Staff, managers, technicians, and farmers use the same login at{" "}
              <Link href="/login">agdeskpro.com/login</Link>. If you forgot your password, use{" "}
              <Link href="/forgot">Reset password</Link>. We email a link if that address is in the
              system. Check spam if you do not see it.
            </p>
            <p>
              New companies start at <Link href="/signup">Start a company</Link>. You cannot log in
              until we approve the signup and you finish billing if we send a Stripe link.
            </p>

            <h2>Tickets, farms, and pivots</h2>
            <p>
              Your company admin and managers control stores, staff, farms, and equipment. If a
              farmer cannot see a ticket, have an admin check that farm login and the pivot on the
              work order. Admins can also set the company logo, stores, and maintenance checklists
              under Settings.
            </p>

            <h2>GPS and maps</h2>
            <p>
              Fleet tracking uses the connector your admin set up (for example Verizon Connect
              Reveal). If trucks are missing or GPS fails, confirm the connector credentials on the
              Connectors page and that the truck is assigned. Pivot navigation uses the coordinates
              saved on the pivot, not only the farm mailing address.
            </p>

            <h2>Billing and trial</h2>
            <p>
              After we approve a company you get a 15-day trial, then $499 per month for 10 staff
              seats. Extra staff seats are $19 per month. Farm logins are not staff seats. Card
              billing runs through Stripe. If a checkout email is missing, ask us and we can send
              the link again.
            </p>

            <h2>Privacy</h2>
            <p>
              How we handle data is in the <Link href="/privacy">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
