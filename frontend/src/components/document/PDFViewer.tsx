"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import '@/lib/pdfWorker';
import { AlertCircle, Loader2 } from 'lucide-react';

interface PDFViewerProps {
  url: string;
  /** 1 = fit the container width */
  scale: number;
  currentPage: number;
  onLoadSuccess: (numPages: number) => void;
}

/** One page at a time, sized to the container so it works from phones to wide screens. */
export default function PDFViewer({ url, scale, currentPage, onLoadSuccess }: PDFViewerProps) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={box} className="w-full">
      {width > 0 && (
        <Document
          file={url}
          onLoadSuccess={({ numPages }) => onLoadSuccess(numPages)}
          loading={
            <div className="flex flex-col items-center justify-center gap-3 p-20 text-sm text-muted-foreground">
              <Loader2 className="animate-spin text-indigo-500" /> Loading PDF…
            </div>
          }
          error={
            <div className="m-6 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-400">
              <AlertCircle size={16} /> This PDF couldn&apos;t be displayed. You can still download it.
            </div>
          }
        >
          <Page
            pageNumber={currentPage}
            width={Math.min(width, 1100) * scale}
            renderAnnotationLayer
            renderTextLayer
            className="mx-auto overflow-hidden bg-white shadow-xl"
          />
        </Document>
      )}
    </div>
  );
}
