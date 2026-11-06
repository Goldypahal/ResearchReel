"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Film, Plus, Sparkles } from 'lucide-react';
import { reelsApi, errorMessage, type Reel } from '@/lib/api';
import { Spinner, ErrorState, EmptyState } from '@/components/common';
import ReelPlayer from '@/components/reels/ReelPlayer';

function ReelsFeed() {
  const startId = useSearchParams().get('id');
  const [reels, setReels] = useState<Reel[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadingMore = useRef(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await reelsApi.list({ limit: 10 });
      let list = r.reels;
      if (startId && !list.some((x) => x.id === startId)) {
        try { list = [await reelsApi.get(startId), ...list]; } catch { /* deleted reel */ }
      } else if (startId) {
        const idx = list.findIndex((x) => x.id === startId);
        list = [...list.slice(idx), ...list.slice(0, idx)];
      }
      setReels(list); setCursor(r.nextCursor);
    } catch (err) { setError(errorMessage(err)); } finally { setLoading(false); }
  }, [startId]);
  useEffect(() => { load(); }, [load]);

  const more = useCallback(async () => {
    if (!cursor || loadingMore.current) return;
    loadingMore.current = true;
    try {
      const r = await reelsApi.list({ cursor, limit: 10 });
      setReels((prev) => [...prev, ...r.reels.filter((x) => !prev.some((p) => p.id === x.id))]);
      setCursor(r.nextCursor);
    } catch { /* retry on next scroll */ } finally { loadingMore.current = false; }
  }, [cursor]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const i = Number((e.target as HTMLElement).dataset.index);
          setActive(i);
          if (i >= reels.length - 3) more();
        }
      });
    }, { root, threshold: 0.65 });
    root.querySelectorAll('[data-index]').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [reels.length, more]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!containerRef.current || (e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const next = Math.max(0, Math.min(reels.length - 1, active + (e.key === 'ArrowDown' ? 1 : -1)));
        containerRef.current.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, reels.length]);

  if (loading) return <Spinner label="Loading reels" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (reels.length === 0) {
    return (
      <EmptyState icon={<Film size={32} />} title="No reels yet" description="Turn a paper into a short explainer, or upload your own video."
        action={<div className="flex gap-3"><Link href="/reels/generator" className="text-sm font-semibold text-indigo-400">Generate from a paper</Link><Link href="/reels/create" className="text-sm font-semibold text-indigo-400">Upload a video</Link></div>} />
    );
  }

  return (
    <div ref={containerRef} className="h-[calc(100dvh-10rem)] md:h-[calc(100dvh-8rem)] overflow-y-scroll snap-y snap-mandatory no-scrollbar mx-auto w-full max-w-[420px] space-y-4">
      {reels.map((r, i) => (
        <div key={r.id} data-index={i} className="snap-start h-full">
          {Math.abs(i - active) <= 2 ? (
            <ReelPlayer reel={r} active={i === active} muted={muted} onToggleMute={() => setMuted((m) => !m)}
              onDeleted={(id) => setReels((prev) => prev.filter((x) => x.id !== id))} />
          ) : <div className="w-full h-full bg-black md:rounded-3xl" />}
        </div>
      ))}
    </div>
  );
}

export default function ReelsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between max-w-[420px] mx-auto">
        <h1 className="text-xl font-extrabold flex items-center gap-2"><Film size={22} className="text-purple-400" /> Reels</h1>
        <div className="flex gap-2">
          <Link href="/reels/generator" className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-indigo-600 text-white"><Sparkles size={13} /> From paper</Link>
          <Link href="/reels/create" className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[var(--foreground)]/10"><Plus size={13} /> Upload</Link>
        </div>
      </div>
      <Suspense fallback={<Spinner />}><ReelsFeed /></Suspense>
    </div>
  );
}
