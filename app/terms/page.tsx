import type { Metadata } from "next";
import Link from "next/link";
import { LandingFooter, LandingHeader } from "@/components/LandingChrome";
import "../landing.css";

export const metadata: Metadata = {
  title: "Terms and Conditions | Ag Desk Pro",
  description:
    "Terms for using Ag Desk Pro, including the work-order text message program for 10DLC.",
};

export default function TermsPage() {
  return (
    <div className="landing">
      <a className="landing-skip" href="#content">
        Skip to content
      </a>
      <LandingHeader />
      <main id="content" className="landing-section">
        <div className="container landing-legal">
          <span className="landing-eyebrow">Legal</span>
          <h1>Terms and Conditions</h1>
          <p className="landing-muted">Last updated October 15, 2026</p>

          <div className="landing-card landing-legal-body">
            <p>
              These terms cover use of Ag Desk Pro at{" "}
              <a href="https://agdeskpro.com">agdeskpro.com</a>, including the work-order text
              message program. Ag Desk Pro is irrigation service software operated by David Luvin.
              By using the site, requesting a demo, or receiving texts from this program, you agree
              to these terms and the <Link href="/privacy">Privacy Policy</Link>.
            </p>

            <h2>The service</h2>
            <p>
              Ag Desk Pro is a service desk for irrigation dealers. Dealers use it for customers,
              equipment, work orders, and shop staff. Customers may use it to see their own work.
              We may change or suspend features, including texting, when we need to operate, secure,
              or comply with carrier rules.
            </p>

            <h2 id="sms">Text message program</h2>
            <p>
              Program name: <strong>Ag Desk Pro work order alerts</strong>. This is a transactional
              text program. It is not a marketing list.
            </p>
            <p>When a dealer turns texting on, we may send:</p>
            <ul>
              <li>A technician a text when a work order is assigned to them.</li>
              <li>Shop managers a text when a work order is opened or updated.</li>
              <li>Office staff a text when a work order is marked repair done.</li>
              <li>A customer a text when their repair is done.</li>
            </ul>
            <p>
              Messages name the dealer, the work order, and a short status. They may include a link
              to that work order. Message frequency varies with shop activity. You may receive a few
              messages per job, not a fixed daily schedule. Message and data rates may apply.
            </p>

            <h2>How you opt in</h2>
            <p>
              A dealer opts staff in by saving a mobile number on that person’s Ag Desk Pro profile
              for SMS and turning texting on for the company. A dealer opts a customer in by saving
              the customer’s mobile number on the customer record and turning texting on. Providing
              that number for work-order alerts is consent to receive these texts.
            </p>
            <p>
              Consent to receive texts is not a condition of buying irrigation service from a dealer
              and is not required to use Ag Desk Pro.
            </p>

            <h2>How you opt out</h2>
            <p>
              Reply <strong>STOP</strong>, END, CANCEL, UNSUBSCRIBE, or QUIT to any message to
              cancel. After you opt out, we will not send further work-order
              texts to that number. You may opt in again by asking your dealer to save the number
              for SMS, or by replying <strong>START</strong> where the carrier supports it.
            </p>
            <p>
              Reply <strong>HELP</strong> for help, or contact{" "}
              <a href="mailto:david@agdeskpro.com">david@agdeskpro.com</a>
              {" or "}
              <a href="tel:+12293046901">(229) 304-6901</a>.
            </p>

            <h2>Privacy and carriers</h2>
            <p>
              How we handle mobile numbers and text consent is in the{" "}
              <Link href="/privacy">Privacy Policy</Link>. We do not sell mobile numbers. We do not
              share text-message opt-in data with third parties for their marketing.
            </p>
            <p>
              Wireless carriers are not liable for delayed or undelivered messages. Delivery depends
              on your carrier and signal.
            </p>

            <h2>Accounts</h2>
            <p>
              You are responsible for the login your dealer or we issue, and for the customer and
              work-order records your company puts in the desk. Do not share passwords. We may
              suspend access that breaks these terms or puts the service at risk.
            </p>

            <h2>Contact</h2>
            <p>
              Questions about these terms or the text program:{" "}
              <a href="mailto:david@agdeskpro.com">david@agdeskpro.com</a>
              {" or "}
              <a href="mailto:info@agdeskpro.com">info@agdeskpro.com</a>
              {" · "}
              <a href="tel:+12293046901">(229) 304-6901</a>
            </p>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
