import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { LandingFooter, LandingHeader } from "@/components/LandingChrome";
import { landingSupportAction } from "@/lib/landing-actions";
import "../landing.css";

export const metadata: Metadata = {
  title: "Support | AG Desk Pro",
  description: "Get help with AG Desk Pro: login, billing, GPS, work orders, and demo requests.",
};

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;
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
            <h2>Send a message</h2>
            <p>
              Tell us your name, the email we should reply to, and what you need. Company is optional.
              This does not start a company or a trial.
            </p>
            {sent === "1" ? (
              <p className="landing-ok">Thanks. We received your message and will follow up.</p>
            ) : null}
            <ActionForm action={landingSupportAction} className="landing-form">
              <div className="landing-field">
                <label htmlFor="support-name">Name</label>
                <input id="support-name" name="name" type="text" required placeholder="Your name" />
              </div>
              <div className="landing-field">
                <label htmlFor="support-email">Email</label>
                <input
                  id="support-email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                />
              </div>
              <div className="landing-field">
                <label htmlFor="support-company">Company (optional)</label>
                <input id="support-company" name="company" type="text" placeholder="Company name" />
              </div>
              <div className="landing-field">
                <label htmlFor="support-message">Message</label>
                <textarea
                  id="support-message"
                  name="message"
                  required
                  placeholder="What were you trying to do, and what happened?"
                />
              </div>
              <button className="landing-btn" type="submit">
                Send message
              </button>
            </ActionForm>
          </div>

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
              Staff, managers, technicians, and customers use the same login at{" "}
              <Link href="/login">agdeskpro.com/login</Link>. If you forgot your password, use{" "}
              <Link href="/forgot">Reset password</Link>. We email a link if that address is in the
              system. Check spam if you do not see it.
            </p>
            <p>
              New companies start at <Link href="/signup">Start a company</Link>. You cannot log in
              until we approve the signup and you finish billing if we send a Stripe link.
            </p>

            <h2>Work orders, customers, and pivots</h2>
            <p>
              Your company admin and managers control stores, staff, customers, and equipment. If a
              customer cannot see a work order, have an admin check that customer login and the pivot on the
              work order. Admins can also set the company logo, stores, and maintenance checklists
              under Settings.
            </p>

            <h2>GPS and maps</h2>
            <p>
              Fleet tracking uses the connector your admin set up (for example Verizon Connect
              Reveal). If trucks are missing or GPS fails, confirm the connector credentials on the
              Connectors page and that the truck is assigned. Pivot navigation uses the coordinates
              saved on the pivot, not only the customer mailing address.
            </p>

            <h2>Billing and trial</h2>
            <p>
              After we approve a company you get a 15-day trial, then $499 per month for 10 staff
              seats. Extra staff seats are $19 per month. Customer logins are not staff seats. Card
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
