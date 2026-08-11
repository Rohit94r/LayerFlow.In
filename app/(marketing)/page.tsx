import type { Metadata } from "next";
import Hero from "@/components/marketing/Hero";
import LogosStrip from "@/components/landing/logos-strip";
import Problem from "@/components/landing/problem";
import HowItWorks from "@/components/landing/how-it-works";
import TerminalSection from "@/components/landing/terminal";
import MagicMoment from "@/components/landing/magic-moment";
import Features from "@/components/landing/features";
import ModelSupport from "@/components/landing/model-support";
import Comparison from "@/components/landing/comparison";
import UseCases from "@/components/landing/use-cases";
import Pricing from "@/components/landing/pricing";
import Roadmap from "@/components/landing/roadmap";
import Testimonials from "@/components/landing/testimonials";
import Faq from "@/components/landing/faq";
import CtaSection from "@/components/landing/cta";

export const metadata: Metadata = {
  title: {
    absolute: "LayerFlow — AI Coding Platform & Prompt Workspace",
  },
  description:
    "Code with AI in your browser or terminal, rescue dead AI chats, organize prompts, and control LLM costs with BYOK. Prompt library, model comparison, and hard budget limits in one AI workspace.",
  keywords: [
    "AI workspace",
    "prompt organization",
    "LLM cost control",
    "organize AI prompts",
    "BYOK",
    "model routing",
    "AI prompt library",
    "LLM budget limits",
    "AI coding platform",
    "LayerFlow",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "LayerFlow — AI Coding Platform & Prompt Workspace",
    description:
      "Code with AI, rescue dead AI chats, organize prompts, and control LLM costs with BYOK keys and hard budgets.",
  },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <LogosStrip />
      <Problem />
      <HowItWorks />
      <TerminalSection />
      <MagicMoment />
      <Features />
      <ModelSupport />
      <Comparison />
      <UseCases />
      <Pricing />
      <Roadmap />
      <Testimonials />
      <Faq />
      <CtaSection />
    </>
  );
}
