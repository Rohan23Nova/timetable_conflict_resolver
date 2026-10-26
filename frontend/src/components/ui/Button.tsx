import React, { forwardRef } from "react";
import { CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-md";

    const variantStyles = {
      primary:
        "bg-accent-amber text-[#111318] hover:bg-accent-amber-hover font-semibold shadow-subtle focus-visible:ring-accent-amber",
      secondary:
        "bg-elevated text-content-primary hover:bg-subtle border border-border-subtle hover:border-border-strong shadow-subtle focus-visible:ring-content-secondary",
      outline:
        "bg-transparent text-content-primary hover:bg-subtle border border-border-strong focus-visible:ring-accent-amber",
      ghost:
        "bg-transparent text-content-secondary hover:text-content-primary hover:bg-subtle focus-visible:ring-accent-amber",
      destructive:
        "bg-accent-danger text-white hover:bg-accent-danger-hover shadow-subtle focus-visible:ring-accent-danger",
    };

    const sizeStyles = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-9 px-4 text-sm gap-2",
      lg: "h-11 px-5 text-base gap-2.5",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <CircleNotch className="animate-spin text-current" size={size === "sm" ? 14 : 18} />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
