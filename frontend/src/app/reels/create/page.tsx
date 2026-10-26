"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle, ArrowDown, ArrowUp, CheckCircle2, Clapperboard, Film, Loader2, Plus, Save, Sparkles, Trash2, Upload,
} from 'lucide-react';
import { documentsApi, errorMessage, reelsApi, type LibraryDocument, type ReelDraft, type ReelScene, type UploadJob } from '@/lib/api';
import { EmptyState, ErrorState, LoadingBlock } from '@/components/common/States';
import { toast } from '@/components/ui/use-toast';
import { cn, timeAgo } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';

const MIN_S = 30;
const MAX_S = 60;
const MAX_SCENES = 12;
const STYLES: Record<string, { label: string; bg: string }> = {
  'indigo-dark': { label: 'Indigo', bg: '#1E1B4B' },
  'slate-gradient': { label: 'Slate', bg: '#0F172A' },
  'emerald-glow': { label: 'Emerald', bg: '#064E3B' },
  'crimson-deep': { label: 'Crimson', bg: '#450A0A' },
  'violet-pulsar': { label: 'Violet', bg: '#2E1065' },
};
const STATUS: Record<ReelDraft['status'], { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'text-muted-foreground bg-[var(--foreground)]/5' },
  generating: { label: 'Rendering', className: 'text-amber-400 bg-amber-500/10' },
  completed: { label: 'Published', className: 'text-emerald-500 bg-emerald-500/10' },
  failed: { label: 'Failed', className: 'text-red-400 bg-red-500/10' },
};

const totalSeconds = (scenes: ReelScene[]) => scenes.reduce((n, s) => n + (Number(s.duration) || 0), 0);
const blankScene = (): ReelScene => ({ title: '', dialogue: '', visualDescription: '', duration: 8, backgroundStyle: 'indigo-dark' });

function NewFromPaper({ docs, initialDoc, onCreated }: { docs: LibraryDocument[]; initialDoc: string; onCreated: (d: ReelDraft[]) => void }) {
  const ready = docs.filter((d) => d.status === 'ready' && d.has_text !== false);
  const [docId, setDocId] = useState(initialDoc && ready.some((d) => d.id === initialDoc) ? initialDoc : ready[0]?.id || '');
  const [mode, setMode] = useState<'single' | 'multi'>('single');
  const [parts, setParts] = useState<'auto' | number>('auto');
  const [busy, setBusy] = useState(false);

  if (ready.length === 0) {
    return (
      <EmptyState
        icon={<Film size={20} />}
        title="Upload a paper first"
        description="Reels are scripted from your paper's text, so you need at least one processed paper."
        action={<Link href="/library" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Go to library</Link>}
      />
    );
  }

  const create = async () => {
    setBusy(true);
    try {
      const res = await reelsApi.generateDraft({
        document_id: docId,
        split_mode: mode,
        parts_mode: parts === 'auto' ? 'auto' : 'custom',
        parts_count: parts === 'auto' ? undefined : parts,
      });
      const list = Array.isArray(res) ? res : [res];
      trackEvent('start_reel_generation', { mode, parts: list.length });
      onCreated(list);
    } catch (err) {
      toast({ title: 'Could not draft a script', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--border)] p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold"><Sparkles size={16} className="text-indigo-400" /> Draft a script from a paper</h2>
      <select aria-label="Paper" value={docId} onChange={(e) => setDocId(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm">
        {ready.map((d) => <option key={d.id} value={d.id}>{d.title.slice(0, 90)}</option>)}
      </select>
      <div className="flex flex-wrap gap-2 text-xs">
        {(['single', 'multi'] as const).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)} aria-pressed={mode === m} className={cn('rounded-full border px-3 py-1.5 font-semibold', mode === m ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-[var(--border)] text-muted-foreground')}>
            {m === 'single' ? 'One reel' : 'Series'}
          </button>
        ))}
        {mode === 'multi' && (
          <select aria-label="Number of parts" value={String(parts)} onChange={(e) => setParts(e.target.value === 'auto' ? 'auto' : Number(e.target.value))} className="rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1.5">
            <option value="auto">Choose number of parts for me</option>
            {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} parts</option>)}
          </select>
        )}
      </div>
      <button onClick={create} disabled={busy || !docId} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-50">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} {busy ? 'Writing the script…' : 'Draft script'}
      </button>
      <p className="text-[11px] text-muted-foreground">Scripts are written from the paper&apos;s own text. You can edit every scene before rendering.</p>
    </div>
  );
}

function UploadOwnVideo({ docs }: { docs: LibraryDocument[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [paper, setPaper] = useState('');
  const [job, setJob] = useState<UploadJob | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!job || job.state === 'completed' || job.state === 'failed') return;
    const t = window.setTimeout(() => reelsApi.getUploadJob(job.id).then(setJob).catch(() => undefined), 2500);
    return () => window.clearTimeout(t);
  }, [job]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;
    setBusy(true);
    try {
      const { jobId } = await reelsApi.uploadVideo(file, { title: title.trim(), linked_paper_id: paper || undefined });
      setJob({ id: jobId, state: 'waiting', title: title.trim(), error: null, video_id: null });
      setFile(null);
      setTitle('');
    } catch (err) {
      toast({ title: 'Upload failed', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-[var(--border)] p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold"><Upload size={16} className="text-indigo-400" /> Upload your own video</h2>
      <p className="text-[11px] text-muted-foreground">30–60 seconds, MP4/MOV/WebM, up to 200 MB.</p>
      <input ref={input} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button type="button" onClick={() => input.current?.click()} className="w-full truncate rounded-lg border border-dashed border-[var(--border)] px-3 py-3 text-xs text-muted-foreground hover:border-indigo-500/50">
        {file ? file.name : 'Choose a video'}
      </button>
      {file && (
        <>
          <input aria-label="Reel title" required value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Title" className="w-full rounded-lg border border-[var(--border)] bg-[var(--foreground)]/5 px-3 py-2 text-sm" />
          <select aria-label="Link a paper" value={paper} onChange={(e) => setPaper(e.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs">
            <option value="">No linked paper</option>
            {docs.filter((d) => d.status === 'ready').map((d) => <option key={d.id} value={d.id}>{d.title.slice(0, 80)}</option>)}
          </select>
          <button type="submit" disabled={busy || !title.trim()} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {busy && <Loader2 size={14} className="animate-spin" />} Upload
          </button>
        </>
      )}
      {job && (
        <p className={cn('flex items-center gap-2 text-xs', job.state === 'failed' ? 'text-red-400' : job.state === 'completed' ? 'text-emerald-500' : 'text-amber-400')} aria-live="polite">
          {job.state === 'completed' ? <CheckCircle2 size={14} /> : job.state === 'failed' ? <AlertCircle size={14} /> : <Loader2 size={14} className="animate-spin" />}
          {job.state === 'completed' ? <>“{job.title}” is live. <Link href={job.video_id ? `/reels?r=${job.video_id}` : '/reels'} className="underline">Watch</Link></> : job.state === 'failed' ? job.error : 'Processing your video…'}
        </p>
      )}
    </form>
  );
}

function SceneEditor({ draft, onChange }: { draft: ReelDraft; onChange: (d: ReelDraft) => void }) {
  const [title, setTitle] = useState(draft.title);
  const [scenes, setScenes] = useState<ReelScene[]>(draft.scenes || []);
  const [selected, setSelected] = useState(0);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const dirty = title !== draft.title || JSON.stringify(scenes) !== JSON.stringify(draft.scenes);
  const total = totalSeconds(scenes);
  const lengthOk = total >= MIN_S && total <= MAX_S;
  const locked = draft.status === 'generating';

  // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data / resets state when its inputs change
  useEffect(() => { setTitle(draft.title); setScenes(draft.scenes || []); setSelected(0); }, [draft.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const patch = (i: number, p: Partial<ReelScene>) => setScenes((s) => s.map((x, n) => (n === i ? { ...x, ...p } : x)));
  const move = (i: number, dir: -1 | 1) => setScenes((s) => {
    const j = i + dir;
    if (j < 0 || j >= s.length) return s;
    const c = [...s];
    [c[i], c[j]] = [c[j], c[i]];
    setSelected(j);
    return c;
  });

  const save = async () => {
    setSaving(true);
    try {
      const d = await reelsApi.updateDraft(draft.id, { title: title.trim(), scenes });
      onChange(d);
      toast({ title: 'Draft saved', variant: 'success' });
      return d;
    } catch (err) {
      toast({ title: 'Could not save', description: errorMessage(err), variant: 'destructive' });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (dirty && !(await save())) return;
    setPublishing(true);
    try {
      await reelsApi.publishDraft(draft.id);
      onChange({ ...draft, title, scenes, status: 'generating', error_message: null });
      toast({ title: 'Rendering your reel', description: 'This takes about a minute. You can leave this page.' });
    } catch (err) {
      toast({ title: 'Could not render', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  const scene = scenes[selected];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input aria-label="Reel title" value={title} disabled={locked} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--foreground)]/5 px-3 py-2 text-sm font-semibold" />
        <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-bold', STATUS[draft.status].className)}>{STATUS[draft.status].label}</span>
      </div>

      {draft.status === 'failed' && draft.error_message && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">{draft.error_message}</p>}
      {draft.status === 'generating' && <p className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300"><Loader2 size={14} className="animate-spin" /> Rendering — this page updates when it&apos;s done.</p>}
      {draft.status === 'completed' && (
        <p className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-400">
          <CheckCircle2 size={14} /> Published to your profile and the reels feed.
          <Link href={draft.video_id ? `/reels?r=${draft.video_id}` : '/reels'} className="font-semibold underline">Watch it</Link>
          <span className="text-muted-foreground">Editing and rendering again publishes a new version.</span>
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="space-y-2">
          {scenes.map((s, i) => (
            <div key={i} className={cn('rounded-xl border p-3', i === selected ? 'border-indigo-500/60 bg-indigo-500/[0.04]' : 'border-[var(--border)]')} onFocusCapture={() => setSelected(i)} onClick={() => setSelected(i)}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Scene {i + 1}</span>
                <div className="flex items-center gap-1">
                  <select aria-label="Background" disabled={locked} value={s.backgroundStyle} onChange={(e) => patch(i, { backgroundStyle: e.target.value })} className="rounded border border-[var(--border)] bg-[var(--background)] px-1.5 py-0.5 text-[11px]">
                    {Object.entries(STYLES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <input aria-label="Duration in seconds" type="number" min={2} max={20} disabled={locked} value={s.duration} onChange={(e) => patch(i, { duration: Math.min(20, Math.max(2, Number(e.target.value) || 2)) })} className="w-12 rounded border border-[var(--border)] bg-[var(--background)] px-1 py-0.5 text-[11px]" />s
                  </label>
                  <button type="button" aria-label="Move up" disabled={locked || i === 0} onClick={() => move(i, -1)} className="rounded p-1 disabled:opacity-30"><ArrowUp size={13} /></button>
                  <button type="button" aria-label="Move down" disabled={locked || i === scenes.length - 1} onClick={() => move(i, 1)} className="rounded p-1 disabled:opacity-30"><ArrowDown size={13} /></button>
                  <button type="button" aria-label="Delete scene" disabled={locked || scenes.length <= 1} onClick={() => { setScenes(scenes.filter((_, n) => n !== i)); setSelected(Math.max(0, i - 1)); }} className="rounded p-1 text-red-400 disabled:opacity-30"><Trash2 size={13} /></button>
                </div>
              </div>
              <input aria-label="On-screen title" disabled={locked} value={s.title} maxLength={60} onChange={(e) => patch(i, { title: e.target.value })} placeholder="On-screen title" className="mb-2 w-full rounded-lg border border-[var(--border)] bg-[var(--foreground)]/5 px-2.5 py-1.5 text-sm font-semibold" />
              <textarea aria-label="Narration" disabled={locked} value={s.dialogue} maxLength={300} rows={2} onChange={(e) => patch(i, { dialogue: e.target.value })} placeholder="Narration / caption" className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--foreground)]/5 px-2.5 py-1.5 text-sm" />
            </div>
          ))}
          {scenes.length < MAX_SCENES && !locked && (
            <button type="button" onClick={() => { setScenes([...scenes, blankScene()]); setSelected(scenes.length); }} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--border)] py-2.5 text-xs font-semibold text-muted-foreground hover:border-indigo-500/50">
              <Plus size={14} /> Add scene
            </button>
          )}
        </div>

        <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          {scene && (
            <div className="relative mx-auto flex aspect-[9/16] w-[200px] flex-col items-center justify-between overflow-hidden rounded-xl p-4 text-center text-white shadow-xl" style={{ background: STYLES[scene.backgroundStyle]?.bg || STYLES['indigo-dark'].bg }} aria-label="Scene preview">
              <span />
              <p className="text-[15px] font-semibold leading-tight">{scene.title || 'Scene title'}</p>
              <p className="text-[10px] leading-snug text-indigo-100">{scene.dialogue || 'Narration appears here'}</p>
            </div>
          )}
          <div className="space-y-1 text-center">
            <p className={cn('text-sm font-bold tabular-nums', lengthOk ? 'text-emerald-500' : 'text-amber-400')}>{total}s</p>
            <div className="mx-auto h-1.5 w-[200px] overflow-hidden rounded-full bg-[var(--border)]">
              <div className={cn('h-full rounded-full', lengthOk ? 'bg-emerald-500' : 'bg-amber-400')} style={{ width: `${Math.min(100, (total / MAX_S) * 100)}%` }} />
            </div>
            <p className="text-[11px] text-muted-foreground">Reels must be {MIN_S}–{MAX_S} seconds.</p>
          </div>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={save} disabled={!dirty || saving || locked} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-bold disabled:opacity-40">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save draft
            </button>
            <button type="button" onClick={publish} disabled={!lengthOk || publishing || locked} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-40">
              {publishing ? <Loader2 size={14} className="animate-spin" /> : <Clapperboard size={14} />} {draft.status === 'completed' ? 'Render new version' : 'Render & publish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Studio() {
  const params = useSearchParams();
  const router = useRouter();
  const [drafts, setDrafts] = useState<ReelDraft[] | null>(null);
  const [docs, setDocs] = useState<LibraryDocument[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeId = params.get('draft');

  const load = useCallback(async () => {
    setError(null);
    try {
      const [d, docsRes] = await Promise.all([reelsApi.getDrafts(), documentsApi.getUserAssets()]);
      setDrafts(d);
      setDocs(docsRes);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data / resets state when its inputs change
  useEffect(() => { load(); }, [load]);

  const active = useMemo(() => drafts?.find((d) => d.id === activeId) || null, [drafts, activeId]);

  // Poll while anything is rendering.
  useEffect(() => {
    if (!drafts?.some((d) => d.status === 'generating')) return;
    const t = window.setTimeout(async () => {
      try {
        const fresh = await reelsApi.getDrafts();
        fresh.forEach((d) => {
          const before = drafts.find((x) => x.id === d.id);
          if (before?.status === 'generating' && d.status === 'completed') toast({ title: `“${d.title}” is published`, variant: 'success' });
          if (before?.status === 'generating' && d.status === 'failed') toast({ title: `“${d.title}” failed to render`, description: d.error_message || undefined, variant: 'destructive' });
        });
        setDrafts(fresh);
      } catch { /* retry next tick */ }
    }, 3000);
    return () => window.clearTimeout(t);
  }, [drafts]);

  const open = (id: string | null) => router.replace(id ? `/reels/create?draft=${id}` : '/reels/create', { scroll: false });
  const replace = (d: ReelDraft) => setDrafts((list) => (list || []).map((x) => (x.id === d.id ? { ...x, ...d } : x)));

  const remove = async (d: ReelDraft) => {
    if (!window.confirm(`Delete the draft "${d.title}"? Published reels are not affected.`)) return;
    try {
      await reelsApi.deleteDraft(d.id);
      setDrafts((list) => (list || []).filter((x) => x.id !== d.id));
      if (activeId === d.id) open(null);
    } catch (err) {
      toast({ title: 'Could not delete draft', description: errorMessage(err), variant: 'destructive' });
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!drafts || !docs) return <LoadingBlock />;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight"><Film size={22} className="text-indigo-400" /> Reel studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">Turn a paper into a 30–60 second explainer, or upload your own clip.</p>
        </div>
        <Link href="/reels" className="text-xs font-semibold text-indigo-400 hover:underline">Watch reels</Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="space-y-4">
          <NewFromPaper docs={docs} initialDoc={params.get('document') || ''} onCreated={(list) => { setDrafts((d) => [...list, ...(d || [])]); open(list[0].id); }} />
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Your drafts</h2>
            {drafts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No drafts yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {drafts.map((d) => (
                  <li key={d.id} className={cn('group flex items-center gap-2 rounded-lg border px-3 py-2', d.id === activeId ? 'border-indigo-500/60 bg-indigo-500/[0.05]' : 'border-[var(--border)]')}>
                    <button onClick={() => open(d.id)} className="min-w-0 flex-1 text-left">
                      <p className="truncate text-sm font-semibold">{d.total_parts && d.total_parts > 1 ? `${d.part_number}/${d.total_parts} · ` : ''}{d.title}</p>
                      <p className="text-[11px] text-muted-foreground"><span className={cn('rounded px-1 font-semibold', STATUS[d.status]?.className)}>{STATUS[d.status]?.label || d.status}</span> · {timeAgo(d.updated_at || d.created_at)}</p>
                    </button>
                    {d.status !== 'generating' && (
                      <button onClick={() => remove(d)} aria-label="Delete draft" className="rounded p-1 text-muted-foreground opacity-0 hover:text-red-400 group-hover:opacity-100 focus:opacity-100"><Trash2 size={13} /></button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <UploadOwnVideo docs={docs} />
        </aside>

        <section className="min-w-0 rounded-2xl border border-[var(--border)] p-5">
          {active ? (
            <SceneEditor draft={active} onChange={replace} />
          ) : drafts.length ? (
            <p className="text-sm text-muted-foreground">Pick a draft to edit, or draft a new script from a paper.</p>
          ) : (
            <EmptyState className="border-0" icon={<Sparkles size={20} />} title="Start with a paper" description="Choose a paper on the left and we'll draft scenes from its abstract and text. You edit, then render." />
          )}
        </section>
      </div>
    </div>
  );
}

export default function CreateReelPage() {
  return <Suspense fallback={<LoadingBlock />}><Studio /></Suspense>;
}
