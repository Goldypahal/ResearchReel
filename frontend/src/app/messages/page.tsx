"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, Phone, Video, Info, Smile, Paperclip, CheckCheck, ArrowLeft } from 'lucide-react';
import { io } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
const socket = io(API_URL);

interface ChatMessage {
  roomId?: string;
  text: string;
  sender: string;
  timestamp?: string;
  isOwn?: boolean;
}

export default function MessagesPage() {
  const contacts = [
    { id: '1', name: 'Dr. Julia Newton', avatar: 'JN', lastMsg: 'The logic module works!', time: '2m', online: true, verified: true },
    { id: '2', name: 'Alan Turing Jr.', avatar: 'AT', lastMsg: 'Sent you the dataset link.', time: '1h', online: false, verified: true },
    { id: '3', name: 'Sarah Chen', avatar: 'SC', lastMsg: 'Meeting at 4?', time: '3h', online: true, verified: false },
    { id: '4', name: 'Research Group Alpha', avatar: 'RA', lastMsg: 'New paper uploaded.', time: '1d', online: true, verified: false },
  ];

  const [activeChat, setActiveChat] = useState<typeof contacts[number] | null>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeChat) {
      socket.emit('join_room', activeChat.id);
    }

    socket.on('receive_message', (data) => {
      setMessages(prev => [...prev, { ...data, isOwn: false }]);
    });

    return () => {
      socket.off('receive_message');
    };
  }, [activeChat]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !activeChat) return;

    const msgData = {
      roomId: activeChat.id,
      text: message,
      sender: 'Me',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    socket.emit('send_message', msgData);
    setMessages(prev => [...prev, { ...msgData, isOwn: true }]);
    setMessage('');
  };

  return (
    <div className="h-[calc(100vh-128px)] md:h-screen bg-[var(--background)] text-[var(--foreground)] overflow-hidden flex flex-col">
      <main className="flex-1 flex overflow-hidden">
        
        {/* Contacts Sidebar */}
        <aside className={`w-full md:w-[350px] border-r border-[var(--border)]/10 flex flex-col bg-[var(--background)] ${activeChat ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-6">
            <h1 className="text-xl font-black text-[var(--foreground)] uppercase tracking-widest mb-6 italic">Directs</h1>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text" 
                placeholder="Search scholars..." 
                className="w-full bg-[var(--foreground)]/5 border border-[var(--border)]/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-[var(--foreground)] focus:outline-none focus:border-indigo-500/50 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {contacts.map((contact) => (
              <button 
                key={contact.id}
                onClick={() => setActiveChat(contact)}
                className={`w-full p-6 flex items-center gap-4 transition-all hover:bg-[var(--foreground)]/5 relative ${activeChat?.id === contact.id ? 'bg-[var(--foreground)]/5' : ''}`}
              >
                {activeChat?.id === contact.id && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-indigo-500 rounded-r-full"></div>}
                <div className="relative">
                   <div className="w-14 h-14 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-sm">
                     {contact.avatar}
                   </div>
                   {contact.online && <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-4 border-[var(--background)] rounded-full"></div>}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-black text-[var(--foreground)]">{contact.name}</span>
                    <span className="text-[10px] font-bold text-zinc-600">{contact.time}</span>
                  </div>
                  <p className="text-xs text-zinc-500 truncate">{contact.lastMsg}</p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Chat Window */}
        <section className={`flex-1 flex flex-col bg-[var(--background)] relative ${activeChat ? 'flex' : 'hidden md:flex'}`}>
          {activeChat ? (
            <>
              {/* Chat Header */}
              <header className="h-20 border-b border-[var(--border)]/10 px-4 md:px-8 flex items-center justify-between bg-[var(--background)]/40 backdrop-blur-3xl z-10">
                <div className="flex items-center gap-3">
                   {/* Back button for mobile */}
                   <button 
                     onClick={() => setActiveChat(null)}
                     className="md:hidden p-2 hover:bg-[var(--foreground)]/5 rounded-full text-[var(--foreground)] shrink-0 transition-colors"
                     aria-label="Back to list"
                   >
                     <ArrowLeft size={20} />
                   </button>
                   <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-black text-xs shrink-0">
                     {activeChat.avatar}
                   </div>
                   <div>
                      <h2 className="text-sm font-black text-[var(--foreground)] leading-tight">{activeChat.name}</h2>
                      <span className="text-[9px] font-bold text-green-500 uppercase tracking-widest leading-none">{activeChat.online ? 'Online' : 'Offline'}</span>
                   </div>
                </div>
                <div className="flex items-center gap-4 md:gap-6 text-zinc-400">
                   <button className="hover:text-indigo-500 transition-all"><Phone size={20} /></button>
                   <button className="hover:text-indigo-500 transition-all"><Video size={20} /></button>
                   <button className="hover:text-indigo-500 transition-all"><Info size={20} /></button>
                </div>
              </header>

              {/* Messages Container */}
              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar"
              >
                <div className="flex flex-col items-center py-12 text-center opacity-40">
                   <div className="w-20 h-20 rounded-full bg-[var(--foreground)]/5 flex items-center justify-center mb-4 italic font-serif text-3xl">“</div>
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] max-w-xs leading-loose">
                      Encryption Active. Your academic discourse is protected by ResearchReel Protocol.
                   </p>
                </div>

                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[60%] p-5 rounded-[30px] ${msg.isOwn ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-[var(--foreground)]/5 text-[var(--foreground)] rounded-bl-none border border-[var(--border)]/10'}`}>
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                      <div className={`flex items-center gap-2 mt-2 ${msg.isOwn ? 'justify-end text-indigo-200' : 'text-zinc-500'}`}>
                        <span className="text-[9px] font-bold uppercase tracking-widest">{msg.timestamp}</span>
                        {msg.isOwn && <CheckCheck size={12} />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <footer className="p-8">
                <form 
                  onSubmit={handleSend}
                  className="bg-[var(--foreground)]/5 border border-[var(--border)]/10 rounded-[32px] p-2 flex items-center gap-2 focus-within:border-indigo-500/50 transition-all"
                >
                  <button type="button" className="p-3 text-zinc-500 hover:text-indigo-500 transition-all"><Smile size={20} /></button>
                  <button type="button" className="p-3 text-zinc-500 hover:text-indigo-500 transition-all"><Paperclip size={20} /></button>
                  <input 
                    type="text" 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type an academic insight..."
                    className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--foreground)] px-2"
                  />
                  <button 
                    type="submit"
                    className="p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[24px] transition-all shadow-lg shadow-indigo-600/20"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </footer>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
               <div className="w-32 h-32 bg-indigo-600/10 rounded-full flex items-center justify-center mb-8 border border-indigo-500/20">
                  <Send size={48} className="text-indigo-500 -rotate-12" />
               </div>
               <h2 className="text-2xl font-black text-[var(--foreground)] uppercase tracking-widest italic mb-4">Your Inbox</h2>
               <p className="text-sm text-zinc-500 max-w-sm leading-loose">
                  Start a conversation with fellow researchers, collaborate on manuscripts, or discuss trending reels.
               </p>
               <button className="mt-8 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                  Send a Message
               </button>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
