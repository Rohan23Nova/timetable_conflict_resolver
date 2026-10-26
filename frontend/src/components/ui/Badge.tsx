import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "amber" | "teal" | "danger" | "muted" | "outline";
  size?: "sm" | "md";
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = "default",
  size = "md",
  dot = false,
  children,
  ...props
}) => {
  const variantStyles = {
    default: "bg-subtle text-content-secondary border-border-subtle",
    amber: "bg-accent-amber/10 text-accent-amber border-accent-amber/30",
    teal: "bg-accent-teal/10 text-accent-teal border-accent-teal/30",
    danger: "bg-accent-danger/10 text-accent-danger border-accent-danger/30",
    muted: "bg-base text-content-muted border-border-subtle",
    outline: "bg-transparent text-content-secondary border-border-strong",
  };

  const dotStyles = {
    default: "bg-content-muted",
    amber: "bg-accent-amber",
    teal: "bg-accent-teal",
    danger: "bg-accent-danger",
    muted: "bg-content-muted",
    outline: "bg-content-secondary",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px] gap-1",
    md: "px-2.5 py-0.5 text-xs gap-1.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border tracking-wide select-none",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dotStyles[variant])} />}
      {children}
    </span>
  );
};
