"use client";

import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  message_type: 'text' | 'file' | 'latex';
  file_url?: string;
  sent_at: string;
}

const MOCK_MESSAGES: Message[] = [
  { id: "m1", sender_id: "u1", sender_name: "Dr. Julia Newton", content: "Did you review the new weights for the encoding module?", message_type: "text", sent_at: "10:24 AM" },
  { id: "m2", sender_id: "me", sender_name: "Me", content: "Yes, the attention heads look much more stable with the new regularization.", message_type: "text", sent_at: "10:26 AM" },
  { id: "m3", sender_id: "u1", sender_name: "Dr. Julia Newton", content: "Great. Here's the updated PDF with the method section.", message_type: "file", file_url: "weights_v4.pdf", sent_at: "10:28 AM" }
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function ChatWindow({ conversationId }: { conversationId: string }) {
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages([...messages, { id: Date.now().toString(), sender_id: "me", sender_name: "Me", content: input, message_type: "text", sent_at: "Just Now" }]);
    setInput('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050505] relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/05 rounded-full blur-[120px] -z-0"></div>

      {/* Header (Section 3.4.2) */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/40 backdrop-blur-3xl z-10">
         <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center font-bold text-indigo-500">J</div>
            <div className="flex flex-col">
               <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-base tracking-tight">Dr. Julia Newton</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full shadow-lg shadow-green-500/40"></div>
               </div>
               <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Last active: 2m ago • Scholar Tier</span>
            </div>
         </div>
         <div className="flex gap-4">
            <button className="w-10 h-10 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center text-lg">📞</button>
            <button className="w-10 h-10 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center text-lg">📹</button>
            <button className="w-10 h-10 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center text-lg">📁</button>
         </div>
      </div>

      {/* Chat Area (Section 3.4.2) */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar z-10">
         {messages.map((m) => (
           <div key={m.id} className={`flex flex-col ${m.sender_id === 'me' ? 'items-end' : 'items-start'}`}>
              <div className="flex items-center gap-2 mb-2 px-1">
                 {m.sender_id !== 'me' && <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">{m.sender_name}</span>}
                 <span className="text-[9px] font-bold text-zinc-700 uppercase tracking-widest">{m.sent_at}</span>
                 {m.sender_id === 'me' && <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Read ✓</span>}
              </div>

              {m.message_type === 'text' && (
                <div className={`max-w-[70%] px-6 py-4 rounded-[28px] text-sm leading-relaxed shadow-xl ${m.sender_id === 'me' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-zinc-900 border border-white/10 text-zinc-200 rounded-tl-none'}`}>
                   {m.content}
                </div>
              )}

              {m.message_type === 'file' && (
                <div className="p-5 rounded-3xl bg-white/[0.03] border border-white/10 group cursor-pointer hover:bg-indigo-500/5 transition-all max-w-[300px]">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📄</div>
                      <div className="flex flex-col">
                         <span className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{m.file_url}</span>
                         <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">PDF • 1.4 MB</span>
                      </div>
                   </div>
                </div>
              )}
           </div>
         ))}
         <div ref={endRef} />
      </div>

      {/* Input Area (Section 3.4.3) */}
      <div className="p-8 pb-10 bg-black/60 backdrop-blur-3xl border-t border-white/10 z-10">
         <form onSubmit={handleSend} className="relative flex items-center">
            <button type="button" className="absolute left-3 w-10 h-10 bg-white/5 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center text-xl">📎</button>
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message or share a paper..."
              className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-16 text-sm text-white outline-none focus:border-indigo-500/50 focus:bg-white/[0.08] transition-all font-medium placeholder:text-zinc-700"
            />
            <div className="absolute right-3 flex items-center gap-2">
               <button type="button" className="w-10 h-10 bg-white/5 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center text-xl">∑</button>
               <button 
                 type="submit"
                 className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                 disabled={!input.trim()}
               >
                 ↑
               </button>
            </div>
         </form>
         <div className="mt-4 flex gap-4 overflow-x-auto no-scrollbar">
            <button className="shrink-0 text-[9px] font-bold text-zinc-500 uppercase tracking-widest bg-white/[0.02] border border-white/5 rounded-full px-4 py-1.5 hover:text-white transition-all">Review methodology</button>
            <button className="shrink-0 text-[9px] font-bold text-zinc-500 uppercase tracking-widest bg-white/[0.02] border border-white/5 rounded-full px-4 py-1.5 hover:text-white transition-all">Share result summary</button>
            <button className="shrink-0 text-[9px] font-bold text-zinc-500 uppercase tracking-widest bg-white/[0.02] border border-white/5 rounded-full px-4 py-1.5 hover:text-white transition-all">Discuss limitations</button>
         </div>
      </div>

    </div>
  );
}
