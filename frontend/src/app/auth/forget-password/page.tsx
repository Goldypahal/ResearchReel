"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SCIENTISTS } from '@/lib/scientists';

export default function ForgetPasswordPage() {
  const [email, setEmail] = useState('');
  const [scientist, setScientist] = useState(SCIENTISTS[0]);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const randomScientist = SCIENTISTS[Math.floor(Math.random() * SCIENTISTS.length)];
    const mountTimeout = setTimeout(() => {
      setScientist(randomScientist);
    }, 0);
    
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

    return () => {
      clearTimeout(mountTimeout);
      clearInterval(interval);
    };
  }, []);

  const handleForgetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Reset link sent to your email.');
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
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
          
          {/* Quote & Name */}
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
          </div>
        </div>
      </div>

      {/* Right Side: Reset Box */}
      <div className="relative z-10 w-full lg:w-[550px] h-[60vh] lg:h-screen flex items-center justify-center p-6 lg:p-12">
        <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl lg:bg-transparent"></div>
        
        <div className="w-full max-w-md relative z-20 bg-white/[0.03] border border-white/10 backdrop-blur-2xl rounded-[40px] p-8 lg:p-12 shadow-2xl">
          
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-8">
               <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🔑</span>
               </div>
               <span className="text-2xl font-black text-white tracking-tighter">ResearchReel</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Lost Access?</h1>
            <p className="text-zinc-400 text-sm">Don&apos;t worry. Even Newton had to search for his notes sometimes.</p>
          </div>

          <form onSubmit={handleForgetPassword} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 ml-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="discovery@university.edu"
                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all font-medium placeholder:text-zinc-600"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full h-14 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all duration-300"
            >
              Send Reset Link
            </button>
          </form>

          <div className="mt-12 text-center text-xs font-medium text-zinc-500">
            Remembered your credentials? <Link href="/auth/login" className="text-white font-bold hover:text-blue-400 transition-colors">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
