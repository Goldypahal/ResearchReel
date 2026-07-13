"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

const scientists = [
  { name: 'Albert Einstein', quote: 'Imagination is more important than knowledge.', code: 'E = mc²', img: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d' },
  { name: 'Marie Curie', quote: 'Nothing in life is to be feared, it is only to be understood.', code: 'Ra-226', img: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31' },
  { name: 'Alan Turing', quote: 'We can only see a short distance ahead, but we can see plenty there that needs to be done.', code: 'Machine Thinking...', img: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158' },
  { name: 'Nikola Tesla', quote: 'The present is theirs; the future, for which I really worked, is mine.', code: 'AC Motor Design', img: 'https://images.unsplash.com/photo-1614935151651-0bea6508ab6b' },
  { name: 'Isaac Newton', quote: 'If I have seen further it is by standing on the shoulders of Giants.', code: 'F = ma', img: 'https://images.unsplash.com/photo-1576086213369-97a306d36557' },
  { name: 'Ada Lovelace', quote: 'That brain of mine is something more than merely mortal; as time will show.', code: 'Algorithm 001', img: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b' },
  { name: 'Stephen Hawking', quote: 'However difficult life may seem, there is always something you can do and succeed at.', code: 'Black Hole Entropy', img: 'https://images.unsplash.com/photo-1628595351029-c2bf17511435' },
  { name: 'Charles Darwin', quote: 'It is not the strongest of the species that survives, but the most responsive to change.', code: 'Natural Selection', img: 'https://images.unsplash.com/photo-1518152006812-edab29b069ac' },
  { name: 'Richard Feynman', quote: 'What I cannot create, I do not understand.', code: 'Path Integral', img: 'https://images.unsplash.com/photo-1574169208507-84376144848b' },
  { name: 'Max Planck', quote: 'Science cannot solve the ultimate mystery of nature.', code: 'E = hν', img: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8' },
  { name: 'Galileo Galilei', quote: 'E pur si muove (And yet it moves).', code: 'Sidereus Nuncius', img: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa' },
  { name: 'Rosalind Franklin', quote: 'Science and everyday life cannot and should not be separated.', code: 'Photo 51', img: 'https://images.unsplash.com/photo-1579154273821-ad99159ad50a' },
  { name: 'Niels Bohr', quote: 'An expert is a person who has made all the mistakes which can be made in a very narrow field.', code: 'Atomic Model', img: 'https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45' },
  { name: 'Carl Sagan', quote: 'Somewhere, something incredible is waiting to be known.', code: 'Pale Blue Dot', img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa' },
  { name: 'Thomas Edison', quote: 'Genius is one percent inspiration and ninety-nine percent perspiration.', code: 'Incandescent Lamp', img: 'https://images.unsplash.com/photo-1506466010722-395aa2bef877' },
];

export default function LandingPortraitSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % scientists.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden lg:flex flex-col flex-1 h-[80vh] relative group overflow-hidden rounded-[40px] border border-white/10 shadow-2xl">
      <div className="absolute inset-0 bg-black/40 z-10 transition-opacity duration-1000"></div>
      
      {/* Background Images */}
      {scientists.map((s, i) => (
        <div 
          key={i} 
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${i === currentIndex ? 'opacity-100' : 'opacity-0'}`}
        >
          <Image 
            src={`${s.img}?auto=format&fit=crop&w=1200&q=80`} 
            alt={s.name} 
            fill 
            className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-[10s]" 
          />
        </div>
      ))}

      {/* Bottom Left Quote & Code */}
      <div className="absolute bottom-12 left-12 z-20 max-w-sm space-y-6">
        <div className="bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/10 animate-in fade-in slide-in-from-left-4 duration-1000" key={`quote-${currentIndex}`}>
           <p className="text-lg font-serif italic text-zinc-100 leading-relaxed mb-4">
              &ldquo;{scientists[currentIndex].quote}&rdquo;
           </p>
           <div className="flex items-center gap-3">
              <div className="w-8 h-px bg-yellow-500"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-500">
                {scientists[currentIndex].name}
              </span>
           </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/5 font-mono text-[10px] text-zinc-500 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300" key={`code-${currentIndex}`}>
           <p className="text-indigo-400">{"// Academic Signature"}</p>
           <p className="text-zinc-300">{scientists[currentIndex].code}</p>
        </div>
      </div>

      {/* Vertical Indicator List */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-4">
        {scientists.map((s, i) => (
           <div 
             key={i} 
             className={`text-[8px] font-black uppercase tracking-widest vertical-text transition-all duration-500 ${i === currentIndex ? 'text-white scale-125' : 'text-zinc-600'}`}
           >
              {s.name.split(' ').pop()}
           </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-yellow-500/30 w-full z-30">
         <div 
           className="h-full bg-yellow-500 transition-all duration-[5000ms] ease-linear"
           style={{ width: '100%', transform: `scaleX(${1})`, transformOrigin: 'left' }}
           key={`progress-${currentIndex}`}
         ></div>
      </div>
    </div>
  );
}
