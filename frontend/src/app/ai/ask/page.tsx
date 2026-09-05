"use client";

import React, { useState } from 'react';
import { Bot, Send, Sparkles, Copy, FileText, Check, Loader2 } from 'lucide-react';
import { aiApi, CitationSource } from '@/lib/api/ai';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  sources?: CitationSource[];
}

export default function AIAskPage() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Ask any research question. I will synthesize literature and provide exact citations.',
      sources: []
    }
  ]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const currentQ = query.trim();
    const userMsg: Message = { id: Date.now().toString(), sender: 'user', text: currentQ, sources: [] };
    
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setIsLoading(true);

    try {
      const response = await aiApi.askGemini(currentQ);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: response.answer || 'No detailed synthesis returned for this query.',
          sources: response.sources || []
        }
      ]);
    } catch (err: any) {
      console.error('AI Q&A Error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: `Error: ${err.message || 'Failed to communicate with AI research copilot service.'}`,
          sources: []
        }
      ]);
    } finally {
      setIsLoading(false);
    }
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
            <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>

            {msg.sources && msg.sources.length > 0 && (
              <div className="pt-2 border-t border-[var(--border)]/50 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sources & Citations:</span>
                <div className="flex flex-wrap gap-2">
                  {msg.sources.map((src: CitationSource, i: number) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[11px] font-medium"
                    >
                      <FileText size={12} />
                      <span>{src.section || src.documentId || 'Paper Citation'} {src.page ? `(p. ${src.page})` : ''}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="p-4 rounded-2xl bg-[var(--foreground)]/[0.03] border border-[var(--border)] flex items-center gap-2 text-indigo-400 text-xs">
            <Loader2 size={16} className="animate-spin" />
            <span>Analyzing research literature and constructing vector citations...</span>
          </div>
        )}
      </div>

      {/* Input Composer */}
      <form onSubmit={handleSend} className="relative flex items-center">
        <input
          type="text"
          placeholder="Ask a question about your research library or academic literature..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isLoading}
          className="w-full pl-4 pr-12 py-3 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-xl text-xs md:text-sm focus:outline-none focus:border-indigo-500/50 transition-all text-[var(--foreground)] placeholder:text-muted-foreground disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!query.trim() || isLoading}
          className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg transition-colors"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}
