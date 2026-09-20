import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { LandingThemeToggle } from "@/components/LandingThemeToggle";

export function LandingHeader() {
  return (
    <header className="landing-header">
      <div className="container landing-nav">
        <BrandLogo imageClassName="landing-logo" />
        <nav className="landing-links" aria-label="Primary">
          <Link href="/#features">Features</Link>
          <Link href="/#product">Product</Link>
          <Link href="/#field">Field</Link>
          <Link href="/#about">About</Link>
          <Link href="/#contact">Contact</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/support">Support</Link>
        </nav>
        <div className="landing-actions">
          <LandingThemeToggle />
          <Link className="landing-btn-secondary" href="/login">
            Log in
          </Link>
          <Link className="landing-btn" href="/#contact">
            Request demo
          </Link>
        </div>
      </div>
    </header>
  );
}

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="container landing-footer-inner">
        <div>AG Desk Pro — irrigation service software for dealers.</div>
        <div>
          <Link href="/privacy">Privacy</Link>
          {" · "}
          <Link href="/support">Support</Link>
          {" · "}
          <a href="mailto:info@agdeskpro.com">info@agdeskpro.com</a>
          {" · "}
          <a href="tel:+12299389000">229-938-9000</a>
        </div>
      </div>
    </footer>
  );
}
