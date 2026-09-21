import type { Metadata } from "next";
import { LandingFooter, LandingHeader } from "@/components/LandingChrome";
import "../landing.css";

export const metadata: Metadata = {
  title: "Privacy Policy | AG Desk Pro",
  description: "How AG Desk Pro collects, uses, and shares information for irrigation dealers and their users.",
};

export default function PrivacyPage() {
  return (
    <div className="landing">
      <a className="landing-skip" href="#content">
        Skip to content
      </a>
      <LandingHeader />
      <main id="content" className="landing-section">
        <div className="container landing-legal">
          <span className="landing-eyebrow">Legal</span>
          <h1>Privacy Policy</h1>
          <p className="landing-muted">Last updated September 20, 2026</p>

          <div className="landing-card landing-legal-body">
            <p>
              AG Desk Pro (“we,” “us”) is irrigation service software operated by David Luvin. This
              policy explains what we collect when you use{" "}
              <a href="https://agdeskpro.com">agdeskpro.com</a>, request a demo, start a company, or
              log in as a dealer, technician, manager, or customer.
            </p>

            <h2>Who this covers</h2>
            <p>
              If you work for an irrigation company that uses AG Desk Pro, that company is
              responsible for the customer, work order, and other records it puts in the desk. We host
              that data so their staff and customers can use the product. If you are visiting the
              public website or requesting a demo, we handle that information ourselves.
            </p>

            <h2>Information we collect</h2>
            <ul>
              <li>
                <strong>Demo and contact requests:</strong> name, company, email, phone, and the
                message you send.
              </li>
              <li>
                <strong>Company signup:</strong> company name, contact name, title, work email,
                phone, address, staff count, notes, and the password you set for the first admin.
              </li>
              <li>
                <strong>Account and work orders:</strong> logins, roles, stores, customers, pivots, work
                orders, notes, parts, labor, photos you upload, and customer-facing status.
              </li>
              <li>
                <strong>Billing:</strong> if we approve your company, Stripe processes card and
                subscription details. We store Stripe customer and subscription IDs, not full card
                numbers.
              </li>
              <li>
                <strong>Email:</strong> we send signup notices, welcome and password emails, and
                billing links through our email provider (Resend).
              </li>
              <li>
                <strong>GPS and maps:</strong> only if a dealer connects Verizon Connect Reveal or
                similar. Then we may show truck locations and geofence/place data the dealer
                already has in that system. In-app maps use satellite imagery (Esri) with place and
                road labels. “Open in Google Maps” sends the pivot coordinates to Google when you
                choose that link.
              </li>
              <li>
                <strong>Cookies:</strong> signed session cookies (<code>ag_session</code> for company
                users and <code>ag_platform</code> for the operator portal) so you stay logged in.
                We do not use advertising cookies on the public site.
              </li>
            </ul>

            <h2>How we use it</h2>
            <ul>
              <li>To run the service desk, demos, trials, and paid subscriptions.</li>
              <li>To email you about signup, approval, billing, and password reset.</li>
              <li>To operate GPS and maps when a dealer turns those connectors on.</li>
              <li>To keep the product secure, debug problems, and meet the law.</li>
            </ul>
            <p>We do not sell your personal information.</p>

            <h2>Who we share it with</h2>
            <ul>
              <li>
                <strong>Inside a company:</strong> staff and customers see what that company’s
                settings allow.
              </li>
              <li>
                <strong>Stripe</strong> for checkout and subscriptions.
              </li>
              <li>
                <strong>Resend</strong> (or SMTP if configured) to send email.
              </li>
              <li>
                <strong>Verizon Connect Reveal</strong> when a dealer connects it, using that
                dealer’s credentials.
              </li>
              <li>Hosting and infrastructure we use to run agdeskpro.com.</li>
              <li>If the law requires it, or to protect the service and our users.</li>
            </ul>

            <h2>How long we keep it</h2>
            <p>
              Demo requests and signup records are kept so we can follow up and operate the
              account. Company data stays while the tenant is active. If a company is deleted by
              the platform operator, we remove that tenant’s records from the production database.
              Billing history may remain at Stripe according to Stripe’s terms.
            </p>

            <h2>Your choices</h2>
            <p>
              You can request a copy, correction, or deletion of personal information we hold by
              emailing us. Customers and technicians should also ask their irrigation dealer, who
              controls most records in the desk. You can log out to end a session cookie.
            </p>

            <h2>Children</h2>
            <p>
              AG Desk Pro is for irrigation businesses. It is not directed at children under 13,
              and we do not knowingly collect their information.
            </p>

            <h2>Security</h2>
            <p>
              Access is limited by login and role. Passwords are stored hashed. Use a unique
              password. No internet service is perfectly secure.
            </p>

            <h2>Changes</h2>
            <p>
              We may update this policy. The date at the top will change. Continued use of the site
              after an update means you accept the revised policy.
            </p>

            <h2>Contact</h2>
            <p>
              Questions:{" "}
              <a href="mailto:david@agdeskpro.com">david@agdeskpro.com</a>
              {" or "}
              <a href="mailto:info@agdeskpro.com">info@agdeskpro.com</a>
              {" · "}
              <a href="tel:+12299389000">229-938-9000</a>
            </p>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
