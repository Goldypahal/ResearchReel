"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, Bot, ChevronRight, Clock, FileText, Film, FolderKanban, Sparkles, Upload, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Feed from '@/components/feed/Feed';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/common/States';
import { aiApi, documentsApi, errorMessage, projectsApi, type LibraryDocument, type Project, type Recommendation } from '@/lib/api';
import { displayName, timeAgo } from '@/lib/utils';

type Load<T> = { data: T | null; error: string | null };
const initial = { data: null, error: null };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function SectionHeader({ icon: Icon, title, href, linkLabel }: { icon: React.ElementType; title: string; href: string; linkLabel: string }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="flex items-center gap-2 text-base font-bold"><Icon size={17} className="text-indigo-500" /> {title}</h3>
      <Link href={href} className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:underline">{linkLabel} <ChevronRight size={14} /></Link>
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  ready: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  processing: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function HomeDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [aiPrompt, setAiPrompt] = useState('');
  const [papers, setPapers] = useState<Load<LibraryDocument[]>>(initial);
  const [recs, setRecs] = useState<Load<Recommendation[]>>(initial);
  const [projects, setProjects] = useState<Load<Project[]>>(initial);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const settle = <T,>(p: Promise<T>, set: (v: Load<T>) => void) =>
      p.then((data) => !cancelled && set({ data, error: null }))
        .catch((err) => !cancelled && set({ data: null, error: errorMessage(err) }));
    settle(documentsApi.getUserAssets(), setPapers);
    settle(aiApi.getRecommendations(4), setRecs);
    settle(projectsApi.getProjects(), setProjects);
    return () => { cancelled = true; };
  }, [user]);

  const handleAiAsk = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(aiPrompt.trim() ? `/ai/ask?q=${encodeURIComponent(aiPrompt.trim())}` : '/ai/ask');
  };

  const recentPapers = (papers.data || []).slice(0, 3);
  const activeProjects = (projects.data || []).slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{greeting()}, {displayName(user)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Here&apos;s what&apos;s happening in your research.</p>
      </div>

      {/* AI copilot */}
      <div className="relative space-y-4 overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-900/80 via-purple-900/60 to-slate-900 p-6 shadow-2xl md:p-8">
        <Bot size={180} className="pointer-events-none absolute right-6 top-4 text-indigo-400 opacity-10" />
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300"><Sparkles size={16} /> Research copilot</div>
        <h2 className="max-w-xl text-xl font-bold text-white md:text-2xl">What are you researching today?</h2>
        <form onSubmit={handleAiAsk} className="relative max-w-2xl">
          <input
            type="text"
            aria-label="Ask the research copilot"
            placeholder="Ask about your papers, methods, or results…"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/10 py-3.5 pl-4 pr-12 text-sm text-white shadow-inner backdrop-blur-md placeholder:text-zinc-400 focus:border-indigo-400 focus:outline-none"
          />
          <button type="submit" aria-label="Ask" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-indigo-600 p-2 text-white hover:bg-indigo-500">
            <ArrowRight size={18} />
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          {[
            { href: '/library', icon: Upload, label: 'Upload paper' },
            { href: '/reels/create', icon: Film, label: 'Create reel' },
            { href: '/projects/new', icon: Users, label: 'New project' },
          ].map((a) => (
            <Link key={a.href} href={a.href} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-white hover:bg-white/20">
              <a.icon size={14} /> {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Recent papers */}
      <section className="space-y-4">
        <SectionHeader icon={Clock} title="Your recent papers" href="/library" linkLabel="Library" />
        {papers.error ? (
          <ErrorState message={papers.error} />
        ) : !papers.data ? (
          <SkeletonRows rows={2} />
        ) : recentPapers.length === 0 ? (
          <EmptyState
            icon={<FileText size={20} />}
            title="Your library is empty"
            description="Upload a PDF or DOCX and ResearchReel extracts the abstract and DOI so you can share it, ask AI about it, or turn it into a reel."
            action={<Link href="/library" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">Upload a paper</Link>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {recentPapers.map((doc) => (
              <Link
                key={doc.id}
                href={`/library/documents/${doc.id}`}
                className="group space-y-3 rounded-xl border border-[var(--border)] bg-[var(--foreground)]/[0.03] p-4 transition-all hover:border-indigo-500/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[doc.status] || STATUS_STYLE.ready}`}>
                    {doc.status === 'ready' ? (doc.metadata?.pages ? `${doc.metadata.pages} pages` : 'Ready') : doc.status}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{timeAgo(doc.updated_at || doc.created_at)}</span>
                </div>
                <h4 className="line-clamp-2 text-sm font-bold group-hover:text-indigo-400">{doc.title}</h4>
                <p className="line-clamp-2 text-xs text-muted-foreground">{doc.abstract || doc.file_name}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* Recommendations */}
          <section className="space-y-4">
            <SectionHeader icon={Sparkles} title="Recommended papers" href="/discover" linkLabel="Discover" />
            {recs.error ? (
              <ErrorState message={recs.error} />
            ) : !recs.data ? (
              <SkeletonRows rows={2} />
            ) : recs.data.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--border)] p-5 text-sm text-muted-foreground">
                No papers have been shared yet. Add research interests to your profile and papers others share will show up here.
              </p>
            ) : (
              <div className="space-y-3">
                {recs.data.map((r) => (
                  <Link key={r.post_id} href={`/post/${r.post_id}`} className="block space-y-1.5 rounded-xl border border-[var(--border)] p-4 transition-all hover:border-indigo-500/30">
                    <p className="text-[11px] font-medium text-indigo-400">{r.reason}</p>
                    <h4 className="text-sm font-bold">{r.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      Shared by {displayName(r)}{r.institution ? ` · ${r.institution}` : ''}
                      {r.publication_year ? ` · ${r.publication_year}` : ''}{r.journal ? ` · ${r.journal}` : ''}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h3 className="flex items-center gap-2 text-base font-bold"><BookOpen size={17} className="text-indigo-500" /> Community feed</h3>
            <Feed />
          </section>
        </div>

        {/* Projects */}
        <aside className="space-y-4">
          <SectionHeader icon={FolderKanban} title="Your projects" href="/projects" linkLabel="All projects" />
          {projects.error ? (
            <ErrorState message={projects.error} />
          ) : !projects.data ? (
            <SkeletonRows rows={2} />
          ) : activeProjects.length === 0 ? (
            <EmptyState
              title="No projects yet"
              description="Plan a study with collaborators and track tasks on a board."
              action={<Link href="/projects/new" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">New project</Link>}
            />
          ) : (
            <div className="space-y-3">
              {activeProjects.map((p) => {
                const total = p.task_count || 0;
                const pct = total ? Math.round(((p.done_count || 0) / total) * 100) : 0;
                return (
                  <Link key={p.id} href={`/projects/${p.id}`} className="block space-y-3 rounded-xl border border-[var(--border)] bg-[var(--foreground)]/[0.03] p-4 transition-all hover:border-indigo-500/40">
                    <h4 className="text-sm font-bold">{p.name}</h4>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{p.member_count || 1} {p.member_count === 1 ? 'member' : 'members'}</span>
                      <span>·</span>
                      <span>{total} {total === 1 ? 'task' : 'tasks'}</span>
                    </div>
                    {total > 0 && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground"><span>Done</span><span>{pct}%</span></div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--border)]">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
