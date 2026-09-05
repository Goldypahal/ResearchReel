"use client";

import React from "react";
import { useToasts, ToastOptions } from "./use-toast";
import { cn } from "../../lib/utils";
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from "lucide-react";

export function Toaster() {
  const { toasts, dismiss } = useToasts();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id!)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastOptions; onDismiss: () => void }) {
  const icons = {
    default: <Info className="h-5 w-5 text-indigo-400 shrink-0" />,
    success: <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />,
    destructive: <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />,
  };

  const variants = {
    default: "bg-zinc-900 border-zinc-800 text-zinc-100",
    success: "bg-zinc-900 border-emerald-500/30 text-zinc-100",
    warning: "bg-zinc-900 border-amber-500/30 text-zinc-100",
    destructive: "bg-zinc-900 border-red-500/30 text-zinc-100",
  };

  return (
    <div
      className={cn(
        "glass flex gap-3 p-4 rounded-xl border shadow-lg transform translate-y-0 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5",
        variants[toast.variant || "default"]
      )}
    >
      {icons[toast.variant || "default"]}
      <div className="flex-1">
        {toast.title && <h6 className="font-semibold text-sm text-white leading-none mb-1">{toast.title}</h6>}
        {toast.description && <p className="text-xs text-zinc-400 leading-normal">{toast.description}</p>}
      </div>
      <button onClick={onDismiss} className="text-zinc-500 hover:text-white transition-colors cursor-pointer shrink-0 align-top self-start">
        <X size={16} />
      </button>
    </div>
  );
}

export { ToastItem as Toast };
