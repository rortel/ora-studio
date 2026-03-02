import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../lib/auth";
import { NotFoundPage } from "../pages/NotFoundPage";

function LoadingScreen() {
  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center">
      <p className="text-muted-foreground" style={{ fontSize: "14px" }}>
        Loading your workspace...
      </p>
    </div>
  );
}

export function RequireAuth() {
  const location = useLocation();
  const { loading, user } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <Outlet />;
}

export function RequireAdmin() {
  const location = useLocation();
  const { loading, user, isAdmin } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (!isAdmin) {
    return <NotFoundPage />;
  }
  return <Outlet />;
}
