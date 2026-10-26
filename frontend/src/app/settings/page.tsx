"use client";

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Palette, Shield, Sparkles, User as UserIcon, BadgeCheck } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import ProfileSettings from '@/components/settings/ProfileSettings';
import VerificationSettings from '@/components/settings/VerificationSettings';
import SecuritySettings from '@/components/settings/SecuritySettings';
import AiSettings from '@/components/settings/AiSettings';
import PlanSettings from '@/components/settings/PlanSettings';
import DangerZone from '@/components/settings/DangerZone';
import { Card } from '@/components/settings/Field';
import { LoadingBlock } from '@/components/common/States';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'profile', label: 'Profile', icon: UserIcon },
  { key: 'verification', label: 'Verification', icon: BadgeCheck },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'ai', label: 'AI & reels', icon: Sparkles },
  { key: 'appearance', label: 'Appearance', icon: Palette },
] as const;
type Tab = typeof TABS[number]['key'];

function Appearance() {
  const { theme, setTheme } = useTheme();
  return (
    <Card title="Theme">
      <div className="grid grid-cols-2 gap-4">
        {([['white', 'Light'], ['black', 'Dark']] as const).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            aria-pressed={theme === value}
            className={cn('flex items-center justify-between rounded-xl border p-4 text-left text-sm font-semibold', theme === value ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' : 'border-[var(--border)] text-muted-foreground')}
          >
            {label} {theme === value && <Check size={16} />}
          </button>
        ))}
      </div>
    </Card>
  );
}

function SettingsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const orcid = params.get('orcid');
  const requested = (params.get('tab') as Tab) || (orcid ? 'verification' : 'profile');
  const tab: Tab = TABS.some((t) => t.key === requested) ? requested : 'profile';
  const checkoutResult = params.get('success') ? 'success' : params.get('canceled') ? 'canceled' : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your profile, verification, security and AI preferences.</p>
      </div>

      <div role="tablist" className="no-scrollbar flex items-center gap-1 overflow-x-auto border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => router.replace(`/settings?tab=${t.key}`, { scroll: false })}
            className={cn('flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold', tab === t.key ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-muted-foreground hover:text-[var(--foreground)]')}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (<><ProfileSettings /><PlanSettings checkoutResult={checkoutResult} /></>)}
      {tab === 'verification' && <VerificationSettings orcidResult={orcid} />}
      {tab === 'security' && (<><SecuritySettings /><DangerZone /></>)}
      {tab === 'ai' && <AiSettings />}
      {tab === 'appearance' && <Appearance />}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <SettingsInner />
    </Suspense>
  );
}
