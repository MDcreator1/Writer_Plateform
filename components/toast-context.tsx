"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ConfirmState {
  message: string;
  x: number;
  y: number;
  resolve: (value: boolean) => void;
}

interface ToastContextProps {
  showToast: (message: string, type?: ToastType) => void;
  confirm: (message: string, x: number, y: number) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const confirm = useCallback((message: string, x: number, y: number) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ message, x, y, resolve });
    });
  }, []);

  // Calculate safe coordinates inside viewport
  let confirmStyle: React.CSSProperties = {};
  if (confirmState) {
    if (typeof window !== "undefined") {
      const top = Math.max(10, Math.min(confirmState.y - 130, window.innerHeight - 170));
      const left = Math.max(10, Math.min(confirmState.x - 140, window.innerWidth - 300));
      confirmStyle = {
        top: `${top}px`,
        left: `${left}px`,
        position: "fixed"
      };
    }
  }

  return (
    <ToastContext.Provider value={{ showToast, confirm }}>
      {children}
      
      {/* Toast Notification Container - Bottom Center */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2.5 max-w-sm w-full px-4 pointer-events-none">
        {toasts.map((toast) => {
          let IconComponent = Info;
          let colorClasses = "bg-surface border-border text-ink";

          if (toast.type === "success") {
            IconComponent = CheckCircle;
            colorClasses = "bg-emerald-500/10 border-emerald-500/35 text-emerald-500 dark:text-emerald-400";
          } else if (toast.type === "error") {
            IconComponent = AlertCircle;
            colorClasses = "bg-rose-500/10 border-rose-500/35 text-rose-500 dark:text-rose-400";
          } else if (toast.type === "warning") {
            IconComponent = AlertTriangle;
            colorClasses = "bg-amber-500/10 border-amber-500/35 text-amber-500 dark:text-amber-400";
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-xl border shadow-lg text-sm backdrop-blur transition-all duration-300 transform translate-y-0 animate-in fade-in slide-in-from-bottom-4 ${colorClasses}`}
            >
              <IconComponent className="h-4.5 w-4.5 mt-0.5 shrink-0" />
              <div className="flex-1 font-medium leading-tight">{toast.message}</div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-muted hover:text-ink hover:opacity-100 transition shrink-0 p-0.5"
                title="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Coordinate-based Confirmation Popover */}
      {confirmState && (
        <div
          style={confirmStyle}
          className="fixed bg-surface border border-border p-4 rounded-xl shadow-luxury z-[9999] min-w-[280px] max-w-xs text-left animate-in fade-in zoom-in-95 duration-150 text-ink"
        >
          <p className="text-xs font-semibold leading-relaxed mb-3.5">
            {confirmState.message}
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                confirmState.resolve(false);
                setConfirmState(null);
              }}
              className="px-3 py-1.5 text-[10px] font-bold border border-border text-muted rounded-lg hover:bg-surface-soft transition"
            >
              No, Cancel
            </button>
            <button
              onClick={() => {
                confirmState.resolve(true);
                setConfirmState(null);
              }}
              className="px-3 py-1.5 text-[10px] font-bold bg-danger text-white rounded-lg hover:bg-danger/90 transition"
            >
              Yes, Confirm
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
