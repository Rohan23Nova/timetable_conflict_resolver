import React, { forwardRef } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helperText, error, leftIcon, rightIcon, id, disabled, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wider text-content-secondary">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-content-muted pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            className={cn(
              "w-full h-9 rounded-md bg-surface text-content-primary border text-sm transition-colors",
              "placeholder:text-content-muted",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-amber focus-visible:border-accent-amber",
              "disabled:opacity-50 disabled:bg-subtle disabled:cursor-not-allowed",
              error
                ? "border-accent-danger focus-visible:ring-accent-danger focus-visible:border-accent-danger"
                : "border-border-subtle hover:border-border-strong",
              leftIcon ? "pl-9" : "pl-3",
              rightIcon ? "pr-9" : "pr-3",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-content-muted flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-accent-danger font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-content-muted">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";

export interface SearchInputProps extends Omit<InputProps, "leftIcon"> {
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ placeholder = "Search...", ...props }, ref) => {
    return (
      <Input
        ref={ref}
        leftIcon={<MagnifyingGlass size={16} />}
        placeholder={placeholder}
        {...props}
      />
    );
  }
);

SearchInput.displayName = "SearchInput";
