"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, X, ChevronLeft, ChevronRight, Trash2, Eye, ImagePlus } from 'lucide-react';
import { Avatar, Modal, primaryBtn, inputClass } from '@/components/common';
import { storiesApi, errorMessage, type StoryGroup } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { timeAgo } from '@/lib/format';
import { toast } from '@/components/ui/use-toast';

const GRADIENTS = [
  'from-indigo-600 to-purple-700', 'from-emerald-600 to-teal-700', 'from-rose-600 to-orange-600',
  'from-sky-600 to-blue-800', 'from-zinc-700 to-zinc-900',
];
const STORY_MS = 6000;

function CreateStory({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [text, setText] = useState('');
  const [gradient, setGradient] = useState(GRADIENTS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const f = new FormData();
      if (text.trim()) f.append('text', text.trim());
      f.append('gradient', gradient);
      if (file) f.append('image', file);
      await storiesApi.create(f);
      toast({ title: 'Story shared', description: 'It will be visible for 24 hours.', variant: 'success' });
      setText(''); setFile(null);
      onCreated(); onClose();
    } catch (err) {
      toast({ title: 'Could not share story', description: errorMessage(err), variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="New story">
      <div className="p-5 space-y-4">
        <div className={`aspect-[9/12] rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center p-6 text-center relative overflow-hidden`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {file && <img src={URL.createObjectURL(file)} alt="Story preview" className="absolute inset-0 w-full h-full object-cover" />}
          <p className="relative text-white text-xl font-bold whitespace-pre-wrap drop-shadow">{text || 'Share a quick research update…'}</p>
        </div>
        <textarea className={`${inputClass} min-h-20`} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="What are you working on today?" />
        <div className="flex items-center gap-2">
          {GRADIENTS.map((g) => (
            <button key={g} onClick={() => setGradient(g)} aria-label="Choose background" className={`w-8 h-8 rounded-full bg-gradient-to-br ${g} ${gradient === g ? 'ring-2 ring-white' : ''}`} />
          ))}
          <label className="ml-auto inline-flex items-center gap-1.5 text-sm cursor-pointer text-indigo-400">
            <ImagePlus size={16} /> {file ? 'Change photo' : 'Add photo'}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
        </div>
        <button className={`${primaryBtn} w-full`} disabled={busy || (!text.trim() && !file)} onClick={submit}>Share story</button>
      </div>
    </Modal>
  );
}

function StoryViewer({ groups, start, onClose, onChanged }: { groups: StoryGroup[]; start: number; onClose: () => void; onChanged: () => void }) {
  const [g, setG] = useState(start);
  const [s, setS] = useState(0);
  const [progress, setProgress] = useState(0);
  const [viewers, setViewers] = useState<{ username: string; full_name: string }[] | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const group = groups[g];
  const story = group?.stories[s];

  const next = useCallback(() => {
    if (!group) return;
    if (s < group.stories.length - 1) setS(s + 1);
    else if (g < groups.length - 1) { setG(g + 1); setS(0); }
    else onClose();
  }, [g, s, group, groups.length, onClose]);
  const prev = () => { if (s > 0) setS(s - 1); else if (g > 0) { setG(g - 1); setS(0); } };

  useEffect(() => {
    if (!story) return;
    if (!group.is_self) storiesApi.view(story.id);
    setProgress(0); setViewers(null);
    const startAt = Date.now();
    timer.current = setInterval(() => {
      const p = (Date.now() - startAt) / STORY_MS;
      if (p >= 1) { clearInterval(timer.current!); next(); } else setProgress(p);
    }, 50);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [story, group, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  if (!story) return null;

  const remove = async () => {
    try { await storiesApi.remove(story.id); toast({ title: 'Story deleted', variant: 'success' }); onChanged(); onClose(); }
    catch (err) { toast({ title: 'Could not delete story', description: errorMessage(err), variant: 'destructive' }); }
  };
  const showViewers = async () => {
    if (timer.current) clearInterval(timer.current);
    try { setViewers(await storiesApi.viewers(story.id)); } catch { setViewers([]); }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={`Story by ${group.full_name}`}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white" aria-label="Close"><X size={28} /></button>
      <div className="relative w-full max-w-sm aspect-[9/16] max-h-[90vh] rounded-2xl overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${story.gradient || GRADIENTS[0]}`} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {story.media_url && <img src={story.media_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute top-0 left-0 right-0 p-3 flex gap-1">
          {group.stories.map((_, i) => (
            <div key={i} className="h-0.5 flex-1 bg-white/30 rounded overflow-hidden">
              <div className="h-full bg-white" style={{ width: `${i < s ? 100 : i === s ? progress * 100 : 0}%` }} />
            </div>
          ))}
        </div>
        <div className="absolute top-5 left-3 right-3 flex items-center gap-2 text-white">
          <Avatar src={group.avatar_url} name={group.full_name} size={32} />
          <Link href={`/profile/${group.username}`} className="font-semibold text-sm" onClick={onClose}>{group.username}</Link>
          <span className="text-xs text-white/70">{timeAgo(story.created_at)}</span>
        </div>
        {story.text && <p className="absolute inset-x-6 top-1/2 -translate-y-1/2 text-center text-white text-2xl font-bold whitespace-pre-wrap drop-shadow-lg">{story.text}</p>}
        <button className="absolute inset-y-0 left-0 w-1/3" onClick={prev} aria-label="Previous story" />
        <button className="absolute inset-y-0 right-0 w-2/3" onClick={next} aria-label="Next story" />
        {group.is_self && (
          <div className="absolute bottom-4 left-4 right-4 flex justify-between text-white text-sm">
            <button onClick={showViewers} className="inline-flex items-center gap-1.5"><Eye size={16} /> Viewers</button>
            <button onClick={remove} className="inline-flex items-center gap-1.5 text-red-300"><Trash2 size={16} /> Delete</button>
          </div>
        )}
        {viewers && (
          <div className="absolute inset-x-0 bottom-0 max-h-1/2 bg-black/90 p-4 text-white text-sm space-y-2 overflow-y-auto">
            <p className="font-semibold">{viewers.length} {viewers.length === 1 ? 'viewer' : 'viewers'}</p>
            {viewers.map((v) => <p key={v.username}>{v.full_name} <span className="text-white/50">@{v.username}</span></p>)}
          </div>
        )}
      </div>
      <button onClick={prev} className="hidden md:block absolute left-8 text-white/70 hover:text-white" aria-label="Previous"><ChevronLeft size={36} /></button>
      <button onClick={next} className="hidden md:block absolute right-8 text-white/70 hover:text-white" aria-label="Next"><ChevronRight size={36} /></button>
    </div>
  );
}

export default function Stories() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => { storiesApi.list().then(setGroups).catch(() => setGroups([])); }, []);
  useEffect(() => { load(); }, [load]);

  const hasOwn = groups.some((x) => x.is_self);

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar" aria-label="Stories">
      {!hasOwn && user && (
        <button onClick={() => setCreating(true)} className="flex flex-col items-center gap-1.5 shrink-0 w-16">
          <div className="relative">
            <Avatar src={user.avatar_url} name={user.full_name} size={60} />
            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-indigo-600 border-2 border-[var(--background)] flex items-center justify-center"><Plus size={12} className="text-white" /></span>
          </div>
          <span className="text-[11px] text-zinc-400 truncate w-full text-center">Your story</span>
        </button>
      )}
      {groups.map((grp, i) => (
        <div key={grp.author_id} className="flex flex-col items-center gap-1.5 shrink-0 w-16 relative">
          <button onClick={() => setOpen(i)} aria-label={`View ${grp.full_name}'s story`}>
            <div className={`p-[2px] rounded-full ${grp.all_viewed ? 'bg-zinc-700' : 'bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-500'}`}>
              <div className="p-[2px] rounded-full bg-[var(--background)]"><Avatar src={grp.avatar_url} name={grp.full_name} size={54} /></div>
            </div>
          </button>
          {grp.is_self && (
            <button onClick={() => setCreating(true)} className="absolute top-10 right-0 w-5 h-5 rounded-full bg-indigo-600 border-2 border-[var(--background)] flex items-center justify-center" aria-label="Add to your story"><Plus size={12} className="text-white" /></button>
          )}
          <span className="text-[11px] text-zinc-400 truncate w-full text-center">{grp.is_self ? 'Your story' : grp.username}</span>
        </div>
      ))}
      {open !== null && <StoryViewer groups={groups} start={open} onClose={() => { setOpen(null); load(); }} onChanged={load} />}
      <CreateStory open={creating} onClose={() => setCreating(false)} onCreated={load} />
    </div>
  );
}
