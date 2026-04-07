import { HeroSection } from "../components/HeroSection";
import { ProblemSection } from "../components/ProblemSection";
import { FeaturesSection } from "../components/FeaturesSection";
import { HowItWorksSection } from "../components/HowItWorksSection";
import { BenefitsSection } from "../components/BenefitsSection";
import { FinalCTASection } from "../components/FinalCTASection";

function Landing() {
  return (
    <div className="landing-shell bg-[#f2fbfd] text-slate-900">
      <HeroSection />
      <ProblemSection />
      <FeaturesSection />
      <HowItWorksSection />
      <BenefitsSection />
      <FinalCTASection />
    </div>
  );
}

export default Landing;

