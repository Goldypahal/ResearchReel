"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, Film, ImagePlus, Loader2, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { documentsApi, errorMessage, postsApi, type CreatePostPayload, type LibraryDocument } from '@/lib/api';
import { displayName } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import Avatar from '@/components/common/Avatar';
import { LoadingBlock } from '@/components/common/States';
import { toast } from '@/components/ui/use-toast';

const MAX_CAPTION = 5000;
const MAX_IMAGES = 4;
const MAX_TAGS = 10;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const STATUS_OPTIONS = [
  { value: '', label: 'No status' },
  { value: 'wip', label: 'Work in progress' },
  { value: 'preprint', label: 'Preprint' },
  { value: 'published', label: 'Published' },
] as const;

function Composer() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [caption, setCaption] = useState('');
  const [images, setImages] = useState<{ file: File; url: string }[]>([]);
  const [docs, setDocs] = useState<LibraryDocument[] | null>(null);
  const [documentId, setDocumentId] = useState(params.get('document') || '');
  const [tagDraft, setTagDraft] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [doi, setDoi] = useState('');
  const [status, setStatus] = useState<CreatePostPayload['publication_status'] | ''>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => { documentsApi.getUserAssets().then(setDocs).catch(() => setDocs([])); }, []);
  useEffect(() => () => images.forEach((i) => URL.revokeObjectURL(i.url)), [images]);

  const readyDocs = useMemo(() => (docs || []).filter((d) => d.status === 'ready'), [docs]);
  const attached = readyDocs.find((d) => d.id === documentId) || null;

  // Pre-fill DOI from the attached paper.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data / resets state when its inputs change
  useEffect(() => { if (attached?.doi && !doi) setDoi(attached.doi); }, [attached, doi]);

  const addImages = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    const bad = incoming.find((f) => !IMAGE_TYPES.includes(f.type));
    if (bad) return setError(`${bad.name} isn't a supported image (JPG, PNG, WebP or GIF).`);
    const big = incoming.find((f) => f.size > 10 * 1024 * 1024);
    if (big) return setError(`${big.name} is over 10 MB.`);
    setError(null);
    setImages((prev) => [...prev, ...incoming.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, MAX_IMAGES));
    if (picker.current) picker.current.value = '';
  };

  const addTag = () => {
    const t = tagDraft.trim().replace(/^#/, '').replace(/\s+/g, '-').toLowerCase().slice(0, 40);
    if (t && !tags.includes(t) && tags.length < MAX_TAGS) setTags([...tags, t]);
    setTagDraft('');
  };

  const canPost = (caption.trim() || images.length || documentId) && !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPost) return;
    setBusy(true);
    setError(null);
    try {
      let media_urls: string[] | undefined;
      if (images.length) media_urls = (await postsApi.uploadImages(images.map((i) => i.file))).urls;
      const post = await postsApi.create({
        content_type: documentId ? 'document' : images.length ? 'image' : 'text',
        caption: caption.trim() || undefined,
        document_id: documentId || null,
        media_urls,
        tags,
        doi: doi.trim() || null,
        publication_status: status || null,
      });
      trackEvent('create_post', { type: post.content_type, images: images.length, tags: tags.length });
      toast({ title: 'Posted', variant: 'success' });
      router.push(`/post/${post.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  if (!user) return null;

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-5 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-tight">New post</h1>
        <Link href="/reels/create" className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:underline"><Film size={14} /> Make a reel instead</Link>
      </div>

      <div className="space-y-4 rounded-2xl border border-[var(--border)] p-5">
        <div className="flex gap-3">
          <Avatar src={user.avatar_url} name={displayName(user)} />
          <div className="flex-1">
            <textarea
              aria-label="Post text"
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
              rows={5}
              autoFocus
              placeholder="Share a finding, ask the community a question, or introduce your paper…"
              className="w-full resize-none bg-transparent text-[15px] leading-relaxed focus:outline-none"
            />
            {caption.length > MAX_CAPTION - 300 && <p className="text-right text-[11px] text-muted-foreground">{caption.length}/{MAX_CAPTION}</p>}
          </div>
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {images.map((img, i) => (
              <div key={img.url} className="relative aspect-square overflow-hidden rounded-lg border border-[var(--border)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={`Attachment ${i + 1}`} className="h-full w-full object-cover" />
                <button type="button" aria-label="Remove image" onClick={() => setImages(images.filter((x) => x !== img))} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"><X size={12} /></button>
              </div>
            ))}
          </div>
        )}

        {attached && (
          <div className="flex items-start gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3">
            <FileText size={18} className="mt-0.5 shrink-0 text-indigo-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{attached.title}</p>
              <p className="line-clamp-2 text-xs text-muted-foreground">{attached.abstract}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">People who see this post can read the paper.</p>
            </div>
            <button type="button" aria-label="Remove paper" onClick={() => setDocumentId('')} className="rounded p-1 hover:bg-[var(--foreground)]/5"><X size={14} /></button>
          </div>
        )}

        {error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">{error}</p>}

        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
          <input ref={picker} type="file" accept={IMAGE_TYPES.join(',')} multiple className="hidden" onChange={(e) => addImages(e.target.files)} />
          <button type="button" onClick={() => picker.current?.click()} disabled={images.length >= MAX_IMAGES || !!documentId} title={documentId ? 'A post can have a paper or images, not both' : undefined} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-[var(--foreground)]/5 hover:text-[var(--foreground)] disabled:opacity-40">
            <ImagePlus size={16} /> Images {images.length ? `(${images.length}/${MAX_IMAGES})` : ''}
          </button>
          <select
            aria-label="Attach a paper from your library"
            value={documentId}
            onChange={(e) => { setDocumentId(e.target.value); if (e.target.value) setImages([]); }}
            disabled={!docs}
            className="max-w-[260px] rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs"
          >
            <option value="">{docs && readyDocs.length === 0 ? 'No papers in your library' : 'Attach a paper…'}</option>
            {readyDocs.map((d) => <option key={d.id} value={d.id}>{d.title.slice(0, 70)}</option>)}
          </select>
          {docs && readyDocs.length === 0 && <Link href="/library" className="text-xs text-indigo-400 hover:underline">Upload one</Link>}
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-[var(--border)] p-5">
        <div className="space-y-1.5">
          <label htmlFor="c-tags" className="text-xs font-bold">Tags</label>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-400">
                #{t} <button type="button" aria-label={`Remove ${t}`} onClick={() => setTags(tags.filter((x) => x !== t))}><X size={12} /></button>
              </span>
            ))}
          </div>
          {tags.length < MAX_TAGS && (
            <input id="c-tags" value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }} onBlur={addTag} placeholder="e.g. bioinformatics — Enter to add" className="w-full rounded-lg border border-[var(--border)] bg-[var(--foreground)]/5 px-3 py-2 text-sm focus:border-indigo-500/60 focus:outline-none" />
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="c-doi" className="text-xs font-bold">DOI <span className="font-normal text-muted-foreground">(optional)</span></label>
            <input id="c-doi" value={doi} onChange={(e) => setDoi(e.target.value)} placeholder="10.1234/abcd.5678" className="w-full rounded-lg border border-[var(--border)] bg-[var(--foreground)]/5 px-3 py-2 text-sm focus:border-indigo-500/60 focus:outline-none" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="c-status" className="text-xs font-bold">Status</label>
            <select id="c-status" value={status || ''} onChange={(e) => setStatus(e.target.value as typeof status)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm">
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => router.back()} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold">Cancel</button>
        <button type="submit" disabled={!canPost} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
          {busy && <Loader2 size={16} className="animate-spin" />} {busy ? 'Posting…' : 'Post'}
        </button>
      </div>
    </form>
  );
}

export default function CreatePostPage() {
  return <Suspense fallback={<LoadingBlock />}><Composer /></Suspense>;
}
