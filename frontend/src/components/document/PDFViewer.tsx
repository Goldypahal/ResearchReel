"use client";

import React, { useEffect, useState } from 'react';

interface PDFViewerProps {
  url: string;
  zoom: number;
  onLoadSuccess: (numPages: number) => void;
  currentPage: number;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ url, zoom, onLoadSuccess, currentPage }) => {
  const [hasError, setHasError] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Verify the PDF exists before embedding so a missing file shows the
    // styled error state instead of a browser error page.
    let cancelled = false;
    setIsReady(false);
    setHasError(false);
    fetch(url, { method: 'HEAD' })
      .then(res => {
        if (cancelled) return;
        if (!res.ok) {
          setHasError(true);
        } else {
          onLoadSuccess(1);
        }
        setIsReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setHasError(true);
        setIsReady(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4 min-h-[500px]">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-[10px]">Decoding Manuscript...</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="p-20 text-red-500 font-bold uppercase tracking-widest text-[10px] bg-red-500/5 rounded-3xl border border-red-500/10">
          Failed to reveal the manuscript. Please verify the link.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] w-full">
      <div className="bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] w-full max-w-[900px] h-[80vh] rounded-lg overflow-hidden">
        <iframe
          src={`${url}#page=${currentPage}&zoom=${zoom}`}
          title="Document viewer"
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
};

export default PDFViewer;
