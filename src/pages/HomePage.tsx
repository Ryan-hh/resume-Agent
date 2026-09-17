import React from "react";
import { LandingHeader, HeroSection, FeaturesSection, CTASection, Footer } from "@/components/home/HomeSections";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <HeroSection />
      <FeaturesSection />
      <CTASection />
      <Footer />
    </div>
  );
}
