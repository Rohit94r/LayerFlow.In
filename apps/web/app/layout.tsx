import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Toaster } from "@/components/ui/toast";
import "./globals.css";

const SITE_URL = "https://layerflow.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "LayerFlow — Stop Surprise AI Bills. Cap Spend Per Project.",
    template: "%s | LayerFlow",
  },
  description:
    "The AI spend firewall. One OpenAI-compatible gateway in front of every model — bring your own keys, set hard budget caps, get alerts at 50/80/100%, and trust your usage history.",
  keywords: [
    "AI spend",
    "LLM cost control",
    "AI budget caps",
    "BYOK",
    "OpenAI-compatible gateway",
    "AI usage history",
    "LLM cost monitoring",
    "per-project AI spend",
    "AI spend firewall",
    "LayerFlow",
  ],
  authors: [{ name: "Rohit Jadhav" }],
  creator: "Rohit Jadhav",
  applicationName: "LayerFlow",
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "LayerFlow",
    title: "LayerFlow — Stop Surprise AI Bills. Cap Spend Per Project.",
    description:
      "The AI spend firewall. Your keys, hard budget caps, alerts at 50/80/100%, and usage history you can trust — one OpenAI-compatible gateway in front of every model.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "LayerFlow" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LayerFlow — Stop Surprise AI Bills. Cap Spend Per Project.",
    description:
      "The AI spend firewall. Your keys, hard budget caps, alerts at 50/80/100%, and usage history you can trust.",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#08080a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "LayerFlow",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    description:
      "Cap AI spend per project in minutes. One OpenAI-compatible gateway — your own keys, hard budget caps, alerts at 50/80/100%, and usage history you can trust.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/* beforeInteractive: runs before paint to prevent theme FOUC; avoids React 19 raw <script> warning */}
        <Script
          id="theme-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }}
        />
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
        <Script
          id="json-ld"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
