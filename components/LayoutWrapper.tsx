"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Navbar } from "./landing/Navbar";
import { Footer } from "./landing/Footer";
import "@/components/landing/landing-theme.css";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAppView =
    pathname.startsWith("/studio") ||
    pathname.startsWith("/hub") ||
    pathname.startsWith("/remix") ||
    pathname.startsWith("/flows") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/admin");

  // Scroll to top on route change, unless hash link
  useEffect(() => {
    if (!window.location.hash) {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  if (isAppView) {
    return <>{children}</>;
  }

  return (
    <div className="landing-theme min-h-screen bg-background text-foreground">
      <Navbar />
      <main style={{ paddingTop: "56px" }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
