"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { SCIENTISTS } from '@/lib/scientists';

export default function VerifyPage() {
  const [step, setStep] = useState(1);
  const [scientist, setScientist] = useState(SCIENTISTS[0]);
  const [fade, setFade] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const randomScientist = SCIENTISTS[Math.floor(Math.random() * SCIENTISTS.length)];
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const handleOrcidLink = () => {
    window.location.href = "https://orcid.org/oauth/authorize?client_id=APP-ID&response_type=code&scope=/authenticate&redirect_uri=http://localhost:3000/auth/verify";
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(3);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col lg:flex-row overflow-hidden">
      
      {/* Left Side: Immersive Scientist Image */}
      <div className="relative flex-1 hidden lg:block transition-opacity duration-1000 overflow-hidden">
        <div className={`absolute inset-0 transition-all duration-1000 transform ${fade ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}>
          <Image 
            src={scientist.image} 
            alt={scientist.name} 
            fill 
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
          
          {/* Quote & Name */}
          <div className="absolute bottom-16 left-16 max-w-2xl animate-in slide-in-from-left duration-1000">
            <div className="mb-6 h-[2px] w-24 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
            <p className="text-5xl font-serif italic text-white leading-tight mb-6 drop-shadow-2xl">
              &ldquo;{scientist.quote}&rdquo;
            </p>
            <div className="flex flex-col">
               <span className="text-indigo-400 font-black text-lg uppercase tracking-[0.3em] mb-1">
                 {scientist.name}
               </span>
               <div className="flex items-center gap-3">
                 <span className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
                   {scientist.field}
                 </span>
                 <span className="text-zinc-600">|</span>
                 <code className="text-indigo-500/50 text-xs font-mono">
                   {scientist.pseudocode}
                 </code>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Verification Steps */}
      <div className="relative z-10 w-full lg:w-[800px] min-h-screen flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl lg:bg-transparent"></div>
        
        <div className="w-full max-w-2xl relative z-20 bg-white/[0.03] border border-white/10 backdrop-blur-2xl rounded-[40px] p-8 lg:p-12 shadow-2xl transition-all">
          
          {step === 1 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                      <span className="text-xl">🎓</span>
                   </div>
                   <span className="text-xl font-black text-white tracking-tighter">Identity Gate</span>
                </div>
                <h1 className="text-4xl font-black text-white tracking-tight">Academic Verification</h1>
                <p className="text-zinc-400 text-lg">Select your verification tier to unlock platform features.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                  onClick={() => setStep(2)}
                  className="p-8 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-blue-500/50 hover:bg-white/[0.06] transition-all text-left space-y-4 group"
                >
                  <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">📜</div>
                  <h3 className="text-2xl font-bold text-white">Student Tier</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">Verified via Student ID upload. Unlocks blue badge.</p>
                  <div className="pt-2 text-blue-500 font-bold text-xs uppercase tracking-widest">Select Tier →</div>
                </button>

                <button 
                  onClick={handleOrcidLink}
                  className="p-8 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-yellow-500/50 hover:bg-white/[0.06] transition-all text-left space-y-4 group"
                >
                  <div className="w-14 h-14 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">🥇</div>
                  <h3 className="text-2xl font-bold text-white">Scholar Tier</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">Verified via ORCID ID. Unlocks gold badge.</p>
                  <div className="pt-2 text-yellow-500 font-bold text-xs uppercase tracking-widest">Link orcid →</div>
                </button>
              </div>

              <div className="text-center pt-4">
                <button onClick={() => router.push('/')} className="text-xs font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-[0.3em]">Skip for now</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
              <button onClick={() => setStep(1)} className="text-[10px] font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest flex items-center gap-2">
                ← Change Tier
              </button>
              <div className="space-y-2">
                <h1 className="text-3xl font-black text-white tracking-tight">Student ID Upload</h1>
                <p className="text-zinc-400 text-sm">Upload clear photos of your valid student identification card.</p>
              </div>

              <form onSubmit={handleStudentSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="h-48 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center p-6 text-center group hover:border-indigo-500/50 transition-all cursor-pointer">
                    <div className="text-3xl mb-3 grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-100 transition-all">📷</div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Front Side</span>
                  </div>
                  <div className="h-48 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center p-6 text-center group hover:border-indigo-500/50 transition-all cursor-pointer">
                    <div className="text-3xl mb-3 grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-100 transition-all">📸</div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Back Side</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-2">University / Institution</label>
                  <input 
                    type="text" 
                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all"
                    placeholder="e.g. Stanford University"
                    required
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full h-14 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-zinc-200 transition-all shadow-xl"
                >
                  Submit for Approval
                </button>
              </form>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-8 py-10 animate-in zoom-in duration-700">
              <div className="w-24 h-24 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center text-5xl mx-auto shadow-[0_0_50px_rgba(34,197,94,0.15)] text-green-500">
                ✓
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl font-black text-white tracking-tight">Identity Submitted</h1>
                <p className="text-zinc-400 px-6 leading-relaxed">Our faculty moderation team will review your application within 48 hours. You will receive a notification and full access upon approval.</p>
              </div>
              <div className="pt-6">
                <button 
                  onClick={() => router.push('/')}
                  className="px-12 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
