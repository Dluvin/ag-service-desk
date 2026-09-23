import Link from "next/link";

export function BrandLogo({
  href = "/",
  className = "inline-block",
  imageClassName = "h-12 w-auto max-w-full object-contain object-left",
  onDark = false,
  themeAware = false,
}: {
  href?: string;
  className?: string;
  imageClassName?: string;
  onDark?: boolean;
  themeAware?: boolean;
}) {
  return (
    <Link href={href} className={className} aria-label="AG Desk Pro home">
      {themeAware && !onDark ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand-logo.png" alt="AG Desk Pro" className={`desk-logo-light bg-transparent ${imageClassName}`} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand-logo-on-dark.png" alt="" className={`desk-logo-dark bg-transparent ${imageClassName}`} />
        </>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={onDark ? "/brand-logo-on-dark.png" : "/brand-logo.png"}
          alt="AG Desk Pro"
          className={`bg-transparent ${imageClassName}`}
        />
      )}
    </Link>
  );
}
