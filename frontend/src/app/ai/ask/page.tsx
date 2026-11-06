"use client";

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Bot, Send, Loader2, FileText, Plus, User as UserIcon } from 'lucide-react';
import { aiApi, documentsApi, errorMessage, type AiMessage } from '@/lib/api';
import Markdown from '@/components/common/Markdown';
import { Spinner } from '@/components/common';

const STARTERS = [
  'Explain the difference between Bayesian and frequentist inference.',
  'How do I choose a sample size for a two-group experiment?',
  'Summarise the key ideas behind transformers in machine learning.',
];
const PAPER_STARTERS = ['Summarise this paper in plain language.', 'What methods did the authors use?', 'What are the limitations of this study?', 'What are the key results?'];

function AskInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [docId, setDocId] = useState<string | null>(params.get('doc'));
  const [docTitle, setDocTitle] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(params.get('c'));
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState(params.get('q') || '');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(params.get('c')));
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const c = params.get('c');
    if (!c) return;
    aiApi.conversation(c).then((conv) => {
      setMessages(conv.messages); setDocId(conv.document_id); setDocTitle(conv.document_title);
    }).catch((e) => setError(errorMessage(e))).finally(() => setLoading(false));
  }, [params]);

  useEffect(() => {
    if (docId && !docTitle) documentsApi.get(docId).then((d) => setDocTitle(d.title)).catch(() => setDocId(null));
  }, [docId, docTitle]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput(''); setError('');
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setBusy(true);
    try {
      const r = await aiApi.ask(q, { documentId: docId, conversationId });
      setMessages((m) => [...m, { role: 'assistant', content: r.answer, sources: r.sources }]);
      if (!conversationId) {
        setConversationId(r.conversation_id);
        router.replace(`/ai/ask?c=${r.conversation_id}`, { scroll: false });
      }
    } catch (err) {
      setError(errorMessage(err));
      setMessages((m) => m.slice(0, -1));
      setInput(q);
    } finally { setBusy(false); }
  };

  const newChat = () => { setMessages([]); setConversationId(null); setError(''); router.replace(docId ? `/ai/ask?doc=${docId}` : '/ai/ask'); };

  if (loading) return <Spinner />;

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100dvh-9rem)]">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
        <div className="min-w-0">
          <h1 className="font-bold flex items-center gap-2"><Bot size={18} className="text-indigo-400" /> Research assistant</h1>
          {docId && docTitle && <Link href={`/library/documents/${docId}`} className="text-xs text-indigo-400 inline-flex items-center gap-1 truncate max-w-full"><FileText size={12} /> Grounded in “{docTitle}”</Link>}
        </div>
        <button onClick={newChat} className="text-sm inline-flex items-center gap-1 text-zinc-400 hover:text-white"><Plus size={15} /> New chat</button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-5">
        {messages.length === 0 && (
          <div className="text-center py-10 space-y-4">
            <p className="text-zinc-500 text-sm">{docId ? 'Ask anything about this paper.' : 'Ask a research question to get started.'}</p>
            <div className="flex flex-col items-center gap-2">
              {(docId ? PAPER_STARTERS : STARTERS).map((s) => (
                <button key={s} onClick={() => send(s)} className="text-sm px-4 py-2 rounded-full border border-[var(--border)] hover:bg-[var(--foreground)]/5">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-[var(--foreground)]/10' : 'bg-indigo-600/20 text-indigo-300'}`}>
              {m.role === 'user' ? <UserIcon size={15} /> : <Bot size={15} />}
            </div>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-[var(--foreground)]/5 border border-[var(--border)]'}`}>
              {m.role === 'user' ? <p className="text-sm whitespace-pre-wrap">{m.content}</p> : <Markdown text={m.content} />}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[var(--border)] text-xs text-zinc-500">
                  Source: {m.sources.map((s) => <Link key={s.documentId} href={`/library/documents/${s.documentId}`} className="text-indigo-400 hover:underline">{s.title}</Link>)}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && <div className="flex gap-3 items-center text-sm text-zinc-500"><Loader2 size={16} className="animate-spin" /> Thinking…</div>}
        <div ref={endRef} />
      </div>

      {error && <p className="text-sm text-red-400 pb-2" role="alert">{error}</p>}
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 pt-3 border-t border-[var(--border)]">
        <textarea
          value={input} onChange={(e) => setInput(e.target.value)} rows={1} maxLength={4000} aria-label="Your question"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={docId ? 'Ask about this paper…' : 'Ask a research question…'}
          className="flex-1 resize-none px-4 py-3 rounded-2xl bg-[var(--foreground)]/5 border border-[var(--border)] text-sm focus:outline-none focus:border-indigo-500/60 max-h-40"
        />
        <button disabled={busy || !input.trim()} className="px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40" aria-label="Send"><Send size={17} /></button>
      </form>
      <p className="text-[11px] text-zinc-600 text-center pt-2">AI can make mistakes. Check important information against the source.</p>
    </div>
  );
}

export default function AskPage() {
  return <Suspense fallback={<Spinner />}><AskInner /></Suspense>;
}
