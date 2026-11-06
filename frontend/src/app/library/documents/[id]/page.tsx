"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Bot, Download, ExternalLink, Sparkles, Trash2, Film, Pencil, Lock, Globe, Loader2, Share2 } from 'lucide-react';
import { aiApi, documentsApi, errorMessage, type Paper } from '@/lib/api';
import { Spinner, ErrorState, Modal, inputClass, primaryBtn, secondaryBtn, dangerBtn, Avatar } from '@/components/common';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/format';
import { toast } from '@/components/ui/use-toast';

export default function PaperPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [paper, setPaper] = useState<Paper | null>(null);
  const [error, setError] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({ title: '', abstract: '', authors: '', doi: '', journal: '', tags: '', visibility: 'public' });

  const load = () => documentsApi.get(id).then((p) => {
    setPaper(p);
    setForm({ title: p.title, abstract: p.abstract || '', authors: (p.authors || []).join(', '), doi: p.doi || '', journal: p.journal || '', tags: (p.tags || []).join(', '), visibility: p.visibility || 'public' });
  }).catch((e) => setError(errorMessage(e)));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <ErrorState message={error} />;
  if (!paper) return <Spinner />;

  const isOwner = paper.permission === 'owner' || paper.uploader_id === user?.id;

  const summarize = async (force = false) => {
    setSummarizing(true);
    try {
      const s = await aiApi.summarize(paper.id, force);
      setPaper({ ...paper, summary_text: s.abstract, key_points: s.key_points });
    } catch (err) {
      toast({ title: 'Could not summarise', description: errorMessage(err), variant: 'destructive' });
    } finally { setSummarizing(false); }
  };

  const saveEdit = async () => {
    try {
      const p = await documentsApi.update(paper.id, {
        title: form.title, abstract: form.abstract, doi: form.doi, journal: form.journal,
        authors: form.authors.split(',').map((a) => a.trim()).filter(Boolean),
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        visibility: form.visibility as 'public' | 'private',
      });
      setPaper({ ...paper, ...p });
      setEditing(false);
      toast({ title: 'Paper updated', variant: 'success' });
    } catch (err) { toast({ title: 'Could not save', description: errorMessage(err), variant: 'destructive' }); }
  };

  const remove = async () => {
    try { await documentsApi.remove(paper.id); toast({ title: 'Paper deleted', variant: 'success' }); router.replace('/library'); }
    catch (err) { toast({ title: 'Could not delete', description: errorMessage(err), variant: 'destructive' }); }
  };

  const share = async () => {
    const url = window.location.href;
    try { if (navigator.share) await navigator.share({ title: paper.title, url }); else { await navigator.clipboard.writeText(url); toast({ title: 'Link copied', variant: 'success', duration: 1500 }); } } catch { /* cancelled */ }
  };

  return (
    <div className="max-w-6xl mx-auto grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6">
      <div className="space-y-5 min-w-0">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {paper.visibility === 'private' ? <span className="inline-flex items-center gap-1 text-amber-300"><Lock size={12} /> Private</span> : <span className="inline-flex items-center gap-1"><Globe size={12} /> Public</span>}
            <span>· Added {formatDate(paper.created_at)}</span>
            {paper.page_count ? <span>· {paper.page_count} pages</span> : null}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold leading-tight">{paper.title}</h1>
          {paper.authors?.length ? <p className="text-sm text-zinc-400">{paper.authors.join(', ')}</p> : null}
          <p className="text-sm text-zinc-500">
            {paper.journal}{paper.publication_year ? ` (${paper.publication_year})` : ''}
            {paper.doi && <> · <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">doi:{paper.doi}</a></>}
          </p>
          {paper.tags?.length ? (
            <div className="flex flex-wrap gap-1.5">{paper.tags.map((t) => <Link key={t} href={`/search?q=${encodeURIComponent('#' + t)}`} className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300">#{t}</Link>)}</div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/ai/ask?doc=${paper.id}`} className={primaryBtn}><Bot size={15} /> Ask AI about this paper</Link>
          {paper.file_url && <a href={paper.file_url} download className={secondaryBtn}><Download size={15} /> Download PDF</a>}
          {paper.external_url && <a href={paper.external_url} target="_blank" rel="noopener noreferrer" className={secondaryBtn}><ExternalLink size={15} /> Publisher page</a>}
          <button onClick={share} className={secondaryBtn}><Share2 size={15} /> Share</button>
          {isOwner && <Link href="/reels/generator" className={secondaryBtn}><Film size={15} /> Make a reel</Link>}
          {isOwner && <button onClick={() => setEditing(true)} className={secondaryBtn}><Pencil size={15} /> Edit</button>}
          {isOwner && <button onClick={() => setConfirmDelete(true)} className={secondaryBtn}><Trash2 size={15} className="text-red-400" /></button>}
        </div>

        {paper.abstract && (
          <section className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">Abstract</h2>
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{paper.abstract}</p>
          </section>
        )}

        {paper.file_url ? (
          <div className="rounded-2xl border border-[var(--border)] overflow-hidden bg-zinc-900">
            <iframe src={`${paper.file_url}#view=FitH`} title={`PDF of ${paper.title}`} className="w-full h-[75vh]" />
          </div>
        ) : (
          <p className="text-sm text-zinc-500">This paper was imported by DOI, so there is no PDF here. Use the publisher link to read it.</p>
        )}
      </div>

      <aside className="space-y-5">
        <section className="rounded-2xl border border-[var(--border)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm flex items-center gap-2"><Sparkles size={15} className="text-indigo-400" /> AI summary</h2>
            {paper.summary_text && <button onClick={() => summarize(true)} disabled={summarizing} className="text-xs text-zinc-500 hover:text-zinc-300">Regenerate</button>}
          </div>
          {paper.summary_text ? (
            <>
              <p className="text-sm leading-relaxed">{paper.summary_text}</p>
              {paper.key_points?.length ? <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-300">{paper.key_points.map((k, i) => <li key={i}>{k}</li>)}</ul> : null}
            </>
          ) : (
            <button onClick={() => summarize()} disabled={summarizing} className={`${secondaryBtn} w-full`}>
              {summarizing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Summarise this paper
            </button>
          )}
        </section>

        {paper.uploader_username && (
          <section className="rounded-2xl border border-[var(--border)] p-4 flex items-center gap-3">
            <Avatar src={paper.uploader_avatar_url} name={paper.uploader_name} size={36} />
            <div className="min-w-0">
              <p className="text-xs text-zinc-500">Shared by</p>
              <Link href={`/profile/${paper.uploader_username}`} className="text-sm font-semibold hover:underline">{paper.uploader_name}</Link>
            </div>
          </section>
        )}

        {paper.reels && paper.reels.length > 0 && (
          <section className="rounded-2xl border border-[var(--border)] p-4 space-y-3">
            <h2 className="font-bold text-sm">Reels about this paper</h2>
            <div className="grid grid-cols-3 gap-2">
              {paper.reels.map((r) => (
                <Link key={r.id} href={`/reels?id=${r.id}`} className="aspect-[9/16] rounded-lg overflow-hidden bg-black block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.thumbnail_url ? <img src={r.thumbnail_url} alt={r.title} className="w-full h-full object-cover" /> : null}
                </Link>
              ))}
            </div>
          </section>
        )}
      </aside>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit paper details" wide>
        <div className="p-5 grid sm:grid-cols-2 gap-3">
          <input className={`${inputClass} sm:col-span-2`} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" />
          <input className={inputClass} value={form.authors} onChange={(e) => setForm({ ...form, authors: e.target.value })} placeholder="Authors (comma separated)" />
          <input className={inputClass} value={form.doi} onChange={(e) => setForm({ ...form, doi: e.target.value })} placeholder="DOI" />
          <input className={inputClass} value={form.journal} onChange={(e) => setForm({ ...form, journal: e.target.value })} placeholder="Journal / venue" />
          <input className={inputClass} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Tags (comma separated)" />
          <select className={inputClass} value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })} aria-label="Visibility">
            <option value="public">Public</option><option value="private">Private</option>
          </select>
          <textarea className={`${inputClass} sm:col-span-2 min-h-32`} value={form.abstract} onChange={(e) => setForm({ ...form, abstract: e.target.value })} placeholder="Abstract" />
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button className={secondaryBtn} onClick={() => setEditing(false)}>Cancel</button>
            <button className={primaryBtn} onClick={saveEdit}>Save</button>
          </div>
        </div>
      </Modal>
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete this paper?">
        <div className="p-5 space-y-4">
          <p className="text-sm text-zinc-400">The PDF and its details will be removed. Posts that attached it will no longer show it.</p>
          <div className="flex justify-end gap-2"><button className={secondaryBtn} onClick={() => setConfirmDelete(false)}>Cancel</button><button className={dangerBtn} onClick={remove}>Delete</button></div>
        </div>
      </Modal>
    </div>
  );
}
