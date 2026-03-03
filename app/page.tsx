import "@/components/landing/landing-theme.css";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { SocialProof } from "@/components/landing/SocialProof";
import { ThreeSteps } from "@/components/landing/ThreeSteps";
import { PulseRadar } from "@/components/landing/PulseRadar";
import { ValueProposition } from "@/components/landing/ValueProposition";
import { CommandCenterMock } from "@/components/landing/CommandCenterMock";
import { DecisionMakers } from "@/components/landing/DecisionMakers";
import { Agents } from "@/components/landing/Agents";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ } from "@/components/landing/FAQ";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="landing-theme">
      <Navbar />
      <main style={{ paddingTop: "56px" }}>
        <Hero />
        <SocialProof />
        <ThreeSteps />
        <PulseRadar />
        <ValueProposition />
        <CommandCenterMock />
        <DecisionMakers />
        <Agents />
        <Pricing />
        <FAQ />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
