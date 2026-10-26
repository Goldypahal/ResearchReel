import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const inputClass =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--foreground)]/5 px-3.5 py-2.5 text-sm focus:border-indigo-500/60 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60';

export function Field({ label, hint, htmlFor, children, error }: { label: string; hint?: ReactNode; htmlFor?: string; children: ReactNode; error?: string | null }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-xs font-bold">{label}</label>
      {children}
      {error ? <p className="text-xs text-red-400">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Card({ title, description, children, className, danger }: { title: string; description?: ReactNode; children: ReactNode; className?: string; danger?: boolean }) {
  return (
    <section className={cn('space-y-5 rounded-2xl border p-6', danger ? 'border-red-500/30 bg-red-500/[0.03]' : 'border-[var(--border)] bg-[var(--foreground)]/[0.02]', className)}>
      <div>
        <h2 className={cn('text-sm font-bold', danger && 'text-red-400')}>{title}</h2>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function PrimaryButton({ children, busy, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button
      {...props}
      disabled={busy || props.disabled}
      className={cn('inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50', className)}
    >
      {busy && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />}
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={cn('inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-bold hover:bg-[var(--foreground)]/5 disabled:opacity-50', className)}>
      {children}
    </button>
  );
}
