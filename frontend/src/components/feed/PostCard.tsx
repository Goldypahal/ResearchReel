"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useSocial } from '@/context/SocialContext';
import { 
  MoreHorizontal, Heart, MessageCircle, Send, Bookmark, Sparkles, 
  X, Check, Copy, AlertTriangle, UserMinus, BookOpen
} from 'lucide-react';
import dynamic from 'next/dynamic';
import ResearchPaperReader from '@/components/reader/ResearchPaperReader';
import { trackEvent } from '@/lib/analytics';

const PDFPreview = dynamic(() => import('./PDFPreview'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
    </div>
  )
});

export interface PostProps {
  id: string;
  author_name: string;
  author_username: string;
  author_avatar?: string;
  author_img?: string;
  verification_status: string;
  content_type: 'text' | 'image' | 'document' | 'code' | 'video';
  caption: string;
  media_urls?: string[];
  document_name?: string;
  summary_text?: string;
  abstract?: string;
  tags?: string[];
  reaction_count: number;
  // DOI / research paper fields (from Crossref import)
  doi?: string | null;
  doi_url?: string | null;
  pdf_url?: string | null;
  landing_url?: string | null;
  title?: string;
  authors?: { name: string; orcid?: string | null }[];
  journal?: string;
  year?: number | null;
  cited_by_count?: number;
}

export default function PostCard({ post }: { post: PostProps }) {
  const { user, token } = useAuth();
  const { followingMap, followUser, unfollowUser } = useSocial();

  // Derive clean username first so it can be used for follow state
  const cleanUsername = post.author_username?.startsWith('@')
    ? post.author_username.slice(1)
    : (post.author_username || 'anonymous');

  const followerUsername = user?.username
    ? (user.username.startsWith('@') ? user.username.slice(1) : user.username)
    : 'julianewton';
  const targetUsername = cleanUsername;
  const isFollowing = followingMap[followerUsername]?.includes(targetUsername) || false;

  // Interaction States
  const [reactions, setReactions] = useState(post.reaction_count);
  const [reacted, setReacted] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  // Overlay Menu States
  const [isOptionsMenuOpen, setIsOptionsMenuOpen] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Content Report States
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // In-app paper reader
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  
  // Comments Flow States
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [commentsList, setCommentsList] = useState([
    {
      id: "c1",
      username: "@julianewton",
      verification: "scholar",
      text: "Fascinating methodology! The Lorentz-covariance wave-function proof is exceptionally solid.",
      time: "2h"
    },
    {
      id: "c2",
      username: "@athompson_cs",
      verification: "student",
      text: "Is there an open repository for the Minkowski spacetime code templates used here?",
      time: "1h"
    }
  ]);

  // Gemini Chat States
  const [isGeminiChatOpen, setIsGeminiChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ sender: 'user' | 'gemini', text: string }[]>([]);
  const [isChatTyping, setIsChatTyping] = useState(false);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isGeminiChatOpen && chatHistory.length === 0) {
      const timer = setTimeout(() => {
        setChatHistory([
          { 
            sender: 'gemini', 
            text: `Hi, I am the Gemini RAG Agent. I've processed the document '${post.document_name || "Post Context"}'. Ask me anything about its findings, methodology, or equations.` 
          }
        ]);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isGeminiChatOpen, chatHistory.length, post.document_name]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 2500);
  };

  const handleReact = () => {
    if (reacted) {
      setReacted(false);
      setReactions(prev => prev - 1);
    } else {
      setReacted(true);
      setReactions(prev => prev + 1);
      showToast("Added to liked posts");
      trackEvent('first_reaction', {
        postId: post.id,
        authorUsername: post.author_username,
        contentType: post.content_type
      });
    }
  };

  const handleSave = () => {
    if (isSaved) {
      setIsSaved(false);
      showToast("Removed from Research Library");
    } else {
      setIsSaved(true);
      showToast("Saved to Research Library");
    }
  };

  const handleCopyLink = () => {
    const linkText = typeof window !== 'undefined' ? `${window.location.origin}/paper/${post.id}` : "";
    navigator.clipboard.writeText(linkText);
    setIsOptionsMenuOpen(false);
    setIsShareMenuOpen(false);
    showToast("Link copied to clipboard!");
  };

  const handleToggleFollow = () => {
    if (isFollowing) {
      unfollowUser(followerUsername, targetUsername);
      showToast(`Unfollowed ${post.author_username}`);
    } else {
      followUser(followerUsername, targetUsername);
      showToast(`Following ${post.author_username}`);
    }
    setIsOptionsMenuOpen(false);
  };

  const handleReport = () => {
    setIsOptionsMenuOpen(false);
    if (!token) {
      showToast("Authentication required to report posts");
      return;
    }
    setIsReportModalOpen(true);
  };

  const handleSubmitReport = async () => {
    if (!token) return;
    setIsSubmittingReport(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_BASE}/moderation/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          post_id: post.id,
          reason: reportReason,
          details: reportDetails
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit report');

      showToast("Report submitted successfully");
      setIsReportModalOpen(false);
      setReportDetails("");
    } catch (error) {
      const err = error as Error;
      showToast(err.message || "Failed to submit report");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleShareToWorkspace = (workspaceName: string) => {
    showToast(`Shared to ${workspaceName} successfully!`);
    setIsShareMenuOpen(false);
  };

  const handleAddComment = () => {
    if (!commentInput.trim()) return;
    
    const newComment = {
      id: `c-${Date.now()}`,
      username: user?.username ? `@${user.username.replace(/^@/, '')}` : "@anonymous",
      verification: user?.role === 'scholar' || user?.role === 'professor' ? 'scholar' : 'student',
      text: commentInput,
      time: "1s"
    };

    setCommentsList(prev => [...prev, newComment]);
    setCommentInput("");
    setShowComments(true);
    showToast("Comment posted!");
    trackEvent('first_comment', {
      postId: post.id,
      commentLength: commentInput.length,
      authorUsername: post.author_username
    });
  };

  const getSuggestions = () => {
    if (post.document_name?.includes("Relativity")) {
      return [
        "Summarize the key contribution",
        "Explain the methodology",
        "What are the limitations?"
      ];
    }
    if (post.document_name?.includes("Radiological")) {
      return [
        "What was the cryogenic decay anomaly?",
        "Explain the methodology",
        "What are the experimental uncertainties?"
      ];
    }
    return [
      "Summarize the main topic",
      "Who is the lead author?",
      "Are there code implementation details?"
    ];
  };

  const handleSendPrompt = (promptText: string) => {
    if (!promptText.trim()) return;
    
    setChatHistory(prev => [...prev, { sender: 'user', text: promptText }]);
    setChatInput("");
    setIsChatTyping(true);

    let responseText = "Based on my context analysis of this paper, the findings represent a key milestone in this domain. However, additional experiments will be required to validate the quantitative baseline improvements.";
    const cleanPrompt = promptText.toLowerCase();

    if (post.document_name?.includes("Relativity")) {
      if (cleanPrompt.includes("summarize") || cleanPrompt.includes("contribution")) {
        responseText = "This paper integrates the core principles of special relativity with modern quantum observers. It proves that wave-function collapse duration is Lorentz-covariant and depends on the reference frame velocity of the measurement device.";
      } else if (cleanPrompt.includes("methodology") || cleanPrompt.includes("explain")) {
        responseText = "The methodology employs a modified Minkowski spacetime formulation where observer state vectors are parameterized using quantum density matrices, leading to coordinate-free quantum measurements.";
      } else if (cleanPrompt.includes("limitation") || cleanPrompt.includes("limit")) {
        responseText = "The primary limitation is the neglect of general relativistic gravity effects; the current model is strictly restricted to flat spacetime (special relativity) and does not scale to strong gravitational fields near black holes.";
      }
    } else if (post.document_name?.includes("Radiological")) {
      if (cleanPrompt.includes("anomaly") || cleanPrompt.includes("cryogenic") || cleanPrompt.includes("decay")) {
        responseText = "The paper documents a minor anomalous decay acceleration of 0.04% in radium isotope samples when cooled to extreme cryogenic temperatures (below 4K) compared to ambient conditions.";
      } else if (cleanPrompt.includes("methodology") || cleanPrompt.includes("explain")) {
        responseText = "The experiment uses a custom-insulated liquid helium cryostat combined with high-precision ionization chambers to isolate and record emission rates over a continuous 72-hour cycle.";
      } else if (cleanPrompt.includes("uncertainty") || cleanPrompt.includes("limitation")) {
        responseText = "Thermal leakage during liquid helium refilling cycles introduced a ±0.01% measurement uncertainty. Furthermore, the decay rate acceleration mechanism remains theoretical and requires validation from standard thermodynamic nuclear theories.";
      }
    } else if (post.document_name?.includes("NeurSymbolic")) {
      if (cleanPrompt.includes("summarize") || cleanPrompt.includes("contribution")) {
        responseText = "The paper proposes a novel Neuro-Symbolic integration layer for transformers. By embedding first-order logic constraints directly into the attention mechanism, it reduces out-of-distribution reasoning errors by 24%.";
      } else if (cleanPrompt.includes("methodology") || cleanPrompt.includes("explain")) {
        responseText = "The authors introduce a differentiable SAT solver that acts as a regularizer during backpropagation, penalizing transformer attention patterns that violate pre-defined symbolic axioms.";
      } else if (cleanPrompt.includes("limitation") || cleanPrompt.includes("limit")) {
        responseText = "The SAT regularizer scales quadratically with the number of symbolic logic constraints, making it computationally heavy for large databases with thousands of rules.";
      }
    }

    setTimeout(() => {
      setIsChatTyping(false);
      setChatHistory(prev => [...prev, { sender: 'gemini', text: responseText }]);
    }, 1200);
  };


  return (
    <div className="w-full bg-transparent border-b border-[var(--border)]/10 pb-8 mb-8 text-[var(--foreground)] max-w-[600px] mx-auto transition-all relative">
      
      {/* Header */}
      <div className="flex items-center justify-between px-0 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center border border-[var(--border)]/10 shadow-sm bg-zinc-900">
            {post.author_img ? (
              <Image src={post.author_img} alt={post.author_name} width={36} height={36} className="w-full h-full object-cover transition-all" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-white">
                {cleanUsername.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-bold text-sm hover:underline cursor-pointer transition-colors tracking-tight lowercase">{cleanUsername}</span>
              {post.verification_status === 'scholar' && (
                <span className="text-[#0095f6] text-[11px] font-bold" title="Verified Scholar">✓</span>
              )}
              {isFollowing ? (
                <span className="text-zinc-500 text-xs ml-1">• 2h</span>
              ) : (
                <button 
                  onClick={handleToggleFollow}
                  className="text-xs text-indigo-500 font-semibold hover:text-indigo-400 ml-2 transition-all"
                >
                  • Follow
                </button>
              )}
            </div>
          </div>
        </div>
        <button 
          onClick={() => setIsOptionsMenuOpen(true)}
          className="text-[var(--foreground)] opacity-50 hover:opacity-100 transition-opacity p-2 hover:bg-[var(--foreground)]/5 rounded-full"
        >
          <MoreHorizontal size={20} />
        </button>
      </div>

      {/* Content Area (Image/Video/Doc) */}
      <div className={`w-full bg-[var(--foreground)]/[0.03] border border-[var(--border)]/10 rounded-lg relative group cursor-pointer overflow-hidden shadow-sm flex items-center justify-center ${
        post.content_type === 'document' ? 'aspect-[3/4]' : 'aspect-square'
      }`}>
        {post.content_type === 'document' ? (
          isMounted ? (
            <PDFPreview 
              file={`/${post.document_name}`} 
              fallbackName={post.document_name || "Research Document"} 
              fallbackSummary={post.summary_text || ""} 
            />
          ) : (
            <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
          )
        ) : post.content_type === 'image' ? (
           <Image 
             src={post.media_urls?.[0] || ""} 
             alt={post.caption} 
             fill 
             className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" 
           />
        ) : (
           <div className="p-10 text-center text-base font-semibold leading-relaxed px-12">
             {post.caption}
           </div>
        )}
      </div>

      {/* Action Bar (Icons) */}
      <div className="flex justify-between px-0 pt-3.5 pb-1.5">
        <div className="flex gap-4">
          <button onClick={handleReact} className="transition-transform active:scale-125 text-[var(--foreground)]">
            {reacted ? (
              <Heart size={24} fill="#ef4444" className="text-red-500" />
            ) : (
              <Heart size={24} strokeWidth={1.8} className="hover:text-red-500 transition-colors" />
            )}
          </button>
          <button 
            onClick={() => setShowComments(prev => !prev)}
            className={`hover:text-indigo-500 transition-colors text-[var(--foreground)] ${showComments ? 'text-indigo-500' : ''}`}
          >
            <MessageCircle size={24} strokeWidth={1.8} />
          </button>
          <button 
            onClick={() => setIsShareMenuOpen(true)}
            className="hover:text-indigo-500 transition-colors text-[var(--foreground)]"
          >
            <Send size={24} strokeWidth={1.8} />
          </button>
        </div>
        <button 
          onClick={handleSave}
          className="hover:text-indigo-500 transition-colors text-[var(--foreground)]"
        >
          {isSaved ? (
            <Bookmark size={24} fill="currentColor" className="text-indigo-500" />
          ) : (
            <Bookmark size={24} strokeWidth={1.8} />
          )}
        </button>
      </div>

      {/* Likes */}
      <div className="px-0 mb-1.5">
        <span className="text-sm font-bold">{reactions.toLocaleString()} likes</span>
      </div>

      {/* Caption */}
      <div className="px-0 mb-2 flex items-start gap-1.5">
        <span className="font-bold text-sm lowercase shrink-0">{cleanUsername}</span>
        <span className="text-sm text-[var(--foreground)] opacity-95 leading-relaxed">{post.caption}</span>
      </div>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="px-0 mb-2 flex flex-wrap gap-x-2">
          {post.tags.map(tag => (
            <span key={tag} className="text-sm font-normal text-indigo-500 hover:underline cursor-pointer">
              #{tag.toLowerCase()}
            </span>
          ))}
        </div>
      )}

      {/* Read Full Paper Button + Ask Gemini */}
      {post.content_type === 'document' && (
        <div className="px-0 mb-2 flex items-center justify-between">
          <button 
            onClick={() => setIsReaderOpen(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-3.5 py-1.5 rounded-full transition-all shadow-md shadow-indigo-600/20 active:scale-95"
          >
            <BookOpen size={12} />
            <span>Read Full Paper</span>
          </button>
          <button 
            onClick={() => setIsGeminiChatOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-500 hover:text-indigo-400 transition-colors"
          >
            <Sparkles size={13} />
            <span>Ask Gemini</span>
          </button>
        </div>
      )}

      {/* Comments List (Toggled) */}
      {showComments && (
        <div className="mt-3.5 space-y-3.5 pl-1 max-h-[220px] overflow-y-auto border-l-2 border-zinc-800/40 pl-3 transition-all scrollbar-thin">
          {commentsList.map(c => (
            <div key={c.id} className="flex flex-col text-sm">
              <div className="flex items-center gap-1.5">
                <span className="font-bold lowercase text-xs">{c.username}</span>
                {c.verification === 'scholar' && (
                  <span className="text-[#0095f6] text-[10px]">✓</span>
                )}
                <span className="text-zinc-500 text-[10px]">{c.time}</span>
              </div>
              <p className="text-zinc-300 text-xs mt-0.5 leading-relaxed">{c.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Comments Toggle Button */}
      <div className="px-0 mb-2 mt-1">
        <button 
          onClick={() => setShowComments(prev => !prev)}
          className={`text-sm text-zinc-500 hover:text-zinc-400 transition-colors`}
        >
          {showComments ? "Hide discussions" : `View all ${commentsList.length} discussions`}
        </button>
      </div>
      
      {/* Add comment input */}
      {user?.role !== 'viewer' ? (
        <div className="px-0 flex items-center justify-between border-t border-[var(--border)]/5 pt-3 mt-2">
          <input 
            type="text" 
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
            placeholder="Add a comment..."
            className="bg-transparent text-sm w-full outline-none placeholder:text-zinc-500 placeholder:text-sm text-[var(--foreground)]"
          />
          <button 
            onClick={handleAddComment}
            className="text-indigo-500 text-sm font-semibold hover:text-indigo-400 transition-colors pl-2"
          >
            Post
          </button>
        </div>
      ) : (
        <div className="px-0 py-1.5 mt-2 text-left border-t border-[var(--border)]/5">
           <span className="text-xs text-zinc-500">Verification required to join discussions</span>
        </div>
      )}

      {/* --- MODALS & INTERACTION OVERLAYS --- */}

      {/* Options Menu Modal (Three dots) */}
      {isOptionsMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center animate-fade-in">
          <div className="absolute inset-0" onClick={() => setIsOptionsMenuOpen(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-[90%] max-w-[320px] overflow-hidden shadow-2xl z-10 flex flex-col">
            <button 
              onClick={handleCopyLink}
              className="px-4 py-3.5 text-sm font-semibold border-b border-zinc-850 hover:bg-zinc-800/40 text-indigo-400 transition-all flex items-center justify-center gap-2"
            >
              <Copy size={16} />
              <span>Copy Document Link</span>
            </button>
            <button 
              onClick={handleToggleFollow}
              className="px-4 py-3.5 text-sm font-semibold border-b border-zinc-850 hover:bg-zinc-800/40 text-red-400 transition-all flex items-center justify-center gap-2"
            >
              <UserMinus size={16} />
              <span>{isFollowing ? `Unfollow ${post.author_username}` : `Follow ${post.author_username}`}</span>
            </button>
            <button 
              onClick={handleReport}
              className="px-4 py-3.5 text-sm font-semibold border-b border-zinc-850 hover:bg-zinc-800/40 text-zinc-400 hover:text-red-400 transition-all flex items-center justify-center gap-2"
            >
              <AlertTriangle size={16} />
              <span>Report Paper</span>
            </button>
            <button 
              onClick={() => setIsOptionsMenuOpen(false)}
              className="px-4 py-3.5 text-sm font-medium hover:bg-zinc-800/40 text-zinc-500 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Share / Send Workspace Modal */}
      {isShareMenuOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center animate-fade-in">
          <div className="absolute inset-0" onClick={() => setIsShareMenuOpen(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl w-[90%] max-w-[380px] p-5 shadow-2xl z-10 flex flex-col text-zinc-100">
            <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-sm">Share paper</h3>
              <button onClick={() => setIsShareMenuOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                <X size={18} />
              </button>
            </div>

            {/* Direct Send to Users */}
            <div className="space-y-2 mb-4">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Direct Message</span>
              <div className="max-h-[120px] overflow-y-auto space-y-1.5 pr-1">
                {[
                  { name: "Albert Einstein", username: "@the_einstein" },
                  { name: "Marie Curie", username: "@m_curie" },
                  { name: "Nikola Tesla", username: "@tesla" },
                  { name: "Alan Turing", username: "@a_turing" }
                ].map(u => (
                  <div key={u.username} className="flex justify-between items-center p-1.5 hover:bg-zinc-800/20 rounded">
                    <div className="flex flex-col">
                      <span className="text-xs font-medium">{u.name}</span>
                      <span className="text-[10px] text-zinc-500">{u.username}</span>
                    </div>
                    <button 
                      onClick={() => handleShareToWorkspace(u.username)}
                      className="text-[10px] font-semibold border border-zinc-700 hover:bg-zinc-800 px-2 py-0.5 rounded transition-all"
                    >
                      Send
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Copy link option */}
            <button 
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 hover:border-indigo-500/30 rounded-xl text-indigo-400 text-xs font-bold transition-all mt-2"
            >
              <Copy size={14} />
              <span>Copy Share Link</span>
            </button>
          </div>
        </div>
      )}

      {/* Gemini RAG Chat Side Panel */}
      {isGeminiChatOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex justify-end animate-fade-in">
          <div className="absolute inset-0" onClick={() => setIsGeminiChatOpen(false)} />
          
          <div className="relative w-full max-w-[460px] h-full bg-zinc-950 border-l border-zinc-800/80 shadow-2xl flex flex-col justify-between p-6 text-zinc-100 z-10 animate-slide-in">
            {/* Header */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-indigo-500 animate-pulse" size={20} />
                  <h3 className="font-bold text-lg text-white">Gemini RAG Agent</h3>
                </div>
                <button onClick={() => setIsGeminiChatOpen(false)} className="text-zinc-400 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <p className="text-xs text-zinc-500 border-b border-zinc-800 pb-3">
                Analyzing paper: <span className="text-indigo-400 font-mono">{post.document_name || "Context Document"}</span>
              </p>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1 text-sm scrollbar-thin">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 leading-relaxed text-xs ${
                    msg.sender === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-md' 
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-tl-none shadow-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isChatTyping && (
                <div className="flex justify-start">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            {/* Prompt suggestions & Chat Input */}
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {getSuggestions().map((s, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleSendPrompt(s)}
                    className="text-[10px] font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/30 px-2.5 py-1.5 rounded-full transition-all text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 border border-zinc-800 bg-zinc-900/50 rounded-xl px-3 py-2">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendPrompt(chatInput)}
                  placeholder="Ask a question about this paper..."
                  className="bg-transparent outline-none flex-1 text-xs text-zinc-100 placeholder:text-zinc-500"
                />
                <button 
                  onClick={() => handleSendPrompt(chatInput)}
                  className="text-indigo-500 hover:text-indigo-400 transition-colors p-1"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[99999] flex items-center justify-center animate-fade-in p-4">
          <div className="absolute inset-0" onClick={() => setIsReportModalOpen(false)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-[420px] p-6 shadow-2xl z-10 flex flex-col text-zinc-100">
            <div className="flex justify-between items-center mb-5 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-red-500">
                <AlertTriangle size={18} />
                <h3 className="font-bold text-sm">Report Content</h3>
              </div>
              <button onClick={() => setIsReportModalOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-2">Reason for Report</label>
                <select 
                  value={reportReason} 
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                >
                  <option value="spam">Spam or Misleading</option>
                  <option value="plagiarism">Plagiarism / Unattributed Work</option>
                  <option value="inappropriate">Inappropriate content</option>
                  <option value="copyright">Intellectual property/Copyright violation</option>
                  <option value="other">Other issue</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-2">Details (Optional)</label>
                <textarea 
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Provide any additional context or proof links..."
                  rows={4}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setIsReportModalOpen(false)}
                  className="flex-1 h-9 bg-zinc-950 border border-zinc-850 hover:bg-zinc-850 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmitReport}
                  disabled={isSubmittingReport}
                  className="flex-1 h-9 bg-red-600 hover:bg-red-500 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all disabled:opacity-50"
                >
                  {isSubmittingReport ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-zinc-900/95 border border-zinc-800 text-zinc-100 px-4 py-2.5 rounded-full shadow-2xl z-[99999] text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Check size={14} className="text-indigo-500" />
          <span>{toast}</span>
        </div>
      )}

      {/* In-App Research Paper Reader */}
      <ResearchPaperReader
        isOpen={isReaderOpen}
        onClose={() => setIsReaderOpen(false)}
        paper={{
          title: post.title || post.document_name || post.caption,
          authors: post.authors,
          author_name: post.author_name,
          journal: post.journal,
          year: post.year,
          doi: post.doi,
          doi_url: post.doi_url,
          pdf_url: post.pdf_url,
          landing_url: post.landing_url,
          abstract: post.abstract,
          summary_text: post.summary_text,
          document_name: post.document_name,
          cited_by_count: post.cited_by_count,
          tags: post.tags,
        }}
      />

    </div>
  );
}
