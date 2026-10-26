import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "@/lib/utils";

export const AppShell: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  return (
    <div className="min-h-screen bg-base text-content-primary flex flex-col">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
      />

      {/* Main Content Area */}
      <div
        className={cn(
          "flex-1 flex flex-col transition-all duration-200",
          isCollapsed ? "lg:pl-16" : "lg:pl-64"
        )}
      >
        {/* Top Header */}
        <Header onOpenMobileSidebar={() => setIsOpenMobile(true)} />

        {/* Dynamic Route Content */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>

        {/* Standard Academic Operations Footer */}
        <footer className="border-t border-border-subtle py-4 px-4 sm:px-6 text-center text-xs text-content-muted">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>SLOTWISE v0.1.0 — University Exam Scheduling Studio (Phase 2 Foundation)</span>
            <span className="font-mono text-[11px]">Phase 1 Engine: Backtracking & Welsh-Powell</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
