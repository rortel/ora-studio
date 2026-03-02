import type { ReactNode } from "react";
import { Link, useLocation } from "react-router";

type SettingsShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

const items = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/team", label: "Team" },
];

export function SettingsShell({ title, description, children }: SettingsShellProps) {
  const location = useLocation();

  return (
    <div className="min-h-[calc(100vh-56px)]">
      <div className="max-w-[1200px] mx-auto px-6 py-6">
        <h1 className="text-foreground mb-1" style={{ fontSize: "28px", fontWeight: 500, letterSpacing: "-0.03em" }}>
          {title}
        </h1>
        <p className="text-muted-foreground mb-5" style={{ fontSize: "14px" }}>
          {description}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-4">
          <aside className="bg-card border border-border rounded-xl p-3 h-fit">
            <p className="text-muted-foreground mb-2 px-2" style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em" }}>
              SETTINGS
            </p>
            <div className="space-y-1">
              {items.map((item) => {
                const active = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`block rounded-lg px-2.5 py-2 transition-colors ${
                      active ? "bg-ora-signal-light text-foreground border border-ora-signal/40" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                    style={{ fontSize: "13px", fontWeight: active ? 600 : 500 }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </aside>

          <section className="space-y-4">{children}</section>
        </div>
      </div>
    </div>
  );
}

