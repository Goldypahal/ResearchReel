"use client";

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import PaperUploader from '@/components/documents/PaperUploader';
import type { LibraryDocument } from '@/lib/api';

interface UploadPaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (doc: LibraryDocument) => void;
}

export default function UploadPaperModal({ isOpen, onClose, onSuccess }: UploadPaperModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Upload a paper">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <h3 className="text-lg font-bold">Upload a paper</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 text-muted-foreground hover:bg-[var(--foreground)]/10"><X size={18} /></button>
        </div>
        {/* key resets the uploader each time the modal opens */}
        <PaperUploader key={String(isOpen)} onUploaded={onSuccess} onCancel={onClose} />
      </div>
    </div>
  );
}
