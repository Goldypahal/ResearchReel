"use client";

import React from 'react';
import { EditorProvider } from '@/context/EditorContext';
import PreviewCanvas from '@/components/editor/PreviewCanvas';
import Timeline from '@/components/editor/Timeline';
import SceneScriptPanel from '@/components/editor/SceneScriptPanel';
import { Save, ArrowLeft, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function EditorPage() {
  return (
    <EditorProvider>
      <div className="flex flex-col h-screen w-full bg-[var(--background)] text-[var(--foreground)] overflow-hidden pt-14 md:pt-0">
        
        {/* Editor Header */}
        <header className="flex-none h-16 border-b border-[var(--border)]/10 bg-black/40 backdrop-blur-md flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <Link href="/home" className="text-zinc-400 hover:text-white transition">
               <ArrowLeft size={20} />
            </Link>
            <div className="h-4 w-px bg-white/20" />
            <input 
              type="text" 
              defaultValue="Superconductivity Abstract"
              className="bg-transparent border-none text-lg font-bold text-white focus:outline-none focus:ring-0"
            />
            <span className="text-xs text-zinc-500 bg-white/5 px-2 py-1 rounded font-mono">Autosaved 1m ago</span>
          </div>

          <div className="flex items-center gap-3">
             <Button variant="ghost" size="sm" className="gap-2 text-zinc-400">
                <Save size={16} /> Save Draft
             </Button>
             <Button variant="primary" size="sm" className="gap-2">
                <UploadCloud size={16} /> Publish Reel
             </Button>
          </div>
        </header>

        {/* Editor Workspace (3-Pane Layout) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_360px] grid-rows-[1fr_240px] lg:grid-rows-[1fr_240px] gap-1 p-2 bg-black/20">
           
           {/* Top Left: Canvas */}
           <div className="col-start-1 row-start-1 p-1">
             <PreviewCanvas />
           </div>

           {/* Right: Scene Script Panel */}
           <div className="col-start-1 lg:col-start-2 row-start-1 row-span-2 lg:row-span-1 p-1 hidden lg:block h-full">
             <SceneScriptPanel />
           </div>

           {/* Bottom Left: Timeline */}
           <div className="col-start-1 lg:col-span-2 row-start-2 p-1">
             <Timeline />
           </div>

        </div>

      </div>
    </EditorProvider>
  );
}
