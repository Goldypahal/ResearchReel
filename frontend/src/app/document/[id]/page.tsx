"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import ChatDrawer from '@/components/ai/ChatDrawer';
import { Maximize2, ZoomIn, ZoomOut, Search, MessageSquare, Bookmark, Share2, MoreHorizontal, ChevronLeft, ChevronRight, PenTool, FileText } from 'lucide-react';

const PDFViewer = dynamic(() => import('@/components/document/PDFViewer'), {
  ssr: false,
});

interface SummaryData {
  abstract: string;
  key_points: string[];
}

const getDocData = (docId: string) => {
  switch (docId) {
    case '2':
      return {
        title: "Radiological Interpretation and Clinical Diagnostic Notes",
        authors: ["Dr. Julia Newton", "Sarah Chen"],
        journal: "Journal of Medical Imaging",
        date: "February 2026",
        pages: 1,
        citations: 82,
        url: "/Radiological_Notes.pdf"
      };
    case '3':
      return {
        title: "Foundations of Relativity and Gravitational Frameworks",
        authors: ["Dr. Alan Turing Jr.", "Dr. Julia Newton"],
        journal: "Foundations of Physics",
        date: "December 2025",
        pages: 1,
        citations: 215,
        url: "/Relativity_Foundations.pdf"
      };
    case '1':
    default:
      return {
        title: "Neuro-Symbolic Integration and Generalized Logic in Transformers",
        authors: ["Dr. Julia Newton", "Dr. Alan Turing Jr.", "Sarah Chen"],
        journal: "Journal of Artificial Intelligence Research",
        date: "January 2026",
        pages: 1,
        citations: 124,
        url: "/NeurSymbolic_Reasoning_v2.pdf"
      };
  }
};

export default function DocumentReaderPage() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [isZenMode, setIsZenMode] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [activeSidebarTab, setActiveSidebarTab] = useState('summary');
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const liveCollaborators = [
     { name: 'Dr. Julia Newton', avatar: 'JN', color: 'bg-indigo-500' },
     { name: 'Alan Turing Jr.', avatar: 'AT', color: 'bg-emerald-500' }
  ];

  const params = useParams();
  const docId = params?.id as string;

  const [documentMetadata, setDocumentMetadata] = useState(() => getDocData(docId));

  useEffect(() => {
    const timer = setTimeout(() => {
      setDocumentMetadata(getDocData(docId));
    }, 0);
    return () => clearTimeout(timer);
  }, [docId]);

  const handleDocumentLoad = (numPages: number) => {
    setDocumentMetadata(prev => ({ ...prev, pages: numPages }));
  };

  return (
    <div className={`bg-[var(--background)] text-[var(--foreground)] overflow-hidden flex flex-col selection:bg-indigo-500/30 transition-all duration-700 ${
      isZenMode 
        ? 'fixed inset-0 z-[100] w-screen h-screen' 
        : 'h-[calc(100vh-128px)] md:h-screen'
    }`}>
        <main className="flex-1 flex overflow-hidden">
           
           {/* Sidebar: Navigation & Thumbnails (Optional) */}
           {!isZenMode && (
             <aside className="w-16 border-r border-white/10 hidden sm:flex flex-col items-center py-8 gap-8 bg-[#050505] shrink-0">
                <button className="text-zinc-500 hover:text-white transition-all"><Bookmark size={20} /></button>
                <button className="text-zinc-500 hover:text-white transition-all"><PenTool size={20} /></button>
                <div className="flex-1"></div>
                <button className="text-zinc-500 hover:text-white transition-all" onClick={() => setIsZenMode(true)}><Maximize2 size={20} /></button>
             </aside>
           )}
 
           {/* Main Reader View */}
           <section className="flex-1 overflow-y-auto bg-[#0a0a0a] flex flex-col items-center custom-scrollbar relative">
              
              {/* Top Controls Bar (Sticky) */}
              <div className="sticky top-0 w-full z-[40] bg-black/40 backdrop-blur-3xl border-b border-white/5 px-4 md:px-8 py-3 flex items-center justify-between gap-2">
                 <div className="flex items-center gap-3 md:gap-6">
                    <div className="flex items-center gap-1 md:gap-2">
                       <button onClick={() => setZoom(prev => Math.max(50, prev - 10))} className="p-1 md:p-1.5 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-all"><ZoomOut size={14} /></button>
                       <span className="text-[9px] md:text-[10px] font-black text-zinc-400 w-8 md:w-10 text-center uppercase tracking-widest">{zoom}%</span>
                       <button onClick={() => setZoom(prev => Math.min(200, prev + 10))} className="p-1 md:p-1.5 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-all"><ZoomIn size={14} /></button>
                    </div>
                    <div className="h-4 w-px bg-white/10"></div>
                    <div className="flex items-center gap-2 md:gap-4">
                       <button className="text-zinc-500 hover:text-white transition-all"><Search size={16} /></button>
                       <div className="flex items-center gap-1.5 md:gap-2 bg-white/5 px-2 md:px-3 py-1 md:py-1.5 rounded-xl border border-white/5">
                          <span className="text-[8px] md:text-[10px] font-black text-white">PAGE</span>
                          <input 
                            type="number" 
                            value={activePage} 
                            onChange={(e) => setActivePage(Number(e.target.value))}
                            className="bg-transparent w-6 md:w-8 text-center text-[9px] md:text-[10px] font-black text-indigo-400 outline-none"
                          />
                          <span className="text-[8px] md:text-[10px] font-black text-zinc-600">OF {documentMetadata.pages}</span>
                       </div>
                    </div>
                 </div>
 
                 <div className="flex items-center gap-3 md:gap-6">
                    <div className="hidden sm:flex items-center gap-4 border-r border-white/10 pr-6 h-10">
                        <div className="flex -space-x-3">
                          {liveCollaborators.map((collab, i) => (
                              <div key={i} className={`w-8 h-8 rounded-full border-2 border-black flex items-center justify-center text-[8px] font-black text-white ${collab.color} cursor-help group relative`}>
                                {collab.avatar}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-white text-black text-[8px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap">
                                    {collab.name}
                                </div>
                              </div>
                          ))}
                          <div className="w-8 h-8 rounded-full border-2 border-black bg-zinc-800 flex items-center justify-center text-[8px] font-black text-zinc-400">
                              +12
                          </div>
                        </div>
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest animate-pulse">Live</span>
                    </div>
 
                    <button className="flex items-center gap-2 px-3 md:px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all group">
                       <Share2 size={14} className="text-zinc-500 group-hover:text-white" />
                       <span className="text-[9px] md:text-[10px] font-black text-zinc-400 group-hover:text-white uppercase tracking-widest hidden xs:inline">Share</span>
                    </button>
                    <button className="p-1 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-all"><MoreHorizontal size={18} /></button>
                 </div>
              </div>

              {/* PDF Container */}
              <div className="py-12 pb-32">
                  <PDFViewer 
                    url={documentMetadata.url}
                    zoom={zoom}
                    currentPage={activePage}
                    onLoadSuccess={handleDocumentLoad}
                  />

                  {/* Desktop Floating Highlight Context */}
                  {!isZenMode && (
                     <div className="fixed bottom-24 right-[420px] z-[60] animate-in fade-in slide-in-from-bottom-4 duration-1000">
                        <div className="p-6 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[32px] w-64 shadow-2xl">
                           <div className="flex items-center gap-2 mb-4">
                              <FileText size={14} className="text-indigo-500" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Contextual Insight</span>
                           </div>
                           <p className="text-[11px] leading-relaxed text-zinc-300 italic">&ldquo;The attention mechanism is the cornerstone of this architecture, allowing for parallel processing of sequence data.&rdquo;</p>
                           <button 
                             onClick={() => setIsChatOpen(true)}
                             className="mt-4 w-full py-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 border border-indigo-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                           >
                              Explain this Section
                           </button>
                        </div>
                     </div>
                  )}
              </div>

                  {/* Navigation Overlay */}
                  <div className="flex items-center gap-6 bg-black/80 backdrop-blur-3xl border border-white/10 px-8 py-4 rounded-[40px] z-[50] shadow-2xl sticky bottom-12">
                     <button 
                       onClick={() => setActivePage(prev => Math.max(1, prev - 1))}
                       className="w-10 h-10 hover:bg-white/5 rounded-full transition-all flex items-center justify-center text-xl text-zinc-400 hover:text-white"
                     >
                        <ChevronLeft size={20} />
                     </button>
                     <div className="h-4 w-px bg-white/10"></div>
                     <button 
                       className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[20px] text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-3" 
                       onClick={() => setIsChatOpen(true)}
                     >
                       <MessageSquare size={14} />
                       Ask AI on Page {activePage}
                     </button>
                     <div className="h-4 w-px bg-white/10"></div>
                     <button 
                       onClick={() => setActivePage(prev => Math.min(documentMetadata.pages, prev + 1))}
                       className="w-10 h-10 hover:bg-white/5 rounded-full transition-all flex items-center justify-center text-xl text-zinc-400 hover:text-white"
                     >
                        <ChevronRight size={20} />
                     </button>
                  </div>


              {/* Exit Zen Mode Button */}
              {isZenMode && (
                <button 
                  onClick={() => setIsZenMode(false)}
                  className="fixed top-6 right-8 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center text-white transition-all z-[100]"
                >
                  <Maximize2 size={20} className="rotate-180" />
                </button>
              )}
           </section>

           {/* Right Sidebar: Collaboration Pane */}
           {!isZenMode && (
             <aside className="w-[400px] border-l border-white/10 bg-[#050505] flex flex-col h-full relative overflow-hidden hidden xl:flex">
                <div className="p-8 border-b border-white/10">
                   <div className="flex items-center justify-between mb-8">
                      <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] italic">Collaborators</h3>
                      <button className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">+ Invite</button>
                   </div>
                   <div className="flex -space-x-3">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="w-10 h-10 rounded-full border-2 border-[#050505] bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white">U{i}</div>
                      ))}
                   </div>
                </div>

                <div className="p-8 flex-1 overflow-y-auto space-y-6 custom-scrollbar">
                   <div className="flex items-center gap-4 mb-6">
                      <button 
                        onClick={() => setActiveSidebarTab('summary')}
                        className={`flex-1 py-2 border-b-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeSidebarTab === 'summary' ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-zinc-600 hover:text-zinc-300'}`}
                      >
                         AI Summary
                      </button>
                      <button 
                        onClick={() => setActiveSidebarTab('annotations')}
                        className={`flex-1 py-2 border-b-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeSidebarTab === 'annotations' ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-zinc-600 hover:text-zinc-300'}`}
                      >
                         Annotations
                      </button>
                   </div>

                   {activeSidebarTab === 'summary' ? (
                     <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        {!summaryData ? (
                           <div className="flex flex-col items-center justify-center py-12 text-center gap-6">
                              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-zinc-600">
                                 <FileText size={32} />
                              </div>
                              <div>
                                 <h4 className="text-white font-black text-xs uppercase tracking-widest mb-2">No Summary Yet</h4>
                                 <p className="text-[10px] text-zinc-500 leading-relaxed max-w-[200px]">Unlock the key insights of this manuscript with ResearchReel AI.</p>
                              </div>
                              <button 
                                onClick={async () => {
                                   setIsSummarizing(true);
                                   // Mock API call (Integrated in controller)
                                   setTimeout(() => {
                                      setSummaryData({
                                         abstract: "The attention mechanism is the cornerstone of this architecture, allowing for parallel processing of sequence data while maintaining long-range dependencies.",
                                         key_points: [
                                            "Self-attention allows relating different positions of a single sequence.",
                                            "Multi-head attention allows the model to jointly attend to information from different representation subspaces.",
                                            "The model achieves 28.4 BLEU on WMT 2014 English-to-German translation."
                                         ]
                                      });
                                      setIsSummarizing(false);
                                   }, 2000);
                                }}
                                disabled={isSummarizing}
                                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                 {isSummarizing ? 'Synthesizing...' : 'Generate AI Summary'}
                              </button>
                           </div>
                        ) : (
                           <div className="space-y-8">
                              <div className="p-6 bg-white/5 rounded-[32px] border border-white/5">
                                 <h4 className="text-indigo-400 font-black text-[10px] uppercase tracking-widest mb-4">Core Abstract</h4>
                                 <p className="text-xs text-zinc-300 leading-relaxed italic">&ldquo;{summaryData?.abstract}&rdquo;</p>
                              </div>
                              <div className="space-y-4">
                                 <h4 className="text-zinc-500 font-black text-[10px] uppercase tracking-widest px-2">Key Discoveries</h4>
                                 {summaryData.key_points.map((point: string, i: number) => (
                                    <div key={i} className="flex gap-4 items-start p-4 bg-black/40 border border-white/5 rounded-2xl">
                                       <span className="text-indigo-500 font-black text-[10px] mt-0.5">{i+1}.</span>
                                       <p className="text-[11px] text-zinc-400 leading-relaxed">{point}</p>
                                    </div>
                                 ))}
                              </div>
                              <button className="w-full py-4 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl border border-white/10 transition-all flex items-center justify-center gap-3">
                                 <Share2 size={14} />
                                 Export AI Report
                              </button>
                           </div>
                        )}
                     </div>
                   ) : (
                     <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                        {[
                          { author: "Dr. Julia Newton", text: "Line 44 needs clarification on the symbolic regularization term.", color: "bg-indigo-600/10 text-indigo-400 border-indigo-500/20" },
                          { author: "Sarah Chen", text: "The experimental results in Section 3.1 exceed expectations.", color: "bg-white/5 text-zinc-400 border-white/5" }
                        ].map((note, i) => (
                          <div key={i} className={`p-6 rounded-[32px] border transition-all hover:scale-[1.02] cursor-pointer ${note.color}`}>
                             <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest">{note.author}</span>
                                <span className="px-2 py-0.5 bg-black/40 rounded-full text-[8px] font-black text-zinc-500 uppercase">p. 4</span>
                             </div>
                             <p className="text-xs italic leading-relaxed">&ldquo;{note.text}&rdquo;</p>
                          </div>
                         ))}
                     </div>
                   )}
                </div>

                <div className="p-8 pb-12 border-t border-white/10 bg-black/20 backdrop-blur-3xl">
                   <button className="w-full h-14 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-zinc-200 transition-all shadow-xl flex items-center justify-center gap-3">
                      <Bookmark size={14} />
                      Save to My Library
                   </button>
                </div>
             </aside>
           )}

        </main>

        {/* AI Chat Drawer */}
        <ChatDrawer 
           isOpen={isChatOpen} 
           onClose={() => setIsChatOpen(false)} 
           documentName={documentMetadata.title} 
        />

    </div>
  );
}
