import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import LogosStrip from "@/components/LogosStrip";
import PlatformFeatures from "@/components/PlatformFeatures";
import WhyChoose from "@/components/WhyChoose";
import Foundation from "@/components/Foundation";
import Steps from "@/components/Steps";
import Faq from "@/components/Faq";
import Blog from "@/components/Blog";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <LogosStrip />
        <PlatformFeatures />
        <WhyChoose />
        <Foundation />
        <Steps />
        <Faq />
        <Blog />
      </main>
      <Footer />
    </>
  );
}
