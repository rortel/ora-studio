"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { PulseIcon } from "./PulseMotif";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isStudio = pathname.startsWith("/studio");
  const isHub = pathname.startsWith("/hub");
  const isRemix = pathname.startsWith("/remix");
  const isFlows = pathname.startsWith("/flows");
  const isProfile = pathname.startsWith("/profile");
  const isApp = isHub || isRemix || isFlows || isProfile;

  const marketingLinks = [
    { label: "How it works", href: "/#how-it-works" },
    { label: "Pricing", href: "/pricing" },
  ];

  const appLinks = [
    { label: "Generate", href: "/hub" },
    { label: "Remix", href: "/remix" },
    { label: "Flows", href: "/flows" },
    { label: "Studio", href: "/studio" },
  ];

  const studioLinks = [
    { label: "Command Center", href: "/studio" },
    { label: "Brand Vault", href: "/studio/vault" },
    { label: "Campaigns", href: "/studio/campaigns" },
    { label: "Analytics", href: "/studio/analytics" },
  ];

  const links = isStudio ? studioLinks : isApp ? appLinks : marketingLinks;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <PulseIcon size={24} />
          <span
            className="text-foreground"
            style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "-0.02em" }}
          >
            ORA
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => {
            const isActive = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`transition-colors ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                style={{ fontSize: "14px", fontWeight: isActive ? 500 : 400 }}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-4">
          {isStudio || isApp ? (
            <>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-ora-signal-light">
                <span className="w-1.5 h-1.5 rounded-full bg-ora-signal" />
                <span className="text-ora-signal" style={{ fontSize: "12px", fontWeight: 500 }}>
                  Acme Corp
                </span>
              </div>
              <Link
                href="/profile"
                className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:opacity-90 transition-opacity"
                style={{ fontSize: "13px", fontWeight: 600 }}
              >
                A
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-muted-foreground hover:text-foreground transition-colors"
                style={{ fontSize: "14px" }}
              >
                Sign in
              </Link>
              <Link
                href="/hub"
                className="text-white px-5 py-2 rounded-full hover:opacity-90 transition-opacity"
                style={{ background: "var(--foreground)", fontSize: "14px", fontWeight: 500 }}
              >
                Start free
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-background border-b border-border px-6 py-4 space-y-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block text-muted-foreground hover:text-foreground"
              style={{ fontSize: "15px" }}
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-border flex gap-3">
            <Link href="/login" className="text-muted-foreground" style={{ fontSize: "15px" }}>Sign in</Link>
            <Link href="/hub" className="bg-primary text-primary-foreground px-5 py-2 rounded-full" style={{ fontSize: "15px" }}>
              Start free
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
