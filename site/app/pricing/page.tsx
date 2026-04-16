import type { Metadata } from "next";
import { PricingTable } from "@/components/pricing-table";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing for CC Commander.",
};

export default function PricingPage() {
  return (
    <>
      <Nav />
      <main className="pt-24">
        <PricingTable />
      </main>
      <Footer />
    </>
  );
}
