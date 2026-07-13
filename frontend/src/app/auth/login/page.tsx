"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { SCIENTISTS } from '@/lib/scientists';
import OTPVerification from '@/components/auth/OTPVerification';
import { trackEvent } from '@/lib/analytics';
import { captureException } from '@/lib/sentry';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    
    // Optional: Cycle scientists every 10 seconds
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();
      if (response.ok && result.success) {
        if (result.token && result.user) {
          login(result.user, result.token);
          trackEvent('login_success', { email, userId: result.user.id });
          router.push('/home');
        } else {
          setIsVerifying(true);
          trackEvent('login_attempt_success', { email });
        }
      } else {
        throw new Error(result.message || 'Invalid credentials or access code.');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network connection failed. Please verify your connection.';
      console.error(err);
      captureException(err, { email, context: 'LoginPage.handleLogin' });
      setError(errorMsg);
      trackEvent('login_attempt_failed', { email, error: errorMsg });
      
      // Fallback for development/sandbox testing
      if (process.env.NODE_ENV === 'development') {
        console.warn("Using development fallback OTP verification");
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
        trackEvent('login_otp_success', { email, userId: result.user.id });
        router.push('/home');
      } else {
        throw new Error(result.message || 'Verification code is invalid or has expired.');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Verification failed. Please retry.';
      console.error(err);
      captureException(err, { email, context: 'LoginPage.handleOTPVerify' });
      setError(errorMsg);
      trackEvent('login_otp_failed', { email, error: errorMsg });
      
      // Sandbox fallback
      if (process.env.NODE_ENV === 'development') {
        login({ id: '1', email, username: email.split('@')[0], verification_status: 'verified', role: 'scholar' }, 'mock-token');
        router.push('/home');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col lg:flex-row overflow-hidden">
      
      {/* Left Side: Immersive Scientist Image */}
      <div className="relative flex-1 h-[40vh] lg:h-screen transition-opacity duration-1000 overflow-hidden">
        <div className={`absolute inset-0 transition-all duration-1000 transform ${fade ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}>
          <Image 
            src={scientist.image} 
            alt={scientist.name} 
            fill 
            className="object-cover"
            priority
          />
          {/* Immersive Overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
          
          {/* Quote & Name (Bottom Left) */}
          <div className="absolute bottom-8 left-8 lg:bottom-16 lg:left-16 max-w-2xl animate-in slide-in-from-left duration-1000">
            <div className="mb-6 h-[2px] w-24 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
            <p className="text-2xl lg:text-5xl font-serif italic text-white leading-tight mb-6 drop-shadow-2xl">
              &ldquo;{scientist.quote}&rdquo;
            </p>
            <div className="flex flex-col">
               <span className="text-blue-400 font-black text-sm lg:text-lg uppercase tracking-[0.3em] mb-1">
                 {scientist.name}
               </span>
               <div className="flex items-center gap-3">
                 <span className="text-zinc-400 text-[10px] lg:text-xs font-bold uppercase tracking-widest">
                   {scientist.field}
                 </span>
                 <span className="text-zinc-600 hidden lg:inline">|</span>
                 <code className="text-blue-500/50 text-[10px] font-mono hidden lg:inline">
                   {scientist.pseudocode}
                 </code>
               </div>
            </div>
            
            {/* Minimalist Code Block (Bottom Left Hint) */}
            <div className="mt-12 hidden lg:block opacity-40 hover:opacity-100 transition-opacity duration-500">
              <pre className="text-[10px] font-mono text-blue-300/70 leading-relaxed">
                {`// ResearchReel Protocol v1.0
const knowledge = await research.discover({
  scientist: "${scientist.name.replace(' ', '_').toLowerCase()}",
  impact: "infinite",
  vision: "beyond_horizons"
});`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Glassmorphic Login Box */}
      <div className="relative z-10 w-full lg:w-[550px] h-[60vh] lg:h-screen flex items-center justify-center p-6 lg:p-12">
        {/* Background Blur for the login side */}
        <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl lg:bg-transparent"></div>
        
        <div className="w-full max-w-md relative z-20 bg-white/[0.03] border border-white/10 backdrop-blur-2xl rounded-[40px] p-8 lg:p-12 shadow-2xl">
          
          {isVerifying ? (
            <OTPVerification 
              email={email} 
              onVerify={handleOTPVerify} 
              onResend={async () => {}} 
              isLoading={isLoading} 
            />
          ) : (
            <>
              {/* Header */}
              <div className="mb-10">
            <div className="flex items-center gap-3 mb-8">
               <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <span className="text-2xl">🧬</span>
               </div>
               <span className="text-2xl font-black text-white tracking-tighter">ResearchReel</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-zinc-400 text-sm">Empowering the next generation of discovery.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-2xl text-xs flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-black uppercase tracking-wider mb-0.5 text-[10px]">Access Blocked</p>
                  <p className="opacity-90">{error}</p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 ml-2">Identifier</label>
              <div className="relative group">
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email or ORCID iD"
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all font-medium placeholder:text-zinc-600"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 ml-2">Security Key</label>
              <div className="relative group">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all font-medium placeholder:text-zinc-600"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between px-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-white/10 bg-white/5 accent-blue-600" />
                <span className="text-[11px] text-zinc-400 group-hover:text-zinc-300 transition-colors">Remember session</span>
              </label>
              <Link href="/auth/forget-password" 
                className="text-blue-500 text-[11px] font-bold hover:text-blue-400 transition-colors"
              >
                Reset access
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-14 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-500 hover:shadow-blue-500/40 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Configuring Terminal...</span>
                </>
              ) : (
                <span>Initialize Session</span>
              )}
            </button>
          </form>

          {/* Social Authentication */}
          <div className="mt-10">
            <div className="flex items-center w-full gap-4 mb-8">
              <div className="h-[1px] flex-1 bg-white/5"></div>
              <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-zinc-600">Secure connect</span>
              <div className="h-[1px] flex-1 bg-white/5"></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button className="h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-[0.98]">
                <Image src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width={18} height={18} />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Google</span>
              </button>
              <button className="h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3 hover:bg-white/10 transition-all active:scale-[0.98]">
                <Image src="https://www.svgrepo.com/show/475661/linkedin-color.svg" alt="LinkedIn" width={18} height={18} />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">LinkedIn</span>
              </button>
            </div>
          </div>

          {/* Register Redirect */}
          <div className="mt-12 text-center text-xs font-medium text-zinc-500">
            New to the frontier? <Link href="/auth/register" className="text-white font-bold hover:text-blue-400 transition-colors">Apply for access</Link>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
