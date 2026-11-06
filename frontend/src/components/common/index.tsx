"use client";

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { BadgeCheck, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { initials } from '@/lib/format';

export function Avatar({ src, name, size = 40, className }: { src?: string | null; name?: string | null; size?: number; className?: string }) {
  return (
    <div
      className={cn('rounded-full overflow-hidden bg-indigo-500/15 text-indigo-300 font-bold flex items-center justify-center shrink-0 border border-[var(--border)]', className)}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38) }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ? `${name}'s profile photo` : 'Profile photo'} className="w-full h-full object-cover" />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </div>
  );
}

const VERIFIED = ['scholar', 'faculty', 'student'];
export function VerifiedBadge({ status, size = 14 }: { status?: string | null; size?: number }) {
  if (!status || !VERIFIED.includes(status)) return null;
  const label = status === 'student' ? 'Verified student' : 'Verified researcher';
  return <BadgeCheck size={size} className={status === 'student' ? 'text-sky-400 shrink-0' : 'text-indigo-400 shrink-0'} aria-label={label} />;
}

export function UserLink({ username, fullName, status, className }: { username: string; fullName?: string | null; status?: string | null; className?: string }) {
  return (
    <Link href={`/profile/${username}`} className={cn('inline-flex items-center gap-1 font-semibold hover:underline min-w-0', className)}>
      <span className="truncate">{fullName || username}</span>
      <VerifiedBadge status={status} />
    </Link>
  );
}

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 py-10 text-sm text-zinc-500', className)} role="status">
      <Loader2 size={18} className="animate-spin" />
      {label && <span>{label}</span>}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 gap-3">
      {icon && <div className="text-zinc-500">{icon}</div>}
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="text-sm text-zinc-500 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 gap-3" role="alert">
      <AlertCircle size={28} className="text-red-400" />
      <p className="text-sm text-zinc-400 max-w-sm">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 border border-[var(--border)]">
          <RefreshCw size={14} /> Try again
        </button>
      )}
    </div>
  );
}

/** Calls onVisible when scrolled into view — used for infinite lists. */
export function LoadMore({ onVisible, loading, hasMore }: { onVisible: () => void; loading: boolean; hasMore: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasMore || !ref.current) return;
    const el = ref.current;
    const obs = new IntersectionObserver((entries) => { if (entries[0].isIntersecting && !loading) onVisible(); }, { rootMargin: '400px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [onVisible, loading, hasMore]);
  if (!hasMore) return null;
  return <div ref={ref}>{loading && <Spinner className="py-6" />}</div>;
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cn('w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-2xl', wide ? 'max-w-3xl' : 'max-w-md')}>
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <h2 className="font-semibold">{title}</h2>
            <button onClick={onClose} className="text-zinc-500 hover:text-[var(--foreground)] text-xl leading-none" aria-label="Close">×</button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export const inputClass = 'w-full px-3.5 py-2.5 rounded-xl bg-[var(--foreground)]/5 border border-[var(--border)] text-sm text-[var(--foreground)] placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/60 transition-colors';
export const primaryBtn = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors';
export const secondaryBtn = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 border border-[var(--border)] disabled:opacity-50 text-sm font-semibold transition-colors';
export const dangerBtn = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600/90 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors';
