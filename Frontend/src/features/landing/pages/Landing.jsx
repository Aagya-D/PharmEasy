import { HeroSection } from "../components/HeroSection";
import { ProblemSection } from "../components/ProblemSection";
import { FeaturesSection } from "../components/FeaturesSection";
import { HowItWorksSection } from "../components/HowItWorksSection";
import { BenefitsSection } from "../components/BenefitsSection";
import { TechStackSection } from "../components/TechStackSection";
import { FinalCTASection } from "../components/FinalCTASection";

function Landing() {
  return (
    <div style={{ backgroundColor: "var(--color-bg-primary)" }}>
      <HeroSection />
      <ProblemSection />
      <FeaturesSection />
      <HowItWorksSection />
      <BenefitsSection />
      <TechStackSection />
      <FinalCTASection />
    </div>
  );
}

export default Landing;

