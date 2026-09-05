"use client";

import React, { useState } from 'react';
import { MessageCircle, Send, Paperclip, Search, User } from 'lucide-react';

export default function MessagesPage() {
  const [activeConv, setActiveConv] = useState('conv_1');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Record<string, Array<{ id: string; sender: string; text: string; time: string }>>>({
    conv_1: [
      { id: '1', sender: 'peer', text: 'Have you reviewed the methodology section in Vaswani et al.?', time: '10:14 AM' },
      { id: '2', sender: 'user', text: 'Yes! I noticed two key limitations regarding positional encoding scaling.', time: '10:16 AM' }
    ],
    conv_2: [
      { id: '1', sender: 'peer', text: 'The dataset preprocessing script for AI Text Detection is ready.', time: 'Yesterday' }
    ]
  });

  const conversations = [
    { id: 'conv_1', name: 'Dr. Julia Newton', role: 'Professor • Cambridge', avatar: 'J', unread: 0, lastMsg: 'Yes! I noticed two key limitations...' },
    { id: 'conv_2', name: 'Alex Chen', role: 'AI Researcher', avatar: 'A', unread: 1, lastMsg: 'The dataset preprocessing script...' }
  ];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => ({
      ...prev,
      [activeConv]: [...(prev[activeConv] || []), newMsg]
    }));
    setInputText('');
  };

  const currentPeer = conversations.find(c => c.id === activeConv) || conversations[0];
  const currentThread = messages[activeConv] || [];

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] rounded-2xl border border-[var(--border)] bg-[var(--foreground)]/[0.01] overflow-hidden flex flex-col md:flex-row">
      {/* Left Column: Conversations List */}
      <aside className="w-full md:w-80 border-r border-[var(--border)] flex flex-col shrink-0 bg-[var(--background)]">
        <div className="p-4 border-b border-[var(--border)] space-y-3">
          <h2 className="text-lg font-bold text-[var(--foreground)] flex items-center gap-2">
            <MessageCircle size={20} className="text-indigo-400" />
            <span>Messages</span>
          </h2>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--foreground)]/5 border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-indigo-500/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[var(--border)]/50">
          {conversations.map((c) => (
            <div
              key={c.id}
              onClick={() => setActiveConv(c.id)}
              className={`p-4 cursor-pointer transition-all flex items-center gap-3 ${
                activeConv === c.id
                  ? 'bg-indigo-500/10 border-l-4 border-indigo-500'
                  : 'hover:bg-[var(--foreground)]/5'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center shrink-0 border border-indigo-500/30">
                {c.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[var(--foreground)] truncate">{c.name}</h3>
                  {c.unread > 0 && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{c.lastMsg}</p>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Right Column: Conversation Thread */}
      <main className="flex-1 flex flex-col min-w-0 bg-[var(--background)]">
        {/* Thread Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center gap-3 bg-[var(--foreground)]/[0.01]">
          <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center shrink-0 border border-indigo-500/30">
            {currentPeer.avatar}
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--foreground)]">{currentPeer.name}</h3>
            <p className="text-[11px] text-muted-foreground">{currentPeer.role}</p>
          </div>
        </div>

        {/* Message Bubble Thread */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
          {currentThread.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`p-3.5 rounded-2xl text-xs max-w-[80%] space-y-1 ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-[var(--foreground)]/5 text-[var(--foreground)] border border-[var(--border)] rounded-bl-none'
                }`}
              >
                <p className="leading-relaxed">{msg.text}</p>
                <p className={`text-[9px] text-right ${msg.sender === 'user' ? 'text-indigo-200' : 'text-zinc-500'}`}>
                  {msg.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Composer */}
        <form onSubmit={handleSend} className="p-3 border-t border-[var(--border)] flex items-center gap-2 relative bg-[var(--background)]">
          <button type="button" className="p-2 text-muted-foreground hover:text-[var(--foreground)] rounded-lg">
            <Paperclip size={18} />
          </button>
          <input
            type="text"
            placeholder="Type a research message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-xl text-xs focus:outline-none focus:border-indigo-500/40 text-[var(--foreground)]"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-50 transition-colors"
          >
            <Send size={16} />
          </button>
        </form>
      </main>
    </div>
  );
}
