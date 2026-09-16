import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/landing/footer";

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}