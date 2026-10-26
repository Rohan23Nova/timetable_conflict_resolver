import React from "react";
import { WarningCircle, ArrowClockwise } from "@phosphor-icons/react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  actionText?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  message,
  onRetry,
  actionText = "Try again",
  className,
}) => {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-xl border border-accent-danger/30 bg-accent-danger-muted/30 max-w-md mx-auto",
        className
      )}
    >
      <div className="w-10 h-10 rounded-full bg-accent-danger/10 border border-accent-danger/20 flex items-center justify-center text-accent-danger mb-3">
        <WarningCircle size={22} weight="bold" />
      </div>

      <h4 className="text-sm font-semibold text-content-primary mb-1">{title}</h4>
      <p className="text-xs text-content-secondary leading-relaxed mb-5 max-w-xs">{message}</p>

      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          leftIcon={<ArrowClockwise size={14} />}
        >
          {actionText}
        </Button>
      )}
    </div>
  );
};
