"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, Bookmark, Bot, ExternalLink, Star, Sparkles, BookOpen, Users, PlaySquare } from 'lucide-react';

export default function DiscoverPage() {
  const [activeTab, setActiveTab] = useState<'papers' | 'researchers' | 'reels' | 'projects'>('papers');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpenAccessOnly, setIsOpenAccessOnly] = useState(false);
  const router = useRouter();

  const papers = [
    {
      id: 'disc_1',
      title: 'Attention Is All You Need',
      authors: 'Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit',
      institution: 'Google Brain / Google Research',
      year: '2017',
      citations: 112400,
      abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. We propose the Transformer, a novel architecture based solely on attention mechanisms...',
      openAccess: true
    },
    {
      id: 'disc_2',
      title: 'Language Models are Few-Shot Learners (GPT-3)',
      authors: 'Tom B. Brown, Benjamin Mann, Nick Ryder, Melanie Subbiah',
      institution: 'OpenAI',
      year: '2020',
      citations: 34200,
      abstract: 'We demonstrate that scaling up language models greatly improves task-agnostic, few-shot performance, sometimes even reaching competitiveness with prior state-of-the-art fine-tuning approaches...',
      openAccess: true
    },
    {
      id: 'disc_3',
      title: 'Deep Residual Learning for Image Recognition (ResNet)',
      authors: 'Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun',
      institution: 'Microsoft Research',
      year: '2016',
      citations: 184500,
      abstract: 'Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously...',
      openAccess: true
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header & Search */}
      <div className="space-y-4">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
          Discover Research
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground">
          Explore cutting-edge academic papers, leading researchers, reels, and collaborative projects.
        </p>

        <div className="relative max-w-2xl">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search papers by keyword, DOI, author, or institution..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 text-[var(--foreground)]"
          />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[var(--foreground)]/[0.02] border border-[var(--border)]">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-muted-foreground mr-2">
            <Filter size={14} />
            <span>Filters:</span>
          </div>

          <select className="px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none">
            <option value="all">All Topics</option>
            <option value="ai">AI / Machine Learning</option>
            <option value="nlp">Natural Language Processing</option>
            <option value="cv">Computer Vision</option>
            <option value="bio">Bioinformatics</option>
          </select>

          <select className="px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none">
            <option value="any">Any Year</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2020-2023">2020 - 2023</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isOpenAccessOnly}
              onChange={(e) => setIsOpenAccessOnly(e.target.checked)}
              className="rounded accent-indigo-600"
            />
            <span>Open Access Only</span>
          </label>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab('papers')}
          className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'papers'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-muted-foreground hover:text-[var(--foreground)]'
          }`}
        >
          <BookOpen size={16} />
          <span>Papers</span>
        </button>
        <button
          onClick={() => setActiveTab('researchers')}
          className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'researchers'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-muted-foreground hover:text-[var(--foreground)]'
          }`}
        >
          <Users size={16} />
          <span>Researchers</span>
        </button>
        <button
          onClick={() => setActiveTab('reels')}
          className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'reels'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-muted-foreground hover:text-[var(--foreground)]'
          }`}
        >
          <PlaySquare size={16} />
          <span>Reels</span>
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'projects'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-muted-foreground hover:text-[var(--foreground)]'
          }`}
        >
          <Sparkles size={16} />
          <span>Projects</span>
        </button>
      </div>

      {/* Tab Contents: Papers */}
      {activeTab === 'papers' && (
        <div className="space-y-4">
          {papers.map((paper) => (
            <div
              key={paper.id}
              className="p-5 rounded-2xl bg-[var(--foreground)]/[0.02] border border-[var(--border)] hover:border-indigo-500/30 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[var(--foreground)] hover:text-indigo-400 cursor-pointer transition-colors" onClick={() => router.push(`/library/documents/${paper.id}`)}>
                    {paper.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">{paper.authors} • {paper.institution}</p>
                </div>
                {paper.openAccess && (
                  <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full shrink-0">
                    Open Access
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground/90 line-clamp-2 leading-relaxed">
                {paper.abstract}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]/50 text-xs">
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span>Year: {paper.year}</span>
                  <span>Citations: {paper.citations.toLocaleString()}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => router.push('/library')} 
                    className="px-3 py-1.5 rounded-lg border border-[var(--border)] hover:bg-[var(--foreground)]/5 text-muted-foreground hover:text-[var(--foreground)] flex items-center gap-1.5 transition-colors"
                  >
                    <Bookmark size={14} /> Save
                  </button>
                  <button 
                    onClick={() => router.push(`/ai/ask?doc=${paper.id}`)} 
                    className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 flex items-center gap-1.5 transition-colors"
                  >
                    <Bot size={14} /> Ask AI
                  </button>
                  <button 
                    onClick={() => router.push(`/library/documents/${paper.id}`)} 
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink size={14} /> Open
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab !== 'papers' && (
        <div className="py-12 text-center text-muted-foreground text-xs space-y-2">
          <p className="font-semibold text-sm">Discovering {activeTab}...</p>
          <p>Explore thousands of community curated {activeTab} across research domains.</p>
        </div>
      )}
    </div>
  );
}
