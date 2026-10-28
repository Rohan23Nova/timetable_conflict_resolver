import React from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  Sun,
  Moon,
  List,
  MagnifyingGlass,
  User,
  ShieldCheck,
  SignOut,
  SignIn,
} from "@phosphor-icons/react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Breadcrumb, BreadcrumbItem } from "@/components/ui/Breadcrumb";
import { Tooltip } from "@/components/ui/Tooltip";
import { BackendStatusBadge } from "./BackendStatusBadge";
import { navItems } from "./Sidebar";

export interface HeaderProps {
  onOpenMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await logout();
    } finally {
      navigate("/login");
    }
  };

  // Find current route title from navItems
  const currentNav = navItems.find((item) =>
    item.href === "/app"
      ? location.pathname === "/app" || location.pathname === "/app/"
      : location.pathname.startsWith(item.href)
  );

  const pageTitle = currentNav?.label || "Overview";

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Studio", href: "/app" },
    ...(location.pathname !== "/app" && location.pathname !== "/app/"
      ? [{ label: pageTitle, isCurrent: true }]
      : [{ label: "Overview", isCurrent: true }]),
  ];

  return (
    <header className="h-16 bg-surface/90 backdrop-blur-xs border-b border-border-subtle sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 select-none">
      {/* Left section: Mobile menu toggle + Breadcrumbs / Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 -ml-1 text-content-secondary hover:text-content-primary hover:bg-subtle rounded-md transition-colors focus-visible:ring-1"
          aria-label="Open mobile navigation"
        >
          <List size={20} />
        </button>

        <div className="flex flex-col">
          <Breadcrumb items={breadcrumbItems} />
          <h1 className="text-sm font-semibold text-content-primary tracking-tight mt-0.5">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Middle section: Global search (intentionally disabled placeholder) */}
      <div className="hidden md:flex items-center max-w-sm w-full mx-4">
        <Tooltip
          content="Global search index will be integrated in Phase 3"
          position="bottom"
          className="text-[11px]"
        >
          <div className="relative w-full">
            <MagnifyingGlass
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted"
            />
            <input
              type="text"
              disabled
              placeholder="Search exams, courses, cohorts... (Phase 3)"
              className="w-full h-8 pl-9 pr-3 rounded-md bg-subtle/50 border border-border-subtle text-xs text-content-muted cursor-not-allowed placeholder:text-content-muted focus:outline-none"
              aria-label="Search examinations (Disabled until Phase 3)"
            />
          </div>
        </Tooltip>
      </div>

      {/* Right section: Backend status, Theme toggle, and Development user profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Backend API Connection Indicator */}
        <BackendStatusBadge />

        {/* Theme Toggle Button */}
        <Tooltip
          content={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          position="bottom"
        >
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-md text-content-secondary hover:text-content-primary hover:bg-subtle border border-border-subtle transition-colors focus-visible:ring-1"
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? (
              <Sun size={18} className="text-accent-amber" weight="bold" />
            ) : (
              <Moon size={18} className="text-content-primary" weight="bold" />
            )}
          </button>
        </Tooltip>

        {/* User Menu Display */}
        {user ? (
          <div className="flex items-center gap-2 pl-2 border-l border-border-subtle">
            <div className="w-8 h-8 rounded-full bg-accent-amber/15 border border-accent-amber/30 flex items-center justify-center text-accent-amber font-semibold text-xs">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : <User size={16} />}
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-semibold text-content-primary flex items-center gap-1">
                {user.fullName}
                {user.role === "admin" && <ShieldCheck size={12} className="text-accent-teal" />}
              </span>
              <span className="text-[10px] text-content-muted capitalize">
                {user.role} {user.institution ? `• ${user.institution}` : ""}
              </span>
            </div>
            <Tooltip content="Sign out of current session" position="bottom" className="text-[11px]">
              <button
                type="button"
                onClick={handleSignOut}
                className="p-1.5 ml-1 rounded-md text-content-muted hover:text-accent-rose hover:bg-subtle transition-colors focus-visible:ring-1"
                aria-label="Sign out"
              >
                <SignOut size={16} />
              </button>
            </Tooltip>
          </div>
        ) : (
          <Tooltip
            content="Development Mode: Data operations are local. Click Sign In to authenticate."
            position="bottom"
            className="text-[11px]"
          >
            <div className="flex items-center gap-2 pl-2 border-l border-border-subtle">
              <Link
                to="/login"
                className="flex items-center gap-2 text-content-secondary hover:text-content-primary transition-colors"
                aria-label="Sign in"
              >
                <div className="w-8 h-8 rounded-full bg-subtle border border-border-strong flex items-center justify-center text-content-muted">
                  <User size={16} />
                </div>
                <div className="hidden xl:flex flex-col text-left">
                  <span className="text-xs font-semibold text-content-primary flex items-center gap-1">
                    Sign In
                    <SignIn size={12} className="text-accent-amber" />
                  </span>
                  <span className="text-[10px] text-content-muted">Development Mode</span>
                </div>
              </Link>
            </div>
          </Tooltip>
        )}
      </div>
    </header>
  );
};
