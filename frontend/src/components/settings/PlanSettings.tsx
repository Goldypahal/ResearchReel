"use client";

import React, { useEffect, useState } from 'react';
import { billingApi, errorMessage, type Subscription } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { SkeletonRows } from '@/components/common/States';
import { Card, PrimaryButton } from './Field';

const PLAN_LABEL: Record<string, string> = { free: 'Free', pro: 'Pro', scholar: 'Scholar', enterprise: 'Enterprise' };

export default function PlanSettings({ checkoutResult }: { checkoutResult?: string | null }) {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    billingApi.getSubscription().then(setSub).catch((err) => setError(errorMessage(err)));
  }, []);
  useEffect(() => {
    if (checkoutResult === 'success') toast({ title: 'Thanks! Your plan will update in a moment.', variant: 'success' });
    if (checkoutResult === 'canceled') toast({ title: 'Checkout cancelled — you were not charged.' });
  }, [checkoutResult]);

  const upgrade = async (plan: string) => {
    setBusy(plan);
    try {
      const { url } = await billingApi.checkout(plan);
      window.location.assign(url);
    } catch (err) {
      toast({ title: 'Could not start checkout', description: errorMessage(err), variant: 'destructive' });
      setBusy(null);
    }
  };

  if (error) return null; // billing is optional; hide the section if it can't load
  return (
    <Card title="Plan">
      {!sub ? (
        <SkeletonRows rows={1} />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">You&apos;re on the <span className="font-bold">{PLAN_LABEL[sub.plan] || sub.plan}</span> plan.</p>
          {sub.billingEnabled && sub.availablePlans.filter((p) => p !== sub.plan).map((p) => (
            <PrimaryButton key={p} onClick={() => upgrade(p)} busy={busy === p}>Upgrade to {PLAN_LABEL[p] || p}</PrimaryButton>
          ))}
          {!sub.billingEnabled && <p className="text-xs text-muted-foreground">Paid plans aren&apos;t available on this server.</p>}
        </div>
      )}
    </Card>
  );
}
