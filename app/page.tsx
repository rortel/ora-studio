import "@/components/landing/landing-theme.css";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { SocialProof } from "@/components/landing/SocialProof";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ArenaSection } from "@/components/landing/ArenaSection";
import { StudioSection } from "@/components/landing/StudioSection";
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
        <HowItWorks />
        <ArenaSection />
        <StudioSection />
        <Pricing />
        <FAQ />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
