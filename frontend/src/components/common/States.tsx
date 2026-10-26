import type { ReactNode } from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ className, size = 20 }: { className?: string; size?: number }) {
  return <Loader2 size={size} className={cn('animate-spin text-indigo-500', className)} aria-label="Loading" />;
}

export function LoadingBlock({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground', className)}>
      <Spinner size={24} />
      <span>{label}</span>
    </div>
  );
}

export function SkeletonRows({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="h-10 w-10 rounded-full bg-[var(--foreground)]/10" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-[var(--foreground)]/10" />
            <div className="h-3 w-2/3 rounded bg-[var(--foreground)]/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-6 py-10 text-center', className)}>
      <AlertCircle size={22} className="text-red-400" />
      <p className="max-w-md text-sm text-[var(--foreground)]/80">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-4 py-1.5 text-xs font-semibold hover:bg-[var(--foreground)]/5">
          <RefreshCw size={12} /> Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, description, action, className }: {
  icon?: ReactNode; title: string; description?: string; action?: ReactNode; className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--border)] px-6 py-14 text-center', className)}>
      {icon && <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400">{icon}</div>}
      <h3 className="text-base font-bold">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}
