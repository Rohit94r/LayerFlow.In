import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ProblemSection from "@/components/ProblemSection";
import HowItWorks from "@/components/HowItWorks";
import ScenesSection from "@/components/ScenesSection";
import ComparisonSection from "@/components/ComparisonSection";
import PublicBand from "@/components/PublicBand";
import PricingSection from "@/components/PricingSection";
import FaqSection from "@/components/FaqSection";
import WaitlistSection from "@/components/WaitlistSection";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";

export const metadata: Metadata = {
  title: "LayerFlow — The AI Workspace That Never Forgets",
  description:
    "Code with AI in your browser or terminal, rescue dead AI chats instead of restarting them, run agents with approvals, and control LLM costs with BYOK keys and hard budget limits.",
  keywords: [
    "AI workspace",
    "prompt organization",
    "LLM cost control",
    "rescue AI chat",
    "organize AI prompts",
    "BYOK",
    "model routing",
    "AI prompt library",
    "LLM budget limits",
    "AI coding platform",
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
    title: "LayerFlow — The AI Workspace That Never Forgets",
    description:
      "Code with AI across any model, rescue dead conversations instead of restarting them, run agents with approvals, and control LLM costs with BYOK keys.",
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
    title: "LayerFlow — Code with AI in your browser or terminal",
    description:
      "The AI coding platform. Plain English in, improved prompts out. Browser terminal, multi-agent coding, and AI work rescue.",
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
    applicationSubCategory: "AI Workspace & Coding Platform",
    operatingSystem: "Web, macOS, Linux, Windows",
    description:
      "Code with AI in your browser or terminal, rescue dead AI chats instead of restarting them, organize prompts, and control LLM costs with BYOK keys.",
    url: "https://layerflow.dev",
    image: "https://layerflow.dev/og.png",
    softwareVersion: "2.0.0",
    featureList: [
      "Chat across any AI model: ChatGPT, Claude, Gemini, DeepSeek",
      "Rescue dead conversations with one-click Continue Packs",
      "Run multi-agent coding workflows with approvals",
      "Unified session sync between web dashboard and lf CLI",
      "Hard budget limits and BYOK zero markup",
      "Auto context cutting to prevent token waste",
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