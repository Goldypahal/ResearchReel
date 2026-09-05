"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { User, Shield, Bell, Palette, Key, Check } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'account' | 'security' | 'notifications' | 'appearance' | 'integrations'>('account');
  const [fullName, setFullName] = useState(user?.full_name || 'Dr. Rajvir Singh');
  const [institution, setInstitution] = useState('Cambridge University');
  const [saved, setSaved] = useState(false);

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
          Settings & Preferences
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          Manage your account profile, security credentials, theme appearance, and API key integrations.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('account')}
          className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'account' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-muted-foreground'
          }`}
        >
          <User size={16} /> Account
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'security' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-muted-foreground'
          }`}
        >
          <Shield size={16} /> Security
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'notifications' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-muted-foreground'
          }`}
        >
          <Bell size={16} /> Notifications
        </button>
        <button
          onClick={() => setActiveTab('appearance')}
          className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'appearance' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-muted-foreground'
          }`}
        >
          <Palette size={16} /> Appearance
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'integrations' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-muted-foreground'
          }`}
        >
          <Key size={16} /> Integrations & API Keys
        </button>
      </div>

      {/* Account Tab */}
      {activeTab === 'account' && (
        <form onSubmit={handleSaveAccount} className="p-6 rounded-2xl bg-[var(--foreground)]/[0.02] border border-[var(--border)] space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--foreground)]">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--foreground)]">Institution / Affiliation</label>
            <input
              type="text"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {saved && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                <Check size={14} /> Saved Changes
              </span>
            )}
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className="p-6 rounded-2xl bg-[var(--foreground)]/[0.02] border border-[var(--border)] space-y-4">
          <h3 className="text-sm font-bold text-[var(--foreground)]">Theme Selection</h3>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setTheme('white')}
              className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all ${
                theme === 'white' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-[var(--border)] text-muted-foreground'
              }`}
            >
              <div>
                <p className="font-bold text-xs">Light Mode</p>
                <p className="text-[10px] text-muted-foreground">Clean light interface</p>
              </div>
              {theme === 'white' && <Check size={16} />}
            </button>

            <button
              onClick={() => setTheme('black')}
              className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all ${
                theme === 'black' ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-[var(--border)] text-muted-foreground'
              }`}
            >
              <div>
                <p className="font-bold text-xs">Dark Mode</p>
                <p className="text-[10px] text-muted-foreground">Deep dark interface</p>
              </div>
              {theme === 'black' && <Check size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="p-6 rounded-2xl bg-[var(--foreground)]/[0.02] border border-[var(--border)] space-y-4">
          <h3 className="text-sm font-bold text-[var(--foreground)]">API Key Integration</h3>
          <p className="text-xs text-muted-foreground">Custom Gemini or OpenAI API keys are encrypted server-side and never exposed as raw secrets.</p>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--foreground)]">Gemini API Key</label>
            <input
              type="password"
              value="••••••••••••••••••••••••"
              disabled
              className="w-full px-3.5 py-2.5 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-xl text-sm text-zinc-500"
            />
          </div>
        </div>
      )}

      {activeTab !== 'account' && activeTab !== 'appearance' && activeTab !== 'integrations' && (
        <div className="p-6 rounded-2xl bg-[var(--foreground)]/[0.02] border border-[var(--border)] text-xs text-muted-foreground">
          <p className="font-semibold capitalize">{activeTab} Configuration</p>
          <p>Configure {activeTab} preferences for your account.</p>
        </div>
      )}
    </div>
  );
}
