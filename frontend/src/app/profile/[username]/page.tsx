"use client";

import React, { useState } from 'react';
import ProfileHeader from '@/components/profile/ProfileHeader';
import AnalyticsDashboard from '@/components/profile/AnalyticsDashboard';
import DOIImportModal, { ImportedPaper } from '@/components/profile/DOIImportModal';
import PostCard from '@/components/feed/PostCard';
import { Grid, PlaySquare, BarChart2, Bookmark, BookOpen, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSocial } from '@/context/SocialContext';

const MOCK_USER = {
  username: "julianewton",
  full_name: "Dr. Julia Newton",
  bio: "Lead Research Scientist specializing in neuro-symbolic reasoning and large scale transformer architectures for autonomous logic validation. Bridges the gap between neural performance and symbolic consistency.",
  verification_status: "scholar",
  orcid_id: "0000-0001-2345-6789",
  institution_name: "MIT CSAIL",
  research_interests: ["NeuroSymbolic", "Transformers", "LogicValidation", "ArtificialIntelligence"],
  follower_count: 14200,
  post_count: 85
};

type ProfileTab = 'content' | 'analytics' | 'reels' | 'saved';

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const { profiles, followersMap } = useSocial();
  const [tab, setTab] = useState<ProfileTab>('content');
  const [isDOIModalOpen, setIsDOIModalOpen] = useState(false);
  const [importedPapers, setImportedPapers] = useState<ImportedPaper[]>([]);
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);

  const profile = authUser ? profiles[authUser.username] : undefined;

  // Use social profile state when available so settings changes update this view.
  const user = authUser ? {
    ...MOCK_USER,
    username: authUser.username,
    full_name: profile?.full_name || authUser.full_name || authUser.username,
    bio: profile?.bio || MOCK_USER.bio,
    verification_status: profile?.verification_status || authUser.verification_status || MOCK_USER.verification_status,
    orcid_id: profile?.orcid_id || MOCK_USER.orcid_id,
    institution_name: profile?.institution_name || MOCK_USER.institution_name,
    research_interests: profile?.research_interests || MOCK_USER.research_interests,
    follower_count: followersMap[authUser.username]?.length ?? MOCK_USER.follower_count,
    post_count: 1 + importedPapers.length,
  } : MOCK_USER;

  const handleImport = (papers: ImportedPaper[]) => {
    setImportedPapers(prev => {
      // Deduplicate by id
      const existingIds = new Set(prev.map(p => p.id));
      const fresh = papers.filter(p => !existingIds.has(p.id));
      return [...fresh, ...prev];
    });
    // Switch to content tab to show new papers
    setTab('content');
  };

  const removeImported = (id: string) => {
    setImportedPapers(prev => prev.filter(p => p.id !== id));
  };

  const tabs: { key: ProfileTab; label: string; icon: React.ComponentType<{ size: number; strokeWidth?: number }> }[] = [
    { key: 'content', label: 'POSTS', icon: Grid },
    { key: 'reels', label: 'REELS', icon: PlaySquare },
    { key: 'saved', label: 'SAVED', icon: Bookmark },
    { key: 'analytics', label: 'ANALYTICS', icon: BarChart2 },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] selection:bg-indigo-500/30">
      <main className="max-w-[935px] mx-auto pt-12 pb-24">
        
        {/* Profile Header */}
        <ProfileHeader 
          user={user} 
          onImportPapers={() => setIsDOIModalOpen(true)}
        />

        {/* Navigation Tabs */}
        <div className="flex items-center justify-center gap-12 border-t border-[var(--border)]/10 mt-0">
           {tabs.map((t) => {
             const Icon = t.icon;
             const isActive = tab === t.key;
             return (
               <button 
                 key={t.key} 
                 onClick={() => setTab(t.key)}
                 className={`flex items-center gap-1.5 py-4 border-t transition-all relative ${
                   isActive 
                   ? 'border-[var(--foreground)] text-[var(--foreground)]' 
                   : 'border-transparent text-zinc-500 hover:text-[var(--foreground)]'
                 }`}
               >
                  <Icon size={12} strokeWidth={isActive ? 2.5 : 1.5} />
                  <span className="text-[12px] font-black tracking-[0.1em]">{t.label}</span>
               </button>
             );
           })}
        </div>

        {/* Content Section */}
        <section className="mt-4">
           {tab === 'content' && (
             <div className="space-y-6">
               {/* ── Imported DOI Papers (full post cards) ── */}
               {importedPapers.length > 0 && (
                 <div className="space-y-4">
                   <div className="flex items-center justify-between px-2">
                     <div className="flex items-center gap-2">
                       <BookOpen size={14} className="text-indigo-400" />
                       <span className="text-xs font-black uppercase tracking-widest text-indigo-400">
                         Imported Research Papers ({importedPapers.length})
                       </span>
                     </div>
                   </div>

                   {/* Expanded post view */}
                   {expandedPaperId && (
                     <div className="border border-indigo-500/20 rounded-2xl p-4 bg-indigo-500/5">
                       {importedPapers.filter(p => p.id === expandedPaperId).map(paper => (
                         <PostCard key={paper.id} post={paper} />
                       ))}
                     </div>
                   )}

                   {/* Grid thumbnails */}
                   <div className="grid grid-cols-3 gap-1 md:gap-4">
                     {importedPapers.map(paper => (
                       <div
                         key={paper.id}
                         onClick={() => setExpandedPaperId(prev => prev === paper.id ? null : paper.id)}
                         className={`aspect-square relative group cursor-pointer overflow-hidden rounded-xl md:rounded-2xl border transition-all hover:shadow-xl hover:shadow-indigo-500/10 ${
                           expandedPaperId === paper.id
                             ? 'border-indigo-500/50 shadow-xl shadow-indigo-500/10'
                             : 'border-zinc-800/50 bg-zinc-900/40'
                         }`}
                       >
                         {/* Thumbnail content */}
                         <div className="w-full h-full bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent flex flex-col items-center justify-center p-3 text-center gap-2">
                           <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                             <BookOpen size={18} />
                           </div>
                           <p className="text-[9px] font-bold text-zinc-300 leading-tight line-clamp-3">{paper.title}</p>
                           {paper.year && (
                             <span className="text-[8px] font-mono text-zinc-600">{paper.year}</span>
                           )}
                         </div>

                         {/* Hover overlay */}
                         <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-1.5 p-2">
                           <span className="text-[9px] font-black uppercase tracking-widest text-white">View Post</span>
                           {typeof paper.cited_by_count === 'number' && (
                             <div className="flex items-center gap-1 text-[9px] text-zinc-300 font-bold">
                               <span>📚</span>
                               <span>{paper.cited_by_count} citations</span>
                             </div>
                           )}
                         </div>

                         {/* Remove button */}
                         <button
                           onClick={e => { e.stopPropagation(); removeImported(paper.id); }}
                           className="absolute top-1.5 right-1.5 w-5 h-5 bg-red-600/80 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10"
                           title="Remove paper"
                         >
                           <X size={10} className="text-white" />
                         </button>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               {/* ── Placeholder grid for other posts ── */}
               <div className="grid grid-cols-3 gap-1 md:gap-8">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="aspect-square bg-[var(--foreground)]/5 border border-[var(--border)]/5 relative group cursor-pointer overflow-hidden rounded-xl md:rounded-2xl shadow-sm transition-all hover:shadow-xl">
                       <div className="w-full h-full bg-gradient-to-br from-[var(--foreground)]/5 to-[var(--foreground)]/10 flex flex-col items-center justify-center text-zinc-500 text-[10px] font-black uppercase tracking-widest gap-2">
                          <div className="w-8 h-8 rounded-full border border-[var(--border)]/10 flex items-center justify-center bg-[var(--background)] shadow-inner">
                             <Grid size={14} className="text-indigo-500/50" />
                          </div>
                          RESEARCH DATA {i + 1}
                       </div>
                       <div className="absolute inset-0 bg-[var(--foreground)]/5 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-6">
                          <div className="flex items-center gap-1.5 font-black text-sm"><span className="text-lg">❤️</span> 1.2k</div>
                          <div className="flex items-center gap-1.5 font-black text-sm"><span className="text-lg">💬</span> 48</div>
                       </div>
                    </div>
                  ))}
               </div>
             </div>
           )}
           
           {tab === 'analytics' && (
              <div className="py-10">
                <AnalyticsDashboard />
              </div>
           )}

           {tab === 'reels' && (
              <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
                 <div className="w-20 h-20 rounded-full border-2 border-[var(--border)]/20 flex items-center justify-center bg-[var(--foreground)]/5">
                    <PlaySquare size={36} strokeWidth={1} className="text-zinc-500" />
                 </div>
                 <div className="space-y-2">
                    <h2 className="text-2xl font-black tracking-tight uppercase">Capture your research in motion</h2>
                    <p className="text-zinc-500 max-w-xs text-sm font-medium">Share bite-sized scientific breakthroughs and lab insights with the community.</p>
                 </div>
                 <button className="text-indigo-500 font-black uppercase text-[10px] tracking-widest hover:text-indigo-600 transition-colors bg-indigo-500/5 px-6 py-2.5 rounded-full border border-indigo-500/20">Create your first reel</button>
              </div>
           )}

           {tab === 'saved' && (
              <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
                 <div className="w-20 h-20 rounded-full border-2 border-[var(--border)]/20 flex items-center justify-center bg-[var(--foreground)]/5">
                    <Bookmark size={36} strokeWidth={1} className="text-zinc-500" />
                 </div>
                 <div className="space-y-2">
                    <h2 className="text-2xl font-black tracking-tight uppercase">Save for later</h2>
                    <p className="text-zinc-500 max-w-xs text-sm font-medium">Keep track of interesting papers, discussions, and breakthrough reels.</p>
                 </div>
              </div>
           )}
        </section>

      </main>

      {/* DOI Import Modal */}
      <DOIImportModal
        isOpen={isDOIModalOpen}
        onClose={() => setIsDOIModalOpen(false)}
        onImport={handleImport}
      />
    </div>
  );
}
