import { Hero } from "@/components/hero";
import { ProblemSection } from "@/components/problem-section";
import { SolutionGrid } from "@/components/solution-grid";
import { SocialProof } from "@/components/social-proof";
import { WorkflowDemo } from "@/components/workflow-demo";
import { SkillsShowcase } from "@/components/skills-showcase";
import { PricingTable } from "@/components/pricing-table";
import { InstallSection } from "@/components/install-section";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <ProblemSection />
        <SolutionGrid />
        <SocialProof />
        <WorkflowDemo />
        <SkillsShowcase />
        <PricingTable />
        <InstallSection />
      </main>
      <Footer />
    </>
  );
}
