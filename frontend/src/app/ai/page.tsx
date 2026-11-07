"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bot, Sparkles, Library, FlaskConical, Star, MessageSquare, Trash2 } from 'lucide-react';
import { aiApi, errorMessage, type AiStatus } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { toast } from '@/components/ui/use-toast';

const FEATURES = [
  { title: 'Ask the assistant', description: 'Explain concepts, methods and derivations, or brainstorm study designs.', icon: Bot, href: '/ai/ask', needs: 'chat' },
  { title: 'Ask across papers', description: 'Choose up to ten papers and get answers that cite the page each point comes from.', icon: Library, href: '/ai/ask', needs: 'any' },
  { title: 'Research tools', description: 'Compare papers, draft a literature review, spot gaps and contradictions, or build a timeline.', icon: FlaskConical, href: '/ai/research', needs: 'rag' },
  { title: 'Papers for you', description: 'Recommendations based on your research interests.', icon: Star, href: '/discover', needs: 'none' },
] as const;

export default function AIHubPage() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [statusFailed, setStatusFailed] = useState(false);
  const [convos, setConvos] = useState<{ id: string; title: string; document_ids?: string[]; document_title: string | null; updated_at: string }[]>([]);

  useEffect(() => {
    aiApi.status().then(setStatus).catch(() => setStatusFailed(true));
    aiApi.conversations().then(setConvos).catch(() => {});
  }, []);

  const remove = async (id: string) => {
    try { await aiApi.deleteConversation(id); setConvos((c) => c.filter((x) => x.id !== id)); }
    catch (err) { toast({ title: 'Could not delete', description: errorMessage(err), variant: 'destructive' }); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-3 py-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold"><Sparkles size={14} /> Research assistant</div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">AI Research Hub</h1>
        <p className="text-sm text-zinc-500 max-w-xl mx-auto">Understand papers faster. Answers about a paper are grounded in its text; always verify important claims.</p>
        {(statusFailed || status?.configured === false) && <p className="text-sm text-amber-300">AI features are not enabled on this server yet. An administrator needs to add a Gemini API key.</p>}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {FEATURES.filter((f) => !status || f.needs === 'none' || f.needs === 'any' || (f.needs === 'chat' ? status.general_chat : status.paper_search)).map((f) => (
          <Link key={f.title} href={f.href} className="rounded-2xl border border-[var(--border)] p-5 hover:border-indigo-500/40 hover:bg-indigo-500/[0.03] transition-colors flex gap-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0"><f.icon size={20} /></div>
            <div><p className="font-semibold">{f.title}</p><p className="text-sm text-zinc-500 mt-1">{f.description}</p></div>
          </Link>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="font-bold flex items-center gap-2"><MessageSquare size={16} /> Recent conversations</h2>
        {convos.length === 0 ? <p className="text-sm text-zinc-500">No conversations yet.</p> : (
          <ul className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
            {convos.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <Link href={`/ai/ask?c=${c.id}`} className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.title}</p>
                  <p className="text-xs text-zinc-500 truncate">
                    {(c.document_ids?.length || 0) > 1 ? `${c.document_ids!.length} papers · ` : c.document_title ? `About “${c.document_title}” · ` : ''}{timeAgo(c.updated_at)}
                  </p>
                </Link>
                <button onClick={() => remove(c.id)} className="text-zinc-500 hover:text-red-400" aria-label="Delete conversation"><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
