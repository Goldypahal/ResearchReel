import { useState, useEffect } from "react";

export interface ToastOptions {
  id?: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success" | "warning";
  duration?: number;
}

type Listener = (toasts: ToastOptions[]) => void;
let memoryToasts: ToastOptions[] = [];
let listeners: Listener[] = [];

export function toast(options: ToastOptions) {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast = { ...options, id };
  memoryToasts = [...memoryToasts, newToast];
  listeners.forEach((listener) => listener(memoryToasts));

  if (options.duration !== 0) {
    setTimeout(() => {
      dismissToast(id);
    }, options.duration || 3000);
  }

  return id;
}

export function dismissToast(id: string) {
  memoryToasts = memoryToasts.filter((t) => t.id !== id);
  listeners.forEach((listener) => listener(memoryToasts));
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastOptions[]>(memoryToasts);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setToasts);
    };
  }, []);

  return { toasts, dismiss: dismissToast };
}
