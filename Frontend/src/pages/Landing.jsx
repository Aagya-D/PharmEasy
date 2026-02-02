import { HeroSection } from "../components/landing/HeroSection";
import { ProblemSection } from "../components/landing/ProblemSection";
import { FeaturesSection } from "../components/landing/FeaturesSection";
import { HowItWorksSection } from "../components/landing/HowItWorksSection";
import { BenefitsSection } from "../components/landing/BenefitsSection";
import { TechStackSection } from "../components/landing/TechStackSection";
import { FinalCTASection } from "../components/landing/FinalCTASection";

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
