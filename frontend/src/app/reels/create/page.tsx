"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Film, Upload, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { documentsApi, reelsApi, errorMessage, type Paper } from '@/lib/api';
import { inputClass, primaryBtn, secondaryBtn } from '@/components/common';

const MAX_MB = 200;

export default function UploadReelPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [paperId, setPaperId] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { documentsApi.list({ scope: 'mine' }).then((r) => setPapers(r.documents)).catch(() => {}); }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!['video/mp4', 'video/quicktime', 'video/webm'].includes(f.type)) return setError('Choose an MP4, MOV or WebM video.');
    if (f.size > MAX_MB * 1024 * 1024) return setError(`Videos must be ${MAX_MB} MB or smaller.`);
    setError(''); setFile(f); setPreview(URL.createObjectURL(f));
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
  };

  const upload = async () => {
    if (!file || !title.trim()) return;
    const form = new FormData();
    form.append('video', file, file.name);
    form.append('title', title.trim());
    form.append('description', description.trim());
    form.append('tags', tags);
    if (paperId) form.append('linked_paper_id', paperId);
    setProgress(0); setError('');
    try {
      await reelsApi.upload(form, setProgress);
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally { setProgress(null); }
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <CheckCircle2 size={44} className="text-emerald-400 mx-auto" />
        <h1 className="text-xl font-bold">Upload received</h1>
        <p className="text-sm text-zinc-400">We&apos;re processing your video. You&apos;ll get a notification when your reel is live — usually within a minute or two.</p>
        <div className="flex justify-center gap-3">
          <button className={secondaryBtn} onClick={() => { setDone(false); setFile(null); setPreview(null); setTitle(''); setDescription(''); setTags(''); }}>Upload another</button>
          <button className={primaryBtn} onClick={() => router.push('/reels')}>Go to reels</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Film className="text-purple-400" /> Upload a reel</h1>
        <Link href="/reels/generator" className="text-sm text-indigo-400 inline-flex items-center gap-1.5"><Sparkles size={15} /> Generate from a paper</Link>
      </div>
      <div className="grid md:grid-cols-[260px_1fr] gap-6">
        <label className="aspect-[9/16] rounded-2xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center gap-2 cursor-pointer overflow-hidden bg-black/30 hover:border-indigo-500/50 text-center p-4"
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}>
          {preview ? <video src={preview} className="w-full h-full object-contain" muted controls /> : (
            <>
              <Upload size={28} className="text-zinc-500" />
              <span className="text-sm font-semibold">Choose a video</span>
              <span className="text-xs text-zinc-500">MP4, MOV or WebM · vertical works best · up to {MAX_MB} MB, 3 s – 3 min</span>
            </>
          )}
          <input type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
        <div className="space-y-3">
          <input className={inputClass} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
          <textarea className={`${inputClass} min-h-28`} placeholder="Describe what viewers will learn" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
          <input className={inputClass} placeholder="Tags, e.g. biology, crispr" value={tags} onChange={(e) => setTags(e.target.value)} />
          <select className={inputClass} value={paperId} onChange={(e) => setPaperId(e.target.value)} aria-label="Link a paper">
            <option value="">Link one of your papers (optional)</option>
            {papers.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
          {progress !== null && (
            <div className="space-y-1">
              <div className="h-1.5 rounded bg-[var(--foreground)]/10 overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
              <p className="text-xs text-zinc-500">Uploading {Math.round(progress * 100)}%</p>
            </div>
          )}
          <button className={`${primaryBtn} w-full`} disabled={!file || !title.trim() || progress !== null} onClick={upload}>
            {progress !== null && <Loader2 size={16} className="animate-spin" />} Publish reel
          </button>
        </div>
      </div>
    </div>
  );
}
