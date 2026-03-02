import { Outlet, useLocation } from "react-router";
import { useEffect } from "react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

export function RootLayout() {
  const location = useLocation();
  const isWorkspace =
    location.pathname.startsWith("/studio") ||
    location.pathname.startsWith("/dashboard") ||
    location.pathname.startsWith("/hub") ||
    location.pathname.startsWith("/chat") ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/settings");

  // Scroll to top on route change, unless it's a hash link
  useEffect(() => {
    if (!location.hash) {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-14">
        <Outlet />
      </main>
      {!isWorkspace && <Footer />}
    </div>
  );
}
