"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AlertCircle, Microscope } from 'lucide-react';
import { SCIENTISTS } from '@/lib/scientists';

/** Split-screen layout shared by sign in, sign up and password reset. */
export default function AuthShell({ title, subtitle, children, footer }: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    // Random starting portrait is chosen after mount so server and client markup match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndex(Math.floor(Math.random() * SCIENTISTS.length));
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % SCIENTISTS.length);
        setFade(true);
      }, 600);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const scientist = SCIENTISTS[index];

  return (
    <div className="min-h-screen bg-black flex flex-col lg:flex-row">
      <div className="relative h-[28vh] lg:h-screen lg:flex-1 overflow-hidden">
        <div className={`absolute inset-0 transition-all duration-700 ${fade ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}>
          <Image src={scientist.image} alt={scientist.name} fill sizes="(min-width: 1024px) 60vw, 100vw" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 lg:bottom-16 lg:left-16 max-w-2xl">
            <p className="hidden sm:block text-xl lg:text-4xl font-serif italic text-white leading-snug mb-4 drop-shadow-2xl">
              &ldquo;{scientist.quote}&rdquo;
            </p>
            <p className="text-indigo-300 font-semibold text-sm lg:text-base tracking-wide">{scientist.name}</p>
            <p className="text-zinc-400 text-xs">{scientist.field}</p>
          </div>
        </div>
      </div>

      <div className="relative w-full lg:w-[540px] flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <Link href="/" className="inline-flex items-center gap-3 mb-8">
            <span className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Microscope size={20} className="text-white" />
            </span>
            <span className="text-xl font-bold text-white tracking-tight">ResearchReel</span>
          </Link>
          {title && (
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
              {subtitle && <p className="text-zinc-400 text-sm">{subtitle}</p>}
            </div>
          )}
          {children}
          {footer && <div className="mt-8 text-center text-sm text-zinc-400">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-xl text-sm flex items-start gap-2">
      <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

export function Field({ label, hint, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = props.id || props.name;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-zinc-300">{label}</label>
      <input
        id={id}
        {...props}
        className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white text-sm outline-none focus:border-indigo-500/60 focus:bg-white/10 transition-all placeholder:text-zinc-600"
      />
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

export function SubmitButton({ busy, children, disabled }: { busy: boolean; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      className="w-full h-12 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-500 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {busy ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-label="Working" /> : children}
    </button>
  );
}
