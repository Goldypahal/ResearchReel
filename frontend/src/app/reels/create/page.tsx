"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Film, ArrowLeft, Sparkles, CheckCircle2, Play, Loader2 } from 'lucide-react';
import { documentsApi, DocumentItem } from '@/lib/api/documents';
import { reelsApi, ReelDraft } from '@/lib/api/reels';

export default function CreateReelPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [userDocs, setUserDocs] = useState<DocumentItem[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [currentDraft, setCurrentDraft] = useState<ReelDraft | null>(null);

  const [title, setTitle] = useState('');
  const [script, setScript] = useState('');
  const [voice, setVoice] = useState('en-US-Neural-Adam');
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDocuments() {
      try {
        const docs = await documentsApi.getUserAssets();
        setUserDocs(docs);
        if (docs.length > 0) {
          setSelectedDocId(docs[0].id);
        }
      } catch (err: any) {
        console.error('Error fetching user documents:', err);
      } finally {
        setIsLoadingDocs(false);
      }
    }
    loadDocuments();
  }, []);

  const handleStartGeneration = async () => {
    if (!selectedDocId || isProcessing) return;
    setIsProcessing(true);
    setError(null);
    setStep(2);

    try {
      const selectedDoc = userDocs.find(d => d.id === selectedDocId);
      const draft = await reelsApi.generateDraft({
        document_id: selectedDocId,
        title: selectedDoc ? `Insight: ${selectedDoc.title}` : 'Research Reel Insight'
      });

      setCurrentDraft(draft);
      setTitle(draft.title || 'Research Reel Insight');
      setScript(draft.script || 'AI is synthesizing key findings from the paper into video narration...');
      setStep(3);
    } catch (err: any) {
      console.error('Reel generation error:', err);
      setError(err.message || 'Failed to initialize AI reel generation.');
      setStep(1);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePublish = async () => {
    if (!currentDraft) return;
    try {
      await reelsApi.updateDraft(currentDraft.id, { title, script });
      await reelsApi.publishDraft(currentDraft.id);
      router.push('/reels');
    } catch (err: any) {
      console.error('Publish Reel Error:', err);
      setError(err.message || 'Failed to publish reel.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/reels')}
          className="p-1.5 rounded-lg hover:bg-[var(--foreground)]/10 text-muted-foreground hover:text-[var(--foreground)]"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl md:text-2xl font-extrabold text-[var(--foreground)] flex items-center gap-2">
          <Film size={22} className="text-purple-400" />
          <span>Research Reel Creator</span>
        </h1>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Step Indicator */}
      <div className="flex items-center justify-between border-b border-[var(--border)] pb-4 text-xs font-semibold">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-purple-400' : 'text-muted-foreground'}`}>
          <span className="w-6 h-6 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">1</span>
          <span>Select Paper</span>
        </div>
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-purple-400' : 'text-muted-foreground'}`}>
          <span className="w-6 h-6 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">2</span>
          <span>AI Scripting</span>
        </div>
        <div className={`flex items-center gap-2 ${step >= 3 ? 'text-purple-400' : 'text-muted-foreground'}`}>
          <span className="w-6 h-6 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">3</span>
          <span>Reel Studio</span>
        </div>
      </div>

      {/* Step 1: Select Paper */}
      {step === 1 && (
        <div className="p-6 rounded-2xl bg-[var(--foreground)]/[0.02] border border-[var(--border)] space-y-5">
          <h3 className="text-sm font-bold text-[var(--foreground)]">Choose Research Paper from Library</h3>

          {isLoadingDocs ? (
            <div className="flex items-center justify-center py-8 text-purple-400 gap-2">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-xs">Loading document library...</span>
            </div>
          ) : userDocs.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-xs text-muted-foreground">No documents found in your library.</p>
              <button
                onClick={() => router.push('/library')}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold"
              >
                Upload Paper First
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {userDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocId(doc.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedDocId === doc.id
                      ? 'border-purple-500 bg-purple-500/10 text-[var(--foreground)]'
                      : 'border-[var(--border)] text-muted-foreground hover:border-[var(--border)]/80'
                  }`}
                >
                  <div>
                    <h4 className="text-sm font-bold text-[var(--foreground)]">{doc.title}</h4>
                    <p className="text-xs text-muted-foreground">{doc.mime_type} • {doc.status}</p>
                  </div>
                  {selectedDocId === doc.id && <CheckCircle2 size={20} className="text-purple-400 shrink-0" />}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-3">
            <button
              onClick={handleStartGeneration}
              disabled={!selectedDocId || isProcessing}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              <span>Generate AI Reel Draft</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Processing */}
      {step === 2 && (
        <div className="p-12 text-center rounded-2xl bg-[var(--foreground)]/[0.02] border border-[var(--border)] space-y-4">
          <Loader2 size={40} className="animate-spin text-purple-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[var(--foreground)]">Generating Research Reel...</h3>
            <p className="text-xs text-muted-foreground">Extracting paper findings, drafting voice script, and queueing BullMQ video rendering worker.</p>
          </div>
        </div>
      )}

      {/* Step 3: Editor Studio */}
      {step === 3 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Video Preview */}
          <div className="h-[420px] rounded-3xl bg-gradient-to-b from-indigo-950 via-purple-950 to-black border border-[var(--border)] shadow-xl p-6 flex flex-col justify-between text-white relative">
            <span className="text-[10px] font-extrabold uppercase px-3 py-1 bg-white/10 rounded-full w-fit">Preview</span>
            <div className="text-center space-y-2">
              <Play size={36} className="mx-auto text-white/80" />
              <p className="text-xs text-zinc-300 font-semibold px-4 line-clamp-4">{script}</p>
            </div>
            <div className="text-[11px] font-bold text-purple-300 truncate">{title}</div>
          </div>

          {/* Settings Form */}
          <div className="p-5 rounded-2xl bg-[var(--foreground)]/[0.02] border border-[var(--border)] space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--foreground)]">Reel Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--foreground)]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--foreground)]">Voice Script</label>
              <textarea
                rows={5}
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--foreground)]">AI Narrator Voice</label>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)]"
              >
                <option value="en-US-Neural-Adam">Adam (Academic Male)</option>
                <option value="en-US-Neural-Emma">Emma (Academic Female)</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2 text-xs font-medium text-muted-foreground border border-[var(--border)] rounded-xl hover:bg-[var(--foreground)]/5"
              >
                Back
              </button>
              <button
                onClick={handlePublish}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                Publish Reel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
