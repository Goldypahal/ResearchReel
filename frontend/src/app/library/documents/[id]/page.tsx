"use client";

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  ArrowLeft, Bookmark, Share2, Bot, Sparkles, Film, 
  Users, Search, ChevronRight, Send, Check, BookOpen, Layers
} from 'lucide-react';

export default function DocumentReaderPage() {
  const router = useRouter();
  const params = useParams();
  const docId = params.id as string;

  const [activeTabMobile, setActiveTabMobile] = useState<'document' | 'ai'>('document');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiMessages, setAiMessages] = useState([
    {
      sender: 'ai',
      text: 'Hello! I am your AI Research Copilot for "Attention Is All You Need". Ask me any question regarding methodology, math derivations, or experimental benchmarks.'
    }
  ]);

  const outline = [
    { title: 'Abstract', page: 1 },
    { title: '1. Introduction', page: 1 },
    { title: '2. Background', page: 2 },
    { title: '3. Model Architecture', page: 3 },
    { title: '4. Why Self-Attention', page: 5 },
    { title: '5. Training', page: 6 },
    { title: '6. Results & Benchmarks', page: 7 },
    { title: '7. Conclusion', page: 9 },
  ];

  const handleSendAi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;

    const userText = aiQuestion;
    setAiMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setAiQuestion('');

    setTimeout(() => {
      setAiMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `Based on Section 3 (p. 3) of the paper, the Transformer replaces recurrent layers with multi-head self-attention. This allows O(1) sequential operation length compared to O(n) in RNNs.`
        }
      ]);
    }, 800);
  };

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col -m-4 md:-m-8 bg-[var(--background)]">
      {/* Top Utility Header */}
      <header className="h-14 border-b border-[var(--border)] px-4 flex items-center justify-between gap-4 shrink-0 bg-[var(--background)]/90 backdrop-blur-md">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push('/library')}
            className="p-1.5 rounded-lg hover:bg-[var(--foreground)]/10 text-muted-foreground hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-sm font-bold text-[var(--foreground)] truncate">
            Attention Is All You Need (Vaswani et al. 2017)
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 text-xs">
          <button 
            onClick={() => router.push(`/ai/summarize?doc=${docId}`)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-lg border border-indigo-500/20 font-medium transition-colors"
          >
            <Sparkles size={14} />
            <span>Summarize</span>
          </button>
          <button 
            onClick={() => router.push('/reels/create')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-lg border border-purple-500/20 font-medium transition-colors"
          >
            <Film size={14} />
            <span>Reel</span>
          </button>
          <button className="p-2 rounded-lg hover:bg-[var(--foreground)]/10 text-muted-foreground hover:text-[var(--foreground)]">
            <Bookmark size={16} />
          </button>
          <button className="p-2 rounded-lg hover:bg-[var(--foreground)]/10 text-muted-foreground hover:text-[var(--foreground)]">
            <Share2 size={16} />
          </button>
        </div>
      </header>

      {/* 3-Panel Workspace Layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Panel: Outline & Search */}
        <aside className="w-64 border-r border-[var(--border)] p-4 space-y-4 hidden lg:flex flex-col shrink-0 bg-[var(--foreground)]/[0.01]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search in document..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--foreground)]/5 border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-indigo-500/40"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Document Outline</h3>
            {outline.map((item) => (
              <button
                key={item.title}
                className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg hover:bg-[var(--foreground)]/5 text-left text-muted-foreground hover:text-[var(--foreground)] transition-colors"
              >
                <span className="truncate">{item.title}</span>
                <span className="text-[10px] text-zinc-500">p.{item.page}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Center Panel: PDF / Document Viewer */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col items-center bg-[var(--foreground)]/[0.02]">
          <div className="w-full max-w-3xl bg-[var(--background)] border border-[var(--border)] rounded-2xl p-8 shadow-xl space-y-6">
            <div className="border-b border-[var(--border)] pb-6 space-y-2">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Research Paper</span>
              <h2 className="text-2xl font-black text-[var(--foreground)] leading-tight">
                Attention Is All You Need
              </h2>
              <p className="text-xs text-muted-foreground">
                Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser, Illia Polosukhin
              </p>
            </div>

            <div className="space-y-4 text-sm text-[var(--foreground)]/90 leading-relaxed font-sans">
              <h3 className="text-base font-bold text-[var(--foreground)]">Abstract</h3>
              <p>
                The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose the Transformer, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism to draw global dependencies between input and output.
              </p>

              <h3 className="text-base font-bold text-[var(--foreground)] pt-4">1. Introduction</h3>
              <p>
                Recurrent neural networks, particularly long short-term memory (LSTM) and gated recurrent (GRU) neural networks, have been firmly established as state of the art approaches in sequence modeling and transduction problems such as language modeling and machine translation.
              </p>

              <h3 className="text-base font-bold text-[var(--foreground)] pt-4">3. Model Architecture</h3>
              <p>
                Most competitive neural sequence transduction models have an encoder-decoder structure. Here, the encoder maps an input sequence of symbol representations to a sequence of continuous representations.
              </p>
            </div>
          </div>
        </main>

        {/* Right Panel: AI Research Copilot */}
        <aside className="w-80 border-l border-[var(--border)] flex flex-col shrink-0 bg-[var(--background)] hidden md:flex">
          <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
              <Bot size={16} />
              <span>AI Research Copilot</span>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {aiMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl text-xs space-y-1 ${
                  msg.sender === 'ai'
                    ? 'bg-indigo-500/10 border border-indigo-500/20 text-[var(--foreground)]'
                    : 'bg-indigo-600 text-white ml-auto max-w-[85%]'
                }`}
              >
                <p className="leading-relaxed">{msg.text}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendAi} className="p-3 border-t border-[var(--border)] relative">
            <input
              type="text"
              placeholder="Ask anything about paper..."
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              className="w-full pl-3 pr-10 py-2.5 text-xs bg-[var(--foreground)]/5 border border-[var(--border)] rounded-xl focus:outline-none focus:border-indigo-500/40 text-[var(--foreground)]"
            />
            <button
              type="submit"
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500"
            >
              <Send size={12} />
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
