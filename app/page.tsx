import { Hero } from "@/components/landing/Hero";
import { SocialProof } from "@/components/landing/SocialProof";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ArenaSection } from "@/components/landing/ArenaSection";
import { StudioSection } from "@/components/landing/StudioSection";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ } from "@/components/landing/FAQ";
import { CTASection } from "@/components/landing/CTASection";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <SocialProof />
      <HowItWorks />
      <ArenaSection />
      <StudioSection />
      <Pricing />
      <FAQ />
      <CTASection />
    </>
  );
}
