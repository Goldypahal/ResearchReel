"use client";

import React, { useState } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Modal, inputClass, primaryBtn, secondaryBtn } from '@/components/common';
import { documentsApi, errorMessage, type Paper } from '@/lib/api';
import { toast } from './use-toast';

interface UploadPaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (doc: Paper) => void;
}

export default function UploadPaperModal({ isOpen, onClose, onSuccess }: UploadPaperModalProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [doi, setDoi] = useState('');
  const [tags, setTags] = useState('');
  const [abstract, setAbstract] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');

  const reset = () => { setFile(null); setTitle(''); setAuthors(''); setDoi(''); setTags(''); setAbstract(''); setVisibility('public'); setProgress(null); setError(''); };
  const close = () => { if (progress === null) { reset(); onClose(); } };

  const pick = (f: File | undefined | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) return setError('Please choose a PDF file.');
    if (f.size > 25 * 1024 * 1024) return setError('PDFs must be 25 MB or smaller.');
    setError(''); setFile(f);
    if (!title) setTitle(f.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' '));
  };

  const upload = async () => {
    if (!file) return;
    const form = new FormData();
    form.append('file', file, file.name);
    if (title.trim()) form.append('title', title.trim());
    if (authors.trim()) form.append('authors', authors.trim());
    if (doi.trim()) form.append('doi', doi.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, ''));
    if (tags.trim()) form.append('tags', tags.trim());
    if (abstract.trim()) form.append('abstract', abstract.trim());
    form.append('visibility', visibility);
    setProgress(0); setError('');
    try {
      const doc = await documentsApi.upload(form, setProgress);
      toast({ title: 'Paper uploaded', description: doc.title, variant: 'success' });
      onSuccess?.(doc);
      reset(); onClose();
      if (!onSuccess) router.push(`/library/documents/${doc.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setProgress(null);
    }
  };

  return (
    <Modal open={isOpen} onClose={close} title="Upload a paper" wide>
      <div className="p-5 space-y-4">
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
          className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[var(--border)] rounded-2xl p-8 cursor-pointer hover:border-indigo-500/50 text-center"
        >
          {file ? <FileText size={28} className="text-red-300" /> : <Upload size={28} className="text-zinc-500" />}
          <span className="text-sm font-semibold">{file ? file.name : 'Drop a PDF here or click to browse'}</span>
          <span className="text-xs text-zinc-500">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : 'PDF, up to 25 MB. We extract the text so you can search it and ask AI about it.'}</span>
          <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </label>

        {file && (
          <div className="grid sm:grid-cols-2 gap-3">
            <input className={`${inputClass} sm:col-span-2`} placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={500} />
            <input className={inputClass} placeholder="Authors (comma separated)" value={authors} onChange={(e) => setAuthors(e.target.value)} />
            <input className={inputClass} placeholder="DOI (optional)" value={doi} onChange={(e) => setDoi(e.target.value)} />
            <input className={inputClass} placeholder="Tags, e.g. physics, optics" value={tags} onChange={(e) => setTags(e.target.value)} />
            <select className={inputClass} value={visibility} onChange={(e) => setVisibility(e.target.value as 'public' | 'private')} aria-label="Visibility">
              <option value="public">Public — anyone can find it</option>
              <option value="private">Private — only you and your projects</option>
            </select>
            <textarea className={`${inputClass} sm:col-span-2 min-h-24`} placeholder="Abstract (optional — we'll try to detect it from the PDF)" value={abstract} onChange={(e) => setAbstract(e.target.value)} maxLength={5000} />
          </div>
        )}

        {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
        {progress !== null && (
          <div className="space-y-1">
            <div className="h-1.5 rounded bg-[var(--foreground)]/10 overflow-hidden"><div className="h-full bg-indigo-500 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
            <p className="text-xs text-zinc-500">{progress < 1 ? `Uploading ${Math.round(progress * 100)}%` : 'Reading the PDF…'}</p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button className={secondaryBtn} onClick={close} disabled={progress !== null}>Cancel</button>
          <button className={primaryBtn} onClick={upload} disabled={!file || progress !== null}>
            {progress !== null && <Loader2 size={16} className="animate-spin" />} Upload
          </button>
        </div>
      </div>
    </Modal>
  );
}
