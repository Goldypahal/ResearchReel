"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Send, Bot } from 'lucide-react';

interface Message {
  role: 'user' | 'ai';
  text: string;
  citations?: { page: number; section: string; text: string }[];
}

export default function ChatDrawer({ isOpen, onClose, documentName }: { isOpen: boolean, onClose: () => void, documentName: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: `Hi! I've analyzed "${documentName}". What would you like to know about its methodology, findings, or experimental setup?` }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/ai/ask-gemini`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          document_id: documentName.replace(/\s+/g, '_').toLowerCase(),
          question: currentInput,
          history: messages
        })
      });

      const result = await response.json();
      if (result.success) {
        setMessages(prev => [...prev, { 
          role: 'ai', 
          text: result.data.answer,
          citations: result.data.citations
        }]);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Chat Error:', error);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: "I'm having trouble connecting to the research engine. Please ensure the RAG service is running." 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end selection:bg-indigo-500/30">
      {/* Overlay Background */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] cursor-pointer animate-in fade-in duration-500" onClick={onClose} />
      
      {/* Side Drawer */}
      <div className="relative w-full max-w-lg bg-[var(--background)] border-l border-[var(--border)]/20 flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.1)] h-full animate-in slide-in-from-right duration-500">
        
        {/* Header */}
        <div className="p-6 border-b border-[var(--border)]/10 flex items-center justify-between bg-[var(--background)]/80 backdrop-blur-3xl sticky top-0 z-10">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 border border-indigo-500/20 shadow-inner">
                <Bot size={24} className="animate-pulse" />
             </div>
             <div className="flex flex-col">
                <span className="text-[var(--foreground)] text-sm font-black uppercase tracking-tight italic lowercase">Ask Gemini 1.5</span>
                <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-none mt-1">Research Intelligence • {documentName}</span>
             </div>
          </div>
          <button 
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[var(--foreground)]/5 text-zinc-500 hover:text-[var(--foreground)] transition-all" 
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 flex flex-col no-scrollbar">
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
               <div className={`max-w-[90%] px-6 py-4 rounded-[28px] text-sm leading-relaxed shadow-sm ${
                 m.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none font-medium' 
                  : 'bg-[var(--foreground)]/5 border border-[var(--border)]/10 text-[var(--foreground)] rounded-tl-none font-medium'
               }`}>
                  {m.text}
               </div>
               {m.citations && (
                 <div className="mt-4 flex gap-3 flex-wrap">
                    {m.citations.map((c, ci) => (
                       <div key={ci} className="bg-[var(--foreground)]/[0.03] border border-[var(--border)]/10 p-4 rounded-2xl cursor-default group hover:bg-[var(--foreground)]/5 transition-all w-full max-w-xs shadow-inner">
                          <div className="flex items-center gap-2 mb-2">
                             <div className="w-5 h-5 bg-indigo-500/10 text-indigo-500 flex items-center justify-center rounded-lg text-[10px] font-black border border-indigo-500/10">PDF</div>
                             <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest italic group-hover:text-indigo-500 transition-colors">Section Reference • p. {c.page}</span>
                          </div>
                          <p className="text-[11px] text-zinc-500 line-clamp-2 italic leading-relaxed group-hover:text-[var(--foreground)] transition-colors">&ldquo;{c.text}&rdquo;</p>
                       </div>
                    ))}
                 </div>
               )}
            </div>
          ))}
          {isTyping && (
            <div className="flex items-center gap-3 animate-pulse px-6 py-4 bg-[var(--foreground)]/5 rounded-3xl w-fit">
              <Sparkles size={14} className="text-indigo-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Gemini is synthesizing...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Footer Input */}
        <div className="p-6 pb-10 bg-[var(--background)]/80 backdrop-blur-3xl border-t border-[var(--border)]/10">
           <form onSubmit={handleSend} className="relative flex items-center">
              <div className="absolute left-6 text-indigo-500/40">
                <Sparkles size={18} />
              </div>
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about methodology, benchmarks, or limitations..."
                className="w-full h-16 bg-[var(--foreground)]/5 border border-[var(--border)]/10 rounded-2xl pl-14 pr-16 text-sm text-[var(--foreground)] outline-none focus:border-indigo-500/50 focus:bg-[var(--foreground)]/[0.08] transition-all placeholder:text-zinc-500 placeholder:text-xs placeholder:uppercase placeholder:tracking-widest"
              />
              <button 
                type="submit"
                className="absolute right-3 w-10 h-10 bg-indigo-600 hover:bg-indigo-500 rounded-xl flex items-center justify-center text-white font-black transition-all disabled:opacity-30 disabled:hover:bg-indigo-600 shadow-lg shadow-indigo-600/20 active:scale-95"
                disabled={!input.trim() || isTyping}
              >
                <Send size={18} />
              </button>
           </form>
           <div className="mt-6 flex flex-wrap gap-2">
              <button className="text-[9px] font-black text-zinc-500 hover:text-indigo-500 transition-colors uppercase tracking-[0.2em] px-4 py-2 rounded-full border border-[var(--border)]/10 hover:border-indigo-500/20 bg-[var(--foreground)]/5">Summarize Methodology</button>
              <button className="text-[9px] font-black text-zinc-500 hover:text-indigo-500 transition-colors uppercase tracking-[0.2em] px-4 py-2 rounded-full border border-[var(--border)]/10 hover:border-indigo-500/20 bg-[var(--foreground)]/5">Find Limitations</button>
              <button className="text-[9px] font-black text-zinc-500 hover:text-indigo-500 transition-colors uppercase tracking-[0.2em] px-4 py-2 rounded-full border border-[var(--border)]/10 hover:border-indigo-500/20 bg-[var(--foreground)]/5">Suggest Experiments</button>
           </div>
        </div>

      </div>
    </div>
  );
}
