import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ProblemSection from "@/components/ProblemSection";
import HowItWorks from "@/components/HowItWorks";
import ScenesSection from "@/components/ScenesSection";
import ComparisonSection from "@/components/ComparisonSection";
import BuildAgentSection from "@/components/BuildAgentSection";
import JobAgentSection from "@/components/JobAgentSection";
import PublicBand from "@/components/PublicBand";
import PricingSection from "@/components/PricingSection";
import FaqSection from "@/components/FaqSection";
import WaitlistSection from "@/components/WaitlistSection";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";

export const metadata: Metadata = {
  title: "LayerFlow — Stop Surprise AI Bills. Cap Spend Per Project.",
  description:
    "The AI spend firewall. One OpenAI-compatible gateway in front of every model — bring your own keys, set hard budget caps, get alerts at 50/80/100%, and trust your usage history.",
  keywords: [
    "AI cost control",
    "LLM budget caps",
    "AI spend",
    "BYOK",
    "OpenAI-compatible gateway",
    "model routing",
    "AI usage history",
    "LLM cost monitoring",
    "AI spend firewall",
    "LayerFlow",
  ],
  authors: [{ name: "Rohit Jadhav", url: "https://layerflow.dev" }],
  creator: "Rohit Jadhav",
  publisher: "LayerFlow",
  metadataBase: new URL("https://layerflow.dev"),
  alternates: {
    canonical: "https://layerflow.dev/",
  },
  openGraph: {
    title: "LayerFlow — Stop Surprise AI Bills. Cap Spend Per Project.",
    description:
      "The AI spend firewall. Your keys, hard budget caps, alerts at 50/80/100%, and usage history you can trust — one OpenAI-compatible gateway in front of every model.",
    url: "https://layerflow.dev/",
    siteName: "LayerFlow",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "LayerFlow",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LayerFlow — Stop surprise AI bills. Cap spend per project in 2 minutes.",
    description:
      "The AI spend firewall. One OpenAI-compatible gateway in front of every model — your keys, hard budget caps, alerts at 50/80/100%.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": "https://layerflow.dev/#app",
    name: "LayerFlow",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "AI Spend Firewall & Gateway",
    operatingSystem: "Web, macOS, Linux, Windows",
    description:
      "Cap AI spend per project in minutes. One OpenAI-compatible gateway, your own keys, hard budget caps, alerts at 50/80/100%, and usage history you can trust.",
    url: "https://layerflow.dev",
    image: "https://layerflow.dev/og.png",
    softwareVersion: "2.0.0",
    featureList: [
      "Hard monthly budget caps with requests hard-blocked at 100%",
      "Bring your own keys — OpenAI, Anthropic, DeepSeek, Groq and more",
      "Email alerts at 50/80/100% of budget",
      "Per-project spend attribution with a single header",
      "Full usage history: model, tokens, project, and exact cost",
      "One OpenAI-compatible API in front of every model",
    ],
    author: { "@id": "https://layerflow.dev/#org" },
    publisher: { "@id": "https://layerflow.dev/#org" },
    isPartOf: { "@id": "https://layerflow.dev/#website" },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://layerflow.dev/#website",
    name: "LayerFlow",
    url: "https://layerflow.dev",
    description:
      "Code with AI in your browser or terminal. The AI workspace that never forgets your work.",
    publisher: { "@id": "https://layerflow.dev/#org" },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://layerflow.dev/#org",
    name: "LayerFlow",
    url: "https://layerflow.dev",
    logo: "https://layerflow.dev/logo.png",
  },
];

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="landing flex min-h-full flex-1 flex-col">
        <ScrollReveal />
        <Navbar />
        <main className="flex flex-1 flex-col bg-bg">
          <Hero />
          <ProblemSection />
          <HowItWorks />
          <ScenesSection />
          <BuildAgentSection />
          <JobAgentSection />
          <ComparisonSection />
          <PublicBand />
          <PricingSection />
          <FaqSection />
          <WaitlistSection />
        </main>
        <Footer />
      </div>
    </>
  );
}