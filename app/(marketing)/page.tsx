import Hero from "@/components/marketing/Hero";
import LogosStrip from "@/components/marketing/LogosStrip";
import Journey from "@/components/marketing/Journey";
import PlatformFeatures from "@/components/marketing/PlatformFeatures";
import WhyChoose from "@/components/marketing/WhyChoose";
import Foundation from "@/components/marketing/Foundation";
import Steps from "@/components/marketing/Steps";
import Faq from "@/components/marketing/Faq";
import Blog from "@/components/marketing/Blog";

export default function HomePage() {
  return (
    <>
      <Hero />
      <LogosStrip />
      <Journey />
      <PlatformFeatures />
      <WhyChoose />
      <Foundation />
      <Steps />
      <Faq />
      <Blog />
    </>
  );
}
