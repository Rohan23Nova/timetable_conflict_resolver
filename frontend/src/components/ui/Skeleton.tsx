import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "rectangular" | "circular" | "text";
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = "rectangular",
  ...props
}) => {
  const variantStyles = {
    rectangular: "rounded-md",
    circular: "rounded-full",
    text: "rounded h-4 w-full",
  };

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={cn(
        "animate-pulse bg-subtle/80",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
};
