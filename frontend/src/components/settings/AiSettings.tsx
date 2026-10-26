"use client";

import React, { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import { errorMessage, reelsApi, type ReelAutomation } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { ErrorState, SkeletonRows } from '@/components/common/States';
import { Card, Field, inputClass, PrimaryButton, SecondaryButton } from './Field';

function Toggle({ id, label, help, checked, onChange, disabled }: { id: string; label: string; help: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-semibold">{label}</label>
        <p className="text-xs text-muted-foreground">{help}</p>
      </div>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${checked ? 'bg-indigo-600' : 'bg-[var(--foreground)]/20'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

export default function AiSettings() {
  const [settings, setSettings] = useState<ReelAutomation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const load = () => {
    setError(null);
    reelsApi.getAutomation().then(setSettings).catch((err) => setError(errorMessage(err)));
  };
  // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data / resets state when its inputs change
  useEffect(load, []);

  const update = async (patch: Parameters<typeof reelsApi.updateAutomation>[0], label: string) => {
    setSaving(label);
    try {
      const next = await reelsApi.updateAutomation(patch);
      setSettings(next);
      return true;
    } catch (err) {
      toast({ title: 'Could not save', description: errorMessage(err), variant: 'destructive' });
      return false;
    } finally {
      setSaving(null);
    }
  };

  const saveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim().startsWith('AIza')) {
      toast({ title: "That doesn't look like a Gemini API key", description: 'Gemini keys start with "AIza".', variant: 'destructive' });
      return;
    }
    if (await update({ gemini_api_key: key.trim() }, 'key')) {
      setKey('');
      toast({ title: 'API key saved', description: 'It is encrypted and never shown again.', variant: 'success' });
    }
  };

  return (
    <Card title="AI & reels" description="Reel scripts use the server's Gemini key by default. Add your own key to use your quota instead.">
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !settings ? (
        <SkeletonRows rows={2} />
      ) : (
        <>
          <div className="space-y-3 rounded-xl border border-[var(--border)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold"><KeyRound size={16} className="text-indigo-400" /> Personal Gemini API key</div>
              <span className={`text-xs font-semibold ${settings.has_api_key ? 'text-emerald-500' : 'text-muted-foreground'}`}>{settings.has_api_key ? 'Saved' : 'Not set'}</span>
            </div>
            <form onSubmit={saveKey} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Field label={settings.has_api_key ? 'Replace key' : 'API key'} htmlFor="ai-key" hint={<>Create one at <a className="text-indigo-400 hover:underline" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>.</>}>
                  <input id="ai-key" type="password" autoComplete="off" className={inputClass} placeholder="AIza…" value={key} onChange={(e) => setKey(e.target.value)} />
                </Field>
              </div>
              <PrimaryButton type="submit" busy={saving === 'key'} disabled={!key.trim()}>Save key</PrimaryButton>
              {settings.has_api_key && (
                <SecondaryButton type="button" disabled={saving === 'key'} onClick={() => update({ gemini_api_key: '' }, 'key')}>Remove</SecondaryButton>
              )}
            </form>
          </div>

          <Toggle
            id="auto-gen"
            label="Draft a reel when I upload a paper"
            help="A script draft appears in your reel drafts for you to review."
            checked={settings.auto_generate}
            disabled={saving === 'auto'}
            onChange={(v) => update({ auto_generate: v, ...(v ? {} : { auto_upload: false }) }, 'auto')}
          />
          <Toggle
            id="auto-pub"
            label="Publish those drafts automatically"
            help="Skips review — the rendered reel is posted to your profile."
            checked={settings.auto_upload}
            disabled={!settings.auto_generate || saving === 'auto'}
            onChange={(v) => update({ auto_upload: v }, 'auto')}
          />
        </>
      )}
    </Card>
  );
}
