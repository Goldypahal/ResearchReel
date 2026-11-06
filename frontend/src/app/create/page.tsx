"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ImagePlus, FileText, X, Loader2, Film } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar, inputClass, primaryBtn } from '@/components/common';
import { documentsApi, postsApi, errorMessage, type Paper } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

const MAX_CAPTION = 5000;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function CreatePostPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [caption, setCaption] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [pdf, setPdf] = useState<File | null>(null);
  const [paperId, setPaperId] = useState('');
  const [myPapers, setMyPapers] = useState<Paper[]>([]);
  const [doi, setDoi] = useState('');
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const imageInput = useRef<HTMLInputElement>(null);
  const pdfInput = useRef<HTMLInputElement>(null);

  useEffect(() => { documentsApi.list({ scope: 'mine' }).then((r) => setMyPapers(r.documents)).catch(() => {}); }, []);

  const previews = React.useMemo(() => images.map((f) => URL.createObjectURL(f)), [images]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const addImages = (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files);
    if (list.some((f) => f.type.startsWith('video/'))) {
      toast({ title: 'Videos are posted as reels', description: 'Use “Create reel” to upload a video.' });
      return;
    }
    const valid = list.filter((f) => IMAGE_TYPES.includes(f.type) && f.size <= 10 * 1024 * 1024);
    if (valid.length < list.length) setError('Some files were skipped (images only, up to 10 MB each).');
    setImages((prev) => [...prev, ...valid].slice(0, 10));
    setPdf(null); setPaperId('');
  };

  const choosePdf = (file: File | null) => {
    if (!file) return;
    if (file.type !== 'application/pdf') return setError('Only PDF files can be attached as papers.');
    if (file.size > 25 * 1024 * 1024) return setError('PDFs must be 25 MB or smaller.');
    setPdf(file); setPaperId(''); setImages([]); setError('');
  };

  const canPost = (caption.trim() || images.length || pdf || paperId) && caption.length <= MAX_CAPTION && progress === null;

  const submit = async () => {
    setError('');
    const form = new FormData();
    form.append('caption', caption.trim());
    images.forEach((f) => form.append('images', f));
    if (pdf) form.append('document', pdf);
    if (paperId) form.append('document_id', paperId);
    if (doi.trim()) form.append('doi', doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, ''));
    if (status) form.append('publication_status', status);
    setProgress(0);
    try {
      const post = await postsApi.create(form, setProgress);
      toast({ title: 'Posted', variant: 'success' });
      router.push(`/post/${post.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setProgress(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Create a post</h1>
        <Link href="/reels/create" className="text-sm text-indigo-400 inline-flex items-center gap-1.5"><Film size={15} /> Create reel instead</Link>
      </div>

      <div className="rounded-2xl border border-[var(--border)] p-4 space-y-4">
        <div className="flex gap-3">
          <Avatar src={user?.avatar_url} name={user?.full_name} size={40} />
          <textarea
            value={caption} onChange={(e) => setCaption(e.target.value)} autoFocus aria-label="Post text"
            placeholder="Share a finding, question or update. Use #tags and @mentions."
            className="flex-1 min-h-36 bg-transparent resize-y text-[15px] focus:outline-none placeholder:text-zinc-500"
          />
        </div>
        <div className={`text-right text-xs ${caption.length > MAX_CAPTION ? 'text-red-400' : 'text-zinc-500'}`}>{caption.length}/{MAX_CAPTION}</div>

        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {previews.map((src, i) => (
              <div key={src} className="relative aspect-square rounded-xl overflow-hidden bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`Selected image ${i + 1}`} className="w-full h-full object-cover" />
                <button onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-black/70 rounded-full p-1" aria-label="Remove image"><X size={14} /></button>
              </div>
            ))}
          </div>
        )}

        {(pdf || paperId) && (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-indigo-500/5">
            <FileText size={20} className="text-red-300" />
            <span className="flex-1 text-sm truncate">{pdf ? pdf.name : myPapers.find((p) => p.id === paperId)?.title}</span>
            <button onClick={() => { setPdf(null); setPaperId(''); }} aria-label="Remove paper"><X size={16} /></button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border)]">
          <button onClick={() => imageInput.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm hover:bg-[var(--foreground)]/5"><ImagePlus size={17} className="text-emerald-400" /> Images</button>
          <button onClick={() => pdfInput.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm hover:bg-[var(--foreground)]/5"><FileText size={17} className="text-red-300" /> Upload PDF</button>
          {myPapers.length > 0 && (
            <select value={paperId} onChange={(e) => { setPaperId(e.target.value); setPdf(null); setImages([]); }} aria-label="Attach one of your papers"
              className="px-3 py-2 rounded-xl text-sm bg-[var(--foreground)]/5 border border-[var(--border)] max-w-56">
              <option value="">Attach from your library…</option>
              {myPapers.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          )}
          <input ref={imageInput} type="file" accept={IMAGE_TYPES.join(',')} multiple hidden onChange={(e) => { addImages(e.target.files); e.target.value = ''; }} />
          <input ref={pdfInput} type="file" accept="application/pdf" hidden onChange={(e) => { choosePdf(e.target.files?.[0] || null); e.target.value = ''; }} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <input className={inputClass} placeholder="DOI (optional), e.g. 10.1038/nphys1170" value={doi} onChange={(e) => setDoi(e.target.value)} />
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Publication status">
            <option value="">Publication status (optional)</option>
            <option value="wip">Work in progress</option>
            <option value="preprint">Preprint</option>
            <option value="published">Published</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-400" role="alert">{error}</p>}

        <div className="flex items-center justify-end gap-3">
          {progress !== null && <span className="text-xs text-zinc-500">Uploading {Math.round(progress * 100)}%</span>}
          <button className={primaryBtn} disabled={!canPost} onClick={submit}>
            {progress !== null && <Loader2 size={16} className="animate-spin" />} Post
          </button>
        </div>
      </div>
    </div>
  );
}
