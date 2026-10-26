import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, WarningCircle, Info, XCircle, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type ToastType = "info" | "success" | "warning" | "error";

export interface Toast {
  id: string;
  title: string;
  message?: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ title, message, type = "info", duration = 4000 }: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: Toast = { id, title, message, type, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast Viewport */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((toast) => {
          const type = toast.type || "info";
          return (
            <div
              key={toast.id}
              role="alert"
              className={cn(
                "pointer-events-auto flex items-start gap-3 p-4 rounded-lg border shadow-elevated transition-all duration-200 bg-surface",
                type === "success" && "border-accent-teal/40 text-content-primary",
                type === "warning" && "border-accent-amber/40 text-content-primary",
                type === "error" && "border-accent-danger/40 text-content-primary",
                type === "info" && "border-border-strong text-content-primary"
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {type === "success" && <CheckCircle size={20} className="text-accent-teal" weight="fill" />}
                {type === "warning" && <WarningCircle size={20} className="text-accent-amber" weight="fill" />}
                {type === "error" && <XCircle size={20} className="text-accent-danger" weight="fill" />}
                {type === "info" && <Info size={20} className="text-accent-amber" weight="fill" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-content-primary">{toast.title}</p>
                {toast.message && (
                  <p className="text-xs text-content-secondary mt-0.5 leading-relaxed">{toast.message}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="text-content-muted hover:text-content-primary transition-colors p-1 -mr-1 -mt-1 rounded focus-visible:ring-1"
                aria-label="Dismiss toast"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
