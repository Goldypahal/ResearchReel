"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import OTPVerification from '@/components/auth/OTPVerification';
import { useAuth } from '@/context/AuthContext';
import LandingPortrait from './LandingPortrait';
import Link from 'next/link';

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [doi, setDoi] = useState('');
  const { login } = useAuth();
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  const validatePassword = (pass: string) => {
    if (pass.length < 8) return 'Password must be at least 8 characters.';
    if (!/[a-z]/.test(pass)) return 'Password must contain a lowercase letter.';
    if (!/[A-Z]/.test(pass)) return 'Password must contain an uppercase letter.';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) return 'Password must contain a special character.';
    return '';
  };

  const readApiError = async (response: Response, fallback: string) => {
    try {
      const result = await response.json();
      return result.message || fallback;
    } catch {
      return fallback;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, 'Unable to sign in with those credentials.'));
      }

      const result = await response.json();
      if (!result.success || !result.user || !result.token) {
        throw new Error(result.message || 'The server did not return a complete login session.');
      }

      login(result.user, result.token);
      router.push('/home');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitRegistration = async () => {
    const response = await fetch(`${apiUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        email,
        username: email.split('@')[0],
        password,
        full_name: fullName.trim(),
        doi: doi.trim() || undefined
      })
    });

    if (!response.ok) {
      throw new Error(await readApiError(response, 'Unable to create that account.'));
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || 'Registration failed.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const passwordValidation = validatePassword(password);
    if (passwordValidation) {
      setFormError(passwordValidation);
      return;
    }

    if (!fullName.trim()) {
      setFormError('Full name is required to create a researcher profile.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitRegistration();
      setIsVerifying(true);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOTPVerify = async (otp: string) => {
    setFormError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, otp })
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, 'Verification failed. Please request a new code.'));
      }

      const result = await response.json();
      if (!result.success || !result.user || !result.token) {
        throw new Error(result.message || 'The server did not return a complete verified session.');
      }

      login(result.user, result.token);
      router.push('/home');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setFormError('');
    setIsSubmitting(true);
    try {
      await submitRegistration();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to resend the verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = Boolean(email && password.length >= 6 && !isSubmitting);

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
              {isVerifying ? (
                <div>
                  <OTPVerification
                    email={email}
                    onVerify={handleOTPVerify}
                    onResend={handleResend}
                    isLoading={isSubmitting}
                  />
                  {formError && (
                    <p className="mt-6 text-red-400/80 text-[11px] font-medium px-2 text-center">
                      {formError}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Scholar Portal v2.0</span>
                    </div>
                    <h2 className="text-4xl font-bold tracking-tight text-white">
                      {isRegistering ? 'Join ResearchReel' : 'Resume Research'}
                    </h2>
                    <p className="text-zinc-500 text-base leading-relaxed">
                      {isRegistering ? 'Create a verified account with email confirmation.' : 'Sign in with your ResearchReel account.'}
                    </p>
                  </div>

                  <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-6">
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

                        <div className="group">
                          <div className="relative">
                            <input
                              type="text"
                              className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 pt-6 pb-2 text-sm focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.05] transition-all peer placeholder-transparent backdrop-blur-md"
                              placeholder="Academic DOI"
                              value={doi}
                              onChange={(e) => setDoi(e.target.value)}
                              id="doi"
                            />
                            <label
                              htmlFor="doi"
                              className="absolute left-5 top-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider transition-all peer-placeholder-shown:text-sm peer-placeholder-shown:top-4 peer-placeholder-shown:font-normal peer-focus:top-2 peer-focus:text-[10px] peer-focus:text-indigo-400"
                            >
                              Academic DOI (Optional)
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
                            setFormError('');
                          }}
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
                      <p className="text-red-400/80 text-[11px] font-medium px-2">{formError}</p>
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
                      {isSubmitting ? 'Working...' : isRegistering ? 'Initialize Account' : 'Authenticate'}
                    </button>
                  </form>

                  <div className="flex flex-col gap-4 pt-4">
                    <button
                      onClick={() => {
                        setIsRegistering(!isRegistering);
                        setFormError('');
                      }}
                      className="w-full py-3.5 rounded-2xl border border-white/5 font-semibold text-xs hover:bg-white/5 transition-all text-zinc-400 hover:text-white"
                    >
                      {isRegistering ? 'Back to Login' : 'Create Researcher Profile'}
                    </button>
                  </div>

                  <div className="flex justify-between items-center pt-8 border-t border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">(c) 2026 RESEARCHREEL</span>
                    <a href="/auth/forget-password" className="text-[10px] font-bold text-zinc-500 hover:text-indigo-400 transition-colors uppercase tracking-widest">Protocol Support</a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full py-6 flex flex-col items-center gap-4 text-xs text-zinc-500">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 max-w-4xl px-4">
          <Link href="/search" className="hover:underline">Research</Link>
          <Link href="/home" className="hover:underline">About</Link>
          <Link href="/explore" className="hover:underline">Explore</Link>
          <Link href="/auth/forget-password" className="hover:underline">Help</Link>
          <a href="http://localhost:5000/api-docs" className="hover:underline">API</a>
          <Link href="/profile" className="hover:underline">Verified</Link>
        </div>
        <div className="flex items-center gap-4">
          <select className="bg-transparent text-xs outline-none cursor-pointer hover:underline" aria-label="Language">
            <option>English</option>
          </select>
          <span>(c) 2026 ResearchReel</span>
        </div>
      </footer>
    </div>
  );
}
