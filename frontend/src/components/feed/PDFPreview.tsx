"use client";

import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';

interface PDFPreviewProps {
  file: string;
  fallbackName: string;
  fallbackSummary: string;
}

export default function PDFPreview({
  file,
  fallbackName,
  fallbackSummary
}: PDFPreviewProps) {
  const [hasError, setHasError] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Verify the PDF actually exists before embedding it, so missing files
    // show the styled fallback card instead of a browser error page.
    let cancelled = false;
    fetch(file, { method: 'HEAD' })
      .then(res => {
        if (cancelled) return;
        const type = res.headers.get('content-type') || '';
        if (!res.ok || !type.includes('pdf')) setHasError(true);
        setIsMounted(true);
      })
      .catch(() => {
        if (cancelled) return;
        setHasError(true);
        setIsMounted(true);
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  if (!isMounted) {
    return (
      <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (hasError) {
    /* Premium Fallback Card */
    return (
      <div className="w-full h-full bg-white relative flex items-center justify-center select-none">
        <div className="p-8 flex flex-col items-center justify-center text-center space-y-4 h-full w-full bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-[24px] border border-indigo-500/20 flex items-center justify-center mb-1 shadow-inner">
            <FileText size={28} className="text-indigo-600" />
          </div>
          <h4 className="font-bold text-base text-zinc-900 tracking-tight leading-tight px-4">{fallbackName}</h4>
          <p className="text-xs text-zinc-500 leading-relaxed max-w-[280px] px-2">{fallbackSummary}</p>
          <div className="pt-2">
            <a
              href={file}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-md shadow-indigo-600/15 transition-all cursor-pointer inline-block"
            >
              Open Document
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-zinc-100 relative flex items-center justify-center select-none overflow-hidden group">
      {/* Native browser PDF rendering: first page, no toolbar */}
      <iframe
        src={`${file}#toolbar=0&navpanes=0&scrollbar=0&view=Fit&page=1`}
        title={fallbackName}
        className="w-full h-full border-0 pointer-events-none"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
    </div>
  );
}
