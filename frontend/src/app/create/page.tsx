"use client";

import React, { useState } from 'react';
import NextImage from 'next/image';
import { useRouter } from 'next/navigation';
import { X, ChevronLeft, Image as ImageIcon, Smile, Lock, ShieldCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { trackEvent } from '@/lib/analytics';
import { captureException } from '@/lib/sentry';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function CreatePostPage() {
  const { user, token } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [doi, setDoi] = useState('');
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const router = useRouter();

  const isVideo = selectedFile?.type?.startsWith('video/') || false;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
      setStep(2);
    };
    reader.readAsDataURL(file);
  };

  const handleShare = async () => {
    if (!selectedFile) {
      setUploadError("No file selected.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      if (isVideo) {
        // Videos must be uploaded to the transcoding queue (media service)
        const formData = new FormData();
        formData.append('video', selectedFile);

        // Split caption into title and description
        const lines = caption.split('\n').filter(l => l.trim().length > 0);
        const title = lines[0] || 'Research Reel Video';
        const description = lines.slice(1).join('\n') || caption;

        formData.append('title', title);
        formData.append('description', description);
        
        if (tags) {
          formData.append('tags', tags);
        }
        if (doi) {
          formData.append('doi', doi);
        }

        const res = await fetch(`${API_BASE}/media/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token || localStorage.getItem('token') || ''}`
          },
          body: formData
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Video upload and processing failed.');
        }
      } else {
        // Images / Text posts go to standard posts create endpoint
        const postBody = {
          content_type: 'text',
          caption,
          media_url: '', // optional or empty url
          doi: doi || undefined
        };

        const res = await fetch(`${API_BASE}/posts/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token || localStorage.getItem('token') || ''}`
          },
          body: JSON.stringify(postBody)
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Post creation failed.');
        }
      }

      // Track analytics event
      trackEvent('first_upload', {
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        contentType: isVideo ? 'video' : 'text',
        hasDoi: !!doi,
        hasTags: !!tags
      });

      setUploadSuccess(true);
      setTimeout(() => {
        router.push('/home');
      }, 1500);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Network error occurred during upload.';
      captureException(err, {
        component: 'CreatePostPage',
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        caption
      });
      setUploadError(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  if (user?.role === 'viewer') {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-[var(--background)] border border-[var(--border)]/20 rounded-[40px] p-12 text-center shadow-2xl space-y-8">
           <div className="w-24 h-24 bg-indigo-500/10 rounded-[32px] flex items-center justify-center mx-auto border border-indigo-500/20">
              <Lock size={40} className="text-indigo-500" />
           </div>
           <div className="space-y-4">
              <h2 className="text-3xl font-black uppercase tracking-tight italic">Access Restricted</h2>
              <p className="text-zinc-500 text-sm font-medium leading-relaxed px-8">
                Your current account status is <span className="text-indigo-500 font-black italic">VIEWER</span>. 
                Only verified Scholars, Students, and Professors can publish breakthroughs to the ResearchReel network.
              </p>
           </div>
           <div className="pt-4">
              <button 
                onClick={() => window.history.back()}
                className="px-10 py-4 bg-indigo-600 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center gap-3 mx-auto"
              >
                 <ShieldCheck size={18} />
                 Return to Station
              </button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex items-center justify-center p-4 selection:bg-indigo-500/30">
      {/* Background Blur Overlay */}
      <div className="fixed inset-0 bg-[var(--background)]/80 backdrop-blur-sm -z-10"></div>
      
      <div className="w-full max-w-[800px] bg-[var(--background)] rounded-[32px] overflow-y-auto md:overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-[500px] max-h-[90vh] md:max-h-none border border-[var(--border)]/10 relative">
        
        {/* Header - Desktop & Mobile */}
        <div className="sticky md:absolute top-0 inset-x-0 h-14 border-b border-[var(--border)]/10 flex items-center justify-between px-6 bg-[var(--background)] z-20 shrink-0">
          <button 
            onClick={() => step === 2 ? setStep(1) : router.back()} 
            disabled={isUploading}
            className="p-2 hover:bg-[var(--foreground)]/5 rounded-full transition-colors disabled:opacity-50"
          >
            {step === 2 ? <ChevronLeft size={20} /> : <X size={20} />}
          </button>
          <h1 className="text-sm font-black uppercase tracking-widest italic">
            {step === 1 ? 'Create new post' : 'Finalize Breakthrough'}
          </h1>
          {step === 2 ? (
            isUploading ? (
              <div className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-indigo-500" />
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Uploading</span>
              </div>
            ) : uploadSuccess ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Shared!</span>
              </div>
            ) : (
              <button 
                onClick={handleShare} 
                disabled={isUploading}
                className="text-sm font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-600 transition-colors disabled:opacity-50"
              >
                Share
              </button>
            )
          ) : (
            <div className="w-10"></div>
          )}
        </div>

        {/* Content Area */}
        <div className={`flex-1 mt-14 relative flex items-center justify-center bg-[var(--foreground)]/[0.02] ${dragActive ? 'bg-[var(--foreground)]/5' : ''} transition-colors`}
             onDragEnter={handleDrag}
             onDragLeave={handleDrag}
             onDragOver={handleDrag}
             onDrop={handleDrop}>
          
          {step === 1 ? (
            <div className="text-center p-12 space-y-6">
              <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center bg-indigo-500/5 rounded-full border-2 border-dashed border-indigo-500/20 text-indigo-500/50 group-hover:scale-110 transition-transform">
                 <ImageIcon size={48} strokeWidth={1} />
              </div>
              <div className="space-y-2">
                <p className="text-xl font-black uppercase tracking-tight italic">Drag research media here</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Images, Videos, or Technical Plots</p>
              </div>
              <label className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-[0.2em] py-3 px-8 rounded-xl cursor-pointer transition-all shadow-lg shadow-indigo-600/20 active:scale-95 mt-4">
                Select from computer
                <input type="file" className="hidden" onChange={(e) => e.target.files && handleFile(e.target.files[0])} accept="image/*,video/*" />
              </label>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center p-8 min-h-[300px] md:min-h-0 relative">
               {isVideo ? (
                 <video src={previewUrl!} controls className="max-w-full max-h-[80%] rounded-xl shadow-2xl bg-black" />
               ) : (
                 <NextImage src={previewUrl!} alt="Preview" fill className="object-contain rounded-xl shadow-2xl" unoptimized />
               )}
            </div>
          )}
        </div>

        {/* Sidebar - Desktop & Mobile Finalize */}
        {step === 2 && (
          <div className="flex w-full md:w-[340px] flex-col border-t md:border-t-0 md:border-l border-[var(--border)]/10 shrink-0">
            <div className="flex-1 p-6 flex flex-col gap-6 md:overflow-y-auto md:no-scrollbar">
              {/* User Profile */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-black text-white italic shadow-sm">
                  {user?.username ? user.username[0].toUpperCase() : 'U'}
                </div>
                <span className="text-xs font-black uppercase tracking-widest italic">{user?.username || 'scholar_username'}</span>
              </div>

              {/* Caption Input */}
              <div className="flex flex-col min-h-[140px] relative">
                <textarea 
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption for your breakthrough..."
                  disabled={isUploading}
                  className="w-full flex-1 bg-transparent border-none outline-none resize-none text-sm font-medium leading-relaxed placeholder:text-zinc-500 disabled:opacity-50"
                />
                <div className="flex justify-between items-center text-zinc-500 pt-2">
                  <button className="p-2 hover:bg-[var(--foreground)]/5 rounded-full transition-colors">
                    <Smile size={18} />
                  </button>
                  <span className="text-[9px] font-black uppercase tracking-widest">{caption.length}/2,200</span>
                </div>
              </div>

              {/* Metadata Inputs */}
              <div className="space-y-4 pt-4 border-t border-[var(--border)]/10">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g. quantum-computing, superconductivity"
                    disabled={isUploading}
                    className="w-full bg-[var(--foreground)]/[0.03] border border-[var(--border)]/15 rounded-xl px-3 py-2 text-xs text-[var(--foreground)] placeholder-zinc-600 outline-none focus:border-indigo-500/50 transition-all disabled:opacity-50 font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">DOI / Reference (optional)</label>
                  <input
                    type="text"
                    value={doi}
                    onChange={(e) => setDoi(e.target.value)}
                    placeholder="e.g. 10.1038/s41586-021-03491-6"
                    disabled={isUploading}
                    className="w-full bg-[var(--foreground)]/[0.03] border border-[var(--border)]/15 rounded-xl px-3 py-2 text-xs text-[var(--foreground)] placeholder-zinc-600 outline-none focus:border-indigo-500/50 transition-all disabled:opacity-50 font-mono"
                  />
                </div>
              </div>

              {/* Error and Success States */}
              {uploadError && (
                <div className="flex items-start gap-2.5 text-red-400 text-xs bg-red-500/8 border border-red-500/20 rounded-xl p-3 mt-2 animate-fade-in shrink-0">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="flex items-start gap-2.5 text-emerald-400 text-xs bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-3 mt-2 animate-fade-in shrink-0">
                  <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">Breakthrough shared successfully! Redirecting...</span>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
