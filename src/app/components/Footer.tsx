import { Link } from "react-router";
import { PulseIcon } from "./PulseMotif";

export function Footer() {
  const cols = [
    {
      title: "Product",
      links: [
        { label: "Hub", href: "/studio" },
        { label: "Chat", href: "/studio" },
        { label: "Studio", href: "/studio" },
        { label: "Brand Vault", href: "/studio/vault" },
        { label: "Agents", href: "/agents" },
        { label: "Pricing", href: "/pricing" },
        { label: "Changelog", href: "/changelog" },
      ],
    },
    {
      title: "Use cases",
      links: [
        { label: "Solo creators", href: "#" },
        { label: "Marketing teams", href: "#" },
        { label: "Agencies", href: "#" },
        { label: "Founders", href: "#" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Documentation", href: "#" },
        { label: "Guides", href: "#" },
        { label: "Support", href: "#" },
        { label: "Status", href: "#" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "#" },
        { label: "Blog", href: "#" },
        { label: "Careers", href: "#" },
        { label: "Privacy", href: "#" },
        { label: "Security", href: "#" },
      ],
    },
  ];

  return (
    <footer className="border-t border-border py-16">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <PulseIcon size={20} />
              <span className="text-foreground" style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "-0.02em" }}>
                ORA
              </span>
            </Link>
            <p className="text-muted-foreground" style={{ fontSize: "13px", lineHeight: 1.55 }}>
              ORA — One account. Every AI. Your brand when you need it.
            </p>
          </div>

          {cols.map((col) => (
            <div key={col.title}>
              <h4
                className="text-foreground mb-3"
                style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}
              >
                {col.title}
              </h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      style={{ fontSize: "13px" }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-border flex items-center justify-between">
          <p className="text-muted-foreground" style={{ fontSize: "12px" }}>
            © 2026 ORA. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
