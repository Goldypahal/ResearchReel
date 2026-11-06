"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Plus, Trash2, ArrowUp, ArrowDown, Play, Pause, Save, Send, Loader2, Settings2, FileText, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { reelsApi, aiApi, errorMessage, type ReelDraft, type Scene, type AutomationSettings } from '@/lib/api';
import { Spinner, Modal, inputClass, primaryBtn, secondaryBtn } from '@/components/common';
import UploadPaperModal from '@/components/ui/UploadPaperModal';
import { toast } from '@/components/ui/use-toast';
import { timeAgo } from '@/lib/format';

const STYLES: Record<string, string> = {
  'indigo-dark': 'from-indigo-950 to-indigo-900',
  'slate-gradient': 'from-slate-950 to-slate-800',
  'emerald-glow': 'from-emerald-950 to-emerald-800',
  'crimson-deep': 'from-red-950 to-red-900',
  'violet-pulsar': 'from-violet-950 to-violet-800',
};
const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-zinc-500/15 text-zinc-300', generating: 'bg-amber-500/15 text-amber-300', completed: 'bg-emerald-500/15 text-emerald-300', failed: 'bg-red-500/15 text-red-300',
};
const totalSeconds = (scenes: Scene[]) => scenes.reduce((s, x) => s + (Number(x.duration) || 0), 0);

function Preview({ scenes }: { scenes: Scene[] }) {
  const [playing, setPlaying] = useState(false);
  const [idx, setIdx] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    setPlaying(false);
    if (timer.current) clearTimeout(timer.current);
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => stop, [stop]);
  useEffect(() => {
    if (!playing) return;
    const scene = scenes[idx];
    if (!scene) { stop(); setIdx(0); return; }
    if (window.speechSynthesis && scene.dialogue) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(scene.dialogue));
    }
    timer.current = setTimeout(() => setIdx((i) => i + 1), (Number(scene.duration) || 6) * 1000);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [playing, idx, scenes, stop]);

  const scene = scenes[Math.min(idx, scenes.length - 1)];
  return (
    <div className="space-y-2">
      <div className={`aspect-[9/16] rounded-2xl bg-gradient-to-b ${STYLES[scene?.backgroundStyle] || STYLES['indigo-dark']} flex flex-col items-center justify-center p-6 text-center text-white relative overflow-hidden`}>
        {scene ? (
          <>
            <p className="text-2xl font-bold leading-tight">{scene.title}</p>
            <p className="absolute bottom-[18%] inset-x-6 text-sm text-indigo-100">{scene.dialogue}</p>
          </>
        ) : <p className="text-sm text-white/60">Add scenes to preview</p>}
        <div className="absolute top-3 inset-x-3 flex gap-1">
          {scenes.map((_, i) => <div key={i} className={`h-0.5 flex-1 rounded ${i <= idx && playing ? 'bg-white' : 'bg-white/30'}`} />)}
        </div>
      </div>
      <button className={`${secondaryBtn} w-full`} onClick={() => (playing ? stop() : (setIdx(0), setPlaying(true)))} disabled={!scenes.length}>
        {playing ? <><Pause size={15} /> Stop preview</> : <><Play size={15} /> Preview with narration</>}
      </button>
      <p className="text-[11px] text-zinc-500 text-center">Preview uses your browser&apos;s voice. The published reel is rendered on the server{' '}(~{totalSeconds(scenes)}s).</p>
    </div>
  );
}

function AutomationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [s, setS] = useState<AutomationSettings | null>(null);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) reelsApi.automation().then(setS).catch(() => {}); }, [open]);
  const save = async (patch: Partial<AutomationSettings> & { gemini_api_key?: string }) => {
    setBusy(true);
    try { setS(await reelsApi.updateAutomation(patch)); toast({ title: 'Settings saved', variant: 'success' }); setKey(''); }
    catch (err) { toast({ title: 'Could not save settings', description: errorMessage(err), variant: 'destructive' }); }
    finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Reel automation">
      {!s ? <Spinner /> : (
        <div className="p-5 space-y-5 text-sm">
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-1 accent-indigo-500" checked={s.auto_generate} disabled={busy} onChange={(e) => save({ auto_generate: e.target.checked })} />
            <span><strong>Draft a reel for every new paper</strong><br /><span className="text-zinc-500">When you upload a paper, a script draft is created automatically.</span></span>
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-1 accent-indigo-500" checked={s.auto_upload} disabled={busy} onChange={(e) => save({ auto_upload: e.target.checked })} />
            <span><strong>Publish drafts on a schedule</strong><br /><span className="text-zinc-500">Renders and posts your oldest draft every interval.</span></span>
          </label>
          <div className="flex items-center gap-3">
            <span>Every</span>
            <select className={`${inputClass} w-32`} value={s.upload_interval_hours} disabled={busy} onChange={(e) => save({ upload_interval_hours: Number(e.target.value) })}>
              {[6, 12, 24, 48, 72, 168].map((h) => <option key={h} value={h}>{h < 24 ? `${h} hours` : h === 168 ? '1 week' : `${h / 24} day${h > 24 ? 's' : ''}`}</option>)}
            </select>
            {s.next_upload_at && s.auto_upload && <span className="text-xs text-zinc-500">Next: {new Date(s.next_upload_at).toLocaleString()}</span>}
          </div>
          <div className="space-y-2 pt-3 border-t border-[var(--border)]">
            <p><strong>Your own Gemini API key</strong> <span className="text-zinc-500">(optional)</span></p>
            <p className="text-xs text-zinc-500">Use your own key for script writing and narration. It is stored encrypted. {s.has_api_key ? 'A key is saved.' : 'No key saved — the platform key is used if available.'}</p>
            <div className="flex gap-2">
              <input type="password" className={inputClass} placeholder="AIza…" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" />
              <button className={primaryBtn} disabled={busy || !key.trim()} onClick={() => save({ gemini_api_key: key.trim() })}>Save</button>
            </div>
            {s.has_api_key && <button className="text-xs text-red-400" onClick={() => save({ gemini_api_key: '' })}>Remove saved key</button>}
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function ReelGeneratorPage() {
  const [papers, setPapers] = useState<{ id: string; title: string }[] | null>(null);
  const [drafts, setDrafts] = useState<ReelDraft[]>([]);
  const [paperId, setPaperId] = useState('');
  const [split, setSplit] = useState<'single' | 'multi'>('single');
  const [partsMode, setPartsMode] = useState<'auto' | 'manual'>('auto');
  const [parts, setParts] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [active, setActive] = useState<ReelDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [p, d] = await Promise.all([reelsApi.myPapers(), reelsApi.drafts()]);
      setPapers(p); setDrafts(d);
      setPaperId((cur) => cur || p[0]?.id || '');
    } catch (err) {
      setPapers([]);
      toast({ title: 'Could not load your papers', description: errorMessage(err), variant: 'destructive' });
    }
  }, []);
  useEffect(() => { loadAll(); aiApi.status().then((s) => setAiReady(s.configured)).catch(() => setAiReady(false)); }, [loadAll]);

  // Poll while any draft is rendering.
  useEffect(() => {
    if (!drafts.some((d) => d.status === 'generating')) return;
    const t = setInterval(async () => {
      try {
        const d = await reelsApi.drafts();
        setDrafts(d);
        setActive((cur) => (cur ? d.find((x) => x.id === cur.id) || cur : cur));
      } catch { /* keep polling */ }
    }, 5000);
    return () => clearInterval(t);
  }, [drafts]);

  const generate = async () => {
    if (!paperId) return;
    setGenerating(true);
    try {
      const r = await reelsApi.generate({ document_id: paperId, split_mode: split, parts_mode: partsMode, parts_count: parts });
      const created = Array.isArray(r) ? r : [r];
      setDrafts((prev) => [...created, ...prev]);
      setActive(created[0]); setDirty(false);
      toast({ title: created.length > 1 ? `${created.length} drafts created` : 'Draft created', description: 'Review and edit the script, then publish.', variant: 'success' });
    } catch (err) {
      toast({ title: 'Could not generate a script', description: errorMessage(err), variant: 'destructive' });
    } finally { setGenerating(false); }
  };

  const edit = (patch: Partial<ReelDraft>) => { setActive((a) => (a ? { ...a, ...patch } : a)); setDirty(true); };
  const editScene = (i: number, patch: Partial<Scene>) => active && edit({ scenes: active.scenes.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const moveScene = (i: number, d: -1 | 1) => {
    if (!active) return;
    const s = [...active.scenes];
    const j = i + d;
    if (j < 0 || j >= s.length) return;
    [s[i], s[j]] = [s[j], s[i]];
    edit({ scenes: s });
  };

  const save = async (): Promise<boolean> => {
    if (!active) return false;
    setSaving(true);
    try {
      const d = await reelsApi.updateDraft(active.id, { title: active.title, description: active.description, scenes: active.scenes });
      setActive(d); setDrafts((prev) => prev.map((x) => (x.id === d.id ? d : x))); setDirty(false);
      return true;
    } catch (err) {
      toast({ title: 'Could not save draft', description: errorMessage(err), variant: 'destructive' });
      return false;
    } finally { setSaving(false); }
  };

  const publish = async () => {
    if (!active) return;
    if (dirty && !(await save())) return;
    try {
      await reelsApi.publishDraft(active.id);
      const upd = { ...active, status: 'generating' as const };
      setActive(upd); setDrafts((prev) => prev.map((x) => (x.id === upd.id ? upd : x)));
      toast({ title: 'Rendering started', description: 'We will notify you when your reel is live.', variant: 'success' });
    } catch (err) {
      toast({ title: 'Could not publish', description: errorMessage(err), variant: 'destructive' });
    }
  };

  const remove = async (d: ReelDraft) => {
    try {
      await reelsApi.deleteDraft(d.id);
      setDrafts((prev) => prev.filter((x) => x.id !== d.id));
      if (active?.id === d.id) setActive(null);
    } catch (err) { toast({ title: 'Could not delete draft', description: errorMessage(err), variant: 'destructive' }); }
  };

  const locked = active?.status === 'generating' || active?.status === 'completed';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="text-indigo-400" /> Reel generator</h1>
          <p className="text-sm text-zinc-500">Turn a paper into a short explainer video. Edit the script, preview it, then publish.</p>
        </div>
        <button className={secondaryBtn} onClick={() => setAutoOpen(true)}><Settings2 size={15} /> Automation</button>
      </div>

      {aiReady === false && (
        <div className="flex gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm text-amber-200">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>AI script writing isn&apos;t enabled on this server, so scripts are built from sentences in the paper itself. Add your own Gemini key under Automation to get AI-written scripts and narration.</span>
        </div>
      )}

      <div className="grid lg:grid-cols-[300px_minmax(0,1fr)_280px] gap-6">
        <section className="space-y-4">
          <div className="rounded-2xl border border-[var(--border)] p-4 space-y-3">
            <h2 className="font-semibold text-sm">1. Choose a paper</h2>
            {papers === null ? <Spinner className="py-4" /> : papers.length === 0 ? (
              <p className="text-sm text-zinc-500">Upload a paper to get started.</p>
            ) : (
              <select className={inputClass} value={paperId} onChange={(e) => setPaperId(e.target.value)} aria-label="Paper">
                {papers.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            )}
            <button className={`${secondaryBtn} w-full`} onClick={() => setUploadOpen(true)}><Upload size={15} /> Upload a paper</button>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2"><input type="radio" className="accent-indigo-500" checked={split === 'single'} onChange={() => setSplit('single')} /> Single reel</label>
              <label className="flex items-center gap-2"><input type="radio" className="accent-indigo-500" checked={split === 'multi'} onChange={() => setSplit('multi')} /> Multi-part series</label>
              {split === 'multi' && (
                <div className="pl-6 space-y-2">
                  <label className="flex items-center gap-2"><input type="radio" className="accent-indigo-500" checked={partsMode === 'auto'} onChange={() => setPartsMode('auto')} /> Decide automatically</label>
                  <label className="flex items-center gap-2"><input type="radio" className="accent-indigo-500" checked={partsMode === 'manual'} onChange={() => setPartsMode('manual')} />
                    <input type="number" min={2} max={6} value={parts} onChange={(e) => setParts(Math.min(6, Math.max(2, Number(e.target.value) || 2)))} className={`${inputClass} w-16 py-1`} aria-label="Number of parts" /> parts
                  </label>
                </div>
              )}
            </div>
            <button className={`${primaryBtn} w-full`} onClick={generate} disabled={!paperId || generating}>
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Generate script
            </button>
          </div>

          <div className="rounded-2xl border border-[var(--border)] p-4 space-y-2">
            <h2 className="font-semibold text-sm">Your drafts</h2>
            {drafts.length === 0 && <p className="text-sm text-zinc-500">No drafts yet.</p>}
            <ul className="space-y-1 max-h-96 overflow-y-auto">
              {drafts.map((d) => (
                <li key={d.id}>
                  <button onClick={() => { if (!dirty || confirm('Discard unsaved changes?')) { setActive(d); setDirty(false); } }}
                    className={`w-full text-left p-2.5 rounded-xl hover:bg-[var(--foreground)]/5 ${active?.id === d.id ? 'bg-[var(--foreground)]/5' : ''}`}>
                    <p className="text-sm font-medium truncate">{d.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${STATUS_STYLES[d.status]}`}>{d.status === 'generating' ? 'rendering' : d.status}</span>
                      {d.total_parts && d.total_parts > 1 && <span className="text-[11px] text-zinc-500">Part {d.part_number}/{d.total_parts}</span>}
                      <span className="text-[11px] text-zinc-500 ml-auto">{timeAgo(d.updated_at)}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] p-4 min-h-96">
          {!active ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 gap-2 py-20">
              <FileText size={32} />
              <p className="text-sm">Generate a script or open a draft to edit it.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${STATUS_STYLES[active.status]}`}>{active.status === 'generating' ? 'rendering' : active.status}</span>
                {active.paper_title && <span className="text-xs text-zinc-500 truncate">from “{active.paper_title}”</span>}
                <button onClick={() => remove(active)} disabled={active.status === 'generating'} className="ml-auto text-zinc-500 hover:text-red-400 disabled:opacity-40" aria-label="Delete draft"><Trash2 size={16} /></button>
              </div>
              {active.status === 'completed' && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 text-emerald-300 text-sm"><CheckCircle2 size={16} /> Published. <Link href="/reels" className="underline">View in reels</Link></div>
              )}
              {active.status === 'failed' && <div className="p-3 rounded-xl bg-red-500/10 text-red-300 text-sm">Rendering failed. Edit the script and publish again.</div>}
              <input className={inputClass} value={active.title} onChange={(e) => edit({ title: e.target.value })} disabled={locked} maxLength={200} aria-label="Title" />
              <textarea className={`${inputClass} min-h-16`} value={active.description || ''} onChange={(e) => edit({ description: e.target.value })} disabled={locked} maxLength={1000} placeholder="Description" />
              <ol className="space-y-3">
                {active.scenes.map((s, i) => (
                  <li key={i} className="rounded-xl border border-[var(--border)] p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-500 w-6">{i + 1}</span>
                      <input className={`${inputClass} py-1.5`} value={s.title} onChange={(e) => editScene(i, { title: e.target.value })} disabled={locked} maxLength={80} placeholder="On-screen title" aria-label={`Scene ${i + 1} title`} />
                      <input type="number" min={3} max={20} className={`${inputClass} py-1.5 w-20`} value={s.duration} onChange={(e) => editScene(i, { duration: Number(e.target.value) })} disabled={locked} aria-label="Seconds" />
                      <span className="text-xs text-zinc-500">s</span>
                    </div>
                    <textarea className={`${inputClass} min-h-16`} value={s.dialogue} onChange={(e) => editScene(i, { dialogue: e.target.value })} disabled={locked} maxLength={400} placeholder="Narration" aria-label={`Scene ${i + 1} narration`} />
                    <div className="flex items-center gap-2">
                      {Object.keys(STYLES).map((st) => (
                        <button key={st} disabled={locked} onClick={() => editScene(i, { backgroundStyle: st })} aria-label={st}
                          className={`w-6 h-6 rounded-full bg-gradient-to-b ${STYLES[st]} ${s.backgroundStyle === st ? 'ring-2 ring-white' : ''}`} />
                      ))}
                      {!locked && (
                        <div className="ml-auto flex gap-1">
                          <button onClick={() => moveScene(i, -1)} className="p-1 text-zinc-500 hover:text-white" aria-label="Move up"><ArrowUp size={15} /></button>
                          <button onClick={() => moveScene(i, 1)} className="p-1 text-zinc-500 hover:text-white" aria-label="Move down"><ArrowDown size={15} /></button>
                          <button onClick={() => edit({ scenes: active.scenes.filter((_, j) => j !== i) })} className="p-1 text-zinc-500 hover:text-red-400" aria-label="Remove scene"><Trash2 size={15} /></button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
              {!locked && (
                <button className={secondaryBtn} disabled={active.scenes.length >= 12} onClick={() => edit({ scenes: [...active.scenes, { title: 'New scene', dialogue: '', duration: 6, backgroundStyle: 'indigo-dark' }] })}>
                  <Plus size={15} /> Add scene
                </button>
              )}
              {!locked && (
                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
                  <button className={secondaryBtn} onClick={save} disabled={!dirty || saving}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save</button>
                  <button className={primaryBtn} onClick={publish} disabled={saving || active.scenes.length === 0}><Send size={15} /> Publish reel</button>
                </div>
              )}
            </div>
          )}
        </section>

        <section>{active && <Preview scenes={active.scenes} />}</section>
      </div>

      <UploadPaperModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} onSuccess={(doc) => { loadAll(); setPaperId(doc.id); }} />
      <AutomationPanel open={autoOpen} onClose={() => setAutoOpen(false)} />
    </div>
  );
}
