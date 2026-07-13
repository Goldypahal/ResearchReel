"use client";

import React, { useState, useEffect, useCallback } from 'react';
import PostCard, { PostProps } from './PostCard';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle2, Circle, Sparkles, Upload, Play, RefreshCw, AlertCircle } from 'lucide-react';

const MOCK_POSTS = [
  {
    id: "s1",
    author_name: "Albert Einstein",
    author_username: "@the_einstein",
    author_img: "/assets/scientists/einstein.png",
    verification_status: "scholar",
    content_type: "document" as const,
    caption: "Working on the Unified Field Theory. Sometimes the simplest answer is the most elegant.",
    document_name: "Relativity_Foundations.pdf",
    summary_text: "A revisit to the principles of special relativity in the context of modern quantum observation.",
    tags: ["Physics", "Relativity", "Cosmology"],
    reaction_count: 1540
  },
  {
    id: "s2-img",
    author_name: "Marie Curie",
    author_username: "@m_curie",
    author_img: "/assets/scientists/curie.png",
    verification_status: "scholar",
    content_type: "image" as const,
    caption: "Observed anomalous energy decays in isotope decay chains under cryogenic conditions. The blue Cherenkov glow is breathtaking.",
    media_urls: ["https://images.unsplash.com/photo-1507668077129-56e32842fceb?w=800&auto=format&fit=crop"],
    tags: ["Chemistry", "Radioactivity", "Science"],
    reaction_count: 3824
  },
  {
    id: "s2",
    author_name: "Marie Curie",
    author_username: "@m_curie",
    author_img: "/assets/scientists/curie.png",
    verification_status: "scholar",
    content_type: "document" as const,
    caption: "New radiation measurements from the radium samples. We must never forget the importance of persistence in the lab.",
    document_name: "Radiological_Notes.pdf",
    summary_text: "Observed anomalous energy decays in isotope decay chains under cryogenic conditions.",
    tags: ["Chemistry", "Radioactivity", "Science"],
    reaction_count: 982
  },
  {
    id: "s4-img",
    author_name: "Nikola Tesla",
    author_username: "@tesla",
    author_img: "/assets/scientists/tesla.png",
    verification_status: "scholar",
    content_type: "image" as const,
    caption: "Testing high frequency electrical discharge on custom coils. Capturing the magnetic field oscillations on camera.",
    media_urls: ["https://images.unsplash.com/photo-1464802686167-b939a6910659?w=800&auto=format&fit=crop"],
    tags: ["Physics", "Electromagnetism", "Coils"],
    reaction_count: 5930
  },
  {
    id: "1",
    author_name: "Dr. Julia Newton",
    author_username: "@julianewton",
    verification_status: "scholar",
    content_type: "document" as const,
    caption: "Excited to share our latest research on neural-symbolic integration for large scale reasoning. We've bridged the gap between logical consistency and transformer performance.",
    document_name: "NeurSymbolic_Reasoning_v2.pdf",
    summary_text: "This paper proposes a novel framework for combining symbolic logic with transformer-based reasoning, improving OOD generalization by 24% on benchmark tasks.",
    tags: ["ArtificialIntelligence", "NeuroSymbolic", "MachineLearning"],
    reaction_count: 42
  },
  {
    id: "s3",
    author_name: "Alan Turing",
    author_username: "@a_turing",
    author_img: "/assets/scientists/turing.png",
    verification_status: "scholar",
    content_type: "text" as const,
    caption: "Can machines think? The imitation game suggests that intelligence is a matter of behavior, not substance.",
    tags: ["Computation", "Philosophy", "AI"],
    reaction_count: 2100
  },
  {
    id: "2",
    author_name: "Alex Thompson",
    author_username: "@athompson_cs",
    verification_status: "student",
    content_type: "text" as const,
    caption: "Quick question for the #Optics community: Has anyone encountered aberrant diffraction patterns when using 405nm laser pulses on custom silicon metasurfaces?",
    tags: ["Physics", "Metasurfaces", "Optics"],
    reaction_count: 12
  }
];

function FeedSkeleton() {
  return (
    <div className="w-full max-w-[600px] mx-auto space-y-8 pt-6">
      {[1, 2].map((i) => (
        <div key={i} className="animate-pulse space-y-4 border-b border-[var(--border)]/10 pb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-zinc-800" />
            <div className="space-y-2">
              <div className="h-3 w-28 bg-zinc-800 rounded" />
              <div className="h-2.5 w-16 bg-zinc-800 rounded" />
            </div>
          </div>
          <div className="w-full aspect-square bg-zinc-900 rounded-lg" />
          <div className="flex justify-between">
            <div className="flex gap-4">
              <div className="w-6 h-6 bg-zinc-800 rounded-full" />
              <div className="w-6 h-6 bg-zinc-800 rounded-full" />
              <div className="w-6 h-6 bg-zinc-800 rounded-full" />
            </div>
            <div className="w-6 h-6 bg-zinc-800 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Feed() {
  const { user, token } = useAuth();
  const [posts, setPosts] = useState<PostProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Onboarding states
  const [uploadedFirst, setUploadedFirst] = useState(false);
  const [reelsWatchedCount, setReelsWatchedCount] = useState(0);
  const [dismissOnboarding, setDismissOnboarding] = useState(false);

  useEffect(() => {
    const syncOnboarding = () => {
      if (typeof window !== 'undefined') {
        setUploadedFirst(localStorage.getItem('onboarding_uploaded') === 'true');
        setReelsWatchedCount(parseInt(localStorage.getItem('reels_watched_count') || '0', 10));
        setDismissOnboarding(localStorage.getItem('onboarding_dismissed') === 'true');
      }
    };
    syncOnboarding();
    window.addEventListener('storage', syncOnboarding);
    return () => window.removeEventListener('storage', syncOnboarding);
  }, []);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_BASE}/posts/feed`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        throw new Error('Failed to fetch latest breakthroughs');
      }
      const data = await res.json();
      const livePosts = Array.isArray(data?.data) ? data.data : Array.isArray(data?.posts) ? data.posts : [];

      const combined = livePosts.length > 0
        ? [...livePosts, ...MOCK_POSTS.filter((m) => !livePosts.some((p: PostProps) => p.id === m.id))]
        : MOCK_POSTS;

      setPosts(combined);

      if (user && livePosts.length > 0) {
        const hasCreated = livePosts.some((p: PostProps) => p.author_username === user.username || p.author_username === `@${user.username}`);
        if (hasCreated) {
          localStorage.setItem('onboarding_uploaded', 'true');
          setUploadedFirst(true);
        }
      }
    } catch (err) {
      console.error(err);
      setPosts(MOCK_POSTS);
      setError('Could not connect to live sync service. Showing cached breakthroughs.');
    } finally {
      setIsLoading(false);
    }
  }, [token, user]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleDismiss = () => {
    localStorage.setItem('onboarding_dismissed', 'true');
    setDismissOnboarding(true);
  };

  const showOnboarding = !dismissOnboarding && (!uploadedFirst || reelsWatchedCount < 5);

  if (isLoading) {
    return <FeedSkeleton />;
  }

  if (posts.length === 0) {
    return (
      <div className="w-full max-w-[600px] mx-auto pt-20 px-4 text-center">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-10 flex flex-col items-center justify-center space-y-5">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-2">
            <span className="text-3xl">🚀</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Your feed is looking a little quiet</h2>
          <p className="text-zinc-400 text-sm max-w-[400px] leading-relaxed">
            The best way to start engaging with the scientific community is to share your work or explore what others are doing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full justify-center">
            <a href="/create" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/20">
              Upload Your First Reel
            </a>
            <a href="/explore" className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-xl transition-colors">
              Explore Popular Reels
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[600px] mx-auto space-y-6 pt-6 selection:bg-indigo-500/30">
      {/* Onboarding checklist */}
      {showOnboarding && (
        <div 
          className="w-full border rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md mb-6 animate-fade-in group"
          style={{ 
            background: 'var(--onboarding-bg)', 
            borderColor: 'var(--onboarding-border)' 
          }}
        >
          <div className="absolute top-0 right-0 p-3">
            <button 
              onClick={handleDismiss} 
              className="text-zinc-500 hover:text-zinc-300 text-xs uppercase font-black tracking-widest transition-colors"
              style={{ color: 'var(--onboarding-text)', opacity: 0.8 }}
            >
              Dismiss
            </button>
          </div>
          
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="animate-pulse" size={16} style={{ color: 'var(--onboarding-title)' }} />
            <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--onboarding-title)' }}>
              Scholarly Onboarding
            </h3>
          </div>
          
          <p className="text-xs font-medium mb-5 leading-relaxed max-w-[420px]" style={{ color: 'var(--onboarding-text)' }}>
            Welcome to the ResearchReel network! Complete these quick tasks to establish your scientific presence and peer network.
          </p>
          
          <div className="space-y-3.5">
            {/* Task 1 */}
            <div 
              className="flex items-center justify-between border p-3 rounded-2xl transition-all"
              style={{ 
                backgroundColor: 'var(--onboarding-task-bg)', 
                borderColor: 'var(--onboarding-task-border)' 
              }}
            >
              <div className="flex items-center gap-3">
                {uploadedFirst ? (
                  <CheckCircle2 size={18} style={{ color: 'var(--onboarding-title)' }} />
                ) : (
                  <Circle size={18} className="text-zinc-650" style={{ color: 'var(--onboarding-task-desc)' }} />
                )}
                <div className="flex flex-col">
                  <span 
                    className="text-xs font-bold"
                    style={{ 
                      color: uploadedFirst ? 'var(--onboarding-task-desc)' : 'var(--onboarding-task-title)',
                      textDecoration: uploadedFirst ? 'line-through' : 'none' 
                    }}
                  >
                    Publish your first breakthrough
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: 'var(--onboarding-task-desc)' }}>
                    Upload an image, video, or PDF
                  </span>
                </div>
              </div>
              {!uploadedFirst && (
                <a 
                  href="/create" 
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 active:scale-95 animate-pulse"
                >
                  <Upload size={12} />
                  <span>Publish</span>
                </a>
              )}
            </div>

            {/* Task 2 */}
            <div 
              className="flex items-center justify-between border p-3 rounded-2xl transition-all"
              style={{ 
                backgroundColor: 'var(--onboarding-task-bg)', 
                borderColor: 'var(--onboarding-task-border)' 
              }}
            >
              <div className="flex items-center gap-3">
                {reelsWatchedCount >= 5 ? (
                  <CheckCircle2 size={18} style={{ color: 'var(--onboarding-title)' }} />
                ) : (
                  <Circle size={18} className="text-zinc-650" style={{ color: 'var(--onboarding-task-desc)' }} />
                )}
                <div className="flex flex-col">
                  <span 
                    className="text-xs font-bold"
                    style={{ 
                      color: reelsWatchedCount >= 5 ? 'var(--onboarding-task-desc)' : 'var(--onboarding-task-title)',
                      textDecoration: reelsWatchedCount >= 5 ? 'line-through' : 'none' 
                    }}
                  >
                    Watch 5 research reels ({reelsWatchedCount}/5)
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: 'var(--onboarding-task-desc)' }}>
                    Explore video breakthrough demonstrations
                  </span>
                </div>
              </div>
              {reelsWatchedCount < 5 && (
                <a 
                  href="/reels" 
                  className="px-3.5 py-1.5 border text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5 active:scale-95 hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--onboarding-btn-bg)',
                    color: 'var(--onboarding-btn-text)',
                    borderColor: 'var(--onboarding-btn-border)'
                  }}
                >
                  <Play size={12} />
                  <span>Watch</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sync Warning banner */}
      {error && (
        <div className="w-full flex items-center justify-between text-zinc-400 text-xs bg-zinc-905/30 border border-zinc-800/80 p-4 rounded-2xl mb-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="text-amber-500 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button 
            onClick={fetchPosts} 
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors shrink-0"
          >
            <RefreshCw size={10} />
            <span>Retry Sync</span>
          </button>
        </div>
      )}

      {/* Post cards */}
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
      <div className="text-center py-10 opacity-50 font-bold uppercase tracking-widest text-xs">End of Discover Feed</div>
    </div>
  );
}
