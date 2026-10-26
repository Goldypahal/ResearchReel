"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import OTPVerification from '@/components/auth/OTPVerification';
import { useAuthFlow } from '@/lib/useAuthFlow';
import LandingPortrait from './LandingPortrait';

const USERNAME_RE = /^[A-Za-z0-9_.]{3,30}$/;
const suggestUsername = (email: string) => email.split('@')[0].replace(/[^A-Za-z0-9_.]/g, '_').slice(0, 30);

export default function LandingPage() {
  const flow = useAuthFlow();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!isRegistering) {
      flow.signIn(email.trim(), password);
      return;
    }
    if (!fullName.trim()) return setLocalError('Enter your full name.');
    if (password.length < 8) return setLocalError('Use a password of at least 8 characters.');
    const username = suggestUsername(email.trim());
    if (!USERNAME_RE.test(username)) {
      return setLocalError('Create your account from the full sign-up page to choose a username.');
    }
    flow.signUp({ email: email.trim(), username, password, full_name: fullName.trim() });
  };

  const formError = localError || flow.error;
  const canSubmit = Boolean(email && password && !flow.busy && (!isRegistering || fullName));

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex flex-col overflow-hidden">
      <main className="flex-grow flex flex-col lg:flex-row">
        <LandingPortrait />

        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-[350px] flex flex-col justify-center animate-in fade-in slide-in-from-right-8 duration-1000">
            <div className="lg:hidden flex justify-center mb-12">
              <span
                className="text-5xl font-bold tracking-tight italic"
                style={{ fontFamily: 'var(--font-geist-sans), "Brush Script MT", cursive' }}
              >
                ResearchReel
              </span>
            </div>

            <div className="w-full space-y-10">
              {flow.step === 'verify' ? (
                <div>
                  <OTPVerification
                    email={flow.email}
                    onVerify={flow.verify}
                    onResend={flow.resend}
                    isLoading={flow.busy}
                    error={flow.error}
                    notice={flow.notice}
                    onBack={flow.back}
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <h2 className="text-4xl font-bold tracking-tight text-white">
                      {isRegistering ? 'Join ResearchReel' : 'Welcome back'}
                    </h2>
                    <p className="text-zinc-500 text-base leading-relaxed">
                      {isRegistering ? 'Share research as short reels, read papers with AI, and collaborate.' : 'Sign in to your research feed, library and projects.'}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {isRegistering && (
                      <>
                        <div className="group">
                          <div className="relative">
                            <input
                              type="text"
                              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 pt-6 pb-2 text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all peer placeholder-transparent backdrop-blur-md"
                              placeholder="Full Name"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              id="fullName"
                              required
                            />
                            <label
                              htmlFor="fullName"
                              className="absolute left-5 top-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-4 peer-placeholder-shown:font-normal peer-focus:top-2 peer-focus:text-[10px] peer-focus:text-indigo-400"
                            >
                              Full Name
                            </label>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="group">
                      <div className="relative">
                        <input
                          type="email"
                          className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 pt-6 pb-2 text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all peer placeholder-transparent backdrop-blur-md"
                          placeholder="Email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          id="email"
                          autoComplete="email"
                          required
                        />
                        <label
                          htmlFor="email"
                          className="absolute left-5 top-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-4 peer-placeholder-shown:font-normal peer-focus:top-2 peer-focus:text-[10px] peer-focus:text-indigo-400"
                        >
                          Email
                        </label>
                      </div>
                    </div>

                    <div className="group">
                      <div className="relative">
                        <input
                          type="password"
                          className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 pt-6 pb-2 text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all peer placeholder-transparent backdrop-blur-md"
                          placeholder="Password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setLocalError('');
                          }}
                          autoComplete={isRegistering ? 'new-password' : 'current-password'}
                          id="password"
                          required
                        />
                        <label
                          htmlFor="password"
                          className="absolute left-5 top-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-4 peer-placeholder-shown:font-normal peer-focus:top-2 peer-focus:text-[10px] peer-focus:text-indigo-400"
                        >
                          Password
                        </label>
                      </div>
                    </div>

                    {formError && (
                      <p role="alert" className="text-red-400 text-sm px-2">{formError}</p>
                    )}

                    <button
                      type="submit"
                      className={`w-full py-4 rounded-2xl font-bold text-sm tracking-widest uppercase transition-all duration-300 shadow-xl shadow-indigo-500/10 ${
                        canSubmit
                          ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white hover:scale-[1.02] active:scale-[0.98]'
                          : 'bg-white/5 text-white/20 cursor-not-allowed'
                      }`}
                      disabled={!canSubmit}
                    >
                      {flow.busy ? 'Please wait…' : isRegistering ? 'Create account' : 'Sign in'}
                    </button>
                  </form>

                  <div className="flex flex-col gap-4 pt-4">
                    <button
                      onClick={() => {
                        setIsRegistering(!isRegistering);
                        setLocalError('');
                        flow.setError(null);
                      }}
                      className="w-full py-3.5 rounded-2xl border border-white/5 font-semibold text-xs hover:bg-white/5 transition-all text-zinc-400 hover:text-white"
                    >
                      {isRegistering ? 'I already have an account' : 'Create an account'}
                    </button>
                  </div>

                  <div className="flex justify-between items-center pt-8 border-t border-white/5">
                    <Link href="/auth/register" className="text-xs text-zinc-500 hover:text-indigo-400 transition-colors">Full sign-up</Link>
                    <Link href={`/auth/forget-password${email ? `?email=${encodeURIComponent(email)}` : ''}`} className="text-xs text-zinc-500 hover:text-indigo-400 transition-colors">Forgot password?</Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full py-6 flex flex-col items-center gap-4 text-xs text-zinc-500">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 max-w-4xl px-4">
          <Link href="/explore" className="hover:underline">Explore</Link>
          <Link href="/reels" className="hover:underline">Reels</Link>
          <Link href="/support" className="hover:underline">Help</Link>
          <Link href="/support#terms" className="hover:underline">Terms</Link>
          <Link href="/support#privacy" className="hover:underline">Privacy</Link>
        </div>
        <span>© {new Date().getFullYear()} ResearchReel</span>
      </footer>
    </div>
  );
}
