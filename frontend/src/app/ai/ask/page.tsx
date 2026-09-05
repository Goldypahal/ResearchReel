"use client";

import React, { useState } from 'react';
import { Bot, Send, Sparkles, Copy, RefreshCw, Bookmark, FileText, Check } from 'lucide-react';

interface Source {
  title: string;
  page: number;
}


interface Message {
  id: string;
  sender: string;
  text: string;
  sources?: Source[];
}

export default function AIAskPage() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Ask any research question. I will synthesize literature and provide exact citations.',
      sources: []
    }
  ]);

  const [isCopied, setIsCopied] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMsg = { id: Date.now().toString(), sender: 'user', text: query, sources: [] };
    setMessages(prev => [...prev, userMsg]);
    const currentQ = query;
    setQuery('');

    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: `Based on current literature regarding "${currentQ}", self-attention mechanisms replace recurrent layers to achieve parallel training efficiency while preserving long-range dependency capabilities.`,
          sources: [
            { title: 'Attention Is All You Need', page: 3 },
            { title: 'BERT: Pre-training of Deep Bidirectional Transformers', page: 5 }
          ]
        }
      ]);
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
          <Bot size={20} />
          <span>AI Research Copilot</span>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-4 rounded-2xl space-y-3 ${
              msg.sender === 'ai'
                ? 'bg-[var(--foreground)]/[0.03] border border-[var(--border)] text-[var(--foreground)]'
                : 'bg-indigo-600 text-white ml-auto max-w-[85%]'
            }`}
          >
            <p className="text-xs md:text-sm leading-relaxed">{msg.text}</p>

            {msg.sources && msg.sources.length > 0 && (
              <div className="pt-2 border-t border-[var(--border)]/50 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sources:</span>
                <div className="flex flex-wrap gap-2">
                  {msg.sources.map((src: any, i: number) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[11px] font-medium"
                    >
                      <FileText size={12} />
                      <span>{src.title} (p. {src.page})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input Composer */}
      <form onSubmit={handleSend} className="relative pt-2">
        <input
          type="text"
          placeholder="Ask a research question..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-4 pr-12 py-3 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-indigo-500/50 text-[var(--foreground)]"
        />
        <button
          type="submit"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
