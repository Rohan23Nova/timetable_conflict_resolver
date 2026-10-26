import React, { useEffect, useRef } from "react";
import { X } from "@phosphor-icons/react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  variant?: "primary" | "destructive";
  isLoading?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  variant = "primary",
  isLoading = false,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Trap body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={cn(
          "relative w-full max-w-md rounded-xl bg-surface border border-border-strong shadow-elevated overflow-hidden",
          "animate-in zoom-in-95 duration-200"
        )}
      >
        <div className="p-5 border-b border-border-subtle flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h3 id="dialog-title" className="text-base font-semibold text-content-primary tracking-tight">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-content-secondary leading-relaxed">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-content-muted hover:text-content-primary transition-colors p-1 rounded focus-visible:ring-1"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {children && <div className="p-5 text-sm text-content-secondary">{children}</div>}

        <div className="px-5 py-3.5 bg-subtle/40 border-t border-border-subtle flex items-center justify-end gap-2.5">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          {onConfirm && (
            <Button
              variant={variant === "destructive" ? "destructive" : "primary"}
              size="sm"
              onClick={onConfirm}
              isLoading={isLoading}
            >
              {confirmText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
