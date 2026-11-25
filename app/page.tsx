import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { LandingDemoPlanField } from "@/components/LandingDemoPlanField";
import { LandingFooter, LandingHeader } from "@/components/LandingChrome";
import { landingDemoAction } from "@/lib/landing-actions";
import { LandingPricing } from "@/components/LandingPricing";
import { PLAN } from "@/lib/plan";
import { isPlanId, PLANS, formatPlanCents } from "@/lib/plans";
import "./landing.css";

export const metadata = {
  title: "Ag Desk Pro",
  description:
    "Irrigation work-order desk with Lead Technicians, multi-helper crews, dispatch maps, sales packages, and Platform-tuned plans for dealers.",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string; plan?: string }>;
}) {
  const { demo, plan } = await searchParams;
  const requestedPlan = plan?.toUpperCase();
  const selectedPlan = isPlanId(requestedPlan) ? requestedPlan : "";
  return (
    <div className="landing">
      <a className="landing-skip" href="#content">
        Skip to content
      </a>
      <LandingHeader />

      <main id="content">
        <section className="landing-hero" id="top">
          <div className="container landing-hero-grid">
            <div className="landing-hero-copy">
              <span className="landing-eyebrow">Irrigation-specific service software</span>
              <h1 className="landing-headline">
                Dispatch Lead Technicians, helper crews, and pivot work from one desk.
              </h1>
              <p className="landing-lead">
                Ag Desk Pro is irrigation-specific service software for dealers: digital work orders,
                Lead Technicians with free Staff Technician helpers, sales packages, pivot maps, and
                Platform options that match how each shop actually runs — not another generic help desk.
              </p>
              <div className="landing-cta">
                <a className="landing-btn" href="#contact">
                  Request demo
                </a>
                <a className="landing-btn-secondary" href="#pricing">
                  See pricing
                </a>
              </div>
              <div className="landing-hero-inner">
                <div>
                  <div className="landing-proof">
                    <div className="landing-card">
                      <strong>25+ years</strong>
                      <span>Blake Reid as a pivot irrigation dealer</span>
                    </div>
                    <div className="landing-card">
                      <strong>30+ years</strong>
                      <span>David Luvin in information technology</span>
                    </div>
                    <div className="landing-card">
                      <strong>(229) 304-6901</strong>
                      <span>Direct line for demo requests</span>
                    </div>
                  </div>
                  <div className="landing-card" style={{ marginTop: "1rem" }}>
                    <p className="landing-muted">
                      If your service department is still running on paper work orders and group
                      texts, you are not alone. Most irrigation dealers we talk to are managing
                      calls the same way they did 15 years ago.
                    </p>
                    <p>
                      We built Ag Desk Pro to change that. Simple work-order management, built
                      specifically for irrigation service teams.
                    </p>
                  </div>
                </div>
                <article className="landing-card">
                  <h3>The old way vs. the new way</h3>
                  <div className="landing-compare">
                    <div className="landing-box">
                      <strong>The old way</strong>
                      <ul className="landing-list">
                        <li>Paper work orders</li>
                        <li>Spreadsheets for job tracking</li>
                        <li>Phone calls to locate technicians</li>
                        <li>No clear view of open and completed work</li>
                      </ul>
                    </div>
                    <div className="landing-box landing-box-on">
                      <strong>The new way</strong>
                      <ul className="landing-list">
                        <li>Lead Technicians plus multi-helper crews on every job</li>
                        <li>Dispatch tiles, maps, and sales packages in one desk</li>
                        <li>Navigate to the pivot, not just the front gate</li>
                        <li>Office, field, and customers on the same page</li>
                      </ul>
                    </div>
                  </div>
                </article>
              </div>
            </div>
            <aside className="landing-panel">
              <figure className="landing-shot">
                <img
                  src="/landing/dashboard.png"
                  alt="Ag Desk Pro dashboard with open work orders map and Verizon trucks"
                />
              </figure>
              <div className="landing-mini">
                <figure className="landing-shot">
                  <img src="/landing/reports.png" alt="Work order reports with status and labor totals" />
                </figure>
                <figure className="landing-shot">
                  <img src="/landing/corner-arm.jpg" alt="Center pivot corner arm in a field" />
                </figure>
              </div>
              <div className="landing-card" style={{ marginTop: "1rem" }}>
                <strong>{PLAN.trialDays}-day trial</strong>
                <p className="landing-muted" style={{ margin: "0.45rem 0 0" }}>
                  After we approve your company, you get {PLAN.trialDays} days on us. Then Starter at{" "}
                  {formatPlanCents(PLANS.STARTER.monthlyCents)}/user, Shop at {PLAN.monthlyLabel}/month, or
                  Enterprise.{" "}
                  <a href="#pricing">
                    <strong>See pricing</strong>
                  </a>
                  .
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="landing-section" id="features">
          <div className="container">
            <h2>Newest features for irrigation service desks</h2>
            <p className="landing-muted" style={{ maxWidth: "68ch", marginTop: "0.5rem" }}>
              Built for how dealers actually dispatch crews — Lead Technicians, Staff Technicians,
              sales, maps, and Platform controls that stay flexible after you go live.
            </p>
            <div className="landing-capability-grid" style={{ marginTop: "1.25rem" }}>
              <article className="landing-card">
                <h3>Lead + helper crews</h3>
                <p className="landing-muted">
                  Assign a Lead Technician, then check multiple Staff Technicians as helpers. Each
                  lead includes three Staff Technicians free on every plan.
                </p>
              </article>
              <article className="landing-card">
                <h3>Dispatch that matches the shop</h3>
                <p className="landing-muted">
                  List or tile boards, store filters, schedule times, and in-app maps so office and
                  field see the same open work.
                </p>
              </article>
              <article className="landing-card">
                <h3>Sales packages</h3>
                <p className="landing-muted">
                  Sales people keep package catalogs next to the service desk — the same company,
                  without mixing sales quotes into generic tickets.
                </p>
              </article>
              <article className="landing-card">
                <h3>Pivots, farms, and assets</h3>
                <p className="landing-muted">
                  Work orders link to the machine and the customer, with directions to the pivot
                  point instead of only the front gate.
                </p>
              </article>
              <article className="landing-card">
                <h3>Enterprise field tools</h3>
                <p className="landing-muted">
                  Handwritten scans, office forms, pivot inspections, and QuickBooks Desktop
                  estimates — on for Enterprise, and available via Platform when a Shop needs them.
                </p>
              </article>
              <article className="landing-card">
                <h3>Platform options</h3>
                <p className="landing-muted">
                  We set plan version, billable seats, store caps, GPS provider, SMS setup, and
                  add-on flags per dealership from Platform — see{" "}
                  <a href="#platform-options">
                    <strong>pricing</strong>
                  </a>
                  .
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-section" id="product">
          <div className="container">
            <h2>The live desk</h2>
            <p className="landing-muted" style={{ maxWidth: "62ch", marginTop: "0.5rem" }}>
              Work orders with lead and helper crews, reports, pivot maps, and GPS trucks — the same
              software your team logs into after we approve your company.
            </p>
            <div className="landing-screens" style={{ marginTop: "1.25rem" }}>
              <article className="landing-photo-card">
                <img src="/landing/dashboard.png" alt="Open work orders map on the dashboard" />
                <div className="landing-photo-copy">
                  <strong>Dispatch map</strong>
                  <p>Open work with Lead Technicians and helper crews on the same view.</p>
                </div>
              </article>
              <article className="landing-photo-card">
                <img src="/landing/reports.png" alt="Reports for work orders opened and closed" />
                <div className="landing-photo-copy">
                  <strong>Work order reports</strong>
                  <p>Opened, closed, labor, and status by store for any date range.</p>
                </div>
              </article>
              <article className="landing-photo-card">
                <img src="/landing/fleet-map.png" alt="Fleet GPS map across south Georgia" />
                <div className="landing-photo-copy">
                  <strong>Fleet GPS</strong>
                  <p>Reveal or Verizon via Platform so you are not calling around for a truck.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-section" id="dispatch">
          <div className="container landing-dispatch">
            <article className="landing-card">
              <span className="landing-eyebrow">Built for the field</span>
              <h2>One of the biggest time-wasters in irrigation service? Getting techs to the right pivot.</h2>
              <p className="landing-muted">
                Directions to a customer address only get you so far. Ag Desk Pro lets you import
                customer pivot locations so technicians navigate to the equipment — not just the
                front gate.
              </p>
              <p>
                <strong>Less time lost. More service calls completed per day.</strong>
              </p>
              <figure className="landing-shot" style={{ marginTop: "1rem" }}>
                <img src="/landing/gps-trucks.png" alt="Verizon truck list synced into Ag Desk Pro" />
              </figure>
            </article>
            <figure className="landing-shot landing-shot-tall">
              <img
                src="/landing/directions.jpg"
                alt="Google Maps directions to a pivot coordinate instead of a front gate"
              />
            </figure>
          </div>
        </section>

        <section className="landing-section" id="field">
          <div className="container">
            <h2>Built around real irrigation work</h2>
            <div className="landing-photos" style={{ marginTop: "1.25rem" }}>
              <article className="landing-photo-card">
                <img src="/landing/corner-arm.jpg" alt="Center pivot with corner arm" />
                <div className="landing-photo-copy">
                  <strong>Pivots</strong>
                  <p>Track the machine, not a generic asset record.</p>
                </div>
              </article>
              <article className="landing-photo-card">
                <img src="/landing/pivot-field.jpg" alt="Center pivot across a green field" />
                <div className="landing-photo-copy">
                  <strong>Uptime</strong>
                  <p>Keep watering systems running when the crop cannot wait.</p>
                </div>
              </article>
              <article className="landing-photo-card">
                <img src="/landing/boom-spray.jpg" alt="Irrigation boom spraying a field" />
                <div className="landing-photo-copy">
                  <strong>Service calls</strong>
                  <p>Work orders for the systems your shop already knows.</p>
                </div>
              </article>
              <article className="landing-photo-card">
                <img src="/landing/service-field.jpg" alt="Pivot wheel repair in the field" />
                <div className="landing-photo-copy">
                  <strong>In the dirt</strong>
                  <p>Built for techs who change tires and gearboxes on site.</p>
                </div>
              </article>
              <article className="landing-photo-card">
                <img src="/landing/pipe-yard.jpg" alt="Galvanized irrigation pipe in the yard" />
                <div className="landing-photo-copy">
                  <strong>Parts and pipe</strong>
                  <p>The same shop that stocks spans can run the work order desk.</p>
                </div>
              </article>
              <article className="landing-photo-card">
                <img src="/landing/drip-line.jpg" alt="Drip irrigation line in pine timber" />
                <div className="landing-photo-copy">
                  <strong>More than pivots</strong>
                  <p>Dealers run drip, boom, and specialty systems too.</p>
                </div>
              </article>
              <article className="landing-photo-card">
                <img src="/landing/pivot-point.jpg" alt="Pivot point and control panel" />
                <div className="landing-photo-copy">
                  <strong>The pivot point</strong>
                  <p>Navigate to this, not the front mailbox.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <LandingPricing />

        <section className="landing-section" id="about">
          <div className="container landing-contact">
            <article className="landing-card">
              <span className="landing-eyebrow">About us</span>
              <h2>Created by people who have seen the service gap firsthand.</h2>
              <p className="landing-muted">
                Blake Reid has been a pivot irrigation dealer for over 25 years, and David Luvin
                has more than 30 years in information technology. Together they have seen the need
                for an easy-to-use work order system that is specific to irrigation.
              </p>
              <div className="landing-quote">
                Ag Desk Pro is a practical tool built from experience in the field, not another
                generic software platform trying to fit agriculture after the fact.
              </div>
            </article>
            <article className="landing-card">
              <h3>Designed for faster response</h3>
              <p className="landing-muted">
                Move from paper work orders and scattered updates to a clearer digital process that
                keeps jobs, assets, and communication together.
              </p>
              <ul className="landing-list">
                <li>Faster work orders with Lead Technicians and helper crews.</li>
                <li>Better visibility for managers and dispatch.</li>
                <li>Cleaner handoff between office, sales, and field staff.</li>
                <li>Less time lost driving to the right pivot.</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="landing-section" id="contact">
          <div className="container landing-contact">
            <article className="landing-card">
              <span className="landing-eyebrow">Request a demo</span>
              <h2>Talk with us about your irrigation service workflow.</h2>
              <p className="landing-muted">
                Tell us how you run service today. We will walk you through the desk.
              </p>
              <div className="landing-cta">
                <a className="landing-btn" href="tel:+12293046901">
                  Call (229) 304-6901
                </a>
                <a className="landing-btn-secondary" href="sms:+12293046901?body=DEMO">
                  Text DEMO
                </a>
              </div>
              <ul className="landing-list">
                <li>
                  Email:{" "}
                  <a href="mailto:david@agdeskpro.com">
                    <strong>david@agdeskpro.com</strong>
                  </a>
                </li>
                <li>
                  Phone:{" "}
                  <a href="tel:+12293046901">
                    <strong>(229) 304-6901</strong>
                  </a>
                </li>
                <li>
                  Text <strong>DEMO</strong> to{" "}
                  <a href="sms:+12293046901?body=DEMO">
                    <strong>(229) 304-6901</strong>
                  </a>
                </li>
              </ul>
              <div className="landing-sms-note">
                <p>
                  Request a demo: call or text DEMO to{" "}
                  <a href="sms:+12293046901?body=DEMO">(229) 304-6901</a>.
                </p>
                <p>
                  By texting DEMO to (229) 304-6901, or by agreeing on a call to that number, you
                  agree to receive up to 3 text messages from Ag Desk Pro about your demo request.
                </p>
                <p>Book a demo</p>
                <p>Welcome packet</p>
                <p>Call summary</p>
                <p>
                  Message and data rates may apply. Reply STOP to opt out, HELP for help. Consent is
                  not a condition of purchase. <Link href="/privacy">Privacy Policy</Link>
                  {" · "}
                  <Link href="/terms#sms">SMS Terms</Link>
                </p>
              </div>
              <div className="landing-pills">
                <span className="landing-chip">Irrigation-specific</span>
                <span className="landing-chip">Dealer + field + customer</span>
                <span className="landing-chip">From {formatPlanCents(PLANS.STARTER.monthlyCents)}/user</span>
              </div>
            </article>
            <article className="landing-card">
              {demo === "1" ? (
                <p className="landing-ok">Thanks. We received your demo request and will follow up.</p>
              ) : null}
              <ActionForm action={landingDemoAction} className="landing-form">
                <div className="landing-field">
                  <label htmlFor="name">Name</label>
                  <input id="name" name="name" type="text" required placeholder="Your name" />
                </div>
                <div className="landing-field">
                  <label htmlFor="company">Company</label>
                  <input id="company" name="company" type="text" placeholder="Company name" />
                </div>
                <div className="landing-field">
                  <label htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" required placeholder="you@example.com" />
                </div>
                <div className="landing-field">
                  <label htmlFor="phone">Phone</label>
                  <input id="phone" name="phone" type="tel" placeholder="(229) 304-6901" />
                </div>
                <div className="landing-field">
                  <label htmlFor="zip">ZIP code</label>
                  <input
                    id="zip"
                    name="zip"
                    type="text"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    required
                    pattern="[0-9]{5}"
                    maxLength={5}
                    placeholder="31721"
                  />
                </div>
                <LandingDemoPlanField initialPlan={selectedPlan} />
                <div className="landing-field">
                  <label htmlFor="message">How can we help?</label>
                  <textarea
                    id="message"
                    name="message"
                    placeholder="Tell us about your irrigation service process and what you want to improve."
                  />
                </div>
                <button className="landing-btn" type="submit">
                  Request demo
                </button>
              </ActionForm>
            </article>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
