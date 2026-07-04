import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

const SITE_URL = "https://layerflow.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "LayerFlow — Production Infrastructure for AI Applications",
    template: "%s · LayerFlow",
  },
  description:
    "LayerFlow is the production infrastructure platform for AI applications. One integration gives you observability, cost control, caching, reliability, and testing across every AI provider.",
  keywords: [
    "AI gateway",
    "LLM observability",
    "AI cost tracking",
    "AI infrastructure",
    "prompt caching",
    "model routing",
    "AI agent monitoring",
    "OpenAI proxy",
    "Anthropic",
    "Gemini",
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
    title: "LayerFlow — Production Infrastructure for AI Applications",
    description:
      "Full visibility, cost control, reliability, and testing for your AI apps — through one integration.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "LayerFlow" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LayerFlow — Production Infrastructure for AI Applications",
    description:
      "Full visibility, cost control, reliability, and testing for your AI apps — through one integration.",
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
    { media: "(prefers-color-scheme: dark)", color: "#08080a" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
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
      "The production infrastructure platform for AI applications — observability, cost control, caching, reliability, and testing through one integration.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${dmMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('lf-theme');if(t==='light'){document.documentElement.classList.add('light');}}catch(e){}})();`,
          }}
        />
      </head>
      <body>{children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
