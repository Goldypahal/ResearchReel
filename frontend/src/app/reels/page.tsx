"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Bookmark, Share2, Plus, Play, ExternalLink, Sparkles, Film } from 'lucide-react';

export default function ReelsFeedPage() {
  const router = useRouter();
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({
    reel_1: 234,
    reel_2: 512
  });

  const reels = [
    {
      id: 'reel_1',
      title: 'Why Transformers Outperform RNNs in Parallel Processing',
      author: '@rajvir',
      authorName: 'Rajvir Singh',
      paperTitle: 'Attention Is All You Need',
      paperId: 'doc_1',
      comments: 42,
      duration: '0:45',
      gradient: 'from-indigo-900 via-purple-950 to-black'
    },
    {
      id: 'reel_2',
      title: 'BERT Bidirectional Context Explained in 60 Seconds',
      author: '@julianewton',
      authorName: 'Dr. Julia Newton',
      paperTitle: 'BERT: Pre-training of Deep Bidirectional Transformers',
      paperId: 'doc_2',
      comments: 89,
      duration: '1:00',
      gradient: 'from-blue-900 via-slate-950 to-black'
    }
  ];

  const handleToggleLike = (reelId: string) => {
    setLiked(prev => {
      const isCurrentlyLiked = !!prev[reelId];
      const newLikedState = !isCurrentlyLiked;
      setLikeCounts(counts => ({
        ...counts,
        [reelId]: counts[reelId] + (newLikedState ? 1 : -1)
      }));
      return { ...prev, [reelId]: newLikedState };
    });
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-[var(--foreground)] flex items-center gap-2">
          <Film size={22} className="text-purple-400" />
          <span>Research Reels</span>
        </h1>

        <button
          onClick={() => router.push('/reels/create')}
          className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors flex items-center gap-1.5"
        >
          <Plus size={14} />
          <span>Create Reel</span>
        </button>
      </div>

      {/* Vertical Reels List */}
      <div className="space-y-8">
        {reels.map((reel) => {
          const isLiked = !!liked[reel.id];
          const count = likeCounts[reel.id];

          return (
            <div
              key={reel.id}
              className={`relative h-[560px] rounded-3xl overflow-hidden bg-gradient-to-b ${reel.gradient} border border-[var(--border)] shadow-2xl flex flex-col justify-between p-6 text-white`}
            >
              {/* Top Bar */}
              <div className="flex items-center justify-between z-10">
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/15 text-purple-300">
                  Academic Reel • {reel.duration}
                </span>

                <button
                  onClick={() => router.push(`/library/documents/${reel.paperId}`)}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors border border-white/15"
                >
                  <ExternalLink size={12} />
                  <span>Source Paper</span>
                </button>
              </div>

              {/* Center Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80">
                  <Play size={28} className="ml-1" />
                </div>
              </div>

              {/* Bottom Info & Action Bar */}
              <div className="flex items-end justify-between gap-4 z-10">
                <div className="space-y-2 max-w-[75%]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/30 border border-white/20 flex items-center justify-center font-bold text-xs">
                      {reel.authorName.slice(0, 1)}
                    </div>
                    <div>
                      <p className="text-xs font-bold">{reel.authorName}</p>
                      <p className="text-[10px] text-zinc-400">{reel.author}</p>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold leading-snug line-clamp-2">
                    {reel.title}
                  </h3>

                  <p className="text-[11px] text-purple-300/80 font-medium">
                    Paper: {reel.paperTitle}
                  </p>
                </div>

                {/* Right Floating Actions */}
                <div className="flex flex-col items-center gap-4 text-xs">
                  <button
                    onClick={() => handleToggleLike(reel.id)}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div className={`p-3 rounded-full backdrop-blur-md transition-all ${
                      isLiked ? 'bg-red-500/20 text-red-500 scale-110' : 'bg-white/10 text-white group-hover:scale-105'
                    }`}>
                      <Heart size={20} className={isLiked ? 'fill-red-500' : ''} />
                    </div>
                    <span className="text-[10px] font-semibold">{count}</span>
                  </button>

                  <button className="flex flex-col items-center gap-1 group">
                    <div className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white group-hover:scale-105 transition-transform">
                      <MessageCircle size={20} />
                    </div>
                    <span className="text-[10px] font-semibold">{reel.comments}</span>
                  </button>

                  <button className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:scale-105 transition-transform">
                    <Bookmark size={20} />
                  </button>

                  <button className="p-3 rounded-full bg-white/10 backdrop-blur-md text-white hover:scale-105 transition-transform">
                    <Share2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
