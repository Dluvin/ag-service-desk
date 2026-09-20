import Link from "next/link";

export function BrandLogo({
  href = "/",
  className = "inline-block",
  imageClassName = "h-12 w-auto max-w-full object-contain object-left",
  onDark = false,
}: {
  href?: string;
  className?: string;
  imageClassName?: string;
  onDark?: boolean;
}) {
  return (
    <Link href={href} className={className} aria-label="AG Desk Pro home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={onDark ? "/logo-agdeskpro-dark.png" : "/logo-agdeskpro.png"}
        alt="AG Desk Pro"
        className={imageClassName}
      />
    </Link>
  );
}
