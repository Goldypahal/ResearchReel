"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, Play, Pause, Save, Upload, Settings, 
  Volume2, FileText, CheckCircle2, Loader2, AlertCircle, 
  ArrowLeft, Plus, Trash2, Smartphone, VolumeX, Eye
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface Scene {
  title: string;
  dialogue: string;
  backgroundStyle: string;
  duration: number;
}

interface Draft {
  id: string;
  title: string;
  description: string;
  scenes: Scene[] | string;
  status: string;
  linked_paper_id?: string;
  part_number?: number;
  total_parts?: number;
}

interface Document {
  id: string;
  file_name: string;
  summary_text?: string;
  created_at: string;
}

interface AutomationSettings {
  auto_generate: boolean;
  auto_upload: boolean;
  upload_interval_hours: number;
  next_upload_at?: string;
  has_api_key?: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ReelGeneratorPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  // State Management
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [activeDraft, setActiveDraft] = useState<Draft | null>(null);
  const [automation, setAutomation] = useState<AutomationSettings>({
    auto_generate: false,
    auto_upload: false,
    upload_interval_hours: 24,
    next_upload_at: undefined,
    has_api_key: false
  });
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');

  // Script Split / Multi-Part States
  const [splitMode, setSplitMode] = useState<'single' | 'multi'>('single');
  const [partsMode, setPartsMode] = useState<'auto' | 'custom'>('auto');
  const [partsCount, setPartsCount] = useState<number>(3);

  // Action/Loading States
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Interactive Live Preview State
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [currentPreviewSceneIdx, setCurrentPreviewSceneIdx] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const slideshowTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchInitialData();
    // Cleanup synthesis on unmount
    return () => {
      stopPreviewSpeech();
    };
  }, [token]);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token || localStorage.getItem('token') || ''}`
  });

  const fetchInitialData = async () => {
    if (!token && !localStorage.getItem('token')) return;
    setIsLoadingDocs(true);
    setIsLoadingDrafts(true);
    setErrorMsg(null);

    try {
      // 1. Fetch user's papers
      const docsRes = await fetch(`${API_BASE}/reels/documents`, { headers: getHeaders() });
      const docsData = await docsRes.json();
      if (docsRes.ok && docsData.success) {
        setDocuments(docsData.data || []);
        if (docsData.data && docsData.data.length > 0) {
          setSelectedDocId(docsData.data[0].id);
        }
      }

      // 2. Fetch drafts
      const draftsRes = await fetch(`${API_BASE}/reels/drafts`, { headers: getHeaders() });
      const draftsData = await draftsRes.json();
      if (draftsRes.ok && draftsData.success) {
        setDrafts(draftsData.data || []);
        if (draftsData.data && draftsData.data.length > 0) {
          loadActiveDraft(draftsData.data[0]);
        }
      }

      // 3. Fetch automation settings
      const autoRes = await fetch(`${API_BASE}/reels/automation`, { headers: getHeaders() });
      const autoData = await autoRes.json();
      if (autoRes.ok && autoData.success) {
        setAutomation(autoData.data);
      }
    } catch (err) {
      console.error('Error fetching studio data:', err);
      setErrorMsg('Failed to connect to studio APIs.');
    } finally {
      setIsLoadingDocs(false);
      setIsLoadingDrafts(false);
    }
  };

  const loadActiveDraft = (draft: Draft) => {
    stopPreviewSpeech();
    let scenesParsed: Scene[] = [];
    if (typeof draft.scenes === 'string') {
      try {
        scenesParsed = JSON.parse(draft.scenes);
      } catch (e) {
        scenesParsed = [];
      }
    } else {
      scenesParsed = draft.scenes || [];
    }
    setActiveDraft({
      ...draft,
      scenes: scenesParsed
    });
    setCurrentPreviewSceneIdx(0);
    setIsPreviewPlaying(false);
  };

  // Upload new paper within generator workspace
  const handleUploadPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploadingDoc(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('title', selectedFile.name);

      const res = await fetch(`${API_BASE}/posts/document/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token || localStorage.getItem('token') || ''}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to upload paper');

      setSuccessMsg('Paper uploaded successfully! Analyzing contents...');
      setSelectedFile(null);

      // Refresh documents
      const docsRes = await fetch(`${API_BASE}/reels/documents`, { headers: getHeaders() });
      const docsData = await docsRes.json();
      if (docsRes.ok && docsData.success) {
        setDocuments(docsData.data || []);
        setSelectedDocId(data.data.id);
      }

      // If auto-generate is active, a draft will be made in the background. Refresh drafts shortly.
      setTimeout(async () => {
        const draftsRes = await fetch(`${API_BASE}/reels/drafts`, { headers: getHeaders() });
        const draftsData = await draftsRes.json();
        if (draftsRes.ok && draftsData.success) {
          setDrafts(draftsData.data || []);
          if (draftsData.data.length > 0) {
            loadActiveDraft(draftsData.data[0]);
          }
        }
      }, 3000);

    } catch (err) {
      const error = err as Error;
      setErrorMsg(error.message || 'Error uploading document.');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Generate a draft from selected paper
  const handleGenerateDraft = async () => {
    if (!selectedDocId) {
      setErrorMsg('Please select a paper first.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    stopPreviewSpeech();

    try {
      const res = await fetch(`${API_BASE}/reels/generate-draft`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          document_id: selectedDocId,
          split_mode: splitMode,
          parts_mode: partsMode,
          parts_count: partsCount
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to generate draft.');

      setSuccessMsg(
        splitMode === 'multi'
          ? `Generated series with ${Array.isArray(data.data) ? data.data.length : 'multiple'} parts!`
          : 'AI summary draft generated successfully!'
      );
      
      // Update local state
      const newDrafts = Array.isArray(data.data) ? data.data : [data.data];
      const updatedDrafts = [...newDrafts, ...drafts];
      setDrafts(updatedDrafts);
      if (newDrafts.length > 0) {
        loadActiveDraft(newDrafts[0]);
      }

    } catch (err) {
      const error = err as Error;
      setErrorMsg(error.message || 'Error generating AI draft.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Update scene details locally
  const handleSceneChange = (index: number, field: keyof Scene, value: string | number) => {
    if (!activeDraft) return;
    const currentScenes = [...(activeDraft.scenes as Scene[])];
    currentScenes[index] = {
      ...currentScenes[index],
      [field]: value
    };
    setActiveDraft({
      ...activeDraft,
      scenes: currentScenes
    });
  };

  // Add new scene
  const handleAddScene = () => {
    if (!activeDraft) return;
    const currentScenes = [...(activeDraft.scenes as Scene[])];
    currentScenes.push({
      title: 'New Key Point',
      dialogue: 'Explain a key insight from your paper in simple terms.',
      backgroundStyle: 'indigo-dark',
      duration: 8
    });
    setActiveDraft({
      ...activeDraft,
      scenes: currentScenes
    });
  };

  // Delete scene
  const handleDeleteScene = (index: number) => {
    if (!activeDraft) return;
    const currentScenes = [...(activeDraft.scenes as Scene[])];
    if (currentScenes.length <= 1) {
      setErrorMsg('A reel draft must have at least one scene.');
      return;
    }
    currentScenes.splice(index, 1);
    setActiveDraft({
      ...activeDraft,
      scenes: currentScenes
    });
    if (currentPreviewSceneIdx >= currentScenes.length) {
      setCurrentPreviewSceneIdx(0);
    }
  };

  // Save draft edits to the database
  const handleSaveDraft = async () => {
    if (!activeDraft) return;
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`${API_BASE}/reels/draft/${activeDraft.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          title: activeDraft.title,
          description: activeDraft.description,
          scenes: activeDraft.scenes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save draft.');

      setSuccessMsg('Draft changes saved successfully.');
      
      // Update drafts list
      setDrafts(prev => prev.map(d => d.id === activeDraft.id ? data.data : d));

    } catch (err) {
      const error = err as Error;
      setErrorMsg(error.message || 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  };

  // Save automation settings
  const handleSaveAutomation = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = {
        ...automation,
        gemini_api_key: geminiApiKey || undefined
      };

      const res = await fetch(`${API_BASE}/reels/automation`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update settings.');

      setSuccessMsg(geminiApiKey ? 'Automation settings and Gemini API Key updated.' : 'Automation settings updated.');
      setAutomation(data.data);
      setGeminiApiKey(''); // Clear the input field after successful save
    } catch (err) {
      const error = err as Error;
      setErrorMsg(error.message || 'Failed to save automation.');
    }
  };

  // Disconnect the custom Gemini API Key
  const handleDisconnectApiKey = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`${API_BASE}/reels/automation`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          ...automation,
          gemini_api_key: '' // Empty string signals the backend to clear the key
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to disconnect key.');

      setSuccessMsg('Gemini API Key disconnected successfully.');
      setAutomation(data.data);
      setGeminiApiKey('');
    } catch (err) {
      const error = err as Error;
      setErrorMsg(error.message || 'Failed to disconnect API key.');
    }
  };

  // Compile and Publish Reel to Feed
  const handlePublishReel = async () => {
    if (!activeDraft) return;
    
    // Auto-save first
    await handleSaveDraft();

    setIsPublishing(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    stopPreviewSpeech();

    try {
      const res = await fetch(`${API_BASE}/reels/publish-draft/${activeDraft.id}`, {
        method: 'POST',
        headers: getHeaders()
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to publish reel.');

      setSuccessMsg('Publishing started in background! Redirecting to feed...');
      
      setTimeout(() => {
        router.push('/reels');
      }, 2000);

    } catch (err) {
      const error = err as Error;
      setErrorMsg(error.message || 'Failed to start compilation.');
      setIsPublishing(false);
    }
  };

  // Voiceover TTS preview using browser Speech Synthesis API
  const speakSceneVoiceover = (text: string, onEndCallback?: () => void) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel(); // Cancel any ongoing speech

    if (isMuted) {
      if (onEndCallback) {
        // Mock a wait matching reading speed (approx 140 words per minute)
        const wordCount = text.split(/\s+/).length;
        const durationMs = Math.max(3000, (wordCount / 140) * 60 * 1000);
        slideshowTimeoutRef.current = setTimeout(onEndCallback, durationMs);
      }
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05; // Slightly faster natural pacing
    utterance.pitch = 1.0;
    
    // Choose a high-quality English voice if available
    const voices = window.speechSynthesis.getVoices();
    const premiumVoice = voices.find(v => 
      v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Apple'))
    );
    if (premiumVoice) utterance.voice = premiumVoice;

    if (onEndCallback) {
      utterance.onend = () => {
        onEndCallback();
      };
      utterance.onerror = () => {
        onEndCallback();
      };
    }

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stopPreviewSpeech = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (slideshowTimeoutRef.current) {
      clearTimeout(slideshowTimeoutRef.current);
      slideshowTimeoutRef.current = null;
    }
  };

  // Continuous play simulation in the virtual smartphone
  useEffect(() => {
    if (!isPreviewPlaying || !activeDraft) {
      stopPreviewSpeech();
      return;
    }

    const scenes = activeDraft.scenes as Scene[];
    if (scenes.length === 0) return;

    const currentScene = scenes[currentPreviewSceneIdx];
    const durationMs = (currentScene.duration || 8) * 1000;

    // Trigger dialogue speech
    speakSceneVoiceover(currentScene.dialogue, () => {
      // Transition to next slide when speaking finishes
      if (isPreviewPlaying) {
        setCurrentPreviewSceneIdx(prev => (prev + 1) % scenes.length);
      }
    });

    // Fallback timer if speech API doesn't trigger or is delayed
    slideshowTimeoutRef.current = setTimeout(() => {
      if (isPreviewPlaying) {
        setCurrentPreviewSceneIdx(prev => (prev + 1) % scenes.length);
      }
    }, durationMs + 2000);

    return () => {
      stopPreviewSpeech();
    };
  }, [isPreviewPlaying, currentPreviewSceneIdx, activeDraft]);

  const togglePreviewPlay = () => {
    setIsPreviewPlaying(!isPreviewPlaying);
  };

  const getStyleGradient = (styleName: string) => {
    switch (styleName) {
      case 'slate-gradient':
        return 'from-slate-900 via-zinc-900 to-stone-900';
      case 'emerald-glow':
        return 'from-emerald-950 via-teal-900 to-slate-950';
      case 'crimson-deep':
        return 'from-rose-950 via-red-950 to-zinc-950';
      case 'violet-pulsar':
        return 'from-violet-950 via-purple-900 to-slate-950';
      case 'indigo-dark':
      default:
        return 'from-indigo-950 via-blue-950 to-slate-950';
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30">
      
      {/* Header Bar */}
      <header className="sticky top-0 bg-[#050508]/85 backdrop-blur-md border-b border-zinc-800/60 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()} 
            className="p-2 hover:bg-zinc-800/50 rounded-xl transition-all"
          >
            <ArrowLeft size={18} className="text-zinc-400" />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight uppercase italic flex items-center gap-2">
              <Sparkles size={18} className="text-indigo-400 animate-pulse" />
              AI Research Reel Studio
            </h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
              NotebookLM-style Automated Short-Form Creator
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeDraft && (
            <>
              <button
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-xs font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Save Draft
              </button>
              <button
                onClick={handlePublishReel}
                disabled={isPublishing}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isPublishing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                Publish Reel
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Grid Workspace */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 p-6">
        
        {/* Left Panel: Paper List & Automation Configuration (xl:col-span-3) */}
        <div className="xl:col-span-3 flex flex-col gap-6">
          
          {/* Documents/Papers Upload & Selector */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-3xl p-5 flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider italic text-indigo-400">
                1. Select Research Paper
              </h2>
              <p className="text-[10px] text-zinc-500 font-medium">
                Choose a paper to extract insight cards
              </p>
            </div>

            {isLoadingDocs ? (
              <div className="py-8 flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-500" size={24} />
              </div>
            ) : documents.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-2xl p-4">
                No research papers found. Upload one below to start generating!
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto no-scrollbar">
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                      selectedDocId === doc.id
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-zinc-800 bg-zinc-950/40 hover:bg-zinc-800/30'
                    }`}
                  >
                    <FileText size={16} className={selectedDocId === doc.id ? 'text-indigo-400' : 'text-zinc-500'} />
                    <span className="text-[11px] font-semibold truncate flex-1">{doc.file_name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Quick Upload Form */}
            <form onSubmit={handleUploadPaper} className="border-t border-zinc-800/60 pt-4 flex flex-col gap-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                Upload New Paper (PDF/Image)
              </label>
              <div className="flex gap-2">
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="generator-file-upload"
                  accept="application/pdf,image/*"
                />
                <label
                  htmlFor="generator-file-upload"
                  className="flex-1 px-3 py-2 bg-zinc-950/60 border border-zinc-800 hover:border-zinc-700 rounded-xl text-[10px] text-zinc-400 font-semibold cursor-pointer truncate"
                >
                  {selectedFile ? selectedFile.name : 'Select PDF / Image...'}
                </label>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploadingDoc}
                  className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-40 transition-all flex items-center justify-center shrink-0"
                >
                  {isUploadingDoc ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                </button>
              </div>
            </form>

            {/* Script Split Options */}
            <div className="border-t border-zinc-800/60 pt-4 flex flex-col gap-3">
              <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                Generation Mode
              </label>
              
              <div className="grid grid-cols-2 gap-2 bg-zinc-950/40 p-1 rounded-xl border border-zinc-800/60">
                <button
                  type="button"
                  onClick={() => setSplitMode('single')}
                  className={`py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                    splitMode === 'single'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Single Summary
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode('multi')}
                  className={`py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                    splitMode === 'multi'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Multi-Part Series
                </button>
              </div>

              {splitMode === 'multi' && (
                <div className="flex flex-col gap-2 bg-zinc-950/20 border border-zinc-800/40 p-3 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Parts Allocation</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPartsMode('auto')}
                        className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                          partsMode === 'auto'
                            ? 'bg-purple-600 text-white'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        Auto Mode
                      </button>
                      <button
                        type="button"
                        onClick={() => setPartsMode('custom')}
                        className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                          partsMode === 'custom'
                            ? 'bg-purple-600 text-white'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        Custom Count
                      </button>
                    </div>
                  </div>

                  {partsMode === 'auto' ? (
                    <p className="text-[9px] text-zinc-500 italic mt-1 leading-relaxed">
                      🤖 Gemini will analyze the paper complexity and dynamically generate the optimal number of script parts.
                    </p>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-zinc-400 font-semibold flex-1">Number of Parts:</span>
                      <input
                        type="number"
                        min={2}
                        max={5}
                        value={partsCount}
                        onChange={(e) => setPartsCount(Math.min(5, Math.max(2, parseInt(e.target.value) || 2)))}
                        className="w-12 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-center text-xs font-black text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleGenerateDraft}
              disabled={isGenerating || !selectedDocId}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Generating AI Script...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Generate AI Reel Draft
                </>
              )}
            </button>
          </div>

          {/* Draft History & Series Parts */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-3xl p-5 flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider italic text-indigo-400">
                Studio History
              </h2>
              <p className="text-[10px] text-zinc-500 font-medium">
                Load previous summaries and series parts
              </p>
            </div>

            {isLoadingDrafts ? (
              <div className="py-4 flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-500" size={20} />
              </div>
            ) : drafts.length === 0 ? (
              <div className="py-4 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-2xl p-4">
                No drafts saved yet.
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto no-scrollbar">
                {drafts.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => loadActiveDraft(d)}
                    className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all ${
                      activeDraft?.id === d.id
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-zinc-800 bg-zinc-950/40 hover:bg-zinc-800/30'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="text-[11px] font-black truncate flex-1">{d.title}</span>
                      {d.part_number && d.total_parts && d.total_parts > 1 ? (
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-[7px] font-black uppercase tracking-wider text-purple-400 shrink-0">
                          Part {d.part_number}/{d.total_parts}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[7px] font-black uppercase tracking-wider text-zinc-500 shrink-0">
                          Single
                        </span>
                      )}
                    </div>
                    {d.description && (
                      <span className="text-[9px] text-zinc-500 line-clamp-1">{d.description}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Automation Configuration Panel */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-3xl p-5 flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider italic text-indigo-400">
                Pipeline Settings
              </h2>
              <p className="text-[10px] text-zinc-500 font-medium">
                NotebookLM Auto-Generation Orchestrator
              </p>
            </div>

            <div className="space-y-4 pt-1">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={automation.auto_generate}
                  onChange={(e) => setAutomation({ ...automation, auto_generate: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-indigo-500/20 mt-0.5"
                />
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-zinc-300">Auto-Generate Reel Draft</span>
                  <span className="text-[9px] text-zinc-500 leading-tight">Create AI slide script on paper upload</span>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={automation.auto_upload}
                  onChange={(e) => setAutomation({ ...automation, auto_upload: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-indigo-500/20 mt-0.5"
                />
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-zinc-300">Auto-Publish to Feed</span>
                  <span className="text-[9px] text-zinc-500 leading-tight">Automatically render and post to feed</span>
                </div>
              </label>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                  Upload Queue Cycle (Hours)
                </label>
                <input
                  type="number"
                  value={automation.upload_interval_hours}
                  onChange={(e) => setAutomation({ ...automation, upload_interval_hours: parseInt(e.target.value) || 24 })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none focus:border-indigo-500/50"
                  min={1}
                />
              </div>

              <button
                onClick={handleSaveAutomation}
                className="w-full py-2.5 bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
              >
                Save Preferences
              </button>

              {automation.auto_upload && automation.next_upload_at && (
                <div className="text-[10px] text-zinc-400 bg-[#050508]/60 p-3 rounded-xl border border-zinc-800/60 mt-1 space-y-1">
                  <div className="text-[8px] font-black uppercase tracking-widest text-indigo-400">Scheduled Queue Run</div>
                  <div className="font-bold text-zinc-200">
                    {new Date(automation.next_upload_at).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Connect Gemini API Key Panel */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-3xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider italic text-indigo-400">
                  Connect Gemini (BYOK)
                </h2>
                <p className="text-[10px] text-zinc-500 font-medium">
                  Use your own key for reel generation
                </p>
              </div>
              {automation.has_api_key ? (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[8px] font-black uppercase tracking-wider text-emerald-400">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                  Active
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[8px] font-black uppercase tracking-wider text-zinc-500">
                  Inactive
                </span>
              )}
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder={automation.has_api_key ? "••••••••••••••••••••••••" : "AIzaSy..."}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none focus:border-indigo-500/50 placeholder-zinc-700 font-mono"
                />
                <span className="text-[8px] text-zinc-500 leading-normal">
                  Your key is securely encrypted and stored. Leave blank to use system default.
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveAutomation}
                  disabled={!geminiApiKey}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
                >
                  Save Key
                </button>
                {automation.has_api_key && (
                  <button
                    onClick={handleDisconnectApiKey}
                    className="px-3 py-2 bg-zinc-950 border border-zinc-800 hover:bg-red-500/10 hover:border-red-500/20 text-zinc-400 hover:text-red-400 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Middle Panel: Script Editor Workspace (xl:col-span-6) */}
        <div className="xl:col-span-6 flex flex-col gap-5">
          {activeDraft ? (
            <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-3xl p-6 flex-1 flex flex-col gap-5 overflow-y-auto no-scrollbar max-h-[82vh]">
              
              {/* Draft Info */}
              <div className="flex items-start justify-between border-b border-zinc-800/60 pb-4">
                <div className="space-y-1">
                  <input
                    type="text"
                    value={activeDraft.title}
                    onChange={(e) => setActiveDraft({ ...activeDraft, title: e.target.value })}
                    className="text-lg font-black bg-transparent border-none outline-none text-zinc-100 placeholder-zinc-700 w-full focus:ring-0"
                    placeholder="Draft Title"
                  />
                  <input
                    type="text"
                    value={activeDraft.description}
                    onChange={(e) => setActiveDraft({ ...activeDraft, description: e.target.value })}
                    className="text-xs bg-transparent border-none outline-none text-zinc-500 placeholder-zinc-800 w-full focus:ring-0"
                    placeholder="Short summary/description of the reel"
                  />
                </div>
                <div className="flex items-center gap-2">
                  {activeDraft.part_number && activeDraft.total_parts && activeDraft.total_parts > 1 && (
                    <div className="bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-purple-400">
                      Part {activeDraft.part_number} of {activeDraft.total_parts}
                    </div>
                  )}
                  <div className="bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-indigo-400">
                    {activeDraft.status}
                  </div>
                </div>
              </div>

              {/* Error & Success Messages */}
              {errorMsg && (
                <div className="flex items-start gap-2.5 text-red-400 text-xs bg-red-500/8 border border-red-500/20 rounded-xl p-3">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="flex items-start gap-2.5 text-emerald-400 text-xs bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-3">
                  <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Scene List */}
              <div className="space-y-6 flex-1">
                {(activeDraft.scenes as Scene[]).map((scene, idx) => (
                  <div 
                    key={idx} 
                    className="bg-zinc-950/40 border border-zinc-800/60 rounded-2xl p-5 flex flex-col gap-4 relative group"
                  >
                    
                    {/* Scene Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                        Insight Card {idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => speakSceneVoiceover(scene.dialogue)}
                          title="Preview Scene Voiceover Narration"
                          className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors flex items-center justify-center"
                        >
                          <Volume2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteScene(idx)}
                          className="p-1.5 bg-zinc-900 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 rounded-lg transition-colors flex items-center justify-center"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Scene Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Left Block */}
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                            Slide Title
                          </label>
                          <input
                            type="text"
                            value={scene.title}
                            onChange={(e) => handleSceneChange(idx, 'title', e.target.value)}
                            className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-200 outline-none"
                            placeholder="e.g. Breakthrough"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                              Visual Style
                            </label>
                            <select
                              value={scene.backgroundStyle}
                              onChange={(e) => handleSceneChange(idx, 'backgroundStyle', e.target.value)}
                              className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-2 py-2 text-xs text-zinc-300 outline-none"
                            >
                              <option value="indigo-dark">Indigo Glow</option>
                              <option value="slate-gradient">Slate Gradient</option>
                              <option value="emerald-glow">Emerald Bio</option>
                              <option value="crimson-deep">Crimson Laser</option>
                              <option value="violet-pulsar">Violet Quantum</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                              Duration (Sec)
                            </label>
                            <input
                              type="number"
                              value={scene.duration}
                              onChange={(e) => handleSceneChange(idx, 'duration', parseInt(e.target.value) || 8)}
                              className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none"
                              min={3}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Dialogue Script */}
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                          Voiceover Dialogue Script
                        </label>
                        <textarea
                          value={scene.dialogue}
                          onChange={(e) => handleSceneChange(idx, 'dialogue', e.target.value)}
                          className="w-full h-[88px] bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-3 py-2 text-xs leading-relaxed text-zinc-300 resize-none outline-none"
                          placeholder="What will the AI say out loud..."
                        />
                      </div>

                    </div>
                  </div>
                ))}

                <button
                  onClick={handleAddScene}
                  className="w-full py-3.5 border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-zinc-900/10 hover:bg-zinc-900/20 text-zinc-400 hover:text-zinc-200 text-xs font-black uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-99"
                >
                  <Plus size={14} />
                  Add Insight Card
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-3xl p-12 flex-1 flex flex-col items-center justify-center text-center gap-5">
              <div className="w-16 h-16 bg-zinc-900 rounded-2xl border border-zinc-800 flex items-center justify-center text-indigo-400">
                <Eye size={28} />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-black uppercase tracking-tight italic">No Draft Loaded</h3>
                <p className="text-xs text-zinc-500 max-w-sm leading-relaxed">
                  Select a draft from the history, or select a paper on the left to generate a new script from scratch.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Interactive Phone Slide Preview (xl:col-span-3) */}
        <div className="xl:col-span-3 flex flex-col items-center gap-4">
          <div className="sticky top-24 flex flex-col items-center gap-4 w-full">
            
            {/* Phone Container */}
            <div className="relative w-[280px] h-[497px] bg-black border-[6px] border-zinc-800 rounded-[40px] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] flex flex-col">
              
              {/* Camera Notch */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-4 bg-zinc-800 rounded-full z-20 flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-black rounded-full ml-auto mr-3"></div>
              </div>

              {activeDraft && (activeDraft.scenes as Scene[]).length > 0 ? (
                (() => {
                  const scenes = activeDraft.scenes as Scene[];
                  const scene = scenes[currentPreviewSceneIdx];
                  
                  return (
                    <div className={`w-full h-full bg-gradient-to-b ${getStyleGradient(scene.backgroundStyle)} relative flex flex-col justify-between p-6 pt-12 pb-8 z-10 transition-all duration-700`}>
                      
                      {/* Slide Indicator Dots */}
                      <div className="flex gap-1.5 w-full justify-center">
                        {scenes.map((_, i) => (
                          <div 
                            key={i} 
                            onClick={() => setCurrentPreviewSceneIdx(i)}
                            className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                              currentPreviewSceneIdx === i ? 'w-6 bg-white' : 'w-2 bg-white/30'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Center Content Title */}
                      <div className="flex-1 flex flex-col justify-center text-center px-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-2 block animate-pulse">
                          Insight {currentPreviewSceneIdx + 1}
                        </span>
                        <h4 className="text-xl font-black uppercase tracking-tight italic leading-snug drop-shadow-md text-white">
                          {scene.title || 'Untitled Card'}
                        </h4>
                      </div>

                      {/* Captions Overlay at Bottom */}
                      <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-3 text-center">
                        <p className="text-[11px] font-semibold text-white/95 leading-relaxed">
                          {scene.dialogue || 'Double-click to write narration.'}
                        </p>
                      </div>

                      {/* Playback Indicators */}
                      {isPreviewPlaying && (
                        <div className="absolute bottom-20 right-4 flex items-center gap-1 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-500/30">
                          <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping"></span>
                          <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400">TTS Audio Play</span>
                        </div>
                      )}

                    </div>
                  );
                })()
              ) : (
                <div className="w-full h-full bg-zinc-950 flex flex-col items-center justify-center p-6 text-center text-zinc-600 gap-3">
                  <Smartphone size={40} strokeWidth={1} />
                  <span className="text-xs font-semibold">Preview Station Empty</span>
                </div>
              )}
            </div>

            {/* Playback Controls */}
            {activeDraft && (
              <div className="flex items-center gap-4 bg-zinc-900/60 border border-zinc-800/60 px-5 py-2.5 rounded-2xl shadow-md">
                <button
                  onClick={() => {
                    const scenes = activeDraft.scenes as Scene[];
                    setCurrentPreviewSceneIdx(prev => (prev - 1 + scenes.length) % scenes.length);
                  }}
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Prev
                </button>

                <button
                  onClick={togglePreviewPlay}
                  className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all"
                >
                  {isPreviewPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                </button>

                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 bg-zinc-950 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
                  title={isMuted ? 'Unmute voice' : 'Mute voice (simulated delay)'}
                >
                  {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>

                <button
                  onClick={() => {
                    const scenes = activeDraft.scenes as Scene[];
                    setCurrentPreviewSceneIdx(prev => (prev + 1) % scenes.length);
                  }}
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
