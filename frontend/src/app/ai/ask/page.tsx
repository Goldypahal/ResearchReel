"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Bot, Send, Loader2, Plus, User as UserIcon, Library, X, Info, FlaskConical } from 'lucide-react';
import { aiApi, documentsApi, errorMessage, type AiMessage, type AiPaperRef, type AiStatus } from '@/lib/api';
import Markdown from '@/components/common/Markdown';
import { Spinner } from '@/components/common';
import { PaperPicker } from '@/components/ai/PaperPicker';
import { RagBadge } from '@/components/ai/RagBadge';
import { Citations } from '@/components/ai/Citations';

const STARTERS = [
  'Explain the difference between Bayesian and frequentist inference.',
  'How do I choose a sample size for a two-group experiment?',
  'Summarise the key ideas behind transformers in machine learning.',
];
const PAPER_STARTERS = ['Summarise this paper in plain language.', 'What methods did the authors use?', 'What are the limitations of this study?', 'What are the key results?'];
const MULTI_STARTERS = [
  'Compare the methods used in these papers.',
  'Where do these papers agree, and where do they disagree?',
  'Summarise the main contribution of each paper.',
  'Which datasets and evaluation metrics do they use?',
];

const isIndexing = (p: AiPaperRef) => p.rag_status === 'pending' || p.rag_status === 'indexing';

function AskInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [papers, setPapers] = useState<AiPaperRef[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(params.get('c'));
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState(params.get('q') || '');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(params.get('c')));
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { aiApi.status().then(setStatus).catch(() => {}); }, []);

  // Load the conversation, or the papers named in the URL (?doc=id or ?docs=a,b).
  useEffect(() => {
    const c = params.get('c');
    if (c) {
      aiApi.conversation(c).then((conv) => {
        setMessages(conv.messages);
        setPapers(conv.papers?.length ? conv.papers : conv.document_id && conv.document_title ? [{ id: conv.document_id, title: conv.document_title }] : []);
      }).catch((e) => setError(errorMessage(e))).finally(() => setLoading(false));
      return;
    }
    const ids = [...new Set([params.get('doc'), ...(params.get('docs')?.split(',') || [])].filter(Boolean) as string[])].slice(0, 10);
    if (!ids.length) return;
    Promise.all(ids.map((id) => documentsApi.get(id).then((d) => ({ id: d.id, title: d.title, rag_status: d.rag_status })).catch(() => null)))
      .then((rows) => setPapers(rows.filter(Boolean) as AiPaperRef[]));
  }, [params]);

  // While papers are being indexed, refresh their status so the badge turns green on its own.
  const indexingIds = papers.filter(isIndexing).map((p) => p.id).join(',');
  const refreshStatuses = useCallback(async () => {
    const ids = indexingIds.split(',').filter(Boolean);
    const fresh = await Promise.all(ids.map((id) => documentsApi.get(id).catch(() => null)));
    setPapers((cur) => cur.map((p) => {
      const f = fresh.find((x) => x?.id === p.id);
      return f ? { ...p, rag_status: f.rag_status } : p;
    }));
  }, [indexingIds]);
  useEffect(() => {
    if (!indexingIds) return;
    const t = setInterval(refreshStatuses, 5000);
    return () => clearInterval(t);
  }, [indexingIds, refreshStatuses]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

  const needsPapers = status !== null && !status.general_chat && papers.length === 0;
  const aiOff = status !== null && !status.configured;

  const send = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q || busy || needsPapers || aiOff) return;
    setInput(''); setError('');
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setBusy(true);
    try {
      const r = await aiApi.ask(q, { documentIds: papers.map((p) => p.id), conversationId });
      setMessages((m) => [...m, { role: 'assistant', content: r.answer, sources: r.sources, notice: r.notice }]);
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

  const newChat = () => {
    setMessages([]); setConversationId(null); setError('');
    router.replace(papers.length ? `/ai/ask?docs=${papers.map((p) => p.id).join(',')}` : '/ai/ask');
  };

  if (loading) return <Spinner />;

  const starters = papers.length > 1 ? MULTI_STARTERS : papers.length === 1 ? PAPER_STARTERS : STARTERS;
  const max = status?.max_papers || 10;

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100dvh-9rem)]">
      <div className="pb-3 border-b border-[var(--border)] space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-bold flex items-center gap-2 whitespace-nowrap"><Bot size={18} className="text-indigo-400" /> Research assistant</h1>
          <div className="flex items-center gap-3">
            {papers.length > 0 && status?.paper_search && (
              <Link href={`/ai/research?docs=${papers.map((p) => p.id).join(',')}`} aria-label="Research tools" className="text-sm inline-flex items-center gap-1 text-zinc-400 hover:text-[var(--foreground)] whitespace-nowrap"><FlaskConical size={15} /> <span className="hidden sm:inline">Research tools</span></Link>
            )}
            <button onClick={newChat} aria-label="New chat" className="text-sm inline-flex items-center gap-1 text-zinc-400 hover:text-[var(--foreground)] whitespace-nowrap"><Plus size={15} /> <span className="hidden sm:inline">New chat</span></button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {papers.map((p) => (
            <span key={p.id} className="inline-flex items-center gap-1.5 max-w-full text-xs pl-2.5 pr-1 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              <Link href={`/library/documents/${p.id}`} className="truncate max-w-[14rem] text-indigo-300 hover:underline">{p.title}</Link>
              <RagBadge status={p.rag_status} />
              <button onClick={() => setPapers((cur) => cur.filter((x) => x.id !== p.id))} aria-label={`Remove ${p.title}`} className="p-0.5 rounded-full text-zinc-500 hover:text-[var(--foreground)]"><X size={12} /></button>
            </span>
          ))}
          <button onClick={() => setPickerOpen(true)} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-dashed border-[var(--border)] text-zinc-400 hover:text-[var(--foreground)] hover:border-indigo-500/40">
            <Library size={12} /> {papers.length ? 'Add or remove papers' : 'Ask about papers'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-5">
        {messages.length === 0 && (
          <div className="text-center py-10 space-y-4">
            <p className="text-zinc-500 text-sm">
              {aiOff ? 'AI features are not enabled on this server yet.'
                : needsPapers ? 'Choose one or more papers to ask about.'
                  : papers.length > 1 ? `Ask a question across these ${papers.length} papers. Answers cite the passages they come from.`
                    : papers.length === 1 ? 'Ask anything about this paper.' : 'Ask a research question, or choose papers for answers grounded in them.'}
            </p>
            {needsPapers ? (
              <button onClick={() => setPickerOpen(true)} className="text-sm px-4 py-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 inline-flex items-center gap-2"><Library size={15} /> Choose papers</button>
            ) : !aiOff && (
              <div className="flex flex-col items-center gap-2">
                {starters.map((s) => (
                  <button key={s} onClick={() => send(s)} className="text-sm px-4 py-2 rounded-full border border-[var(--border)] hover:bg-[var(--foreground)]/5">{s}</button>
                ))}
              </div>
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={m.id || i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-[var(--foreground)]/10' : 'bg-indigo-600/20 text-indigo-300'}`}>
              {m.role === 'user' ? <UserIcon size={15} /> : <Bot size={15} />}
            </div>
            <div className={`max-w-[85%] min-w-0 rounded-2xl px-4 py-3 ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-[var(--foreground)]/5 border border-[var(--border)]'}`}>
              {m.role === 'user' ? <p className="text-sm whitespace-pre-wrap">{m.content}</p> : <Markdown text={m.content} />}
              {m.notice && <p className="mt-2 text-xs text-amber-300 flex items-start gap-1.5"><Info size={13} className="mt-0.5 shrink-0" /> {m.notice}</p>}
              {m.role === 'assistant' && m.sources && m.sources.length > 0 && <Citations sources={m.sources} />}
            </div>
          </div>
        ))}
        {busy && <div className="flex gap-3 items-center text-sm text-zinc-500"><Loader2 size={16} className="animate-spin" /> {papers.length > 1 ? 'Searching the papers…' : 'Thinking…'}</div>}
        <div ref={endRef} />
      </div>

      {error && <p className="text-sm text-red-400 pb-2" role="alert">{error}</p>}
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 pt-3 border-t border-[var(--border)]">
        <textarea
          value={input} onChange={(e) => setInput(e.target.value)} rows={1} maxLength={4000} aria-label="Your question"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          disabled={needsPapers || aiOff}
          placeholder={needsPapers ? 'Choose papers first…' : papers.length > 1 ? 'Ask across the selected papers…' : papers.length === 1 ? 'Ask about this paper…' : 'Ask a research question…'}
          className="flex-1 resize-none px-4 py-3 rounded-2xl bg-[var(--foreground)]/5 border border-[var(--border)] text-sm focus:outline-none focus:border-indigo-500/60 max-h-40 disabled:opacity-50"
        />
        <button disabled={busy || !input.trim() || needsPapers || aiOff} className="px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40" aria-label="Send"><Send size={17} /></button>
      </form>
      <p className="text-[11px] text-zinc-600 text-center pt-2">AI can make mistakes. Check important information against the source.</p>

      <PaperPicker open={pickerOpen} onClose={() => setPickerOpen(false)} selected={papers} onConfirm={setPapers} max={max} />
    </div>
  );
}

export default function AskPage() {
  return <Suspense fallback={<Spinner />}><AskInner /></Suspense>;
}
