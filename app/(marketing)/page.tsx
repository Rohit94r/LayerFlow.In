import Hero from "@/components/marketing/Hero";
import LogosStrip from "@/components/landing/logos-strip";
import Problem from "@/components/landing/problem";
import HowItWorks from "@/components/landing/how-it-works";
import MagicMoment from "@/components/landing/magic-moment";
import Features from "@/components/landing/features";
import Comparison from "@/components/landing/comparison";
import UseCases from "@/components/landing/use-cases";
import Pricing from "@/components/landing/pricing";
import Roadmap from "@/components/landing/roadmap";
import Testimonials from "@/components/landing/testimonials";
import Faq from "@/components/landing/faq";
import CtaSection from "@/components/landing/cta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <LogosStrip />
      <Problem />
      <HowItWorks />
      <MagicMoment />
      <Features />
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
