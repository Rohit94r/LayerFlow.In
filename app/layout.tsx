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
    default: "LayerFlow — The Workspace for Everything You Do With AI",
    template: "%s · LayerFlow",
  },
  description:
    "Save prompts, compare models, control costs, organize AI projects, and connect every LLM in one place. LayerFlow is the AI workspace for developers and power users.",
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
    title: "LayerFlow — The Workspace for Everything You Do With AI",
    description:
      "Save prompts, compare models, control costs, and connect every LLM in one workspace.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "LayerFlow" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LayerFlow — The Workspace for Everything You Do With AI",
    description:
      "Save prompts, compare models, control costs, and connect every LLM in one workspace.",
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
      "The AI workspace for prompts, models, and cost control — save, compare, organize, and stay under budget.",
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
            __html: `(function(){try{var t=localStorage.getItem('lf-theme');if(t!=='dark'){document.documentElement.classList.add('light');}}catch(e){document.documentElement.classList.add('light');}})();`,
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
