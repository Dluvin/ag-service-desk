import Link from "next/link";
import {
  SALES_EMAIL,
  SALES_MAILTO,
  SMS_SETUP_CENTS,
  TRIAL_DAYS,
  formatPlanCents,
  landingPlanTiles,
  landingPlatformOptions,
} from "@/lib/plans";
import { FREE_HELPERS_PER_LEAD } from "@/lib/staff-seats";

export function LandingPricing() {
  const tiles = landingPlanTiles();
  const platformOptions = landingPlatformOptions();
  return (
    <section className="landing-section" id="pricing">
      <div className="container">
        <span className="landing-eyebrow">Pricing</span>
        <h2>Three versions. Same desk. Platform-tuned per dealer.</h2>
        <p className="landing-muted" style={{ maxWidth: "68ch", marginTop: "0.5rem" }}>
          After we approve your company you get a {TRIAL_DAYS}-day trial. Then pick Starter, Shop, or
          Enterprise. Every plan includes Lead Technicians with {FREE_HELPERS_PER_LEAD} free Staff
          Technicians each. Need more stores or billable seats than your plan includes? Contact sales —
          we do not auto-unlock overages.
        </p>
        <div className="landing-pricing" style={{ marginTop: "1.5rem" }}>
          {tiles.map((tile) => (
            <article
              key={tile.id}
              className={`landing-price-tile${tile.featured ? " landing-price-tile-featured" : ""}`}
            >
              {tile.featured ? <span className="landing-price-badge">Most shops</span> : null}
              <h3>{tile.name}</h3>
              <p className="landing-price-amount">
                {tile.price}
                <span>{tile.priceNote}</span>
              </p>
              <p className="landing-muted">{tile.description}</p>
              <ul className="landing-price-list">
                {tile.features.map((feature) => (
                  <li
                    key={feature.label}
                    className={
                      feature.optional
                        ? "landing-price-optional"
                        : feature.included
                          ? "landing-price-yes"
                          : "landing-price-no"
                    }
                  >
                    <span aria-hidden="true">{feature.optional ? "+" : feature.included ? "✓" : "×"}</span>
                    <span>
                      {feature.label}
                      {feature.optional ? <em> optional / Platform</em> : null}
                      {!feature.included && !feature.optional ? <em> not included</em> : null}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="landing-price-cta">
                <Link className="landing-btn" href={`/?plan=${tile.id}#contact`}>
                  Request a demo
                </Link>
              </div>
            </article>
          ))}
        </div>

        <article className="landing-card" style={{ marginTop: "1.75rem" }} id="platform-options">
          <span className="landing-eyebrow">Platform options</span>
          <h3 style={{ marginTop: "0.35rem" }}>What we can set for your company</h3>
          <p className="landing-muted" style={{ maxWidth: "68ch" }}>
            Ag Desk Pro Platform controls plan version, seat and store caps, GPS, and Enterprise-style
            add-ons per dealership — without waiting on a software release.
          </p>
          <div className="landing-platform-grid" style={{ marginTop: "1.1rem" }}>
            {platformOptions.map((option) => (
              <div key={option.title} className="landing-box">
                <strong>{option.title}</strong>
                <p className="landing-muted" style={{ margin: "0.35rem 0 0" }}>
                  {option.detail}
                </p>
              </div>
            ))}
          </div>
        </article>

        <p className="landing-muted" style={{ marginTop: "1.25rem" }}>
          SMS setup is {formatPlanCents(SMS_SETUP_CENTS)} one time. Ag Desk Pro sets up the dealership’s
          Bird account, the sending number, and 10DLC registration. Bird still bills the wallet and each
          text. Email does not have this fee.
        </p>
        <p className="landing-muted" style={{ marginTop: "0.75rem" }}>
          Overages and other GPS providers:{" "}
          <a href={SALES_MAILTO}>
            <strong>{SALES_EMAIL}</strong>
          </a>
          . No development fee to point Enterprise at another GPS system.
        </p>
      </div>
    </section>
  );
}
