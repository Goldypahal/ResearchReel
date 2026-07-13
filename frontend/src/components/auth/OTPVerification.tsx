"use client";

import React, { useState, useEffect } from 'react';
import { ShieldCheck, ArrowRight, RefreshCcw, Lock } from 'lucide-react';

interface OTPVerificationProps {
  email: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  isLoading: boolean;
}

export default function OTPVerification({ email, onVerify, onResend, isLoading }: OTPVerificationProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [error, setError] = useState('');

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(prev => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleChange = (element: HTMLInputElement, index: number) => {
    if (isNaN(Number(element.value))) return;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    // Focus next input
    if (element.value !== '' && element.nextSibling) {
      (element.nextSibling as HTMLInputElement).focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && e.currentTarget.previousSibling) {
      (e.currentTarget.previousSibling as HTMLInputElement).focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalOtp = otp.join('');
    if (finalOtp.length < 6) {
      setError('Please enter all 6 digits');
      return;
    }
    onVerify(finalOtp);
  };

  return (
    <div className="w-full animate-in fade-in zoom-in duration-500">
      <div className="flex flex-col items-center text-center mb-10">
        <div className="w-16 h-16 bg-indigo-600/10 rounded-3xl flex items-center justify-center text-indigo-500 mb-6 border border-indigo-500/20 shadow-inner">
           <ShieldCheck size={32} />
        </div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2 italic">Verify Identity</h2>
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed max-w-xs">
          A 6-digit access code was transmitted to <span className="text-indigo-400">{email}</span>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        <div className="flex justify-between gap-2">
          {otp.map((data, index) => (
            <input
              key={index}
              type="text"
              maxLength={1}
              value={data}
              onChange={e => handleChange(e.target, index)}
              onKeyDown={e => handleKeyDown(e, index)}
              className="w-12 h-16 bg-white/5 border border-white/10 rounded-2xl text-center text-xl font-black text-white focus:border-indigo-500 focus:bg-white/10 outline-none transition-all shadow-lg"
              autoFocus={index === 0}
            />
          ))}
        </div>

        {error && (
          <p className="text-rose-500 text-[10px] font-black uppercase tracking-widest text-center animate-pulse">
            {error}
          </p>
        )}

        <div className="space-y-4">
          <button
            type="submit"
            disabled={isLoading || otp.join('').length < 6}
            className="w-full h-16 bg-indigo-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-indigo-600/20 hover:bg-indigo-500 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <RefreshCcw size={20} className="animate-spin" />
            ) : (
              <>
                <span>Secure Access</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>

          <div className="text-center">
            {timer > 0 ? (
              <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">
                Resend protocol in <span className="text-indigo-500">{timer}s</span>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setTimer(60);
                  onResend();
                }}
                className="text-indigo-500 hover:text-indigo-400 text-[10px] font-black uppercase tracking-widest underline underline-offset-4 decoration-2"
              >
                Request New Code
              </button>
            )}
          </div>
        </div>
      </form>

      <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-center gap-2 opacity-30">
        <Lock size={12} className="text-zinc-500" />
        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 italic">ResearchReel Secure Layer</span>
      </div>
    </div>
  );
}
