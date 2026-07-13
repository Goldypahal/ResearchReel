"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

const scientists = [
  { 
    name: 'Albert Einstein', 
    quote: 'Imagination is more important than knowledge.', 
    code: 'R_uv - 1/2 g_uv R = 8πG T_uv', 
    img: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Einstein_1921_by_F_Schmutzer_-_restoration.jpg' 
  },
  { 
    name: 'Marie Curie', 
    quote: 'Nothing in life is to be feared, it is only to be understood.', 
    code: 'Po (84) & Ra (88)', 
    img: 'https://upload.wikimedia.org/wikipedia/commons/c/c8/Marie_Curie_1903.jpg' 
  },
  { 
    name: 'Nikola Tesla', 
    quote: 'The present is theirs; the future, for which I really worked, is mine.', 
    code: 'Magnetic Flux Density (B)', 
    img: 'https://upload.wikimedia.org/wikipedia/commons/7/79/Tesla_circa_1890.jpeg' 
  },
  { 
    name: 'Alan Turing', 
    quote: 'We can only see a short distance ahead, but we can see plenty there that needs to be done.', 
    code: 'while(true) { if(halt) break; }', 
    img: 'https://upload.wikimedia.org/wikipedia/commons/a/a1/Alan_Turing_Aged_16.jpg' 
  },
  { 
    name: 'Isaac Newton', 
    quote: 'If I have seen further it is by standing on the shoulders of Giants.', 
    code: 'd/dx (sin x) = cos x', 
    img: 'https://upload.wikimedia.org/wikipedia/commons/3/39/GodfreyKneller-IsaacNewton-1689.jpg' 
  },
  {
    name: 'Ada Lovelace',
    quote: 'The Analytical Engine weaves algebraic patterns just as the Jacquard loom weaves flowers.',
    code: 'Bernoulli Numbers Algorithm',
    img: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Ada_Lovelace_portrait.jpg'
  },
  {
    name: 'Charles Darwin',
    quote: 'It is not the strongest of the species that survives, but the most responsive to change.',
    code: 'Natural Selection',
    img: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/Charles_Darwin_seated_crop.jpg'
  },
  {
    name: 'Galileo Galilei',
    quote: 'E pur si muove (And yet it moves).',
    code: 'v = v0 + at',
    img: 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Justus_Sustermans_-_Portrait_of_Galileo_Galilei%2C_1636.jpg'
  },
  {
    name: 'Max Planck',
    quote: 'Science cannot solve the ultimate mystery of nature.',
    code: 'h = 6.626 × 10^-34 Js',
    img: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/Max_Planck_%281858-1947%29.jpg'
  },
  {
    name: 'Stephen Hawking',
    quote: 'However difficult life may seem, there is always something you can do and succeed at.',
    code: 'S = (k A c^3) / (4 G h)',
    img: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Stephen_Hawking.StarChild.jpg'
  },
  {
    name: 'Rosalind Franklin',
    quote: 'Science and everyday life cannot and should not be separated.',
    code: 'Photo 51',
    img: 'https://upload.wikimedia.org/wikipedia/commons/9/94/Rosalind_Franklin.jpg'
  },
  {
    name: 'Niels Bohr',
    quote: 'An expert is a person who has made all the mistakes which can be made in a very narrow field.',
    code: 'L = n * (h / 2π)',
    img: 'https://upload.wikimedia.org/wikipedia/commons/6/6d/Niels_Bohr.jpg'
  },
  {
    name: 'Richard Feynman',
    quote: 'What I cannot create, I do not understand.',
    code: 'Path Integral',
    img: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Richard_Feynman_Nobel.jpg'
  },
  {
    name: 'Carl Sagan',
    quote: 'Somewhere, something incredible is waiting to be known.',
    code: 'Voyager Golden Record',
    img: 'https://upload.wikimedia.org/wikipedia/commons/b/be/Carl_Sagan_Planetary_Society_cropped.png'
  },
  {
    name: 'Thomas Edison',
    quote: 'Genius is one percent inspiration and ninety-nine percent perspiration.',
    code: 'Direct Current (DC)',
    img: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Thomas_Edison2.jpg'
  }
];

export default function LandingPortrait() {
  const [scholar, setScholar] = useState<typeof scientists[number] | null>(null);

  useEffect(() => {
    // Select one scientist randomly and stick with it until refresh
    const randomIndex = Math.floor(Math.random() * scientists.length);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScholar(scientists[randomIndex]);
  }, []);

  if (!scholar) return <div className="hidden lg:block w-1/2 h-screen bg-black"></div>;

  return (
    <div className="hidden lg:flex flex-col w-1/2 h-screen relative overflow-hidden">
      {/* Background Image - Full Bleed */}
      <div className="absolute inset-0 z-0">
        <Image 
          src={`${scholar.img}?auto=format&fit=crop&w=1600&q=100`} 
          alt={scholar.name} 
          fill 
          className="w-full h-full object-cover transition-transform duration-[20s] scale-110" 
          style={{ 
            animation: 'slowZoom 20s infinite alternate ease-in-out' 
          }} 
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/20 to-transparent z-10"></div>
        <div className="absolute inset-0 bg-black/10 backdrop-brightness-75 z-5"></div>
      </div>

      {/* Floating Content */}
      <div className="relative z-20 flex flex-col justify-end h-full p-16 pb-24 max-w-2xl">
        <div className="space-y-8 animate-in fade-in slide-in-from-left-12 duration-1000">
           <div className="flex items-center gap-4">
              <div className="w-12 h-px bg-yellow-500"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-yellow-500">
                SCIENTIFIC LEGACY
              </span>
           </div>
           
           <h1 className="text-5xl font-serif italic text-white leading-tight">
             &ldquo;{scholar.quote}&rdquo;
           </h1>
           
           <div className="flex items-baseline gap-4">
              <p className="text-xl font-bold text-white tracking-wide">
                {scholar.name}
              </p>
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-700"></div>
              <p className="text-zinc-500 text-sm font-mono tracking-tighter">
                {scholar.code}
              </p>
           </div>
        </div>
      </div>

      {/* Side Label */}
      <div className="absolute right-12 top-1/2 -translate-y-1/2 z-20 opacity-20 pointer-events-none">
         <p className="text-[8px] font-black uppercase tracking-[1.5em] vertical-text text-white">
            RESEARCHREEL DIGITAL ARCHIVE
         </p>
      </div>

      <style jsx>{`
        @keyframes slowZoom {
          from { transform: scale(1); }
          to { transform: scale(1.15); }
        }
        .vertical-text {
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }
      `}</style>
    </div>
  );
}
