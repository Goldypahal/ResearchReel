"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth, UserRole } from '@/context/AuthContext';
import { SCIENTISTS } from '@/lib/scientists';
import { GraduationCap, BookOpen, Microscope, Eye, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import OTPVerification from '@/components/auth/OTPVerification';
import { trackEvent } from '@/lib/analytics';
import { captureException } from '@/lib/sentry';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [doi, setDoi] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [scientist, setScientist] = useState(SCIENTISTS[0]);
  const [fade, setFade] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const randomScientist = SCIENTISTS[Math.floor(Math.random() * SCIENTISTS.length)];
    setScientist(randomScientist);
    
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setScientist(prev => {
          const currentIndex = SCIENTISTS.indexOf(prev);
          return SCIENTISTS[(currentIndex + 1) % SCIENTISTS.length];
        });
        setFade(true);
      }, 800);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const validateVerification = () => {
    const academicDomains = ['.edu', '.ac.', '.res.in', '.org', '.gov'];
    const isAcademicEmail = academicDomains.some(domain => email.toLowerCase().endsWith(domain) || email.toLowerCase().includes(domain + '.'));
    const hasValidDoi = doi.length > 5 && doi.includes('/');

    if (role === 'scholar' && hasValidDoi) return 'scholar';
    if (role === 'professor' && isAcademicEmail) return 'professor';
    if (role === 'student' && isAcademicEmail) return 'student';
    
    return 'viewer';
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const finalRole = validateVerification();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      
      const response = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          username: username || email.split('@')[0],
          password,
          full_name: fullName,
          role: finalRole,
          doi: finalRole === 'scholar' ? doi : undefined
        })
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setIsVerifying(true);
        trackEvent('register_attempt_success', { email, role: finalRole });
      } else {
        throw new Error(result.message || 'Registration failed. The email or username may already be in use.');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network error occurred. Please try again.';
      console.error(err);
      captureException(err, { email, role, context: 'RegisterPage.handleRegister' });
      setError(errorMsg);
      trackEvent('register_attempt_failed', { email, role, error: errorMsg });
      
      // Fallback for demo if backend is not fully setup
      if (process.env.NODE_ENV === 'development') {
        console.warn("Using development fallback OTP verification due to error:", err instanceof Error ? err.message : String(err));
        setIsVerifying(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerify = async (otp: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });

      const result = await response.json();
      if (response.ok && result.success) {
        login(result.user, result.token);
        trackEvent('signup', { email, userId: result.user.id, role: result.user.role });
        router.push('/home');
      } else {
        throw new Error(result.message || 'Verification failed. Code may have expired.');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Verification code validation failed.';
      console.error(err);
      captureException(err, { email, context: 'RegisterPage.handleOTPVerify' });
      setError(errorMsg);
      trackEvent('register_otp_failed', { email, error: errorMsg });
      
      // Mock success for demo
      if (process.env.NODE_ENV === 'development') {
        login({ id: '1', email, username, role: validateVerification() as UserRole, verification_status: 'verified' }, 'mock-token');
        trackEvent('signup', { email, userId: 'mock-1', role: validateVerification() });
        router.push('/home');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col lg:flex-row overflow-hidden selection:bg-indigo-500/30">
      
      {/* Left Side: Immersive Scientist Image */}
      <div className="relative flex-1 h-[30vh] lg:h-screen transition-opacity duration-1000 overflow-hidden">
        <div className={`absolute inset-0 transition-all duration-1000 transform ${fade ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}>
          <Image 
            src={scientist.image} 
            alt={scientist.name} 
            fill 
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-transparent"></div>
          
          {/* Quote & Name */}
          <div className="absolute bottom-8 left-8 lg:bottom-16 lg:left-16 max-w-2xl animate-in slide-in-from-left duration-1000">
            <div className="mb-6 h-[2px] w-24 bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.8)]"></div>
            <p className="text-2xl lg:text-5xl font-serif italic text-white leading-tight mb-8 drop-shadow-2xl">
              &ldquo;{scientist.quote}&rdquo;
            </p>
            <div className="flex flex-col">
               <span className="text-indigo-400 font-black text-sm lg:text-lg uppercase tracking-[0.4em] mb-2 italic">
                 {scientist.name}
               </span>
               <div className="flex items-center gap-4">
                 <span className="text-zinc-400 text-[10px] lg:text-xs font-black uppercase tracking-[0.2em]">
                   {scientist.field}
                 </span>
                 <span className="text-zinc-800 hidden lg:inline">/ /</span>
                 <code className="text-indigo-500/40 text-[10px] font-mono hidden lg:inline tracking-tighter">
                   {scientist.pseudocode}
                 </code>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Registration Box */}
      <div className="relative z-10 w-full lg:w-[600px] h-fit min-h-screen flex items-center justify-center p-4 lg:p-12 bg-black lg:bg-transparent">
        <div className="absolute inset-0 bg-indigo-500/5 backdrop-blur-3xl lg:hidden"></div>
        
        <div className="w-full max-w-lg relative z-20 bg-white/[0.02] border border-white/5 backdrop-blur-2xl rounded-[48px] p-8 lg:p-14 shadow-2xl">
          
          {isVerifying ? (
            <OTPVerification 
              email={email} 
              onVerify={handleOTPVerify} 
              onResend={async () => {}} 
              isLoading={isLoading} 
            />
          ) : (
            <>
              <div className="mb-10">
            <div className="flex items-center gap-4 mb-8 group cursor-pointer">
               <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:rotate-12 transition-transform">
                  <Microscope size={24} className="text-white" />
               </div>
               <span className="text-2xl font-black text-white tracking-tighter italic">ResearchReel</span>
            </div>
            <h1 className="text-3xl font-black text-white mb-3 tracking-tight uppercase">Join the Collective</h1>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest leading-relaxed">Verified access for students, professors, and scholars.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl text-xs flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-black uppercase tracking-wider mb-0.5 text-[10px]">Registration Alert</p>
                  <p className="opacity-90">{error}</p>
                </div>
              </div>
            )}
            {/* Role Selection */}
            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-[0.2em] font-black text-zinc-500 ml-1">Identify Your Station</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'student', icon: GraduationCap, label: 'Student' },
                  { id: 'professor', icon: BookOpen, label: 'Professor' },
                  { id: 'scholar', icon: Microscope, label: 'Scholar' },
                  { id: 'viewer', icon: Eye, label: 'Viewer' }
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id as UserRole)}
                    className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all ${
                      role === r.id 
                        ? 'bg-indigo-600/10 border-indigo-500 text-indigo-500' 
                        : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'
                    }`}
                  >
                    <r.icon size={20} />
                    <span className="text-[9px] font-black uppercase tracking-widest">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-black text-zinc-500 ml-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="DR. ALAN TURING"
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-5 text-white text-xs font-medium outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-700"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-black text-zinc-500 ml-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="enigma_solver"
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-5 text-white text-xs font-medium outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-700"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-black text-zinc-500 ml-1">
                {role === 'viewer' ? 'Personal Email' : 'Academic Email'}
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  className={`w-full h-12 bg-white/5 border border-white/10 rounded-xl px-5 text-white text-xs font-medium outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-700 ${
                    (role === 'student' || role === 'professor') && email && !email.toLowerCase().includes('.edu') && !email.toLowerCase().includes('.ac.') ? 'border-amber-500/50' : ''
                  }`}
                  required
                />
                {(role === 'student' || role === 'professor') && email && !email.toLowerCase().includes('.edu') && !email.toLowerCase().includes('.ac.') && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-amber-500 text-[9px] font-black uppercase animate-pulse">
                    <AlertCircle size={14} />
                    <span>Non-Academic</span>
                  </div>
                )}
              </div>
            </div>

            {role === 'scholar' && (
              <div className="space-y-2 animate-in slide-in-from-top-4 duration-300">
                <label className="text-[10px] uppercase tracking-widest font-black text-zinc-500 ml-1">Academic DOI</label>
                <div className="relative">
                  <input
                    type="text"
                    value={doi}
                    onChange={(e) => setDoi(e.target.value)}
                    placeholder="10.1000/RESEARCH.2026"
                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-5 text-white text-xs font-medium outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-700"
                    required={role === 'scholar'}
                  />
                  {doi.includes('/') ? (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500">
                      <CheckCircle2 size={16} />
                    </div>
                  ) : (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600">
                      <Microscope size={16} />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-black text-zinc-500 ml-1">Secure Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-5 text-white text-xs font-medium outline-none focus:border-indigo-500/50 transition-all placeholder:text-zinc-700"
                required
              />
            </div>

            <div className="py-2 bg-indigo-500/5 rounded-2xl p-4 border border-indigo-500/10">
              <p className="text-[9px] text-zinc-500 leading-relaxed font-bold uppercase tracking-widest text-center">
                {role === 'viewer' 
                  ? "Note: Viewers cannot comment, upload research, or contact scholars directly."
                  : "By verifying, you gain full access to publication and discussion tools."}
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-16 bg-indigo-600 text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-indigo-600/20 hover:bg-indigo-500 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin text-white" />
                  <span>Activating Station...</span>
                </>
              ) : (
                <>
                  <span>Initialize Profile</span>
                  <CheckCircle2 size={20} />
                </>
              )}
            </button>
          </form>

            <div className="mt-10 text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Enrolled already? <Link href="/auth/login" className="text-white hover:text-indigo-400 transition-colors ml-2 underline underline-offset-4">Sign in to Station</Link>
            </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
