import { Hero } from "../components/Hero";
import { PulseRadar } from "../components/PulseRadar";
import { SocialProof } from "../components/SocialProof";
import { ThreeSteps } from "../components/ThreeSteps";
import { StudioMock } from "../components/StudioMock";
import { ValueProposition } from "../components/ValueProposition";
import { DecisionMakers } from "../components/DecisionMakers";
import { Agents } from "../components/Agents";
import { Pricing } from "../components/Pricing";
import { FAQ } from "../components/FAQ";
import { CTASection } from "../components/CTASection";

export function LandingPage() {
  return (
    <>
      <Hero />
      <PulseRadar />
      <SocialProof />
      <ThreeSteps />
      <StudioMock />
      <ValueProposition />
      <DecisionMakers />
      <Agents />
      <Pricing />
      <FAQ />
      <CTASection />
    </>
  );
}
