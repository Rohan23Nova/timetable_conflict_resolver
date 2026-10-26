import React, { useEffect, useState, useCallback } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";
import { apiClient } from "@/services/apiClient";
import { HealthResponse } from "@/types/api";
import { Tooltip } from "@/components/ui/Tooltip";

export type ConnectionState = "checking" | "connected" | "disconnected";

export const BackendStatusBadge: React.FC = () => {
  const [state, setState] = useState<ConnectionState>("checking");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  const checkConnection = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await apiClient.getHealth(signal);
      if (data && data.status === "healthy" && data.database === "connected") {
        setHealth(data);
        setState("connected");
        setErrorMessage(null);
      } else {
        setState("disconnected");
        setErrorMessage("Backend reported a degraded or unreachable database state.");
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") return;
      setState("disconnected");
      setErrorMessage(
        "Cannot reach FastAPI server. Ensure the backend is running at http://127.0.0.1:8000 via: .venv/bin/uvicorn backend.app.main:app"
      );
    } finally {
      setIsRetrying(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    checkConnection(controller.signal);
    return () => {
      controller.abort();
    };
  }, [checkConnection]);

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRetrying(true);
    setState("checking");
    checkConnection();
  };

  if (state === "checking") {
    return (
      <div
        data-testid="backend-status-checking"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-subtle border border-border-subtle text-[11px] font-medium text-content-muted"
      >
        <span className="w-2 h-2 rounded-full bg-content-muted animate-pulse" />
        <span>Checking API...</span>
      </div>
    );
  }

  if (state === "connected") {
    return (
      <Tooltip
        content={`API v${health?.version || "0.1.0"} • Database: ${health?.database} • Env: ${health?.environment}`}
        position="bottom"
      >
        <div
          data-testid="backend-status-connected"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-teal-muted/40 border border-accent-teal/30 text-[11px] font-medium text-accent-teal cursor-help transition-colors select-none"
        >
          <span className="w-2 h-2 rounded-full bg-accent-teal" />
          <span className="hidden sm:inline">Backend</span>
          <span>Connected</span>
        </div>
      </Tooltip>
    );
  }

  return (
    <div
      data-testid="backend-status-disconnected"
      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-accent-danger-muted/30 border border-accent-danger/40 text-[11px] font-medium text-accent-danger transition-colors"
    >
      <Tooltip content={errorMessage || "FastAPI connection failed"} position="bottom">
        <div className="flex items-center gap-1.5 cursor-help">
          <span className="w-2 h-2 rounded-full bg-accent-danger animate-pulse" />
          <span>API Offline</span>
        </div>
      </Tooltip>
      <button
        type="button"
        onClick={handleRetry}
        disabled={isRetrying}
        className="p-0.5 hover:text-content-primary rounded transition-colors focus-visible:ring-1"
        aria-label="Retry backend connection"
        title="Retry connection"
      >
        <ArrowClockwise
          size={12}
          className={isRetrying ? "animate-spin text-accent-amber" : "text-content-muted hover:text-content-primary"}
        />
      </button>
    </div>
  );
};
