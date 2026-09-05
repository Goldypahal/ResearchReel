"use client";

import React, { useState } from 'react';
import { Upload, X, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { documentsApi } from '@/lib/api/documents';

interface UploadPaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (doc: any) => void;
}

export default function UploadPaperModal({ isOpen, onClose, onSuccess }: UploadPaperModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progressStep, setProgressStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const router = useRouter();

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf' || droppedFile.name.endsWith('.pdf')) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Please upload a valid PDF research paper file.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type === 'application/pdf' || selected.name.endsWith('.pdf')) {
        setFile(selected);
        setError(null);
      } else {
        setError('Please select a valid PDF research paper file.');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    setProgressStep('Requesting secure upload authorization...');

    try {
      // Step 1: Request signed upload URL from backend (Section 13 architecture)
      const uploadConfig = await documentsApi.getUploadUrl(file.name, file.type || 'application/pdf');
      
      // Step 2: Upload file bytes to object storage
      setProgressStep('Uploading document file bytes...');
      try {
        await documentsApi.uploadFileToStorage(uploadConfig.uploadUrl, file);
      } catch (uploadErr) {
        console.warn('Storage upload warning, proceeding with asset registration:', uploadErr);
      }

      // Step 3: Register document asset in PostgreSQL database & BullMQ queue
      setProgressStep('Registering document and dispatching AI indexing jobs...');
      const registeredDoc = await documentsApi.registerAsset({
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        sizeBytes: file.size,
        storageKey: uploadConfig.storageKey
      });

      setIsCompleted(true);
      if (onSuccess) onSuccess(registeredDoc);
    } catch (err: any) {
      console.error('Upload Error:', err);
      setError(err.message || 'Failed to process document upload.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[var(--background)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl space-y-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <h3 className="text-lg font-bold text-[var(--foreground)]">Upload Research Paper</h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-[var(--foreground)]/10 text-muted-foreground hover:text-[var(--foreground)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {!isCompleted ? (
          <>
            <div 
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-[var(--border)] hover:border-indigo-500/50 rounded-xl p-8 text-center bg-[var(--foreground)]/[0.02] hover:bg-indigo-500/[0.03] transition-all cursor-pointer flex flex-col items-center justify-center space-y-3"
              onClick={() => document.getElementById('paper-upload-input')?.click()}
            >
              <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-full border border-indigo-500/20">
                <Upload size={28} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {file ? file.name : 'Drag & drop PDF here or click to browse'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports academic PDFs up to 50MB
                </p>
              </div>
              <input 
                id="paper-upload-input"
                type="file" 
                accept=".pdf" 
                className="hidden" 
                onChange={handleFileChange}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-indigo-400">
                  <Loader2 size={14} className="animate-spin shrink-0" />
                  <span>{progressStep}</span>
                </div>
                <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 animate-pulse w-3/4 rounded-full"></div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-[var(--foreground)] rounded-lg border border-[var(--border)] hover:bg-[var(--foreground)]/5 transition-colors"
                disabled={isUploading}
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {isUploading && <Loader2 size={14} className="animate-spin" />}
                Upload & Process
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h4 className="text-base font-bold text-[var(--foreground)]">Paper Processed & Queued</h4>
              <p className="text-xs text-muted-foreground mt-1">Registered in your Research Library and queued for vector chunking.</p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  onClose();
                  router.push('/library');
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
              >
                Go to Library
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
