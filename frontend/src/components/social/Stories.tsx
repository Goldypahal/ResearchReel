"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Pause, Play, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSocial, type Story } from '@/context/SocialContext';
import { errorMessage, storiesApi } from '@/lib/api';
import { cn, displayName, timeAgo } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import Avatar from '@/components/common/Avatar';

/** Gradients are stored by key; the class strings live here so Tailwind always generates them. */
export const STORY_GRADIENTS: Record<string, { label: string; className: string }> = {
  indigo: { label: 'Indigo', className: 'from-indigo-600 via-purple-600 to-pink-600' },
  ocean: { label: 'Ocean', className: 'from-blue-600 to-emerald-500' },
  ember: { label: 'Ember', className: 'from-orange-500 via-red-500 to-rose-600' },
  night: { label: 'Night', className: 'from-purple-800 via-violet-900 to-indigo-950' },
  slate: { label: 'Slate', className: 'from-zinc-900 via-teal-900 to-slate-900' },
};
const gradientClass = (key?: string | null) => (STORY_GRADIENTS[key || ''] || STORY_GRADIENTS.indigo).className;
const STORY_MS = 6000;
const MAX_LEN = 280;

interface AuthorGroup { author_id: string; username: string; full_name?: string | null; avatar_url?: string | null; stories: Story[]; allViewed: boolean }

function groupByAuthor(stories: Story[]): AuthorGroup[] {
  const map = new Map<string, AuthorGroup>();
  for (const s of stories) {
    const g = map.get(s.author_id) || { author_id: s.author_id, username: s.username, full_name: s.full_name, avatar_url: s.avatar_url, stories: [], allViewed: true };
    g.stories.push(s);
    g.allViewed = g.allViewed && s.viewed;
    map.set(s.author_id, g);
  }
  return [...map.values()];
}

function CreateStory({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { createStory } = useSocial();
  const [text, setText] = useState('');
  const [gradient, setGradient] = useState('indigo');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      await createStory(text.trim(), gradient);
      toast({ title: 'Story shared for 24 hours', variant: 'success' });
      onClose();
    } catch (err) {
      toast({ title: 'Could not share story', description: errorMessage(err), variant: 'destructive' });
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="New story">
      <div className="absolute inset-0" onClick={onClose} />
      <form onSubmit={submit} className="relative z-10 flex w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-2xl md:flex-row">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 z-20 rounded-full p-1.5 text-muted-foreground hover:bg-[var(--foreground)]/5"><X size={18} /></button>
        <div className="flex shrink-0 items-center justify-center bg-black/40 p-6 md:w-72">
          <div className={cn('relative flex h-[320px] w-[190px] flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-tr p-4 text-white shadow-2xl', gradientClass(gradient))}>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold">
              <Avatar src={user?.avatar_url} name={displayName(user)} size="xs" /> {user?.username}
            </div>
            <p className="break-words text-center text-sm font-bold leading-snug drop-shadow">{text || 'Your update…'}</p>
            <span className="text-center text-[9px] text-white/60">Visible for 24 hours</span>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-5 p-6">
          <div>
            <h3 className="text-lg font-bold">New story</h3>
            <p className="text-xs text-muted-foreground">A quick update for people who follow you. Disappears after 24 hours.</p>
          </div>
          <div className="space-y-1">
            <textarea
              aria-label="Story text"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
              placeholder="e.g. Preprint is up — feedback welcome!"
              rows={4}
              className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--foreground)]/[0.03] px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none"
              required
              autoFocus
            />
            <p className="text-right text-[11px] text-muted-foreground">{text.length}/{MAX_LEN}</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold">Background</p>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(STORY_GRADIENTS).map(([key, g]) => (
                <button
                  key={key}
                  type="button"
                  aria-label={g.label}
                  aria-pressed={gradient === key}
                  onClick={() => setGradient(key)}
                  className={cn('h-8 rounded-lg border-2 bg-gradient-to-tr', g.className, gradient === key ? 'border-indigo-400' : 'border-transparent')}
                />
              ))}
            </div>
          </div>
          <div className="mt-auto flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-bold">Cancel</button>
            <button type="submit" disabled={busy || !text.trim()} className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50">
              {busy ? 'Sharing…' : 'Share story'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function StoryViewer({ groups, startGroup, onClose }: { groups: AuthorGroup[]; startGroup: number; onClose: () => void }) {
  const { user } = useAuth();
  const { markStoryViewed, refreshStories } = useSocial();
  const [g, setG] = useState(startGroup);
  const [i, setI] = useState(() => Math.max(0, groups[startGroup].stories.findIndex((s) => !s.viewed)));
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const elapsed = useRef(0);

  const group = groups[g];
  const story = group?.stories[i];

  const next = useCallback(() => {
    if (!group) return onClose();
    if (i < group.stories.length - 1) setI(i + 1);
    else if (g < groups.length - 1) { setG(g + 1); setI(0); }
    else onClose();
  }, [g, i, group, groups.length, onClose]);

  const prev = () => {
    if (i > 0) setI(i - 1);
    else if (g > 0) { setG(g - 1); setI(groups[g - 1].stories.length - 1); }
    else { elapsed.current = 0; setProgress(0); }
  };

  useEffect(() => {
    if (!story) return;
    elapsed.current = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data / resets state when its inputs change
    setProgress(0);
    if (!story.viewed) markStoryViewed(story.id);
  }, [story, markStoryViewed]);

  useEffect(() => {
    if (paused || !story) return;
    const step = 50;
    const t = window.setInterval(() => {
      elapsed.current += step;
      setProgress(Math.min(1, elapsed.current / STORY_MS));
      if (elapsed.current >= STORY_MS) next();
    }, step);
    return () => window.clearInterval(t);
  }, [paused, story, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === ' ') { e.preventDefault(); setPaused((p) => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!story) return null;
  const own = user?.id === story.author_id;

  const remove = async () => {
    try {
      await storiesApi.remove(story.id);
      await refreshStories();
      onClose();
    } catch (err) {
      toast({ title: 'Could not delete story', description: errorMessage(err), variant: 'destructive' });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90" role="dialog" aria-modal="true" aria-label={`Story by ${group.username}`}>
      <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-20 rounded-full p-2 text-white/80 hover:bg-white/10"><X size={22} /></button>
      <button onClick={prev} aria-label="Previous" className="absolute left-2 z-20 hidden rounded-full p-2 text-white/80 hover:bg-white/10 md:block"><ChevronLeft size={28} /></button>
      <button onClick={next} aria-label="Next" className="absolute right-2 z-20 hidden rounded-full p-2 text-white/80 hover:bg-white/10 md:block"><ChevronRight size={28} /></button>

      <div className={cn('relative flex h-[min(86vh,720px)] w-[min(92vw,405px)] flex-col overflow-hidden rounded-2xl bg-gradient-to-tr text-white', gradientClass(story.gradient))}>
        <div className="flex gap-1 p-3">
          {group.stories.map((s, n) => (
            <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <div className="h-full bg-white" style={{ width: `${n < i ? 100 : n === i ? progress * 100 : 0}%` }} />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-3">
          <Link href={`/profile/${group.username}`} onClick={onClose} className="flex items-center gap-2 text-sm font-semibold">
            <Avatar src={group.avatar_url} name={displayName(group)} size="sm" /> {group.username}
            <span className="font-normal text-white/70">{timeAgo(story.created_at)}</span>
          </Link>
          <div className="flex items-center gap-1">
            {own && <button onClick={remove} aria-label="Delete story" className="rounded-full p-2 hover:bg-white/10"><Trash2 size={16} /></button>}
            <button onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Play' : 'Pause'} className="rounded-full p-2 hover:bg-white/10">{paused ? <Play size={16} /> : <Pause size={16} />}</button>
          </div>
        </div>
        <div className="grid flex-1 grid-cols-3" onPointerDown={() => setPaused(true)} onPointerUp={() => setPaused(false)}>
          <button className="col-span-1" aria-label="Previous story" onClick={prev} />
          <button className="col-span-2" aria-label="Next story" onClick={next} />
        </div>
        <p className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 whitespace-pre-line break-words text-center text-xl font-bold leading-snug drop-shadow-md">{story.text}</p>
      </div>
    </div>
  );
}

/** Row of story circles: you first, then people you follow (unseen before seen). */
export default function StoriesBar() {
  const { user } = useAuth();
  const { stories, storiesLoading } = useSocial();
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);

  const groups = useMemo(() => {
    const all = groupByAuthor(stories);
    const mine = all.filter((x) => x.author_id === user?.id);
    const others = all.filter((x) => x.author_id !== user?.id).sort((a, b) => Number(a.allViewed) - Number(b.allViewed));
    return [...mine, ...others];
  }, [stories, user?.id]);

  if (!user) return null;
  const hasOwn = groups[0]?.author_id === user.id;

  return (
    <>
      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-1" aria-label="Stories">
        <button onClick={() => (hasOwn ? setViewing(0) : setCreating(true))} className="flex w-16 shrink-0 flex-col items-center gap-1">
          <span className="relative">
            <span className={cn('block rounded-full p-[2px]', hasOwn ? (groups[0].allViewed ? 'bg-[var(--border)]' : 'bg-gradient-to-tr from-amber-400 via-pink-500 to-indigo-500') : '')}>
              <span className="block rounded-full bg-[var(--background)] p-[2px]"><Avatar src={user.avatar_url} name={displayName(user)} size="lg" /></span>
            </span>
            <span
              role="button"
              tabIndex={0}
              aria-label="Add story"
              onClick={(e) => { e.stopPropagation(); setCreating(true); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setCreating(true); } }}
              className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-[var(--background)] bg-indigo-600 text-white"
            >
              <Plus size={12} />
            </span>
          </span>
          <span className="w-full truncate text-center text-[11px]">Your story</span>
        </button>

        {storiesLoading && groups.length === 0 && [0, 1, 2].map((n) => (
          <div key={n} className="flex w-16 shrink-0 animate-pulse flex-col items-center gap-1">
            <div className="h-[64px] w-[64px] rounded-full bg-[var(--foreground)]/10" />
            <div className="h-2 w-10 rounded bg-[var(--foreground)]/10" />
          </div>
        ))}

        {groups.map((grp, n) => grp.author_id === user.id ? null : (
          <button key={grp.author_id} onClick={() => setViewing(n)} className="flex w-16 shrink-0 flex-col items-center gap-1">
            <span className={cn('block rounded-full p-[2px]', grp.allViewed ? 'bg-[var(--border)]' : 'bg-gradient-to-tr from-amber-400 via-pink-500 to-indigo-500')}>
              <span className="block rounded-full bg-[var(--background)] p-[2px]"><Avatar src={grp.avatar_url} name={displayName(grp)} size="lg" /></span>
            </span>
            <span className={cn('w-full truncate text-center text-[11px]', grp.allViewed && 'text-muted-foreground')}>{grp.username}</span>
          </button>
        ))}
      </div>

      {creating && <CreateStory onClose={() => setCreating(false)} />}
      {viewing !== null && groups[viewing] && <StoryViewer groups={groups} startGroup={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
