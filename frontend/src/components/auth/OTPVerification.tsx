"use client";

import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, ArrowRight, Loader2, ArrowLeft } from 'lucide-react';

interface OTPVerificationProps {
  email: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  isLoading: boolean;
  /** Server-side error from the last attempt. */
  error?: string | null;
  /** Informational message, e.g. "a new code was sent". */
  notice?: string | null;
  onBack?: () => void;
}

const LENGTH = 6;
const RESEND_SECONDS = 60;

export default function OTPVerification({ email, onVerify, onResend, isLoading, error, notice, onBack }: OTPVerificationProps) {
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''));
  const [timer, setTimer] = useState(RESEND_SECONDS);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  // A failed attempt clears the boxes so the next code can be typed straight in.
  useEffect(() => {
    if (!error) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDigits(Array(LENGTH).fill(''));
    inputs.current[0]?.focus();
  }, [error]);

  const code = digits.join('');

  const fill = (start: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) return;
    const next = [...digits];
    for (let i = 0; i < clean.length && start + i < LENGTH; i++) next[start + i] = clean[i];
    setDigits(next);
    const focusAt = Math.min(start + clean.length, LENGTH - 1);
    inputs.current[focusAt]?.focus();
    if (next.every(Boolean) && !isLoading) onVerify(next.join(''));
  };

  const onChange = (index: number, value: string) => {
    if (value === '') {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }
    fill(index, value.slice(-LENGTH));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) inputs.current[index - 1]?.focus();
    if (e.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < LENGTH - 1) inputs.current[index + 1]?.focus();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length === LENGTH) onVerify(code);
  };

  const resend = async () => {
    setTimer(RESEND_SECONDS);
    await onResend();
  };

  return (
    <div className="w-full animate-in fade-in zoom-in duration-500">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-14 h-14 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-5 border border-indigo-500/20">
          <ShieldCheck size={28} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
        <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">
          We sent a 6-digit code to <span className="text-white font-medium break-all">{email}</span>. It expires in 10 minutes.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-6" noValidate>
        <div className="flex justify-between gap-2" role="group" aria-label="Verification code">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              pattern="[0-9]*"
              maxLength={LENGTH}
              value={d}
              aria-label={`Digit ${i + 1}`}
              onChange={(e) => onChange(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              onPaste={(e) => { e.preventDefault(); fill(i, e.clipboardData.getData('text')); }}
              onFocus={(e) => e.target.select()}
              className="w-12 h-14 bg-white/5 border border-white/10 rounded-xl text-center text-xl font-semibold text-white focus:border-indigo-500 focus:bg-white/10 outline-none transition-all"
              autoFocus={i === 0}
            />
          ))}
        </div>

        {error && <p role="alert" className="text-rose-400 text-sm text-center">{error}</p>}
        {!error && notice && <p className="text-emerald-400 text-sm text-center">{notice}</p>}

        <button
          type="submit"
          disabled={isLoading || code.length < LENGTH}
          className="w-full h-12 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-500 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : <>Verify <ArrowRight size={18} /></>}
        </button>

        <div className="flex items-center justify-between text-sm">
          {onBack ? (
            <button type="button" onClick={onBack} className="text-zinc-400 hover:text-white inline-flex items-center gap-1">
              <ArrowLeft size={14} /> Use a different email
            </button>
          ) : <span />}
          {timer > 0 ? (
            <span className="text-zinc-500">Resend in {timer}s</span>
          ) : (
            <button type="button" onClick={resend} disabled={isLoading} className="text-indigo-400 hover:text-indigo-300 font-medium disabled:opacity-50">
              Resend code
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
