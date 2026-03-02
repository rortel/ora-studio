import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import { Bell, ChevronDown, Menu, Wallet, X } from "lucide-react";
import { PulseIcon } from "./PulseMotif";
import { useAuth } from "../lib/auth";
import { hasStudioAccess } from "../lib/studioAccess";

function initialsFromProfile(fullName: string, email: string) {
  const clean = fullName.trim();
  if (clean) {
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }
  const local = (email.split("@")[0] || "").trim();
  return (local.slice(0, 2) || "U").toUpperCase();
}

function isActivePath(pathname: string, href: string) {
  if (href === "/hub") return pathname === "/hub" || pathname.startsWith("/hub/");
  if (href === "/chat") return pathname === "/chat" || pathname.startsWith("/chat/");
  if (href === "/studio") return pathname === "/studio" || pathname.startsWith("/studio/");
  if (href === "/admin") return pathname === "/admin" || pathname.startsWith("/admin/");
  if (href === "/settings/profile") return pathname.startsWith("/settings/");
  return pathname === href;
}

export function Navbar() {
  const location = useLocation();
  const { loading, user, profile, isAdmin, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const inWorkspaceRoute =
    location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/hub") ||
    location.pathname.startsWith("/chat") ||
    location.pathname.startsWith("/studio") ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/settings");
  const showWorkspaceNav = inWorkspaceRoute || Boolean(user);

  const avatarLabel = initialsFromProfile(profile?.fullName || "", profile?.email || user?.email || "");
  const credits = Number.isFinite(profile?.credits) ? profile?.credits : 0;
  const studioLocked = !hasStudioAccess(profile?.subscription);

  const workspaceLinks = useMemo(
    () => [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Hub", href: "/hub" },
      { label: "Chat", href: "/chat" },
      { label: "Studio", href: "/studio", locked: studioLocked },
      ...(isAdmin ? [{ label: "Admin", href: "/admin" }] : []),
    ],
    [studioLocked, isAdmin],
  );

  const marketingLinks = [
    { label: "How it works", href: "/#how-it-works" },
    { label: "Agents", href: "/agents" },
    { label: "Pricing", href: "/pricing" },
  ];

  const navLinks = showWorkspaceNav ? workspaceLinks : marketingLinks;
  const logoTarget = user ? "/dashboard" : "/";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-md border-b border-border">
      <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center justify-between">
        <Link to={logoTarget} className="flex items-center gap-2.5">
          <PulseIcon size={24} />
          <span className="text-foreground" style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "-0.02em" }}>
            ORA Studio
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {navLinks.map((link) => {
            const active = isActivePath(location.pathname, link.href);
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`relative transition-colors ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                style={{ fontSize: "14px", fontWeight: active ? 500 : 450 }}
              >
                {link.label}
                {"locked" in link && link.locked ? " 🔒" : ""}
                {active && <span className="absolute left-0 -bottom-[17px] h-[2px] w-full bg-ora-signal" />}
              </Link>
            );
          })}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {showWorkspaceNav ? (
            <>
              <Link
                to="/pricing"
                className="inline-flex items-center gap-1.5 border border-border rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                style={{ fontSize: "12px", fontWeight: 500 }}
              >
                <Wallet size={13} />
                {credits.toLocaleString()}
              </Link>
              <button
                type="button"
                className="w-8 h-8 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer inline-flex items-center justify-center"
                title="Notifications"
              >
                <Bell size={14} />
              </button>

              {user ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setProfileOpen((prev) => !prev)}
                    className="inline-flex items-center gap-2 border border-border rounded-full px-2.5 py-1 hover:bg-secondary transition-colors cursor-pointer"
                  >
                    <span
                      className="w-6 h-6 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center"
                      style={{ fontSize: "11px", fontWeight: 700 }}
                    >
                      {avatarLabel}
                    </span>
                    <ChevronDown size={13} className="text-muted-foreground" />
                  </button>
                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-[190px] bg-background border border-border rounded-lg shadow-sm p-1.5 z-50">
                      <Link to="/dashboard" className="block rounded-md px-2.5 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary" style={{ fontSize: "12px" }} onClick={() => setProfileOpen(false)}>
                        Dashboard
                      </Link>
                      <Link to="/hub" className="block rounded-md px-2.5 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary" style={{ fontSize: "12px" }} onClick={() => setProfileOpen(false)}>
                        Models
                      </Link>
                      <Link to="/settings/profile" className="block rounded-md px-2.5 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary" style={{ fontSize: "12px" }} onClick={() => setProfileOpen(false)}>
                        Settings
                      </Link>
                      <Link to="/pricing" className="block rounded-md px-2.5 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary" style={{ fontSize: "12px" }} onClick={() => setProfileOpen(false)}>
                        Pricing
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          void signOut();
                        }}
                        className="w-full text-left rounded-md px-2.5 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                        style={{ fontSize: "12px" }}
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                  style={{ fontSize: "13px", fontWeight: 600 }}
                >
                  Sign in
                </Link>
              )}
            </>
          ) : (
            <>
              {!loading && user ? (
                <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors" style={{ fontSize: "14px", fontWeight: 500 }}>
                  Open workspace
                </Link>
              ) : (
                <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors" style={{ fontSize: "14px" }}>
                  Sign in
                </Link>
              )}
              <Link
                to={user ? "/dashboard" : "/login"}
                className="bg-primary text-primary-foreground px-5 py-2 rounded-lg hover:opacity-90 transition-opacity"
                style={{ fontSize: "14px", fontWeight: 500 }}
              >
                Start free
              </Link>
            </>
          )}
        </div>

        <button className="md:hidden text-foreground" onClick={() => setMobileOpen((prev) => !prev)}>
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-background border-b border-border px-6 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              onClick={() => setMobileOpen(false)}
              className="block text-muted-foreground hover:text-foreground"
              style={{ fontSize: "15px", fontWeight: isActivePath(location.pathname, link.href) ? 500 : 400 }}
            >
              {link.label}
              {"locked" in link && link.locked ? " 🔒" : ""}
            </Link>
          ))}
          <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
            {user ? (
              <>
                <Link to="/pricing" onClick={() => setMobileOpen(false)} className="text-muted-foreground" style={{ fontSize: "13px" }}>
                  💎 {credits.toLocaleString()}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    void signOut();
                  }}
                  className="text-muted-foreground cursor-pointer"
                  style={{ fontSize: "13px" }}
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)} className="text-muted-foreground" style={{ fontSize: "14px" }}>
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
