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
    default: "LayerFlow — AI Workspace for Prompts, Models, and Cost",
    template: "%s · LayerFlow",
  },
  description:
    "LayerFlow is the AI workspace for prompts, models, and cost management. Write, version, organize, and compare prompts across GPT, Claude, Gemini, and more — with hard budget limits.",
  keywords: [
    "prompt management",
    "AI workspace",
    "prompt versioning",
    "prompt diff",
    "AI cost tracking",
    "budget limits",
    "multi-model comparison",
    "GPT vs Claude vs Gemini",
    "prompt organization",
    "AI playground",
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
    title: "LayerFlow — AI Workspace for Prompts, Models, and Cost",
    description:
      "Write, version, compare, and control your AI prompts. LayerFlow is the workspace for everyone who works with AI models.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "LayerFlow" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LayerFlow — AI Workspace for Prompts, Models, and Cost",
    description:
      "Write, version, compare, and control your AI prompts. LayerFlow is the workspace for everyone who works with AI models.",
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
      "The AI workspace for prompts, models, and cost management — write, version, compare, and control all in one place.",
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
