"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, 
  ExternalLink, Download, BookOpen, AlertCircle,
  Maximize2, Minimize2, RotateCw
} from 'lucide-react';
// PDFs are rendered with the browser's native viewer via <iframe> to avoid
// bundler incompatibilities between pdf.js and the Next.js webpack pipeline.

export interface ResearchPaperReaderProps {
  isOpen: boolean;
  onClose: () => void;
  paper: {
    title: string;
    authors?: { name: string; orcid?: string | null }[];
    author_name?: string;
    journal?: string;
    year?: number | null;
    doi?: string | null;
    doi_url?: string | null;
    pdf_url?: string | null;
    landing_url?: string | null;
    abstract?: string;
    summary_text?: string;
    document_name?: string;
    cited_by_count?: number;
    tags?: string[];
  };
}

export default function ResearchPaperReader({ isOpen, onClose, paper }: ResearchPaperReaderProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'abstract' | 'pdf'>('abstract');

  // Determine best URL to load
  const pdfSrc = paper.pdf_url || (paper.document_name ? `/${paper.document_name}` : null);
  const externalUrl = paper.landing_url || paper.doi_url;
  const doiDisplay = paper.doi ? `https://doi.org/${paper.doi}` : null;

  useEffect(() => {
    // Verify the PDF exists before embedding it in the iframe
    if (!pdfSrc) {
      setIsMounted(true);
      return;
    }
    let cancelled = false;
    fetch(pdfSrc, { method: 'HEAD' })
      .then(res => {
        if (cancelled) return;
        if (!res.ok) setPdfError(true);
        else setNumPages(n => n || 1);
        setIsMounted(true);
      })
      .catch(() => {
        if (cancelled) return;
        setPdfError(true);
        setIsMounted(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pdfSrc]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      const init = () => {
        setPageNumber(1);
        setScale(1.0);
        setPdfError(false);
        setActiveTab(pdfSrc ? 'pdf' : 'abstract');
      };
      const frame = requestAnimationFrame(init);
      return () => cancelAnimationFrame(frame);
    }
  }, [isOpen, pdfSrc]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setPageNumber(p => Math.min(p + 1, numPages));
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setPageNumber(p => Math.max(p - 1, 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, numPages, onClose]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  }, []);

  const zoomIn = () => setScale(s => Math.min(s + 0.2, 3.0));
  const zoomOut = () => setScale(s => Math.max(s - 0.2, 0.5));
  const resetZoom = () => setScale(1.0);

  const authorList = paper.authors?.length
    ? paper.authors.map(a => a.name).join(', ')
    : paper.author_name || 'Unknown Author';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Reader Panel */}
      <div
        className={`relative z-10 flex flex-col bg-zinc-950 border border-zinc-800/60 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 ${
          isFullscreen
            ? 'w-screen h-screen rounded-none'
            : 'w-full max-w-5xl h-[90vh] mx-4'
        }`}
      >
        {/* ─── TOP TOOLBAR ─── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/60 bg-zinc-900/60 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center justify-center shrink-0">
              <BookOpen size={15} className="text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white truncate max-w-[520px]" title={paper.title}>
                {paper.title}
              </h2>
              <p className="text-[10px] text-zinc-500 truncate">
                {authorList}
                {paper.journal ? ` • ${paper.journal}` : ''}
                {paper.year ? ` (${paper.year})` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-3">
            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 hover:text-indigo-400 transition-colors px-2.5 py-1.5 rounded-lg border border-zinc-800 hover:border-indigo-500/30 bg-zinc-900 hover:bg-indigo-500/5"
                title="Open original publication"
              >
                <ExternalLink size={12} />
                <span className="hidden sm:inline">Open Original</span>
              </a>
            )}
            {pdfSrc && !pdfError && (
              <a
                href={pdfSrc}
                download
                className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 hover:text-indigo-400 transition-colors px-2.5 py-1.5 rounded-lg border border-zinc-800 hover:border-indigo-500/30 bg-zinc-900 hover:bg-indigo-500/5"
                title="Download PDF"
              >
                <Download size={12} />
                <span className="hidden sm:inline">Download</span>
              </a>
            )}
            <button
              onClick={() => setIsFullscreen(f => !f)}
              className="p-1.5 text-zinc-500 hover:text-zinc-200 transition-colors rounded-lg hover:bg-zinc-800"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ─── TAB SWITCHER ─── */}
        <div className="flex border-b border-zinc-800/60 shrink-0 bg-zinc-950">
          <button
            onClick={() => setActiveTab('abstract')}
            className={`px-5 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 ${
              activeTab === 'abstract'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Abstract & Info
          </button>
          <button
            onClick={() => setActiveTab('pdf')}
            className={`px-5 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 ${
              activeTab === 'pdf'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {pdfSrc && !pdfError ? 'Read Paper' : 'Full Paper'}
          </button>
        </div>

        {/* ─── CONTENT AREA ─── */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* Abstract Tab */}
          {activeTab === 'abstract' && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Paper Metadata Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-4 space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Publication</span>
                  <p className="text-sm font-bold text-white">{paper.journal || 'Unknown Journal'}</p>
                  {paper.year && <p className="text-xs text-zinc-500">Published {paper.year}</p>}
                </div>
                <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-4 space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Citations</span>
                  <p className="text-2xl font-black text-white">{(paper.cited_by_count || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-zinc-500">times cited</p>
                </div>
              </div>

              {/* Authors */}
              <div className="space-y-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Authors</span>
                <div className="flex flex-wrap gap-2">
                  {(paper.authors && paper.authors.length > 0
                    ? paper.authors
                    : [{ name: paper.author_name || 'Unknown', orcid: null }]
                  ).map((a, i) => (
                    <span
                      key={i}
                      className="text-xs font-semibold bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full text-zinc-200 flex items-center gap-1.5"
                    >
                      {a.name}
                      {a.orcid && (
                        <a
                          href={`https://orcid.org/${a.orcid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] text-indigo-400 hover:underline"
                        >
                          ORCID
                        </a>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* Abstract */}
              {(paper.abstract || paper.summary_text) && (
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Abstract / Objective</span>
                  <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-900/40 border border-zinc-800/40 rounded-xl p-4">
                    {paper.abstract || paper.summary_text}
                  </p>
                </div>
              )}

              {/* DOI */}
              {doiDisplay && (
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">DOI</span>
                  <a
                    href={doiDisplay}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:underline font-mono block"
                  >
                    {doiDisplay}
                  </a>
                </div>
              )}

              {/* Tags */}
              {paper.tags && paper.tags.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Subject Areas</span>
                  <div className="flex flex-wrap gap-2">
                    {paper.tags.map(tag => (
                      <span
                        key={tag}
                        className="text-[10px] font-bold text-indigo-400 bg-indigo-500/8 border border-indigo-500/15 px-2.5 py-1 rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA to read full paper */}
              <div className="pt-2">
                <button
                  onClick={() => setActiveTab('pdf')}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                >
                  Read Full Paper →
                </button>
              </div>
            </div>
          )}

          {/* PDF Reader Tab */}
          {activeTab === 'pdf' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* PDF Toolbar */}
              {pdfSrc && !pdfError && (
                <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/40 bg-zinc-900/40 shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPageNumber(p => Math.max(p - 1, 1))}
                      disabled={pageNumber <= 1}
                      className="p-1.5 rounded-lg hover:bg-zinc-800 disabled:opacity-30 text-zinc-400 hover:text-white transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-xs font-mono text-zinc-400 min-w-[80px] text-center">
                      {pageNumber} / {numPages || '—'}
                    </span>
                    <button
                      onClick={() => setPageNumber(p => Math.min(p + 1, numPages))}
                      disabled={pageNumber >= numPages}
                      className="p-1.5 rounded-lg hover:bg-zinc-800 disabled:opacity-30 text-zinc-400 hover:text-white transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button onClick={zoomOut} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all" title="Zoom out">
                      <ZoomOut size={15} />
                    </button>
                    <button onClick={resetZoom} className="px-2.5 py-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white text-[10px] font-mono transition-all" title="Reset zoom">
                      {Math.round(scale * 100)}%
                    </button>
                    <button onClick={zoomIn} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all" title="Zoom in">
                      <ZoomIn size={15} />
                    </button>
                    <button onClick={resetZoom} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all ml-1" title="Reset">
                      <RotateCw size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* PDF Render Area */}
              <div className="flex-1 overflow-auto bg-zinc-900/20 flex items-start justify-center py-4 custom-scrollbar">
                {!isMounted ? (
                  <div className="flex flex-col items-center gap-3 mt-20 text-zinc-600">
                    <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-widest">Initializing Reader…</span>
                  </div>
                ) : pdfError || !pdfSrc ? (
                  /* ── Fallback: no PDF URL or load error ── */
                  <div className="w-full max-w-lg mx-auto mt-10 p-8 flex flex-col items-center gap-6 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center">
                      <AlertCircle size={32} className="text-zinc-500" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-white">PDF Not Available Inline</h3>
                      <p className="text-sm text-zinc-500 leading-relaxed">
                        The publisher has restricted direct PDF access. You can view the full paper on the publisher&apos;s website.
                      </p>
                    </div>

                    {/* Abstract fallback */}
                    {(paper.abstract || paper.summary_text) && (
                      <div className="w-full bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-5 text-left">
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500">Abstract</span>
                        <p className="text-sm text-zinc-300 leading-relaxed mt-2">
                          {paper.abstract || paper.summary_text}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3 w-full">
                      {externalUrl && (
                        <a
                          href={externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all text-center shadow-lg shadow-indigo-600/20"
                        >
                          Open Publisher Page ↗
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ── PDF Viewer (native browser rendering) ── */
                  <div className="w-full h-full flex items-stretch justify-center px-4">
                    <iframe
                      src={`${pdfSrc}#page=${pageNumber}&zoom=${Math.round(scale * 100)}`}
                      title={paper.title}
                      className="w-full max-w-[900px] h-full min-h-[70vh] border-0 rounded-lg bg-white shadow-2xl shadow-black/60"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
