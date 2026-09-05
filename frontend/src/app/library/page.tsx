"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, Upload, FileText, MoreVertical, Bot, Film, Users, History, Trash2, ExternalLink } from 'lucide-react';
import UploadPaperModal from '@/components/ui/UploadPaperModal';

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'recent' | 'favorites' | 'shared'>('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const router = useRouter();

  const documents = [
    {
      id: 'doc_1',
      title: 'Attention Is All You Need',
      authors: 'Vaswani et al.',
      addedDate: '2 days ago',
      hasSummary: true,
      favorite: true
    },
    {
      id: 'doc_2',
      title: 'BERT: Pre-training of Deep Bidirectional Transformers',
      authors: 'Devlin et al.',
      addedDate: '1 week ago',
      hasSummary: true,
      favorite: false
    },
    {
      id: 'doc_3',
      title: 'Retrieval-Augmented Generation for Knowledge-Intensive Tasks',
      authors: 'Lewis et al.',
      addedDate: '2 weeks ago',
      hasSummary: true,
      favorite: true
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
            My Research Library
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Manage your uploaded papers, AI indexed research documents, and saved literature.
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-colors flex items-center gap-2"
        >
          <Upload size={16} />
          <span>Upload Paper</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)]">
        {(['all', 'recent', 'favorites', 'shared'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-xs font-semibold capitalize border-b-2 transition-all ${
              activeTab === tab
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-muted-foreground hover:text-[var(--foreground)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="p-5 rounded-2xl bg-[var(--foreground)]/[0.02] border border-[var(--border)] hover:border-indigo-500/40 transition-all space-y-4 relative group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                <FileText size={20} />
              </div>
              <div className="flex items-center gap-1">
                {doc.favorite && (
                  <Bookmark size={16} className="text-amber-400 fill-amber-400" />
                )}
              </div>
            </div>

            <div className="space-y-1">
              <h3 
                onClick={() => router.push(`/library/documents/${doc.id}`)}
                className="text-sm font-bold text-[var(--foreground)] hover:text-indigo-400 cursor-pointer transition-colors line-clamp-1"
              >
                {doc.title}
              </h3>
              <p className="text-xs text-muted-foreground">{doc.authors}</p>
              <p className="text-[11px] text-muted-foreground/70">Added {doc.addedDate}</p>
            </div>

            {doc.hasSummary && (
              <span className="inline-block px-2.5 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md">
                AI Summary Ready
              </span>
            )}

            <div className="pt-2 border-t border-[var(--border)]/50 flex items-center justify-between text-xs">
              <button
                onClick={() => router.push(`/library/documents/${doc.id}`)}
                className="text-indigo-400 font-semibold hover:underline flex items-center gap-1"
              >
                <ExternalLink size={14} /> Open Reader
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => router.push(`/ai/ask?doc=${doc.id}`)}
                  title="Ask AI"
                  className="p-1.5 rounded-lg hover:bg-[var(--foreground)]/10 text-muted-foreground hover:text-indigo-400"
                >
                  <Bot size={15} />
                </button>
                <button
                  onClick={() => router.push('/reels/create')}
                  title="Generate Reel"
                  className="p-1.5 rounded-lg hover:bg-[var(--foreground)]/10 text-muted-foreground hover:text-purple-400"
                >
                  <Film size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <UploadPaperModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />
    </div>
  );
}
