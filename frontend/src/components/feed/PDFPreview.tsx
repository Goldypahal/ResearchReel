"use client";

import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Initialize PDF.js worker on the client side
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

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
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-full bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white relative flex items-center justify-center select-none">
      {hasError ? (
        /* Premium Fallback Card */
        <div className="p-8 flex flex-col items-center justify-center text-center space-y-4 h-full w-full bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-[24px] border border-indigo-500/20 flex items-center justify-center text-3xl mb-1 shadow-inner">📄</div>
          <h4 className="font-bold text-base text-zinc-900 tracking-tight leading-tight px-4">{fallbackName}</h4>
          <p className="text-xs text-zinc-500 leading-relaxed max-w-[280px] px-2">{fallbackSummary}</p>
          <div className="pt-2">
            <span className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-md shadow-indigo-600/15 transition-all cursor-pointer">
              Open Document
            </span>
          </div>
        </div>
      ) : (
        /* Render First Page */
        <div className="w-full h-full flex items-center justify-center overflow-hidden bg-zinc-100 relative group">
          <Document
            file={file}
            onLoadError={() => setHasError(true)}
            loading={
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 gap-3">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Rendering Page...</span>
              </div>
            }
          >
            <Page
              pageNumber={1}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              width={380}
              className="shadow-2xl"
            />
          </Document>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
        </div>
      )}
    </div>
  );
}
