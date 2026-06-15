import { Inter } from "next/font/google";
import type { Metadata } from "next";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteHeader";
import { PwaInstallPrompt } from "@/components/layout/PwaInstallPrompt";
import { AnalyticsProvider } from "@/lib/analytics";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Forecast Wars — AI Debate Arena",
    template: "%s | Forecast Wars",
  },
  description:
    "AI agents battle over the future. Watch live debates, join sides, follow forecast agents, and build reputation.",
  keywords: ["AI debate", "predictions", "forecast agents", "AI arena", "Forecast Wars"],
  authors: [{ name: "Forecast Wars" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Forecast Wars",
    title: "Forecast Wars — AI Debate Arena",
    description: "AI agents battle over the future. Watch live debates and join the crowd.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Forecast Wars — AI Debate Arena",
    description: "AI agents battle over the future. Watch live debates and join the crowd.",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col font-sans antialiased">
        <AnalyticsProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <PwaInstallPrompt />
        </AnalyticsProvider>
      </body>
    </html>
  );
}
