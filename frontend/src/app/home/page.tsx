"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bot, Sparkles, Users, FileText, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Feed from '@/components/feed/Feed';
import Stories from '@/components/feed/Stories';
import { Avatar, UserLink } from '@/components/common';
import FollowButton from '@/components/common/FollowButton';
import { aiApi, projectsApi, usersApi, type Paper, type Project, type PublicUser } from '@/lib/api';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [scope, setScope] = useState<'following' | 'all'>('following');
  const [projects, setProjects] = useState<Project[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [people, setPeople] = useState<PublicUser[]>([]);

  useEffect(() => {
    projectsApi.list().then((p) => setProjects(p.slice(0, 3))).catch(() => {});
    aiApi.recommendations().then((p) => setPapers(p.slice(0, 4))).catch(() => {});
    usersApi.suggestions(5).then(setPeople).catch(() => {});
  }, []);

  const ask = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(prompt.trim() ? `/ai/ask?q=${encodeURIComponent(prompt.trim())}` : '/ai/ask');
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8">
      <div className="space-y-6 min-w-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{greeting()}, {user?.full_name?.split(' ')[0] || user?.username}</h1>
          <p className="text-sm text-zinc-500 mt-1">Here&apos;s what&apos;s happening in your research network.</p>
        </div>

        <Stories />

        <form onSubmit={ask} className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/70 via-purple-900/50 to-slate-900 border border-indigo-500/30 p-5 space-y-3">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs uppercase tracking-wider"><Sparkles size={14} /> Research assistant</div>
          <div className="flex gap-2">
            <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ask about a method, concept or paper…" aria-label="Ask the research assistant"
              className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-black/30 border border-white/10 text-sm text-white placeholder:text-zinc-400 focus:outline-none focus:border-indigo-400" />
            <button className="px-4 shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold inline-flex items-center gap-1.5"><Bot size={16} /> Ask</button>
          </div>
        </form>

        <div className="flex gap-2 border-b border-[var(--border)]" role="tablist">
          {(['following', 'all'] as const).map((s) => (
            <button key={s} role="tab" aria-selected={scope === s} onClick={() => setScope(s)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px ${scope === s ? 'border-indigo-500 text-[var(--foreground)]' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
              {s === 'following' ? 'Following' : 'Everyone'}
            </button>
          ))}
        </div>

        <Feed
          scope={scope}
          emptyTitle={scope === 'following' ? 'Your feed is quiet' : 'No posts yet'}
          emptyDescription={scope === 'following' ? 'Follow researchers to see their posts here, or switch to Everyone.' : 'Be the first to share something with the community.'}
        />
      </div>

      <aside className="hidden lg:block space-y-6">
        <section className="rounded-2xl border border-[var(--border)] p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold flex items-center gap-2"><Users size={15} /> Your projects</h2>
            <Link href="/projects" className="text-xs text-indigo-400">See all</Link>
          </div>
          {projects.length === 0 ? (
            <p className="text-xs text-zinc-500">No projects yet. <Link href="/projects/new" className="text-indigo-400">Start one</Link> to collaborate.</p>
          ) : (
            <ul className="space-y-3">
              {projects.map((p) => {
                const pct = p.task_count ? Math.round(((p.done_count || 0) / p.task_count) * 100) : 0;
                return (
                  <li key={p.id}>
                    <Link href={`/projects/${p.id}`} className="block group">
                      <p className="text-sm font-semibold group-hover:underline truncate">{p.name}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1.5 rounded bg-[var(--foreground)]/10 overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} /></div>
                        <span className="text-[11px] text-zinc-500">{p.done_count || 0}/{p.task_count || 0}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {papers.length > 0 && (
          <section className="rounded-2xl border border-[var(--border)] p-4">
            <h2 className="text-sm font-bold flex items-center gap-2 mb-3"><FileText size={15} /> Papers for you</h2>
            <ul className="space-y-3">
              {papers.map((p) => (
                <li key={p.id}>
                  <Link href={`/library/documents/${p.id}`} className="text-sm font-medium hover:underline line-clamp-2">{p.title}</Link>
                  <p className="text-[11px] text-zinc-500 truncate">{p.authors?.length ? p.authors.join(', ') : `Shared by @${p.uploader_username}`}</p>
                </li>
              ))}
            </ul>
            <Link href="/discover" className="mt-3 inline-flex items-center gap-1 text-xs text-indigo-400">Discover more <ArrowRight size={12} /></Link>
          </section>
        )}

        {people.length > 0 && (
          <section className="rounded-2xl border border-[var(--border)] p-4">
            <h2 className="text-sm font-bold mb-3">Researchers to follow</h2>
            <ul className="space-y-3">
              {people.map((u) => (
                <li key={u.id} className="flex items-center gap-3">
                  <Link href={`/profile/${u.username}`}><Avatar src={u.avatar_url} name={u.full_name} size={34} /></Link>
                  <div className="flex-1 min-w-0">
                    <UserLink username={u.username} fullName={u.full_name} status={u.verification_status} className="text-sm" />
                    <p className="text-[11px] text-zinc-500 truncate">{u.institution || `@${u.username}`}</p>
                  </div>
                  <FollowButton username={u.username} initial={false} size="sm" />
                </li>
              ))}
            </ul>
          </section>
        )}
      </aside>
    </div>
  );
}
