import React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-dashed border-border-strong bg-surface/50 max-w-lg mx-auto",
        className
      )}
    >
      {icon ? (
        <div className="w-12 h-12 rounded-xl bg-subtle border border-border-subtle flex items-center justify-center text-content-secondary mb-4 shadow-subtle">
          {icon}
        </div>
      ) : (
        <div className="w-12 h-12 rounded-xl bg-subtle border border-border-subtle flex items-center justify-center text-accent-amber mb-4 shadow-subtle">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="6" cy="6" r="3" />
            <circle cx="18" cy="8" r="2.5" />
            <circle cx="12" cy="18" r="3" />
            <line x1="6" y1="6" x2="18" y2="8" strokeOpacity="0.4" />
            <line x1="6" y1="6" x2="12" y2="18" strokeOpacity="0.4" />
            <line x1="18" y1="8" x2="12" y2="18" strokeOpacity="0.4" />
          </svg>
        </div>
      )}

      <h3 className="text-base font-semibold text-content-primary tracking-tight mb-1.5">{title}</h3>
      <p className="text-xs sm:text-sm text-content-secondary max-w-sm leading-relaxed mb-6">
        {description}
      </p>

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
};
