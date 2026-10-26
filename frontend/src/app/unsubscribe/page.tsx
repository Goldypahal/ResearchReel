"use client";

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BellOff, CheckCircle2 } from 'lucide-react';
import { errorMessage, notificationsApi } from '@/lib/api';
import { Spinner } from '@/components/common/States';

/**
 * Landing page for the "Unsubscribe" link in emails. It needs a click, so link
 * scanners that open emails can't unsubscribe people by accident.
 */
function Unsubscribe() {
  const token = useSearchParams().get('token') || '';
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>(token ? 'idle' : 'error');
  const [label, setLabel] = useState('');
  const [error, setError] = useState(token ? '' : 'This link is missing its unsubscribe code.');

  const confirm = async () => {
    setState('busy');
    try {
      const r = await notificationsApi.unsubscribe(token);
      setLabel(r.label.toLowerCase());
      setState('done');
    } catch (err) {
      setError(errorMessage(err, 'This unsubscribe link is invalid.'));
      setState('error');
    }
  };

  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl border border-border bg-card p-8 text-center">
      {state === 'done' ? (
        <>
          <CheckCircle2 size={40} className="mx-auto mb-4 text-emerald-500" />
          <h1 className="text-xl font-bold">You&apos;re unsubscribed</h1>
          <p className="mt-2 text-sm text-muted-foreground">We won&apos;t email you about {label} any more.</p>
        </>
      ) : state === 'error' ? (
        <>
          <BellOff size={40} className="mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-xl font-bold">Link not valid</h1>
          <p role="alert" className="mt-2 text-sm text-muted-foreground">{error}</p>
        </>
      ) : (
        <>
          <BellOff size={40} className="mx-auto mb-4 text-primary" />
          <h1 className="text-xl font-bold">Unsubscribe from these emails?</h1>
          <p className="mt-2 text-sm text-muted-foreground">You&apos;ll still see this activity in the app. Sign-in codes and security emails are always sent.</p>
          <button onClick={confirm} disabled={state === 'busy'} className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {state === 'busy' ? <Spinner size={16} /> : 'Unsubscribe'}
          </button>
        </>
      )}
      <p className="mt-6 text-sm">
        <Link href="/settings?tab=notifications" className="text-primary hover:underline">Manage all email settings</Link>
      </p>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="mt-24 flex justify-center"><Spinner /></div>}>
      <Unsubscribe />
    </Suspense>
  );
}
