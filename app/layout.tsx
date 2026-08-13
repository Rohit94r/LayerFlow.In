import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme";
import "./globals.css";

const SITE_URL = "https://layerflow.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "LayerFlow — Code with AI in your browser or terminal",
    template: "%s · LayerFlow",
  },
  description:
    "The AI coding platform. Write plain English, click Improve, and run working prompts — or use the browser terminal with multiple coding agents. Rescue dead AI chats, compress context, and control AI costs.",
  keywords: [
    "AI coding platform",
    "browser terminal",
    "AI coding agent",
    "multi-agent",
    "prompt improver",
    "plain english to code",
    "AI context",
    "AI conversation summary",
    "limit rescue",
    "chatgpt limit",
    "claude limit",
    "AI cost comparison",
    "best AI model",
    "AI workspace",
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
    title: "LayerFlow — Code with AI in your browser or terminal",
    description:
      "The AI coding platform. Plain English in, improved prompts out. Browser terminal, multi-agent coding, and AI work rescue with conversation summaries and cost control.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "LayerFlow" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LayerFlow — Code with AI in your browser or terminal",
    description:
      "The AI coding platform. Plain English in, improved prompts out. Browser terminal, multi-agent coding, and AI work rescue with conversation summaries and cost control.",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: {
    icon: "/favicon.svg",
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
      "The AI coding platform — code in your browser or terminal, rescue messy AI chats, and continue in any model with better prompts and lower cost.",
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
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
