"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { PulseIcon } from "./PulseMotif";

function isActivePath(pathname: string, href: string) {
  if (href === "/#how-it-works") return pathname === "/";
  if (href === "/agents") return pathname === "/agents" || pathname.startsWith("/agents/");
  if (href === "/pricing") return pathname === "/pricing";
  return pathname === href;
}

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const marketingLinks = [
    { label: "How it works", href: "/#how-it-works" },
    { label: "Agents", href: "/agents" },
    { label: "Pricing", href: "/pricing" },
  ];

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md"
      style={{
        background: "rgba(250,250,250,0.85)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <PulseIcon size={24} />
          <span style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--foreground)" }}>
            ORA Studio
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {marketingLinks.map((link) => {
            const active = isActivePath(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="relative transition-colors"
                style={{
                  fontSize: "14px",
                  fontWeight: active ? 500 : 450,
                  color: active ? "var(--foreground)" : "var(--muted-foreground)",
                }}
              >
                {link.label}
                {active && (
                  <span
                    className="absolute left-0 w-full"
                    style={{ bottom: "-17px", height: "2px", background: "var(--ora-signal)" }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="transition-colors"
            style={{ fontSize: "14px", color: "var(--muted-foreground)" }}
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="px-5 py-2 rounded-lg hover:opacity-90 transition-opacity"
            style={{ fontSize: "14px", fontWeight: 500, background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            Start free
          </Link>
        </div>

        <button
          className="md:hidden"
          style={{ color: "var(--foreground)" }}
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {mobileOpen && (
        <div
          className="md:hidden px-6 py-4 space-y-3"
          style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}
        >
          {marketingLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block"
              style={{
                fontSize: "15px",
                fontWeight: isActivePath(pathname, link.href) ? 500 : 400,
                color: "var(--muted-foreground)",
              }}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 flex items-center gap-2" style={{ borderTop: "1px solid var(--border)" }}>
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              style={{ fontSize: "14px", color: "var(--muted-foreground)" }}
            >
              Sign in
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
