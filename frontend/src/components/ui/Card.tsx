import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "subtle" | "outlined";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    const variantStyles = {
      default: "bg-surface border border-border-subtle shadow-card",
      elevated: "bg-elevated border border-border-strong shadow-elevated",
      subtle: "bg-subtle border border-border-subtle",
      outlined: "bg-transparent border border-border-strong",
    };

    return (
      <div
        ref={ref}
        className={cn("rounded-lg overflow-hidden text-content-primary", variantStyles[variant], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { title?: string; description?: string; action?: React.ReactNode }
>(({ className, title, description, action, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("p-5 border-b border-border-subtle flex items-start justify-between gap-4", className)}
      {...props}
    >
      {(title || description) ? (
        <div className="flex flex-col gap-1">
          {title && <h3 className="text-base font-semibold text-content-primary tracking-tight">{title}</h3>}
          {description && <p className="text-xs text-content-secondary leading-relaxed">{description}</p>}
        </div>
      ) : null}
      {children}
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
});
CardHeader.displayName = "CardHeader";

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("p-5", className)} {...props}>
        {children}
      </div>
    );
  }
);
CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("px-5 py-3.5 bg-subtle/50 border-t border-border-subtle flex items-center justify-between gap-4", className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CardFooter.displayName = "CardFooter";
