import Link from "next/link";
import { SALES_EMAIL, SALES_MAILTO, TRIAL_DAYS, landingPlanTiles } from "@/lib/plans";

export function LandingPricing() {
  const tiles = landingPlanTiles();
  return (
    <section className="landing-section" id="pricing">
      <div className="container">
        <span className="landing-eyebrow">Pricing</span>
        <h2>Three versions. Same desk.</h2>
        <p className="landing-muted" style={{ maxWidth: "62ch", marginTop: "0.5rem" }}>
          After we approve your company you get a {TRIAL_DAYS}-day trial. Then pick Starter, Shop, or
          Enterprise. Need more stores or seats than your plan includes? Contact sales — we do not
          auto-unlock overages.
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
                      {feature.optional ? <em> optional add-on</em> : null}
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
        <p className="landing-muted" style={{ marginTop: "1.25rem" }}>
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
