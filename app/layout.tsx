import type { Metadata } from "next";
import { DM_Sans, Source_Serif_4 } from "next/font/google";
import { ThemeScript } from "@/components/ThemeScript";
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
  title: "AG Desk Pro",
  description: "Irrigation-specific work orders for dealers, technicians, and customers",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${sans.variable} ${serif.variable} min-h-full antialiased`}>{children}</body>
    </html>
  );
}
