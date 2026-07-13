"use client";

import React from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  url: string;
  zoom: number;
  onLoadSuccess: (numPages: number) => void;
  currentPage: number;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ url, zoom, onLoadSuccess, currentPage }) => {
  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    onLoadSuccess(numPages);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px]">
      <div 
        className="bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] transition-transform duration-300"
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
      >
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex flex-col items-center justify-center p-20 gap-4">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-zinc-500 font-bold uppercase tracking-[0.2em] text-[10px]">Decoding Manuscript...</span>
            </div>
          }
          error={
            <div className="p-20 text-red-500 font-bold uppercase tracking-widest text-[10px] bg-red-500/5 rounded-3xl border border-red-500/10">
              Failed to reveal the manuscript. Please verify the link.
            </div>
          }
        >
          <Page 
            pageNumber={currentPage} 
            renderAnnotationLayer={true}
            renderTextLayer={true}
            className="rounded-none overflow-hidden"
            width={850}
          />
        </Document>
      </div>
    </div>
  );
};

export default PDFViewer;
