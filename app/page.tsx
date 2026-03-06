import { Hero } from "@/components/landing/Hero";
import { ProductShowcase } from "@/components/landing/ProductShowcase";
import { SocialProof } from "@/components/landing/SocialProof";
import { SupportedModels } from "@/components/landing/SupportedModels";
import { ThreeSteps } from "@/components/landing/ThreeSteps";
import { StudioSection } from "@/components/landing/StudioSection";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ } from "@/components/landing/FAQ";
import { CTASection } from "@/components/landing/CTASection";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <ProductShowcase />
      <SocialProof />
      <SupportedModels />
      <ThreeSteps />
      <StudioSection />
      <Pricing />
      <FAQ />
      <CTASection />
    </>
  );
}
