"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Bot, Loader2, Send } from 'lucide-react';
import { aiApi, ApiError, errorMessage, type AskCitation } from '@/lib/api';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

interface Msg { id: string; role: 'user' | 'ai' | 'error'; text: string; citations?: AskCitation[] }

const friendlyError = (err: unknown) => {
  if (err instanceof ApiError && err.code === 'AI_UNAVAILABLE') return 'AI answers are unavailable right now. Try again in a bit.';
  if (err instanceof ApiError && err.statusCode === 429) return err.message;
  return errorMessage(err, 'Something went wrong getting an answer.');
};

/**
 * Q&A against one paper (documentId) or the user's whole library (no documentId).
 * Answers come from the API; nothing here is canned.
 */
export default function PaperChat({ documentId, placeholder, initialQuestion, suggestions = [] }: {
  documentId?: string;
  placeholder?: string;
  initialQuestion?: string;
  suggestions?: string[];
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const asked = useRef(false);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setDraft('');
    setMessages((m) => [...m, { id: `u${Date.now()}`, role: 'user', text: q }]);
    setBusy(true);
    try {
      const res = await aiApi.askGemini(q, documentId);
      trackEvent('ask_ai', { scoped: Boolean(documentId) });
      setMessages((m) => [...m, { id: `a${Date.now()}`, role: 'ai', text: res.answer, citations: res.citations }]);
    } catch (err) {
      setMessages((m) => [...m, { id: `e${Date.now()}`, role: 'error', text: friendlyError(err) }]);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (initialQuestion && !asked.current) {
      asked.current = true;
      ask(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-3 pt-4 text-center">
            <Bot className="mx-auto text-indigo-400" size={28} />
            <p className="text-sm text-muted-foreground">{documentId ? 'Ask anything about this paper. Answers quote the text where possible.' : 'Ask a question across the papers in your library.'}</p>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => ask(s)} className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs hover:border-indigo-500/50 hover:text-indigo-400">{s}</button>
                ))}
              </div>
            )}
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[90%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
              m.role === 'user' ? 'bg-indigo-600 text-white' : m.role === 'error' ? 'border border-red-500/20 bg-red-500/10 text-red-300' : 'bg-[var(--foreground)]/5'
            )}>
              {m.text}
              {!!m.citations?.length && (
                <div className="mt-3 space-y-1.5 border-t border-[var(--border)] pt-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sources</p>
                  {m.citations.slice(0, 4).map((c, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      {[c.section, c.page ? `p. ${c.page}` : null].filter(Boolean).join(' · ')}{c.section || c.page ? ' — ' : ''}“{c.text}”
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Thinking…</div>}
        <div ref={bottom} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); ask(draft); }} className="flex gap-2 border-t border-[var(--border)] p-3">
        <input
          aria-label="Your question"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder || 'Ask a question…'}
          maxLength={2000}
          className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--foreground)]/5 px-3.5 py-2.5 text-sm focus:border-indigo-500/60 focus:outline-none"
        />
        <button type="submit" disabled={!draft.trim() || busy} aria-label="Send" className="rounded-xl bg-indigo-600 px-3 text-white hover:bg-indigo-500 disabled:opacity-50"><Send size={16} /></button>
      </form>
    </div>
  );
}
