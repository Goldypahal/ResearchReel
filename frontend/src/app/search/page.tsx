"use client";

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, Film, MessageSquare, Search, User, X } from 'lucide-react';
import { errorMessage, searchApi, usersApi, type SearchResult, type SearchType, type UserCard } from '@/lib/api';
import UserRow from '@/components/common/UserRow';
import { EmptyState, ErrorState, LoadingBlock, SkeletonRows } from '@/components/common/States';
import { cn, timeAgo } from '@/lib/utils';

const RECENT_KEY = 'recent_searches';
const TABS: { key: SearchType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'user', label: 'People' },
  { key: 'document', label: 'Papers' },
  { key: 'post', label: 'Posts' },
  { key: 'video', label: 'Reels' },
];
const ICON = { post: MessageSquare, user: User, document: FileText, video: Film } as const;
const hrefFor = (r: SearchResult) =>
  r.type === 'post' ? `/post/${r.id}` : r.type === 'user' ? `/profile/${r.title}` : r.type === 'document' ? `/library/documents/${r.id}` : `/reels?r=${r.id}`;

const readRecent = (): string[] => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; } };
const writeRecent = (list: string[]) => { try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* storage unavailable */ } };

function SearchInner() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get('q') || '';
  const type = (params.get('type') as SearchType) || 'all';
  const [draft, setDraft] = useState(q);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [people, setPeople] = useState<UserCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data / resets state when its inputs change
  useEffect(() => { setDraft(q); }, [q]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data / resets state when its inputs change
  useEffect(() => { setRecent(readRecent()); }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data / resets state when its inputs change
    if (!q.trim()) { setResults(null); setPeople(null); return; }
    let cancelled = false;
    setResults(null);
    setError(null);
    const next = [q, ...readRecent().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8);
    writeRecent(next);
    setRecent(next);
    if (type === 'user') {
      usersApi.search(q, 30).then((r) => { if (!cancelled) { setPeople(r); setResults([]); } }).catch((err) => !cancelled && setError(errorMessage(err)));
    } else {
      setPeople(null);
      searchApi.search(q, type).then((r) => { if (!cancelled) setResults(r); }).catch((err) => !cancelled && setError(errorMessage(err)));
    }
    return () => { cancelled = true; };
  }, [q, type]);

  const go = (term: string, t: SearchType = type) => router.push(`/search?q=${encodeURIComponent(term)}${t !== 'all' ? `&type=${t}` : ''}`);

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-24">
      <form onSubmit={(e) => { e.preventDefault(); if (draft.trim()) go(draft.trim()); }} className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search papers, people, posts and reels" aria-label="Search" className="w-full rounded-2xl border border-[var(--border)] bg-[var(--foreground)]/5 py-3.5 pl-12 pr-10 text-sm focus:border-indigo-500/50 focus:outline-none" />
        {draft && <button type="button" aria-label="Clear" onClick={() => { setDraft(''); router.push('/search'); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground"><X size={16} /></button>}
      </form>

      {!q ? (
        recent.length > 0 ? (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent</h2>
              <button onClick={() => { writeRecent([]); setRecent([]); }} className="text-xs font-semibold text-indigo-400">Clear</button>
            </div>
            <ul>
              {recent.map((r) => (
                <li key={r}><button onClick={() => go(r, 'all')} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-[var(--foreground)]/5"><Search size={14} className="text-muted-foreground" /> {r}</button></li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="text-center text-sm text-muted-foreground">Search by title, abstract, name or tag. Your private papers are included only for you.</p>
        )
      ) : (
        <>
          <div className="no-scrollbar flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button key={t.key} onClick={() => go(q, t.key)} aria-pressed={type === t.key} className={cn('shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold', type === t.key ? 'bg-indigo-600 text-white' : 'text-muted-foreground hover:bg-[var(--foreground)]/5')}>{t.label}</button>
            ))}
          </div>
          {error ? <ErrorState message={error} onRetry={() => go(q)} /> : !results ? <SkeletonRows rows={5} /> : type === 'user' ? (
            people && people.length ? <div className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] px-4">{people.map((u) => <UserRow key={u.id} user={u} />)}</div>
              : <EmptyState icon={<User size={20} />} title={`No people match “${q}”`} />
          ) : results.length === 0 ? (
            <EmptyState icon={<Search size={20} />} title={`No results for “${q}”`} description="Try fewer or different words." />
          ) : (
            <ul className="space-y-2">
              {results.map((r) => {
                const Icon = ICON[r.type] || Search;
                return (
                  <li key={`${r.type}:${r.id}`}>
                    <Link href={hrefFor(r)} className="flex gap-3 rounded-xl border border-[var(--border)] p-4 hover:border-indigo-500/40">
                      <Icon size={18} className="mt-0.5 shrink-0 text-indigo-400" />
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-sm font-semibold">{r.type === 'user' ? `@${r.title}` : r.title || 'Untitled'}</p>
                        {r.description && <p className="line-clamp-2 text-xs text-muted-foreground">{r.description}</p>}
                        <p className="mt-1 text-[11px] capitalize text-muted-foreground">{r.type === 'video' ? 'Reel' : r.type === 'document' ? 'Paper' : r.type}{r.created_at ? ` · ${timeAgo(r.created_at)}` : ''}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return <Suspense fallback={<LoadingBlock />}><SearchInner /></Suspense>;
}
