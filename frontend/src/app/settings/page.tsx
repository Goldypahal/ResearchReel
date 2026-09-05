"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { usersApi } from '@/lib/api/users';
import { User as UserIcon, Shield, Bell, Palette, Key, Check, Loader2 } from 'lucide-react';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'account' | 'security' | 'notifications' | 'appearance' | 'integrations'>('account');

  const [fullName, setFullName] = useState('');
  const [institution, setInstitution] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setInstitution((user as any).institution || '');
      setBio((user as any).bio || '');
    }
  }, [user]);

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSaved(false);

    try {
      const updated = await usersApi.updateProfile({
        full_name: fullName,
        institution,
        bio
      });

      if (user) {
        updateUser({
          ...user,
          full_name: updated.full_name || fullName,
          ...updated
        });
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error('Update Profile Error:', err);
      setError(err.message || 'Failed to update profile settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
          Settings & Preferences
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          Manage your account profile, security credentials, theme appearance, and API integrations.
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
          <UserIcon size={16} /> Account
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
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--foreground)]">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Dr. Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--foreground)]">Institution / Affiliation</label>
            <input
              type="text"
              placeholder="e.g. Stanford University"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--foreground)]">Bio / Research Summary</label>
            <textarea
              rows={3}
              placeholder="Short summary of your research domain and background..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:border-indigo-500/50 resize-none"
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
              disabled={isSaving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving && <Loader2 size={14} className="animate-spin" />}
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
              placeholder="Configured via server environment secrets"
              disabled
              className="w-full px-3.5 py-2.5 bg-[var(--foreground)]/5 border border-[var(--border)] rounded-xl text-sm text-zinc-500 cursor-not-allowed"
            />
          </div>
        </div>
      )}

      {activeTab !== 'account' && activeTab !== 'appearance' && activeTab !== 'integrations' && (
        <div className="p-6 rounded-2xl bg-[var(--foreground)]/[0.02] border border-[var(--border)] text-xs text-muted-foreground">
          <p className="font-semibold capitalize text-[var(--foreground)]">{activeTab} Configuration</p>
          <p>Configure {activeTab} preferences for your account.</p>
        </div>
      )}
    </div>
  );
}
