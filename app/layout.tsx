import type { Metadata } from "next";
import { DM_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const sans = DM_Sans({
  variable: "--font-sans-loaded",
  subsets: ["latin"],
});

const serif = Source_Serif_4({
  variable: "--font-serif-loaded",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AG Service Desk",
  description: "Multi-tenant service tickets for irrigation pivots",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${serif.variable} min-h-full antialiased`}>{children}</body>
    </html>
  );
}
