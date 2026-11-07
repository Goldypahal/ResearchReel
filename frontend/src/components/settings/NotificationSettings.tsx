"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { errorMessage, notificationsApi, type EmailPreferences } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { ErrorState, SkeletonRows } from '@/components/common/States';
import { Card, Field, inputClass } from './Field';
import { cn } from '@/lib/utils';

const browserZone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; }
};

/** All IANA zones the browser knows, with the user's current one guaranteed present. */
const zoneList = (current: string | null) => {
  let zones: string[] = [];
  try {
    zones = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') || [];
  } catch { /* older browsers */ }
  const extra = [current, browserZone(), 'UTC'].filter((z): z is string => Boolean(z));
  return [...new Set([...extra, ...zones])].sort((a, b) => (a === 'UTC' ? -1 : b === 'UTC' ? 1 : a.localeCompare(b)));
};

function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
        checked ? 'bg-indigo-500' : 'bg-[var(--foreground)]/20')}
    >
      <span className={cn('inline-block h-5 w-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5' : 'translate-x-0.5')} />
    </button>
  );
}

export default function NotificationSettings() {
  const [prefs, setPrefs] = useState<EmailPreferences | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const load = () => notificationsApi.emailPreferences().then(setPrefs).catch((err) => setError(errorMessage(err)));
  useEffect(() => { load(); }, []);

  const zones = useMemo(() => zoneList(prefs?.timezone ?? null), [prefs?.timezone]);

  const toggle = async (key: string, enabled: boolean) => {
    if (!prefs) return;
    const before = prefs;
    setPrefs({ ...prefs, categories: prefs.categories.map((c) => (c.key === key ? { ...c, enabled } : c)) });
    setSaving(key);
    try {
      setPrefs(await notificationsApi.updateEmailPreferences({ categories: { [key]: enabled } }));
    } catch (err) {
      setPrefs(before);
      toast({ title: 'Could not save', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  const setZone = async (timezone: string) => {
    setSaving('timezone');
    try {
      setPrefs(await notificationsApi.updateEmailPreferences({ timezone }));
      toast({ title: 'Time zone saved', variant: 'success' });
    } catch (err) {
      toast({ title: 'Could not save', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); load(); }} />;
  if (!prefs) return <SkeletonRows rows={5} />;

  const allOff = prefs.categories.every((c) => !c.enabled);

  return (
    <>
      <Card title="Email notifications" description="Choose what we email you about. You'll still see everything in the app under Notifications.">
        <ul className="divide-y divide-[var(--border)]">
          {prefs.categories.map((c) => (
            <li key={c.key} className="flex items-center justify-between gap-4 py-3">
              <span className="text-sm">{c.label}</span>
              <Toggle checked={c.enabled} label={c.label} disabled={saving === c.key} onChange={(v) => toggle(c.key, v)} />
            </li>
          ))}
        </ul>
        {allOff && <p className="text-xs text-muted-foreground">All activity emails are off. Account emails, like sign-in codes and password resets, are always sent.</p>}
      </Card>

      <Card title="Time zone" description="Used for times in lecture reminders.">
        <Field label="Your time zone" htmlFor="tz">
          <select
            id="tz"
            className={inputClass}
            value={prefs.timezone || ''}
            disabled={saving === 'timezone'}
            onChange={(e) => setZone(e.target.value)}
          >
            {!prefs.timezone && <option value="">Not set (times are shown in UTC)</option>}
            {zones.map((z) => <option key={z} value={z}>{z.replace(/_/g, ' ')}</option>)}
          </select>
        </Field>
      </Card>
    </>
  );
}
