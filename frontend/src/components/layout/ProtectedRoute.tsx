import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Skeleton } from "@/components/ui/Skeleton";

export interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-10 h-10 rounded-lg bg-surface border border-border-strong flex items-center justify-center shadow-subtle animate-pulse">
          <span className="w-4 h-4 rounded-full bg-accent-amber" />
        </div>
        <p className="text-xs text-content-muted font-mono tracking-wider uppercase">
          Verifying session status...
        </p>
        <div className="w-48 space-y-2">
          <Skeleton variant="text" className="h-2" />
          <Skeleton variant="text" className="h-2 w-3/4 mx-auto" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve original path for redirect after login
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnUrl=${returnUrl}`} state={{ from: location }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
