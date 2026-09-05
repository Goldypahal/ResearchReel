"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Bot, Film, Users, PenTool, X } from 'lucide-react';

interface CreationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUploadModal?: () => void;
}

export default function CreationSheet({ isOpen, onClose, onOpenUploadModal }: CreationSheetProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const actions = [
    {
      title: 'Upload Research Paper',
      description: 'Upload a PDF to parse, index, and analyze with AI',
      icon: FileText,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
      onClick: () => {
        onClose();
        if (onOpenUploadModal) onOpenUploadModal();
        else router.push('/library');
      }
    },
    {
      title: 'Ask AI Copilot',
      description: 'Pose research questions or analyze scientific datasets',
      icon: Bot,
      color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
      onClick: () => {
        onClose();
        router.push('/ai/ask');
      }
    },
    {
      title: 'Create Research Reel',
      description: 'Convert paper insights into an engaging vertical video',
      icon: Film,
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
      onClick: () => {
        onClose();
        router.push('/reels/create');
      }
    },
    {
      title: 'New Collaborative Project',
      description: 'Start a project workspace with paper collections & Kanban',
      icon: Users,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
      onClick: () => {
        onClose();
        router.push('/projects/new');
      }
    },
    {
      title: 'Create Research Post',
      description: 'Publish updates, discussions, or paper recommendations',
      icon: PenTool,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
      onClick: () => {
        onClose();
        router.push('/create');
      }
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-[var(--background)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl space-y-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--foreground)]">Create New Research Item</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Select what you would like to generate or upload</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--foreground)]/10 text-muted-foreground hover:text-[var(--foreground)] transition-colors"
            aria-label="Close Creation Sheet"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-3">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.title}
                onClick={act.onClick}
                className="flex items-center gap-4 p-3.5 rounded-xl border border-[var(--border)] hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all text-left group"
              >
                <div className={`p-2.5 rounded-xl border ${act.color} shrink-0 group-hover:scale-105 transition-transform`}>
                  <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-[var(--foreground)] group-hover:text-indigo-500 transition-colors">
                    {act.title}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {act.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
