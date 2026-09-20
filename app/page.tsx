import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { LandingThemeToggle } from "@/components/LandingThemeToggle";
import { landingDemoAction } from "@/lib/landing-actions";
import { PLAN } from "@/lib/plan";
import "./landing.css";

export const metadata = {
  title: "AG Desk Pro",
  description:
    "Irrigation-specific service ticket software for dealers, field technicians, and office teams.",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const { demo } = await searchParams;
  return (
    <div className="landing">
      <a className="landing-skip" href="#content">
        Skip to content
      </a>
      <header className="landing-header">
        <div className="container landing-nav">
          <Link className="landing-brand" href="/">
            AG Desk Pro
            <small>Service tickets for irrigation dealers</small>
          </Link>
          <nav className="landing-links" aria-label="Primary">
            <a href="#features">Features</a>
            <a href="#product">Product</a>
            <a href="#field">Field</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </nav>
          <div className="landing-actions">
            <LandingThemeToggle />
            <Link className="landing-btn-secondary" href="/login">
              Log in
            </Link>
            <a className="landing-btn" href="#contact">
              Request demo
            </a>
          </div>
        </div>
      </header>

      <main id="content">
        <section className="landing-hero" id="top">
          <div className="container landing-hero-grid">
            <div className="landing-hero-copy">
              <span className="landing-eyebrow">Irrigation-specific service software</span>
              <h1>Keep irrigation service tickets, assets, and technician updates in one place.</h1>
              <p className="landing-lead">
                AG Desk Pro is built for irrigation dealers and service teams that need a simple way
                to manage repair tickets, track pivots, organize departments, and keep farmers
                informed without forcing their workflow into generic help desk software.
              </p>
              <div className="landing-cta">
                <a className="landing-btn" href="#contact">
                  Request demo
                </a>
                <Link className="landing-btn-secondary" href="/signup">
                  Start a company
                </Link>
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
                      <strong>229-938-9000</strong>
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
                      We built AG Desk Pro to change that. Simple work-order management, built
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
                        <li>Digital work orders in seconds</li>
                        <li>Real-time job tracking</li>
                        <li>Dispatch with navigation to the pivot, not just the farm gate</li>
                        <li>Office, techs, and farmers on the same page</li>
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
                  alt="AG Desk Pro dashboard with open tickets map and Verizon trucks"
                />
              </figure>
              <div className="landing-mini">
                <figure className="landing-shot">
                  <img src="/landing/reports.png" alt="Ticket reports with status and labor totals" />
                </figure>
                <figure className="landing-shot">
                  <img src="/landing/corner-arm.jpg" alt="Center pivot corner arm in a field" />
                </figure>
              </div>
              <div className="landing-card" style={{ marginTop: "1rem" }}>
                <strong>{PLAN.trialDays}-day trial</strong>
                <p className="landing-muted" style={{ margin: "0.45rem 0 0" }}>
                  {`After we approve your company, you get ${PLAN.trialDays} days on us. Then $${PLAN.monthlyDollars}/month for ${PLAN.includedSeats} staff seats. Extra seats $${PLAN.extraSeatDollars}/month.`}
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="landing-section" id="features">
          <div className="container">
            <h2>Why this works for irrigation teams</h2>
            <div className="landing-feature" style={{ marginTop: "1.25rem" }}>
              <article className="landing-card">
                <h3>Built around real irrigation service work</h3>
                <p className="landing-muted">
                  Instead of asking your team to adapt to a generic IT tool, AG Desk Pro gives you
                  one workflow for incoming service requests, field troubleshooting, asset history,
                  and internal follow-up.
                </p>
                <ul className="landing-list">
                  <li>Track support tickets from first call to resolution.</li>
                  <li>Link work to pivots, assets, and client records.</li>
                  <li>Keep technicians, office staff, and farmers aligned.</li>
                  <li>Organize users, departments, and reporting in one system.</li>
                </ul>
              </article>
              <aside className="landing-card">
                <h3>Built for your whole service team</h3>
                <ul className="landing-list">
                  <li>Create digital work orders in seconds.</li>
                  <li>Track open, pending, and resolved jobs in one place.</li>
                  <li>Keep office staff and field technicians on the same page.</li>
                  <li>Give customers clearer communication and faster follow-up.</li>
                </ul>
              </aside>
            </div>
          </div>
        </section>

        <section className="landing-section" id="product">
          <div className="container">
            <h2>The live desk</h2>
            <p className="landing-muted" style={{ maxWidth: "62ch", marginTop: "0.5rem" }}>
              Tickets, reports, pivot maps, and GPS trucks — this is the same software your team
              logs into after we approve your company.
            </p>
            <div className="landing-screens" style={{ marginTop: "1.25rem" }}>
              <article className="landing-photo-card">
                <img src="/landing/dashboard.png" alt="Open tickets map on the dashboard" />
                <div className="landing-photo-copy">
                  <strong>Dispatch map</strong>
                  <p>Open tickets at the pivot, with assigned trucks on the same view.</p>
                </div>
              </article>
              <article className="landing-photo-card">
                <img src="/landing/reports.png" alt="Reports for tickets opened and closed" />
                <div className="landing-photo-copy">
                  <strong>Ticket reports</strong>
                  <p>Opened, closed, labor, and status by store for any date range.</p>
                </div>
              </article>
              <article className="landing-photo-card">
                <img src="/landing/fleet-map.png" alt="Fleet GPS map across south Georgia" />
                <div className="landing-photo-copy">
                  <strong>Fleet GPS</strong>
                  <p>See where trucks are so you are not calling around to find a tech.</p>
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
                Directions to a farm address only get you so far. AG Desk Pro lets you import
                customer pivot locations so technicians navigate to the equipment — not just the
                front gate.
              </p>
              <p>
                <strong>Less time lost. More service calls completed per day.</strong>
              </p>
              <figure className="landing-shot" style={{ marginTop: "1rem" }}>
                <img src="/landing/gps-trucks.png" alt="Verizon truck list synced into AG Desk Pro" />
              </figure>
            </article>
            <figure className="landing-shot landing-shot-tall">
              <img
                src="/landing/directions.jpg"
                alt="Google Maps directions to a pivot coordinate instead of a farm gate"
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
                  <p>The same shop that stocks spans can run the ticket desk.</p>
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
                  <p>Navigate to this, not the farm mailbox.</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="landing-section" id="about">
          <div className="container landing-contact">
            <article className="landing-card">
              <span className="landing-eyebrow">About us</span>
              <h2>Created by people who have seen the service gap firsthand.</h2>
              <p className="landing-muted">
                Blake Reid has been a pivot irrigation dealer for over 25 years, and David Luvin
                has more than 30 years in information technology. Together they have seen the need
                for an easy-to-use service ticket system that is specific to irrigation.
              </p>
              <div className="landing-quote">
                AG Desk Pro is a practical tool built from experience in the field, not another
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
                <li>Faster work order creation.</li>
                <li>Better visibility for managers and dispatch.</li>
                <li>Cleaner handoff between office staff and techs.</li>
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
                Tell us how you run service today. We will walk you through the desk, then you can
                start a company for approval and a {PLAN.trialDays}-day trial.
              </p>
              <ul className="landing-list">
                <li>
                  Email:{" "}
                  <a href="mailto:info@agdeskpro.com">
                    <strong>info@agdeskpro.com</strong>
                  </a>
                </li>
                <li>
                  Phone:{" "}
                  <a href="tel:+12299389000">
                    <strong>229-938-9000</strong>
                  </a>
                </li>
                <li>
                  Ready to begin?{" "}
                  <Link href="/signup">
                    <strong>Start a company</strong>
                  </Link>
                </li>
              </ul>
              <div className="landing-pills">
                <span className="landing-chip">Irrigation-specific</span>
                <span className="landing-chip">Dealer + field + farmer</span>
                <span className="landing-chip">${PLAN.monthlyDollars}/mo after trial</span>
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
                  <input id="phone" name="phone" type="tel" placeholder="229-938-9000" />
                </div>
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

      <footer className="landing-footer">
        <div className="container landing-footer-inner">
          <div>AG Desk Pro — irrigation service software for dealers.</div>
          <div>
            <a href="mailto:info@agdeskpro.com">info@agdeskpro.com</a>
            {" · "}
            <a href="tel:+12299389000">229-938-9000</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
